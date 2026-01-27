/**
 * 🎮 Gamification Service
 * 
 * Kullanıcı XP, Level, Streak ve Achievement sistemini yönetir.
 * "Hero's Journey" deneyiminin kalbi.
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');
const { sendPushNotification } = require('../utils/notifications/pushNotification.js');

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

    // Sektör İngilizcesi (NEW)
    SECTOR_VOCAB_LEARN: 15,
    SECTOR_VOCAB_MASTER: 30,
    SECTOR_CONTENT_COMPLETE: 50,
    SECTOR_DIALOGUE_COMPLETE: 60,
    SECTOR_QUIZ_COMPLETE: 75,
    SECTOR_QUIZ_PERFECT: 150,
    SECTOR_ROLEPLAY_COMPLETE: 100,
    SECTOR_PODCAST_COMPLETE: 80,
    SECTOR_MODULE_COMPLETE: 200,
    SECTOR_STREAK_BONUS: 25,
};


class GamificationService {
    constructor() {
        this.xpRewards = XP_REWARDS;
    }

    // ============================================
    // XP & LEVEL MANAGEMENT
    // ============================================

    // XP güvenlik sabitleri
    static XP_SECURITY = {
        MAX_XP_PER_CALL: 1000,          // Tek çağrıda max XP (internal)
        MAX_DAILY_XP: 10000,            // Günlük max XP (abuse detection)
        VALID_SOURCES: ['content', 'quiz', 'streak', 'word', 'daily_quest', 'quest', 'onboarding', 'achievement', 'sector', 'manual', 'listening']
    };

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
        // Defense in depth: Internal validation
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            logger.warn(`[Gamification] Invalid XP amount: ${amount} for user ${userId}`);
            throw new Error('Invalid XP amount');
        }

        if (amount > GamificationService.XP_SECURITY.MAX_XP_PER_CALL) {
            logger.warn(`[Gamification] XP amount exceeded internal limit: ${amount} for user ${userId}`);
            amount = GamificationService.XP_SECURITY.MAX_XP_PER_CALL;
        }

        if (source && !GamificationService.XP_SECURITY.VALID_SOURCES.includes(source)) {
            logger.warn(`[Gamification] Invalid XP source: ${source} for user ${userId}`);
            source = 'unknown';
        }

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

            // Update weekly leaderboard score (non-blocking)
            this.updateWeeklyScore(userId, amount, source).catch(() => { });

            // Update challenge progress (non-blocking)
            if (source === 'content') {
                this.updateChallengeProgress(userId, 'listen_content', 1).catch(() => { });
            } else if (source === 'word') {
                this.updateChallengeProgress(userId, 'learn_words', 1).catch(() => { });
            } else if (source === 'quiz') {
                this.updateChallengeProgress(userId, 'complete_quiz', 1).catch(() => { });
            }

            // 🔔 Send notifications (non-blocking)
            // Level Up Notification
            if (leveledUp) {
                sendPushNotification(userId, {
                    title: `🎉 Level ${newLevel} Oldun!`,
                    body: `Tebrikler! ${amount} XP kazandın ve Level ${newLevel}'e ulaştın!`,
                    type: 'level_up',
                    data: { level: newLevel, xpAdded: amount }
                }).catch(err => logger.error('[Gamification] Level notification failed:', err));
            }

            // Achievement Notification
            for (const achievement of earnedAchievements) {
                sendPushNotification(userId, {
                    title: `🏆 ${achievement.title_tr}`,
                    body: achievement.description_tr,
                    type: 'achievement',
                    data: { achievementCode: achievement.code, xpReward: achievement.xp_reward }
                }).catch(err => logger.error('[Gamification] Achievement notification failed:', err));
            }

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

            // 🔔 Send streak notifications (non-blocking)
            if (streakBroken) {
                sendPushNotification(userId, {
                    title: '💔 Streak Kırıldı',
                    body: 'Serin sona erdi, ama bugün yeni bir başlangıç yap!',
                    type: 'streak_broken',
                    data: { previousStreak: profile.streak_count }
                }).catch(err => logger.error('[Gamification] Streak broken notification failed:', err));
            } else if (newStreak === 7 || newStreak === 30 || newStreak === 100) {
                sendPushNotification(userId, {
                    title: `🔥 ${newStreak} Günlük Seri!`,
                    body: `Muhteşem! ${newStreak} gün üst üste çalıştın!`,
                    type: 'streak_milestone',
                    data: { streak: newStreak, bonus: streakBonus }
                }).catch(err => logger.error('[Gamification] Streak milestone notification failed:', err));
            }

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
     * Transaction ile race condition önleme
     */
    async useStreakFreeze(userId) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Pessimistic locking ile profile al
            const result = await client.query(
                'SELECT * FROM user_gamification WHERE user_id = $1 FOR UPDATE',
                [userId]
            );

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, message: 'Kullanıcı bulunamadı' };
            }

            const profile = result.rows[0];

            if (profile.freeze_balance <= 0) {
                await client.query('ROLLBACK');
                return { success: false, message: 'Dondurma hakkınız yok' };
            }

            // Bugün zaten freeze kullanılmış mı kontrol et
            const today = new Date().toISOString().split('T')[0];
            if (profile.last_activity_date === today) {
                await client.query('ROLLBACK');
                return { success: false, message: 'Bugün zaten aktifsiniz, freeze gerekli değil' };
            }

            await client.query(`
                UPDATE user_gamification
                SET freeze_balance = freeze_balance - 1,
                    last_activity_date = CURRENT_DATE,
                    updated_at = NOW()
                WHERE user_id = $1
            `, [userId]);

            await client.query('COMMIT');

            logger.info(`[Gamification] User ${userId} used streak freeze. Remaining: ${profile.freeze_balance - 1}`);

            return {
                success: true,
                message: 'Streak donduruldu!',
                remainingFreezes: profile.freeze_balance - 1
            };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('[Gamification] useStreakFreeze failed:', error);
            throw error;
        } finally {
            client.release();
        }
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
     * Aktif yolculuk quest'ine bağlı görevler oluşturur
     * İlk gün kullanıcıları için dinleme odaklı görevler verir
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

        // Kullanıcının ilk günü mü kontrol et (onboarding sonrası ilk 24 saat)
        let isFirstDay = false;
        try {
            const profileResult = await db.query(`
                SELECT created_at, onboarding_completed
                FROM user_gamification
                WHERE user_id = $1
            `, [userId]);

            if (profileResult.rows.length > 0) {
                const profile = profileResult.rows[0];
                const createdAt = new Date(profile.created_at);
                const now = new Date();
                const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

                // 48 saat içinde ve onboarding tamamlanmışsa ilk gün görevleri ver
                isFirstDay = hoursSinceCreation <= 48 && profile.onboarding_completed;
            }
        } catch (error) {
            logger.warn('[Gamification] Could not check first day status:', error.message);
        }

        // Aktif yolculuk quest'ini al
        let parentQuestNodeId = null;
        let parentTaskType = null;

        try {
            const activeQuest = await db.query(`
                SELECT qn.*
                FROM quest_nodes qn
                JOIN user_quest_progress uqp ON qn.id = uqp.node_id
                WHERE uqp.user_id = $1
                  AND uqp.status IN ('in_progress', 'unlocked')
                ORDER BY qn.step_order ASC
                LIMIT 1
            `, [userId]);

            if (activeQuest.rows.length > 0) {
                parentQuestNodeId = activeQuest.rows[0].id;
                parentTaskType = activeQuest.rows[0].task_type;
            }
        } catch (error) {
            logger.warn('[Gamification] Could not get active quest:', error.message);
        }

        // Kullanıcının primary sektörünü al
        let userSector = null;
        try {
            const sectorService = require('./sectorService');
            userSector = await sectorService.getUserPrimarySector(userId);
        } catch (error) {
            logger.warn('[Gamification] Could not get user sector:', error.message);
        }

        // Quest tipine göre görev şablonları seç (sektör dahil, ilk gün kontrolü)
        const questTemplates = this.getQuestTemplatesForTaskType(parentTaskType, userSector, isFirstDay);

        // İlk gün için tüm görevleri ver, değilse dengeli seç
        const selectedQuests = isFirstDay
            ? questTemplates
            : this.selectBalancedQuests(questTemplates, parentTaskType);

        for (const quest of selectedQuests) {
            await db.query(`
                INSERT INTO daily_quests (
                    user_id, quest_date, task_type, task_title,
                    target_amount, xp_reward, parent_quest_node_id, description
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                userId, today, quest.type, quest.title,
                quest.target, quest.xp,
                quest.relatedToParent ? parentQuestNodeId : null,
                quest.description || null
            ]);
        }

        return (await db.query(
            'SELECT * FROM daily_quests WHERE user_id = $1 AND quest_date = $2',
            [userId, today]
        )).rows;
    }

    /**
     * Task tipine göre görev şablonları
     * @param {string} taskType - Parent quest task type
     * @param {Object|null} userSector - Kullanıcının primary sektörü
     * @param {boolean} isFirstDay - Kullanıcının ilk günü mü (dinleme odaklı görevler için)
     */
    getQuestTemplatesForTaskType(taskType, userSector = null, isFirstDay = false) {
        // 🎧 İlk gün için dinleme odaklı görevler
        // Yeni kullanıcılar önce dinlemeye alışsın, platformu keşfetsin
        if (isFirstDay) {
            return [
                {
                    type: 'listen_minutes',
                    title: 'İlk 5 dakikanı dinle',
                    description: 'Ana sayfaya git ve ilgi alanlarına göre bir içerik seç. "Başla" butonuna tıklayarak dinlemeye başla. Dinlediğin süre otomatik olarak sayılacak.',
                    target: 5,
                    xp: 50,
                    relatedToParent: true
                },
                {
                    type: 'listen_content',
                    title: 'İlk içeriğini seç',
                    description: 'Ana sayfadaki "İçerik Öner" bölümünden sana özel hazırlanan içeriklerden birini seç ve dinlemeye başla.',
                    target: 1,
                    xp: 75,
                    relatedToParent: true
                },
                {
                    type: 'create_content',
                    title: 'İçerik oluştur',
                    description: 'Ana sayfadan "Yeni İçerik Oluştur" butonuna tıkla. İlgi alanlarını seç ve sana özel bir içerik üret.',
                    target: 1,
                    xp: 100,
                    relatedToParent: false
                },
            ];
        }

        // Temel görevler (her zaman dahil) - Açıklamalı
        const baseTemplates = [
            {
                type: 'listen_minutes',
                title: '10 dakika dinle',
                description: 'Ana sayfadan veya içerik sayfalarından bir içerik seç ve dinlemeye başla. Dinlediğin süre otomatik olarak sayılacak.',
                target: 10,
                xp: 50,
                relatedToParent: false
            },
            {
                type: 'listen_content',
                title: 'İçerik dinle',
                description: 'Ana sayfadan veya "İçeriklerim" bölümünden bir içerik seç ve dinlemeye başla.',
                target: 1,
                xp: 50,
                relatedToParent: false
            },
        ];

        // Tip bazlı özel görevler
        const typeSpecificTemplates = {
            vocabulary: [
                {
                    type: 'learn_words',
                    title: '5 kelime öğren',
                    description: 'Kelime Kartları bölümüne git ve "Yeni Kelimeler" sekmesinden yeni kelimeler öğren.',
                    target: 5,
                    xp: 30,
                    relatedToParent: true
                },
                {
                    type: 'review_words',
                    title: '5 kelime tekrar et',
                    description: 'Kelime Kartları bölümündeki "Tekrar Et" sekmesine git ve öğrendiğin kelimeleri tekrar et.',
                    target: 5,
                    xp: 30,
                    relatedToParent: true
                },
            ],
            listen: [
                {
                    type: 'listen_minutes',
                    title: '15 dakika dinle',
                    description: 'Bugün toplam 15 dakika İngilizce içerik dinle. Ana sayfadan veya içerik sayfalarından içerik seç.',
                    target: 15,
                    xp: 75,
                    relatedToParent: true
                },
                {
                    type: 'complete_content',
                    title: '1 içerik tamamla',
                    description: 'Bir içeriği sonuna kadar dinleyerek tamamla. İçerik sayfasında ilerleme çubuğu %100 olduğunda tamamlanmış sayılır.',
                    target: 1,
                    xp: 75,
                    relatedToParent: true
                },
            ],
            quiz: [
                {
                    type: 'complete_quiz',
                    title: 'Quiz tamamla',
                    description: 'Bir içeriği dinledikten sonra içerik sayfasındaki quiz bölümüne git ve quiz\'i tamamla.',
                    target: 1,
                    xp: 50,
                    relatedToParent: true
                },
                {
                    type: 'review_words',
                    title: '10 kelime tekrar et',
                    description: 'Kelime Kartları bölümündeki "Tekrar Et" sekmesine git ve 10 kelimeyi tekrar et.',
                    target: 10,
                    xp: 40,
                    relatedToParent: true
                },
            ],
            milestone: [
                {
                    type: 'complete_content',
                    title: '2 içerik tamamla',
                    description: 'Bugün toplam 2 içeriği sonuna kadar dinleyerek tamamla. Her tamamlanan içerik bu göreve sayılır.',
                    target: 2,
                    xp: 100,
                    relatedToParent: true
                },
                {
                    type: 'learn_words',
                    title: '10 kelime öğren',
                    description: 'Kelime Kartları bölümünden 10 yeni kelime öğren. Her kelimeyi kartla çalıştığında sayılır.',
                    target: 10,
                    xp: 60,
                    relatedToParent: true
                },
            ],
        };

        // Genel görevler (tip belirli değilse)
        const generalTemplates = [
            {
                type: 'learn_words',
                title: '5 kelime öğren',
                description: 'Kelime Kartları bölümüne git ve yeni kelimeler öğren. Her kelimeyi kartla çalıştığında sayılır.',
                target: 5,
                xp: 30,
                relatedToParent: false
            },
            {
                type: 'review_words',
                title: '10 kelime tekrar et',
                description: 'Kelime Kartları bölümündeki "Tekrar Et" sekmesine git ve öğrendiğin kelimeleri tekrar et.',
                target: 10,
                xp: 40,
                relatedToParent: false
            },
            {
                type: 'complete_content',
                title: '1 içerik tamamla',
                description: 'Bir içeriği sonuna kadar dinleyerek tamamla. İçerik sayfasında ilerleme çubuğu %100 olduğunda tamamlanmış sayılır.',
                target: 1,
                xp: 75,
                relatedToParent: false
            },
            {
                type: 'create_content',
                title: 'Yeni içerik oluştur',
                description: 'Ana sayfadan "Yeni İçerik Oluştur" butonuna tıkla ve ilgi alanlarına göre yeni içerik üret.',
                target: 1,
                xp: 100,
                relatedToParent: false
            },
        ];

        // Sektörel görevler (kullanıcının seçtiği sektör varsa)
        const sectorTemplates = [];
        if (userSector) {
            const sectorName = userSector.name_tr || userSector.name || 'Sektör';
            sectorTemplates.push(
                {
                    type: 'sector_vocab',
                    title: `${sectorName} Terimleri (5 kelime)`,
                    description: `Sektörler sayfasına git, ${sectorName} sektörünü seç ve sektörel kelimeleri öğren.`,
                    target: 5,
                    xp: 45,
                    relatedToParent: false,
                    sectorId: userSector.id
                },
                {
                    type: 'sector_content',
                    title: `${sectorName} Makalesi Oku`,
                    description: `Sektörler sayfasından ${sectorName} sektörüne git ve sektörel bir içerik dinle.`,
                    target: 1,
                    xp: 65,
                    relatedToParent: false,
                    sectorId: userSector.id
                },
                {
                    type: 'sector_quiz',
                    title: `${sectorName} Quiz Tamamla`,
                    description: `Sektörler sayfasından ${sectorName} sektöründeki bir içeriğin quiz'ini tamamla.`,
                    target: 1,
                    xp: 80,
                    relatedToParent: false,
                    sectorId: userSector.id
                }
            );
        }

        const specific = typeSpecificTemplates[taskType] || [];
        return [...baseTemplates, ...specific, ...sectorTemplates, ...generalTemplates];
    }

    /**
     * Dengeli görev seçimi
     * En az 2 tanesi parent quest ile ilgili olacak şekilde seçer
     */
    selectBalancedQuests(templates, parentTaskType) {
        const relatedQuests = templates.filter(t => t.relatedToParent);
        const generalQuests = templates.filter(t => !t.relatedToParent);

        const selected = [];
        const usedTypes = new Set();

        // İlgili görevlerden 2 tane (farklı tiplerden)
        const shuffledRelated = relatedQuests.sort(() => Math.random() - 0.5);
        for (const quest of shuffledRelated) {
            if (!usedTypes.has(quest.type) && selected.length < 2) {
                selected.push(quest);
                usedTypes.add(quest.type);
            }
        }

        // Genel görevlerden 1-2 tane (farklı tiplerden)
        const shuffledGeneral = generalQuests.sort(() => Math.random() - 0.5);
        for (const quest of shuffledGeneral) {
            if (!usedTypes.has(quest.type) && selected.length < 4) {
                selected.push(quest);
                usedTypes.add(quest.type);
            }
        }

        // En az 3 görev olsun
        while (selected.length < 3 && shuffledGeneral.length > 0) {
            const quest = shuffledGeneral.pop();
            if (quest && !selected.includes(quest)) {
                selected.push(quest);
            }
        }

        return selected.slice(0, 4); // Maksimum 4 görev
    }

    /**
     * Günlük görev ilerlemesi güncelle
     * Aynı türden birden fazla görev varsa sadece birini günceller:
     * 1. parent_quest_node_id olanlar (roadmap bağlantılı) öncelikli
     * 2. En az ilerleme göstermiş olan
     *
     * Güvenlik: incrementAmount sınırı ve transaction ile idempotency
     */
    async updateDailyQuestProgress(userId, taskType, incrementAmount = 1) {
        // Güvenlik: incrementAmount sınırı
        const MAX_INCREMENT = 100;
        if (incrementAmount > MAX_INCREMENT) {
            logger.warn(`[Gamification] Daily quest increment exceeded: ${incrementAmount} for user ${userId}`);
            incrementAmount = MAX_INCREMENT;
        }

        if (incrementAmount <= 0) {
            return null;
        }

        const today = new Date().toISOString().split('T')[0];
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Önce hedef görevi bul ve kilitle (sadece 1 tane)
            const targetQuest = await client.query(`
                SELECT id, current_amount, target_amount
                FROM daily_quests
                WHERE user_id = $1
                  AND quest_date = $2
                  AND task_type = $3
                  AND is_claimed = false
                  AND current_amount < target_amount
                ORDER BY
                    CASE WHEN parent_quest_node_id IS NOT NULL THEN 0 ELSE 1 END,
                    current_amount ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            `, [userId, today, taskType]);

            if (targetQuest.rows.length === 0) {
                await client.query('COMMIT');
                return null;
            }

            const quest = targetQuest.rows[0];
            const questId = quest.id;

            // 2. Sadece o görevi güncelle
            const result = await client.query(`
                UPDATE daily_quests
                SET
                    current_amount = LEAST(current_amount + $2, target_amount),
                    is_completed = (current_amount + $2 >= target_amount),
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `, [questId, incrementAmount]);

            await client.query('COMMIT');

            if (result.rows.length > 0 && result.rows[0].is_completed && !result.rows[0].is_claimed) {
                // Otomatik claim (transaction dışında)
                await this.claimDailyQuest(userId, result.rows[0].id);
            }

            return result.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('[Gamification] updateDailyQuestProgress failed:', error);
            throw error;
        } finally {
            client.release();
        }
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

        // Get additional data
        let league = null;
        let streakSociety = null;
        let activeChallenges = [];

        try {
            league = await this.getUserLeague(userId);
            streakSociety = await this.getStreakSociety(userId);
            activeChallenges = await this.getUserChallengeProgress(userId);
        } catch (error) {
            // Ignore errors for optional data
        }

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

            // New: League & Society
            league,
            streakSociety,
            activeChallenges,
        };
    }

    // ============================================
    // LEADERBOARD SYSTEM
    // ============================================

    /**
     * Haftalık skor güncelle (XP eklendiğinde çağrılır)
     */
    async updateWeeklyScore(userId, xpAmount, source = null) {
        const weekStart = this.getWeekStart();

        try {
            await db.query(`
                INSERT INTO weekly_scores (user_id, week_start, xp_earned, content_completed, words_learned, listening_minutes)
                VALUES ($1, $2, $3, 
                    CASE WHEN $4 = 'content' THEN 1 ELSE 0 END,
                    CASE WHEN $4 = 'word' THEN 1 ELSE 0 END,
                    CASE WHEN $4 = 'listening' THEN 1 ELSE 0 END
                )
                ON CONFLICT (user_id, week_start) 
                DO UPDATE SET 
                    xp_earned = weekly_scores.xp_earned + $3,
                    content_completed = weekly_scores.content_completed + CASE WHEN $4 = 'content' THEN 1 ELSE 0 END,
                    words_learned = weekly_scores.words_learned + CASE WHEN $4 = 'word' THEN 1 ELSE 0 END,
                    listening_minutes = weekly_scores.listening_minutes + CASE WHEN $4 = 'listening' THEN 1 ELSE 0 END,
                    updated_at = NOW()
            `, [userId, weekStart, xpAmount, source]);
        } catch (error) {
            logger.error('[Gamification] updateWeeklyScore failed:', error);
        }
    }

    /**
     * Haftalık leaderboard getir
     */
    async getLeaderboard(userId, limit = 30) {
        const weekStart = this.getWeekStart();

        try {
            // Önce tüm haftalık skorları sırala
            const result = await db.query(`
                SELECT 
                    ws.user_id,
                    ws.xp_earned,
                    ws.listening_minutes,
                    ws.content_completed,
                    ws.league,
                    u.display_name,
                    u.avatar_url,
                    ug.current_level,
                    ug.streak_count,
                    ROW_NUMBER() OVER (ORDER BY ws.xp_earned DESC, ws.listening_minutes DESC) as rank
                FROM weekly_scores ws
                JOIN users u ON ws.user_id = u.id
                LEFT JOIN user_gamification ug ON ws.user_id = ug.user_id
                WHERE ws.week_start = $1
                ORDER BY ws.xp_earned DESC, ws.listening_minutes DESC
                LIMIT $2
            `, [weekStart, limit]);

            // Kullanıcının kendi sırasını bul
            const userRankResult = await db.query(`
                SELECT rank FROM (
                    SELECT 
                        user_id,
                        ROW_NUMBER() OVER (ORDER BY xp_earned DESC, listening_minutes DESC) as rank
                    FROM weekly_scores
                    WHERE week_start = $1
                ) ranked
                WHERE user_id = $2
            `, [weekStart, userId]);

            const userRank = userRankResult.rows[0]?.rank || null;

            return {
                leaderboard: result.rows,
                userRank,
                weekStart,
                totalParticipants: result.rows.length
            };
        } catch (error) {
            logger.error('[Gamification] getLeaderboard failed:', error);
            return { leaderboard: [], userRank: null, weekStart, totalParticipants: 0 };
        }
    }

    /**
     * Ligleri getir
     */
    async getLeagues() {
        try {
            const result = await db.query(`
                SELECT * FROM leagues ORDER BY rank_order ASC
            `);
            return result.rows;
        } catch (error) {
            logger.error('[Gamification] getLeagues failed:', error);
            return [];
        }
    }

    /**
     * Kullanıcının mevcut ligini getir
     */
    async getUserLeague(userId) {
        try {
            const profile = await this.getOrCreateProfile(userId);
            const leagueCode = profile.current_league || 'seed';

            const result = await db.query(`
                SELECT * FROM leagues WHERE code = $1
            `, [leagueCode]);

            return result.rows[0] || { code: 'seed', name_tr: 'Tohum', icon: '🌱' };
        } catch (error) {
            logger.error('[Gamification] getUserLeague failed:', error);
            return { code: 'seed', name_tr: 'Tohum', icon: '🌱' };
        }
    }

    /**
     * Haftanın başlangıç tarihini al (Pazartesi)
     */
    getWeekStart() {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    // ============================================
    // WEEKLY CHALLENGES
    // ============================================

    /**
     * Aktif weekly challenge'ları getir
     */
    async getActiveChallenges() {
        const today = new Date().toISOString().split('T')[0];

        try {
            const result = await db.query(`
                SELECT * FROM weekly_challenges
                WHERE week_start <= $1 AND week_end >= $1 AND is_active = true
                ORDER BY week_start DESC
            `, [today]);

            return result.rows;
        } catch (error) {
            logger.error('[Gamification] getActiveChallenges failed:', error);
            return [];
        }
    }

    /**
     * Kullanıcının challenge ilerlemesini getir
     */
    async getUserChallengeProgress(userId, challengeId = null) {
        try {
            let query = `
                SELECT 
                    ucp.*,
                    wc.title_tr,
                    wc.title_en,
                    wc.theme,
                    wc.theme_icon,
                    wc.tasks,
                    wc.week_end,
                    wc.total_xp_reward,
                    wc.badge_code
                FROM user_challenge_progress ucp
                JOIN weekly_challenges wc ON ucp.challenge_id = wc.id
                WHERE ucp.user_id = $1
            `;
            const params = [userId];

            if (challengeId) {
                query += ' AND ucp.challenge_id = $2';
                params.push(challengeId);
            }

            query += ' ORDER BY wc.week_start DESC';

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            logger.error('[Gamification] getUserChallengeProgress failed:', error);
            return [];
        }
    }

    /**
     * Challenge'a katıl
     */
    async joinChallenge(userId, challengeId) {
        try {
            // Zaten katılmış mı?
            const existing = await db.query(`
                SELECT 1 FROM user_challenge_progress 
                WHERE user_id = $1 AND challenge_id = $2
            `, [userId, challengeId]);

            if (existing.rows.length > 0) {
                return { success: false, message: 'Zaten bu challenge\'a katıldınız' };
            }

            // Challenge var mı ve aktif mi?
            const challenge = await db.query(`
                SELECT * FROM weekly_challenges 
                WHERE id = $1 AND is_active = true AND week_end >= CURRENT_DATE
            `, [challengeId]);

            if (challenge.rows.length === 0) {
                return { success: false, message: 'Challenge bulunamadı veya süresi dolmuş' };
            }

            // Katıl
            await db.query(`
                INSERT INTO user_challenge_progress (user_id, challenge_id, tasks_progress)
                VALUES ($1, $2, '{}')
            `, [userId, challengeId]);

            logger.info(`[Gamification] User ${userId} joined challenge ${challengeId}`);

            return {
                success: true,
                message: 'Challenge\'a başarıyla katıldınız!',
                challenge: challenge.rows[0]
            };
        } catch (error) {
            logger.error('[Gamification] joinChallenge failed:', error);
            return { success: false, message: 'Bir hata oluştu' };
        }
    }

    /**
     * Challenge görev ilerlemesini güncelle
     * Non-blocking ama logged - retry mekanizması ile
     */
    async updateChallengeProgress(userId, taskType, incrementAmount = 1, retryCount = 0) {
        const MAX_RETRIES = 2;

        try {
            // Güvenlik: incrementAmount sınırı
            if (incrementAmount > 100) incrementAmount = 100;
            if (incrementAmount <= 0) return;

            // Kullanıcının aktif challenge'larını bul
            const activeProgress = await db.query(`
                SELECT ucp.*, wc.tasks
                FROM user_challenge_progress ucp
                JOIN weekly_challenges wc ON ucp.challenge_id = wc.id
                WHERE ucp.user_id = $1
                    AND ucp.is_completed = false
                    AND wc.week_end >= CURRENT_DATE
            `, [userId]);

            for (const progress of activeProgress.rows) {
                const tasks = progress.tasks;
                let tasksProgress = progress.tasks_progress || {};
                let updated = false;

                // İlgili task'ları bul ve güncelle
                tasks.forEach((task, index) => {
                    if (task.type === taskType) {
                        const current = tasksProgress[index] || 0;
                        tasksProgress[index] = Math.min(current + incrementAmount, task.target);
                        updated = true;
                    }
                });

                if (updated) {
                    // Tamamlanan görev sayısını hesapla
                    let completedTasks = 0;
                    let totalXpEarned = 0;

                    tasks.forEach((task, index) => {
                        if ((tasksProgress[index] || 0) >= task.target) {
                            completedTasks++;
                            totalXpEarned += task.xp_reward;
                        }
                    });

                    const isCompleted = completedTasks === tasks.length;

                    await db.query(`
                        UPDATE user_challenge_progress
                        SET 
                            tasks_progress = $1,
                            completed_tasks = $2,
                            total_xp_earned = $3,
                            is_completed = $4,
                            completed_at = CASE WHEN $4 THEN NOW() ELSE NULL END
                        WHERE id = $5
                    `, [JSON.stringify(tasksProgress), completedTasks, totalXpEarned, isCompleted, progress.id]);

                    // İlk challenge tamamlandıysa rozet ver
                    if (isCompleted) {
                        await this.awardAchievement(userId, 'CHALLENGE_FIRST');
                        logger.info(`[Gamification] User ${userId} completed challenge ${progress.challenge_id}`);
                    }
                }
            }
        } catch (error) {
            logger.error(`[Gamification] updateChallengeProgress failed (attempt ${retryCount + 1}):`, error.message);

            // Retry mekanizması
            if (retryCount < MAX_RETRIES) {
                logger.info(`[Gamification] Retrying challenge progress update for user ${userId}...`);
                setTimeout(() => {
                    this.updateChallengeProgress(userId, taskType, incrementAmount, retryCount + 1)
                        .catch(() => { }); // Son retry da başarısız olursa sessizce geç
                }, 1000 * (retryCount + 1)); // Exponential backoff
            }
        }
    }

    // ============================================
    // STREAK SOCIETY
    // ============================================

    /**
     * Streak Society bilgisini getir
     */
    async getStreakSociety(userId) {
        try {
            const profile = await this.getOrCreateProfile(userId);
            const streak = profile.streak_count || 0;

            let society = null;
            let nextMilestone = null;
            let daysToNext = null;

            if (streak >= 100) {
                society = {
                    code: 'legendary',
                    name_tr: 'Efsanevi Kökler',
                    name_en: 'Legendary Roots',
                    icon: '👑',
                    color: '#FFD700'
                };
            } else if (streak >= 30) {
                society = {
                    code: 'month_master',
                    name_tr: 'Ay Ustaları',
                    name_en: 'Month Masters',
                    icon: '🌙',
                    color: '#9333EA'
                };
                nextMilestone = 100;
                daysToNext = 100 - streak;
            } else if (streak >= 7) {
                society = {
                    code: 'week_warrior',
                    name_tr: 'Haftalık Savaşçılar',
                    name_en: 'Week Warriors',
                    icon: '⚔️',
                    color: '#3B82F6'
                };
                nextMilestone = 30;
                daysToNext = 30 - streak;
            } else {
                society = null;
                nextMilestone = 7;
                daysToNext = 7 - streak;
            }

            // Streak Society üye sayıları
            const memberCounts = await db.query(`
                SELECT 
                    streak_society,
                    COUNT(*) as count
                FROM user_gamification
                WHERE streak_society IS NOT NULL
                GROUP BY streak_society
            `);

            return {
                currentStreak: streak,
                society,
                nextMilestone,
                daysToNext,
                memberCounts: memberCounts.rows.reduce((acc, row) => {
                    acc[row.streak_society] = parseInt(row.count);
                    return acc;
                }, {})
            };
        } catch (error) {
            logger.error('[Gamification] getStreakSociety failed:', error);
            return { currentStreak: 0, society: null, nextMilestone: 7, daysToNext: 7 };
        }
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

    // ============================================
    // SECTOR ACHIEVEMENTS (Sektör İngilizcesi)
    // ============================================

    /**
     * Sektör achievement kontrolü
     * @param {string} userId 
     * @param {string} type - 'content' veya 'vocabulary'
     * @param {number} totalCompleted - Toplam tamamlanan sayı
     */
    async checkSectorAchievements(userId, type, totalCompleted) {
        const earned = [];

        if (type === 'content') {
            const contentMilestones = [1, 5, 10, 25, 50, 100];
            const codeMap = {
                1: 'SECTOR_FIRST_CONTENT',
                5: 'SECTOR_5_CONTENTS',
                10: 'SECTOR_10_CONTENTS',
                25: 'SECTOR_25_CONTENTS',
                50: 'SECTOR_50_CONTENTS',
                100: 'SECTOR_100_CONTENTS'
            };

            for (const milestone of contentMilestones) {
                if (totalCompleted >= milestone && codeMap[milestone]) {
                    const achievement = await this.awardAchievement(userId, codeMap[milestone]);
                    if (achievement) earned.push(achievement);
                }
            }
        } else if (type === 'vocabulary') {
            const vocabMilestones = [1, 10, 25, 50, 100, 250];
            const codeMap = {
                1: 'SECTOR_FIRST_VOCAB',
                10: 'SECTOR_VOCAB_10',
                25: 'SECTOR_VOCAB_25',
                50: 'SECTOR_VOCAB_50',
                100: 'SECTOR_VOCAB_100',
                250: 'SECTOR_VOCAB_250'
            };

            for (const milestone of vocabMilestones) {
                if (totalCompleted >= milestone && codeMap[milestone]) {
                    const achievement = await this.awardAchievement(userId, codeMap[milestone]);
                    if (achievement) earned.push(achievement);
                }
            }
        }

        // Multi-sector achievement kontrolü
        try {
            const sectorCountResult = await db.query(`
                SELECT COUNT(DISTINCT sector_id) as sector_count
                FROM user_sector_stats
                WHERE user_id = $1 AND content_completed > 0
            `, [userId]);

            const sectorCount = parseInt(sectorCountResult.rows[0]?.sector_count || 0);

            if (sectorCount >= 2) {
                const achievement = await this.awardAchievement(userId, 'MULTI_SECTOR_2');
                if (achievement) earned.push(achievement);
            }
            if (sectorCount >= 5) {
                const achievement = await this.awardAchievement(userId, 'MULTI_SECTOR_5');
                if (achievement) earned.push(achievement);
            }
        } catch (error) {
            logger.warn('[Gamification] Multi-sector check failed:', error.message);
        }

        return earned;
    }

    /**
     * Quiz achievement kontrolü
     * @param {string} userId 
     * @param {number} totalCompleted - Tamamlanan quiz sayısı
     * @param {boolean} isPerfect - %100 mü?
     */
    async checkQuizAchievements(userId, totalCompleted, isPerfect = false) {
        const earned = [];

        // İlk quiz
        if (totalCompleted >= 1) {
            const achievement = await this.awardAchievement(userId, 'SECTOR_QUIZ_FIRST');
            if (achievement) earned.push(achievement);
        }

        // 10 quiz
        if (totalCompleted >= 10) {
            const achievement = await this.awardAchievement(userId, 'SECTOR_QUIZ_10');
            if (achievement) earned.push(achievement);
        }

        // Mükemmel skor
        if (isPerfect) {
            const achievement = await this.awardAchievement(userId, 'SECTOR_QUIZ_PERFECT');
            if (achievement) earned.push(achievement);
        }

        return earned;
    }
}

module.exports = new GamificationService();


