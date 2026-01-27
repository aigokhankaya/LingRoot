/**
 * 🎯 Sector Gamification Service
 * 
 * Sektör İngilizcesi modülünün gamification sistemiyle entegrasyonunu yönetir.
 * - Sektör bazlı XP kazanımı
 * - Sektör streak takibi
 * - Sektör achievement tetikleme
 * - Context-aware SRS entegrasyonu
 * - Dinamik sektör quest oluşturma
 * 
 * @author Senior Architect
 * @created 2026-01-23
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');
const gamificationService = require('./gamificationService');

// Sektör XP Ödülleri (migration ile senkronize)
const SECTOR_XP_REWARDS = {
    // Vocabulary
    VOCAB_LEARN: 15,
    VOCAB_MASTER: 30,
    VOCAB_REVIEW_CORRECT: 5,

    // Content
    CONTENT_START: 10,
    CONTENT_COMPLETE: 50,
    DIALOGUE_COMPLETE: 60,

    // Quiz
    QUIZ_COMPLETE: 75,
    QUIZ_PERFECT: 150,
    QUIZ_PASS: 50,

    // Roleplay
    ROLEPLAY_COMPLETE: 100,
    ROLEPLAY_EXCELLENT: 175,

    // Podcast
    PODCAST_LISTEN: 40,
    PODCAST_COMPLETE: 80,

    // Module
    MODULE_COMPLETE: 200,
    ALL_MODULES_COMPLETE: 500,

    // Bonuses
    SECTOR_STREAK_BONUS: 25,        // Günlük sektör aktivitesi bonusu
    FIRST_SECTOR_ACTIVITY: 50,      // İlk sektör aktivitesi bonusu
};

class SectorGamificationService {
    constructor() {
        this.xpRewards = SECTOR_XP_REWARDS;
    }

    // ============================================
    // SECTOR XP MANAGEMENT
    // ============================================

    /**
     * Sektör aktivitesi için XP ekle
     * @param {string} userId 
     * @param {string} activityType - 'vocab_learn', 'content_complete', 'quiz_complete', etc.
     * @param {number} sectorId 
     * @param {string} sourceId - İlgili içerik ID
     * @param {Object} metadata - Ek bilgiler (score, duration, etc.)
     */
    async addSectorXP(userId, activityType, sectorId, sourceId = null, metadata = {}) {
        try {
            // XP miktarını belirle
            const xpAmount = this.calculateXP(activityType, metadata);

            if (xpAmount <= 0) {
                return { success: false, message: 'Invalid activity type' };
            }

            // Ana gamification servisine XP ekle
            const xpResult = await gamificationService.addXP(
                userId,
                xpAmount,
                'sector',
                sourceId,
                `Sektör aktivitesi: ${activityType}`
            );

            // Sektör istatistiklerini güncelle
            await this.updateSectorStats(userId, sectorId, activityType, xpAmount);

            // Sektör streak'i güncelle
            const streakResult = await this.updateSectorStreak(userId, sectorId);

            // Daily quest ilerlemesini güncelle
            await this.updateSectorDailyQuests(userId, sectorId, activityType);

            // Achievement kontrolü
            const achievements = await this.checkSectorAchievements(userId, sectorId, activityType, metadata);

            logger.info(`[SectorGamification] User ${userId}: +${xpAmount} XP (${activityType}) in sector ${sectorId}`);

            return {
                success: true,
                xpEarned: xpAmount,
                ...xpResult,
                sectorStreak: streakResult?.currentStreak || 0,
                achievements
            };

        } catch (error) {
            logger.error('[SectorGamification] addSectorXP failed:', error);
            throw error;
        }
    }

    /**
     * Aktivite tipine göre XP hesapla
     */
    calculateXP(activityType, metadata = {}) {
        const xpMap = {
            // Vocabulary
            'vocab_learn': this.xpRewards.VOCAB_LEARN,
            'vocab_master': this.xpRewards.VOCAB_MASTER,
            'vocab_review_correct': this.xpRewards.VOCAB_REVIEW_CORRECT,

            // Content
            'content_start': this.xpRewards.CONTENT_START,
            'content_complete': this.xpRewards.CONTENT_COMPLETE,
            'dialogue_complete': this.xpRewards.DIALOGUE_COMPLETE,

            // Quiz
            'quiz_complete': this.xpRewards.QUIZ_COMPLETE,
            'quiz_perfect': this.xpRewards.QUIZ_PERFECT,
            'quiz_pass': this.xpRewards.QUIZ_PASS,

            // Roleplay
            'roleplay_complete': this.xpRewards.ROLEPLAY_COMPLETE,
            'roleplay_excellent': this.xpRewards.ROLEPLAY_EXCELLENT,

            // Podcast
            'podcast_listen': this.xpRewards.PODCAST_LISTEN,
            'podcast_complete': this.xpRewards.PODCAST_COMPLETE,

            // Module
            'module_complete': this.xpRewards.MODULE_COMPLETE,
            'all_modules_complete': this.xpRewards.ALL_MODULES_COMPLETE,
        };

        let baseXP = xpMap[activityType] || 0;

        // Bonus hesaplamaları
        if (metadata.score && metadata.score >= 100) {
            baseXP = Math.floor(baseXP * 1.5); // Perfect score bonus
        } else if (metadata.score && metadata.score >= 90) {
            baseXP = Math.floor(baseXP * 1.25); // High score bonus
        }

        return baseXP;
    }

    // ============================================
    // SECTOR STATS
    // ============================================

    /**
     * Sektör istatistiklerini güncelle
     */
    async updateSectorStats(userId, sectorId, activityType, xpAmount) {
        const updates = {
            'vocab_learn': { vocabulary_learned: 1 },
            'vocab_master': { vocabulary_learned: 1 },
            'vocab_review_correct': { vocabulary_reviewing: 1 },
            'content_complete': { content_completed: 1 },
            'content_start': { content_in_progress: 1 },
            'dialogue_complete': { content_completed: 1 },
            'podcast_complete': { content_completed: 1 },
        };

        const update = updates[activityType] || {};

        // Her zaman XP ve zaman güncelle
        update.total_xp_earned = xpAmount;
        update.last_activity_at = 'NOW()';

        const setClauses = Object.entries(update)
            .map(([key, val]) => {
                if (val === 'NOW()') return `${key} = NOW()`;
                return `${key} = COALESCE(${key}, 0) + ${val}`;
            })
            .join(', ');

        try {
            await db.query(`
                INSERT INTO user_sector_stats (user_id, sector_id, ${Object.keys(update).join(', ')})
                VALUES ($1, $2, ${Object.values(update).map((v, i) => v === 'NOW()' ? 'NOW()' : `$${i + 3}`).join(', ')})
                ON CONFLICT (user_id, sector_id) 
                DO UPDATE SET ${setClauses}, updated_at = NOW()
            `, [userId, sectorId, ...Object.values(update).filter(v => v !== 'NOW()')]);
        } catch (error) {
            logger.warn('[SectorGamification] updateSectorStats warning:', error.message);
        }
    }

    /**
     * Kullanıcının sektör istatistiklerini getir
     */
    async getSectorStats(userId, sectorId) {
        const result = await db.query(`
            SELECT 
                uss.*,
                s.name_tr as sector_name,
                s.name_en as sector_name_en,
                s.icon as sector_icon,
                s.color as sector_color
            FROM user_sector_stats uss
            JOIN sectors s ON s.id = uss.sector_id
            WHERE uss.user_id = $1 AND uss.sector_id = $2
        `, [userId, sectorId]);

        return result.rows[0] || null;
    }

    /**
     * Kullanıcının tüm sektör istatistiklerini getir
     */
    async getAllSectorStats(userId) {
        const result = await db.query(`
            SELECT 
                uss.*,
                s.name_tr as sector_name,
                s.name_en as sector_name_en,
                s.icon as sector_icon,
                s.color as sector_color,
                (SELECT COUNT(*) FROM sector_vocabulary WHERE sector_id = uss.sector_id) as total_vocabulary,
                (SELECT COUNT(*) FROM sector_content WHERE sector_id = uss.sector_id AND status = 'published') as total_content
            FROM user_sector_stats uss
            JOIN sectors s ON s.id = uss.sector_id
            WHERE uss.user_id = $1
            ORDER BY uss.total_xp_earned DESC
        `, [userId]);

        return result.rows;
    }

    // ============================================
    // SECTOR STREAK
    // ============================================

    /**
     * Sektör streak'i güncelle
     */
    async updateSectorStreak(userId, sectorId) {
        const today = new Date().toISOString().split('T')[0];

        try {
            // Mevcut durumu al
            const current = await db.query(`
                SELECT sector_streak, longest_sector_streak, last_sector_activity_date
                FROM user_sector_stats
                WHERE user_id = $1 AND sector_id = $2
            `, [userId, sectorId]);

            let currentStreak = 0;
            let longestStreak = 0;
            let lastActivity = null;

            if (current.rows.length > 0) {
                currentStreak = current.rows[0].sector_streak || 0;
                longestStreak = current.rows[0].longest_sector_streak || 0;
                lastActivity = current.rows[0].last_sector_activity_date;
            }

            let newStreak = currentStreak;
            let streakBonus = 0;

            if (!lastActivity) {
                // İlk aktivite
                newStreak = 1;
                streakBonus = this.xpRewards.FIRST_SECTOR_ACTIVITY;
            } else {
                const lastDate = new Date(lastActivity);
                const todayDate = new Date(today);
                const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

                if (diffDays === 0) {
                    // Aynı gün, streak değişmez
                } else if (diffDays === 1) {
                    // Ardışık gün
                    newStreak = currentStreak + 1;
                    streakBonus = this.xpRewards.SECTOR_STREAK_BONUS;

                    // Milestone bonusları
                    if (newStreak === 7) streakBonus += 100;
                    if (newStreak === 14) streakBonus += 200;
                    if (newStreak === 30) streakBonus += 500;
                } else {
                    // Streak kırıldı
                    newStreak = 1;
                }
            }

            // Güncelle
            await db.query(`
                UPDATE user_sector_stats
                SET 
                    sector_streak = $3,
                    longest_sector_streak = GREATEST(COALESCE(longest_sector_streak, 0), $3),
                    last_sector_activity_date = $4
                WHERE user_id = $1 AND sector_id = $2
            `, [userId, sectorId, newStreak, today]);

            // Bonus XP ver (varsa)
            if (streakBonus > 0) {
                await gamificationService.addXP(
                    userId,
                    streakBonus,
                    'sector_streak',
                    sectorId.toString(),
                    `Sektör ${newStreak} günlük seri!`
                );
            }

            logger.info(`[SectorGamification] User ${userId}: Sector ${sectorId} streak -> ${newStreak}`);

            return {
                currentStreak: newStreak,
                longestStreak: Math.max(longestStreak, newStreak),
                streakBonus
            };

        } catch (error) {
            logger.error('[SectorGamification] updateSectorStreak failed:', error);
            return null;
        }
    }

    // ============================================
    // SECTOR DAILY QUESTS
    // ============================================

    /**
     * Sektör daily quest ilerlemesini güncelle
     */
    async updateSectorDailyQuests(userId, sectorId, activityType) {
        const today = new Date().toISOString().split('T')[0];

        // Aktivite tipini quest tipine map'le
        const questTypeMap = {
            'vocab_learn': 'sector_vocab',
            'vocab_master': 'sector_vocab',
            'content_complete': 'sector_content',
            'dialogue_complete': 'sector_content',
            'quiz_complete': 'sector_quiz',
            'roleplay_complete': 'sector_roleplay',
            'podcast_complete': 'sector_content',
        };

        const questType = questTypeMap[activityType];
        if (!questType) return;

        try {
            // İlgili günlük görevi bul ve güncelle
            await db.query(`
                UPDATE daily_quests
                SET 
                    current_amount = LEAST(current_amount + 1, target_amount),
                    is_completed = (current_amount + 1 >= target_amount)
                WHERE user_id = $1 
                  AND quest_date = $2 
                  AND task_type = $3
                  AND (sector_id = $4 OR sector_id IS NULL)
                  AND is_claimed = false
                  AND current_amount < target_amount
            `, [userId, today, questType, sectorId]);

            // Tamamlanan görevleri otomatik claim et
            const completed = await db.query(`
                SELECT id, xp_reward FROM daily_quests
                WHERE user_id = $1 
                  AND quest_date = $2
                  AND is_completed = true 
                  AND is_claimed = false
            `, [userId, today]);

            for (const quest of completed.rows) {
                await gamificationService.claimDailyQuest(userId, quest.id);
            }

        } catch (error) {
            logger.warn('[SectorGamification] updateSectorDailyQuests warning:', error.message);
        }
    }

    /**
     * Sektör bazlı günlük görevler oluştur
     */
    async generateSectorDailyQuests(userId, sectorId, count = 2) {
        const today = new Date().toISOString().split('T')[0];

        // Sektör bilgisini al
        let sectorName = 'Sektör';
        try {
            const sectorResult = await db.query(
                'SELECT name_tr FROM sectors WHERE id = $1',
                [sectorId]
            );
            if (sectorResult.rows[0]) {
                sectorName = sectorResult.rows[0].name_tr;
            }
        } catch (e) {
            // ignore
        }

        const sectorQuestTemplates = [
            { type: 'sector_vocab', title: `${sectorName}: 5 terim öğren`, target: 5, xp: 50 },
            { type: 'sector_vocab', title: `${sectorName}: 10 terim tekrar et`, target: 10, xp: 40 },
            { type: 'sector_content', title: `${sectorName} makalesi oku`, target: 1, xp: 60 },
            { type: 'sector_content', title: `${sectorName} diyaloğu dinle`, target: 1, xp: 65 },
            { type: 'sector_quiz', title: `${sectorName} quizi tamamla`, target: 1, xp: 80 },
            { type: 'sector_roleplay', title: `${sectorName} roleplay oyna`, target: 1, xp: 100 },
        ];

        // Rastgele seç
        const shuffled = sectorQuestTemplates.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);

        for (const quest of selected) {
            try {
                await db.query(`
                    INSERT INTO daily_quests (
                        user_id, quest_date, task_type, task_title,
                        target_amount, xp_reward, sector_id, is_sector_related
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, true)
                    ON CONFLICT DO NOTHING
                `, [userId, today, quest.type, quest.title, quest.target, quest.xp, sectorId]);
            } catch (error) {
                logger.warn('[SectorGamification] Insert sector quest failed:', error.message);
            }
        }

        return selected;
    }

    // ============================================
    // SECTOR ACHIEVEMENTS
    // ============================================

    /**
     * Sektör başarımlarını kontrol et
     */
    async checkSectorAchievements(userId, sectorId, activityType, metadata = {}) {
        const earnedAchievements = [];

        try {
            // Mevcut istatistikleri al
            const stats = await this.getSectorStats(userId, sectorId);
            if (!stats) return [];

            // 1. Vocabulary achievements
            if (activityType.startsWith('vocab')) {
                const vocabAchievements = await this.checkVocabAchievements(userId, sectorId, stats);
                earnedAchievements.push(...vocabAchievements);
            }

            // 2. Content achievements
            if (activityType.includes('content') || activityType.includes('dialogue') || activityType.includes('podcast')) {
                const contentAchievements = await this.checkContentAchievements(userId, sectorId, stats);
                earnedAchievements.push(...contentAchievements);
            }

            // 3. Quiz achievements
            if (activityType.includes('quiz') && metadata.score) {
                const quizAchievements = await this.checkQuizAchievements(userId, sectorId, metadata);
                earnedAchievements.push(...quizAchievements);
            }

            // 4. Roleplay achievements
            if (activityType.includes('roleplay')) {
                const roleplayAchievements = await this.checkRoleplayAchievements(userId);
                earnedAchievements.push(...roleplayAchievements);
            }

            // 5. Streak achievements
            if (stats.sector_streak > 0) {
                const streakAchievements = await this.checkSectorStreakAchievements(userId, stats.sector_streak);
                earnedAchievements.push(...streakAchievements);
            }

            // 6. Multi-sector achievements
            const multiSectorAchievements = await this.checkMultiSectorAchievements(userId);
            earnedAchievements.push(...multiSectorAchievements);

        } catch (error) {
            logger.error('[SectorGamification] checkSectorAchievements error:', error);
        }

        return earnedAchievements;
    }

    async checkVocabAchievements(userId, sectorId, stats) {
        const earned = [];
        const vocabCount = stats.vocabulary_learned || 0;

        const milestones = [
            { count: 10, code: 'SECTOR_VOCAB_10' },
            { count: 25, code: 'SECTOR_VOCAB_25' },
            { count: 50, code: 'SECTOR_VOCAB_50' },
            { count: 100, code: 'SECTOR_VOCAB_100' },
            { count: 250, code: 'SECTOR_VOCAB_250' },
        ];

        for (const milestone of milestones) {
            if (vocabCount >= milestone.count) {
                const achievement = await gamificationService.awardAchievement(userId, milestone.code);
                if (achievement) earned.push(achievement);
            }
        }

        return earned;
    }

    async checkContentAchievements(userId, sectorId, stats) {
        const earned = [];
        const contentCount = stats.content_completed || 0;

        const milestones = [
            { count: 1, code: 'SECTOR_FIRST_CONTENT' },
            { count: 5, code: 'SECTOR_5_CONTENTS' },
            { count: 10, code: 'SECTOR_10_CONTENTS' },
            { count: 25, code: 'SECTOR_25_CONTENTS' },
            { count: 50, code: 'SECTOR_50_CONTENTS' },
            { count: 100, code: 'SECTOR_100_CONTENTS' },
        ];

        for (const milestone of milestones) {
            if (contentCount >= milestone.count) {
                const achievement = await gamificationService.awardAchievement(userId, milestone.code);
                if (achievement) earned.push(achievement);
            }
        }

        return earned;
    }

    async checkQuizAchievements(userId, sectorId, metadata) {
        const earned = [];

        // İlk quiz
        const achievement1 = await gamificationService.awardAchievement(userId, 'SECTOR_QUIZ_FIRST');
        if (achievement1) earned.push(achievement1);

        // Perfect score
        if (metadata.score === 100) {
            const achievement2 = await gamificationService.awardAchievement(userId, 'SECTOR_QUIZ_PERFECT');
            if (achievement2) earned.push(achievement2);
        }

        // Quiz sayısını kontrol et
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count FROM user_quiz_results 
                WHERE user_id = $1 AND is_passed = true
            `, [userId]);

            if (result.rows[0]?.count >= 10) {
                const achievement3 = await gamificationService.awardAchievement(userId, 'SECTOR_QUIZ_10');
                if (achievement3) earned.push(achievement3);
            }
        } catch (e) {
            // ignore
        }

        return earned;
    }

    async checkRoleplayAchievements(userId) {
        const earned = [];

        try {
            // Roleplay sayısını al (sector_content where content_type = 'roleplay')
            const result = await db.query(`
                SELECT COUNT(*) as count FROM user_sector_content_progress uscp
                JOIN sector_content sc ON sc.id = uscp.content_id
                WHERE uscp.user_id = $1 AND sc.content_type = 'roleplay' AND uscp.is_completed = true
            `, [userId]);

            const count = result.rows[0]?.count || 0;

            if (count >= 1) {
                const a1 = await gamificationService.awardAchievement(userId, 'ROLEPLAY_FIRST');
                if (a1) earned.push(a1);
            }
            if (count >= 5) {
                const a2 = await gamificationService.awardAchievement(userId, 'ROLEPLAY_5');
                if (a2) earned.push(a2);
            }
            if (count >= 10) {
                const a3 = await gamificationService.awardAchievement(userId, 'ROLEPLAY_10');
                if (a3) earned.push(a3);
            }
        } catch (e) {
            // ignore
        }

        return earned;
    }

    async checkSectorStreakAchievements(userId, streak) {
        const earned = [];
        const milestones = [7, 14, 30];

        for (const milestone of milestones) {
            if (streak >= milestone) {
                const code = `SECTOR_STREAK_${milestone}`;
                const achievement = await gamificationService.awardAchievement(userId, code);
                if (achievement) earned.push(achievement);
            }
        }

        return earned;
    }

    async checkMultiSectorAchievements(userId) {
        const earned = [];

        try {
            // Kaç farklı sektörde 25+ kelime öğrenilmiş?
            const result = await db.query(`
                SELECT COUNT(DISTINCT sector_id) as sector_count
                FROM user_sector_stats
                WHERE user_id = $1 AND vocabulary_learned >= 25
            `, [userId]);

            const sectorCount = result.rows[0]?.sector_count || 0;

            if (sectorCount >= 2) {
                const a1 = await gamificationService.awardAchievement(userId, 'MULTI_SECTOR_2');
                if (a1) earned.push(a1);
            }
            if (sectorCount >= 3) {
                const a2 = await gamificationService.awardAchievement(userId, 'POLYGLOT_PROFESSIONAL_3');
                if (a2) earned.push(a2);
            }
            if (sectorCount >= 5) {
                const a3 = await gamificationService.awardAchievement(userId, 'POLYGLOT_PROFESSIONAL_5');
                if (a3) earned.push(a3);
            }
        } catch (e) {
            // ignore
        }

        return earned;
    }

    // ============================================
    // CONTEXTUAL SRS INTEGRATION
    // ============================================

    /**
     * Kelime maruziyetini kaydet (pasif SRS)
     */
    async logWordExposure(userId, word, sectorId, contentId, contentType, exposureType = 'read', contextSentence = null) {
        try {
            await db.query(`
                INSERT INTO word_exposure_log (user_id, word, sector_id, content_id, content_type, exposure_type, context_sentence)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [userId, word.toLowerCase(), sectorId, contentId, contentType, exposureType, contextSentence]);

            return true;
        } catch (error) {
            logger.warn('[SectorGamification] logWordExposure warning:', error.message);
            return false;
        }
    }

    /**
     * Kullanıcının bugün tekrar etmesi gereken sektör kelimelerini al
     */
    async getTodayReviewWords(userId, sectorId, limit = 10) {
        const today = new Date().toISOString().split('T')[0];

        try {
            const result = await db.query(`
                SELECT DISTINCT sv.word, sv.definition_en, sv.definition_tr, sv.example_sentence
                FROM sector_vocabulary sv
                JOIN user_vocabulary uv ON uv.word_id = sv.id
                LEFT JOIN word_reviews wr ON wr.user_id = $1 AND wr.word = sv.word
                WHERE 
                    sv.sector_id = $2
                    AND (wr.next_review_date IS NULL OR wr.next_review_date <= $3)
                ORDER BY wr.next_review_date ASC NULLS FIRST
                LIMIT $4
            `, [userId, sectorId, today, limit]);

            return result.rows;
        } catch (error) {
            logger.warn('[SectorGamification] getTodayReviewWords warning:', error.message);
            return [];
        }
    }

    /**
     * Kullanıcının öğrendiği sektör kelimelerini al (içerik enjeksiyonu için)
     */
    async getLearnedSectorWords(userId, sectorId, limit = 20) {
        try {
            const result = await db.query(`
                SELECT sv.word, sv.cefr_level
                FROM sector_vocabulary sv
                JOIN user_vocabulary uv ON uv.word_id = sv.id AND uv.user_id = $1
                WHERE sv.sector_id = $2 AND uv.is_learned = true
                ORDER BY uv.created_at DESC
                LIMIT $3
            `, [userId, sectorId, limit]);

            return result.rows.map(r => r.word);
        } catch (error) {
            return [];
        }
    }

    /**
     * İçerik prompt'una kelime enjeksiyonu için context oluştur
     */
    async getVocabularyInjectionContext(userId, sectorId) {
        const reviewWords = await this.getTodayReviewWords(userId, sectorId, 5);
        const learnedWords = await this.getLearnedSectorWords(userId, sectorId, 10);

        return {
            wordsToInclude: reviewWords.map(w => w.word),
            wordsToReinforce: learnedWords.slice(0, 5),
            instructions: reviewWords.length > 0
                ? `IMPORTANT: Include these words naturally in the content: ${reviewWords.map(w => w.word).join(', ')}. Each word should appear at least twice in different contexts.`
                : null
        };
    }

    // ============================================
    // SECTOR QUEST GENERATION
    // ============================================

    /**
     * Kullanıcı için sektör quest'leri oluştur
     */
    async generateSectorQuestsForUser(userId, sectorId) {
        try {
            // Quest template'lerini al
            const templates = await db.query(`
                SELECT * FROM sector_quest_templates 
                WHERE (sector_id = $1 OR sector_id IS NULL) AND is_active = true
                ORDER BY module_order, id
            `, [sectorId]);

            // Sektör bilgisini al
            const sectorResult = await db.query(
                'SELECT name_tr, name_en FROM sectors WHERE id = $1',
                [sectorId]
            );
            const sectorName = sectorResult.rows[0]?.name_tr || 'Sektör';

            let stepOrder = 1;
            let previousNodeId = null;
            const createdQuests = [];

            for (const template of templates.rows) {
                const title = template.title_template.replace('%SECTOR%', sectorName);
                const description = template.description_template?.replace('%SECTOR%', sectorName) || '';

                // Quest node oluştur
                const result = await db.query(`
                    INSERT INTO quest_nodes (
                        title, description, step_order,
                        prerequisite_node_id, reward_xp, task_type,
                        task_subtype, estimated_minutes, is_major_milestone,
                        icon_emoji, sector_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING id
                `, [
                    title,
                    description,
                    stepOrder,
                    previousNodeId,
                    template.reward_xp,
                    template.task_type,
                    template.task_subtype,
                    template.estimated_minutes,
                    template.is_major_milestone,
                    template.icon_emoji,
                    sectorId
                ]);

                const nodeId = result.rows[0].id;

                // User progress oluştur
                const status = stepOrder <= 2 ? 'unlocked' : 'locked';
                await db.query(`
                    INSERT INTO user_quest_progress (user_id, node_id, status, sector_context_id)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (user_id, node_id) DO NOTHING
                `, [userId, nodeId, status, sectorId]);

                createdQuests.push({ id: nodeId, title, status });
                previousNodeId = nodeId;
                stepOrder++;
            }

            logger.info(`[SectorGamification] Created ${createdQuests.length} sector quests for user ${userId} in sector ${sectorId}`);
            return createdQuests;

        } catch (error) {
            logger.error('[SectorGamification] generateSectorQuestsForUser failed:', error);
            throw error;
        }
    }

    // ============================================
    // SECTOR PROGRESS SUMMARY
    // ============================================

    /**
     * Kullanıcının sektör ilerleme özetini getir (Dashboard için)
     */
    async getSectorProgressSummary(userId, sectorId) {
        try {
            const stats = await this.getSectorStats(userId, sectorId) || {};

            // Toplam kelime sayısı
            const vocabTotal = await db.query(
                'SELECT COUNT(*) as count FROM sector_vocabulary WHERE sector_id = $1',
                [sectorId]
            );

            // Toplam içerik sayısı
            const contentTotal = await db.query(
                'SELECT COUNT(*) as count FROM sector_content WHERE sector_id = $1 AND status = $2',
                [sectorId, 'published']
            );

            // Modül ilerlemesi
            const moduleProgress = await db.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE ump.status = 'completed') as completed,
                    COUNT(*) as total
                FROM sector_modules sm
                LEFT JOIN user_module_progress ump ON sm.id = ump.module_id AND ump.user_id = $1
                WHERE sm.sector_id = $2
            `, [userId, sectorId]);

            return {
                // Vocabulary
                vocabulary: {
                    learned: stats.vocabulary_learned || 0,
                    total: vocabTotal.rows[0]?.count || 0,
                    progress: vocabTotal.rows[0]?.count > 0
                        ? Math.round((stats.vocabulary_learned || 0) / vocabTotal.rows[0].count * 100)
                        : 0
                },
                // Content
                content: {
                    completed: stats.content_completed || 0,
                    total: contentTotal.rows[0]?.count || 0,
                    progress: contentTotal.rows[0]?.count > 0
                        ? Math.round((stats.content_completed || 0) / contentTotal.rows[0].count * 100)
                        : 0
                },
                // Modules
                modules: {
                    completed: moduleProgress.rows[0]?.completed || 0,
                    total: moduleProgress.rows[0]?.total || 0,
                    progress: moduleProgress.rows[0]?.total > 0
                        ? Math.round((moduleProgress.rows[0]?.completed || 0) / moduleProgress.rows[0].total * 100)
                        : 0
                },
                // XP & Streak
                totalXP: stats.total_xp_earned || 0,
                sectorStreak: stats.sector_streak || 0,
                longestStreak: stats.longest_sector_streak || 0,
                lastActivity: stats.last_activity_at
            };
        } catch (error) {
            logger.error('[SectorGamification] getSectorProgressSummary failed:', error);
            return null;
        }
    }
}

module.exports = new SectorGamificationService();
