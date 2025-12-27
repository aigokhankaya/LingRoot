/**
 * 🎮 Gamification Service
 * 
 * Kullanıcı XP, Level, Streak ve Achievement sistemini yönetir.
 * "Hero's Journey" deneyiminin kalbi.
 */

const db = require('../config/db');
const logger = require('../utils/logger');

// Level başına gereken XP (kümülatif değil, o level için gereken)
const XP_PER_LEVEL_BASE = 50;

// XP Kaynakları ve Miktarları
const XP_REWARDS = {
    // İçerik Tüketimi
    CONTENT_LISTEN_PER_MINUTE: 10,
    CONTENT_COMPLETE: 100,
    PODCAST_COMPLETE: 150,
    BOOK_CHAPTER_COMPLETE: 200,

    // Kelime Öğrenimi
    WORD_LEARNED: 5,
    WORD_MASTERED: 20,
    WORD_REVIEW_CORRECT: 3,

    // Quiz ve Challenges
    QUIZ_COMPLETE: 50,
    QUIZ_PERFECT_SCORE: 100,
    BOSS_FIGHT_WIN: 250,
    DAILY_QUEST_COMPLETE: 50,

    // Streak
    STREAK_DAILY: 25,
    STREAK_BONUS_7_DAYS: 100,
    STREAK_BONUS_30_DAYS: 500,
};

class GamificationService {
    constructor() {
        this.xpRewards = XP_REWARDS;
    }

    // ============================================
    // XP & LEVEL MANAGEMENT
    // ============================================

    /**
     * Kullanıcıya XP ekle ve level kontrolü yap
     * @param {string} userId 
     * @param {number} amount 
     * @param {string} source - 'content', 'quiz', 'streak', 'achievement'
     * @param {string} sourceId - İlgili içerik/quiz ID
     * @param {string} description 
     * @returns {Promise<Object>} - { newXp, newLevel, leveledUp, achievements }
     */
    async addXP(userId, amount, source, sourceId = null, description = null) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Mevcut durumu al
            const currentState = await this.getOrCreateProfile(userId, client);
            const oldLevel = currentState.current_level;
            const newTotalXP = currentState.total_lifetime_xp + amount;

            // Yeni level hesapla
            const newLevel = this.calculateLevel(newTotalXP);
            const leveledUp = newLevel > oldLevel;

            // Gamification tablosunu güncelle
            await client.query(`
                UPDATE user_gamification 
                SET 
                    total_lifetime_xp = $1,
                    current_level = $2,
                    current_xp = $3,
                    updated_at = NOW()
                WHERE user_id = $4
            `, [
                newTotalXP,
                newLevel,
                this.getXPInCurrentLevel(newTotalXP, newLevel),
                userId
            ]);

            // XP Transaction log
            await client.query(`
                INSERT INTO xp_transactions (user_id, amount, source, source_id, description, level_before, level_after)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [userId, amount, source, sourceId, description, oldLevel, newLevel]);

            // Level atladıysa achievement kontrol et
            let earnedAchievements = [];
            if (leveledUp) {
                earnedAchievements = await this.checkLevelAchievements(userId, newLevel, client);
            }

            await client.query('COMMIT');

            logger.info(`[Gamification] User ${userId}: +${amount} XP (${source}), Level ${oldLevel} → ${newLevel}`);

            return {
                xpAdded: amount,
                totalXP: newTotalXP,
                currentLevel: newLevel,
                xpInLevel: this.getXPInCurrentLevel(newTotalXP, newLevel),
                xpForNextLevel: this.getXPForNextLevel(newLevel),
                leveledUp,
                levelsGained: newLevel - oldLevel,
                earnedAchievements
            };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('[Gamification] addXP failed:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Level hesapla (toplam XP'den)
     */
    calculateLevel(totalXP) {
        // Quadratic formula: level = floor(sqrt(totalXP / 50)) + 1
        return Math.max(1, Math.floor(Math.sqrt(totalXP / XP_PER_LEVEL_BASE)) + 1);
    }

    /**
     * Mevcut level içindeki XP miktarı
     */
    getXPInCurrentLevel(totalXP, level) {
        const xpForCurrentLevel = this.getTotalXPForLevel(level);
        return totalXP - xpForCurrentLevel;
    }

    /**
     * Bir level'e ulaşmak için gereken toplam XP
     */
    getTotalXPForLevel(level) {
        // Level 1 = 0 XP, Level 2 = 50 XP, Level 3 = 200 XP, ...
        return XP_PER_LEVEL_BASE * Math.pow(level - 1, 2);
    }

    /**
     * Sonraki level için gereken XP
     */
    getXPForNextLevel(currentLevel) {
        return this.getTotalXPForLevel(currentLevel + 1) - this.getTotalXPForLevel(currentLevel);
    }

    // ============================================
    // STREAK MANAGEMENT
    // ============================================

    /**
     * Günlük aktivite kaydı ve streak güncelleme
     */
    async updateStreak(userId) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const profile = await this.getOrCreateProfile(userId, client);
            const today = new Date().toISOString().split('T')[0];
            const lastActivity = profile.last_activity_date;

            let newStreak = profile.streak_count;
            let streakBroken = false;
            let streakBonus = 0;

            if (!lastActivity) {
                // İlk aktivite
                newStreak = 1;
            } else {
                const lastDate = new Date(lastActivity);
                const todayDate = new Date(today);
                const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

                if (diffDays === 0) {
                    // Aynı gün, streak değişmez
                } else if (diffDays === 1) {
                    // Ardışık gün, streak artır
                    newStreak = profile.streak_count + 1;
                    streakBonus = XP_REWARDS.STREAK_DAILY;

                    // Milestone bonusları
                    if (newStreak === 7) streakBonus += XP_REWARDS.STREAK_BONUS_7_DAYS;
                    if (newStreak === 30) streakBonus += XP_REWARDS.STREAK_BONUS_30_DAYS;
                } else {
                    // Streak kırıldı
                    streakBroken = true;
                    newStreak = 1;
                }
            }

            // Güncelle
            await client.query(`
                UPDATE user_gamification 
                SET 
                    streak_count = $1,
                    longest_streak = GREATEST(longest_streak, $1),
                    last_activity_date = $2,
                    updated_at = NOW()
                WHERE user_id = $3
            `, [newStreak, today, userId]);

            // Streak XP bonus
            let xpResult = null;
            if (streakBonus > 0) {
                await client.query('COMMIT');
                xpResult = await this.addXP(userId, streakBonus, 'streak', null, `${newStreak} günlük seri bonusu`);
            } else {
                await client.query('COMMIT');
            }

            // Streak achievement kontrolü
            const streakAchievements = await this.checkStreakAchievements(userId, newStreak);

            logger.info(`[Gamification] User ${userId}: Streak ${profile.streak_count} → ${newStreak}`);

            return {
                currentStreak: newStreak,
                previousStreak: profile.streak_count,
                longestStreak: Math.max(profile.longest_streak, newStreak),
                streakBroken,
                streakBonus,
                xpResult,
                achievements: streakAchievements
            };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('[Gamification] updateStreak failed:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Streak dondur (freeze kullan)
     */
    async useStreakFreeze(userId) {
        const profile = await this.getOrCreateProfile(userId);

        if (profile.freeze_balance <= 0) {
            return { success: false, message: 'Dondurma hakkınız yok' };
        }

        await db.query(`
            UPDATE user_gamification 
            SET freeze_balance = freeze_balance - 1,
                last_activity_date = CURRENT_DATE
            WHERE user_id = $1
        `, [userId]);

        return { success: true, message: 'Streak donduruldu!', remainingFreezes: profile.freeze_balance - 1 };
    }

    // ============================================
    // ACHIEVEMENTS
    // ============================================

    /**
     * Tüm başarımları getir (kazanılan ve kazanılmayan)
     */
    async getAchievements(userId) {
        const result = await db.query(`
            SELECT 
                a.*,
                ua.earned_at,
                CASE WHEN ua.user_id IS NOT NULL THEN true ELSE false END as is_earned
            FROM achievements a
            LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
            WHERE a.is_hidden = false OR ua.user_id IS NOT NULL
            ORDER BY a.sort_order, a.id
        `, [userId]);

        return result.rows;
    }

    /**
     * Başarım kazandır
     */
    async awardAchievement(userId, achievementCode, client = null) {
        const conn = client || db;

        try {
            // Achievement'ı bul
            const achievementResult = await conn.query(
                'SELECT * FROM achievements WHERE code = $1',
                [achievementCode]
            );

            if (achievementResult.rows.length === 0) {
                logger.warn(`[Gamification] Unknown achievement: ${achievementCode}`);
                return null;
            }

            const achievement = achievementResult.rows[0];

            // Zaten kazanılmış mı?
            const existingResult = await conn.query(
                'SELECT 1 FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
                [userId, achievement.id]
            );

            if (existingResult.rows.length > 0) {
                return null; // Zaten var
            }

            // Kazandır
            await conn.query(`
                INSERT INTO user_achievements (user_id, achievement_id)
                VALUES ($1, $2)
            `, [userId, achievement.id]);

            logger.info(`[Gamification] User ${userId} earned achievement: ${achievementCode}`);

            return achievement;

        } catch (error) {
            logger.error('[Gamification] awardAchievement failed:', error);
            return null;
        }
    }

    /**
     * Level achievement kontrolü
     */
    async checkLevelAchievements(userId, newLevel, client = null) {
        const levelMilestones = [10, 25, 50, 75, 100];
        const earned = [];

        for (const milestone of levelMilestones) {
            if (newLevel >= milestone) {
                const code = `LEVEL_${milestone}`;
                const achievement = await this.awardAchievement(userId, code, client);
                if (achievement) earned.push(achievement);
            }
        }

        return earned;
    }

    /**
     * Streak achievement kontrolü
     */
    async checkStreakAchievements(userId, streak) {
        const streakMilestones = [3, 7, 30, 100];
        const earned = [];

        for (const milestone of streakMilestones) {
            if (streak >= milestone) {
                const code = `STREAK_${milestone}`;
                const achievement = await this.awardAchievement(userId, code);
                if (achievement) earned.push(achievement);
            }
        }

        return earned;
    }

    // ============================================
    // DAILY QUESTS
    // ============================================

    /**
     * Günlük görevleri getir veya oluştur
     */
    async getDailyQuests(userId) {
        const today = new Date().toISOString().split('T')[0];

        // Bugünün görevleri var mı?
        const existing = await db.query(
            'SELECT * FROM daily_quests WHERE user_id = $1 AND quest_date = $2',
            [userId, today]
        );

        if (existing.rows.length > 0) {
            return existing.rows;
        }

        // Yeni görevler oluştur
        const questTemplates = [
            { type: 'listen_minutes', title: '10 dakika dinle', target: 10, xp: 50 },
            { type: 'learn_words', title: '5 kelime öğren', target: 5, xp: 30 },
            { type: 'review_words', title: '10 kelime tekrar et', target: 10, xp: 40 },
            { type: 'complete_content', title: '1 içerik tamamla', target: 1, xp: 75 },
            { type: 'create_content', title: 'Yeni içerik oluştur', target: 1, xp: 100 },
            { type: 'listen_content', title: 'İçerik dinle', target: 1, xp: 50 },
            { type: 'complete_quiz', title: 'Quiz tamamla', target: 1, xp: 50 },
        ];

        // Rastgele 2-3 görev seç
        const selectedQuests = questTemplates.sort(() => Math.random() - 0.5).slice(0, 3);

        for (const quest of selectedQuests) {
            await db.query(`
                INSERT INTO daily_quests (user_id, quest_date, task_type, task_title, target_amount, xp_reward)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [userId, today, quest.type, quest.title, quest.target, quest.xp]);
        }

        return (await db.query(
            'SELECT * FROM daily_quests WHERE user_id = $1 AND quest_date = $2',
            [userId, today]
        )).rows;
    }

    /**
     * Günlük görev ilerlemesi güncelle
     */
    async updateDailyQuestProgress(userId, taskType, incrementAmount = 1) {
        const today = new Date().toISOString().split('T')[0];

        const result = await db.query(`
            UPDATE daily_quests 
            SET 
                current_amount = LEAST(current_amount + $3, target_amount),
                is_completed = (current_amount + $3 >= target_amount)
            WHERE user_id = $1 AND quest_date = $2 AND task_type = $4 AND is_claimed = false
            RETURNING *
        `, [userId, today, incrementAmount, taskType]);

        if (result.rows.length > 0 && result.rows[0].is_completed && !result.rows[0].is_claimed) {
            // Otomatik claim
            await this.claimDailyQuest(userId, result.rows[0].id);
        }

        return result.rows[0];
    }

    /**
     * Günlük görev ödülünü al
     */
    async claimDailyQuest(userId, questId) {
        const quest = await db.query(
            'SELECT * FROM daily_quests WHERE id = $1 AND user_id = $2 AND is_completed = true AND is_claimed = false',
            [questId, userId]
        );

        if (quest.rows.length === 0) {
            return { success: false, message: 'Görev bulunamadı veya zaten alındı' };
        }

        // Ödülü işaretle
        await db.query(
            'UPDATE daily_quests SET is_claimed = true WHERE id = $1',
            [questId]
        );

        // XP ekle
        const xpResult = await this.addXP(
            userId,
            quest.rows[0].xp_reward,
            'daily_quest',
            questId,
            `Günlük görev: ${quest.rows[0].task_title}`
        );

        return { success: true, xpEarned: quest.rows[0].xp_reward, ...xpResult };
    }

    // ============================================
    // USER PROFILE
    // ============================================

    /**
     * Kullanıcı gamification profilini getir veya oluştur
     */
    async getOrCreateProfile(userId, client = null) {
        const conn = client || db;

        let result = await conn.query(
            'SELECT * FROM user_gamification WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            await conn.query(
                'INSERT INTO user_gamification (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
                [userId]
            );
            result = await conn.query(
                'SELECT * FROM user_gamification WHERE user_id = $1',
                [userId]
            );
        }

        return result.rows[0];
    }

    /**
     * Tam kullanıcı stats getir (Dashboard için)
     */
    async getFullStats(userId) {
        const profile = await this.getOrCreateProfile(userId);
        const achievements = await this.getAchievements(userId);
        const dailyQuests = await this.getDailyQuests(userId);

        const earnedCount = achievements.filter(a => a.is_earned).length;
        const totalCount = achievements.length;

        return {
            // Level & XP
            level: profile.current_level,
            totalXP: profile.total_lifetime_xp,
            currentLevelXP: profile.current_xp,
            xpForNextLevel: this.getXPForNextLevel(profile.current_level),
            levelProgress: profile.current_xp / this.getXPForNextLevel(profile.current_level),

            // Streak
            streak: profile.streak_count,
            longestStreak: profile.longest_streak,
            freezeBalance: profile.freeze_balance,
            lastActivityDate: profile.last_activity_date,

            // Archetype
            archetype: profile.archetype,
            onboardingCompleted: profile.onboarding_completed,

            // Achievements
            achievementProgress: `${earnedCount}/${totalCount}`,
            recentAchievements: achievements.filter(a => a.is_earned).slice(-3),

            // Daily Quests
            dailyQuests,
            dailyQuestsCompleted: dailyQuests.filter(q => q.is_completed).length,
        };
    }

    /**
     * CEFR seviyesini Level'e çevir
     */
    cefrToLevelRange(cefr) {
        const mapping = {
            'A1': [1, 10],
            'A2': [11, 25],
            'B1': [26, 45],
            'B2': [46, 65],
            'C1': [66, 85],
            'C2': [86, 100]
        };
        return mapping[cefr] || [1, 10];
    }

    /**
     * Level'i CEFR'e çevir
     */
    levelToCEFR(level) {
        if (level <= 10) return 'A1';
        if (level <= 25) return 'A2';
        if (level <= 45) return 'B1';
        if (level <= 65) return 'B2';
        if (level <= 85) return 'C1';
        return 'C2';
    }
}

module.exports = new GamificationService();
