/**
 * 🎯 Sector Recommendation Service
 *
 * Akıllı içerik öneri sistemi - Kullanıcının sektör İngilizcesi yolculuğu için
 * kişiselleştirilmiş içerik ve kelime önerileri sunar.
 *
 * Faktörler:
 * - CEFR seviyesi
 * - İlerleme durumu (tamamlanan, devam eden)
 * - Öğrenme kalıpları (tercih edilen içerik türleri)
 * - Tekrar gereken kelimeler (SRS)
 * - Sektör hedefleri
 * - Günlük/haftalık aktivite
 *
 * @author Senior Architect
 * @created 2026-01-24
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');

// Öneri ağırlıkları
const WEIGHTS = {
    LEVEL_MATCH: 30,           // CEFR seviye uyumu
    PROGRESS_CONTINUATION: 25, // Devam eden içerik
    TYPE_PREFERENCE: 15,       // Tercih edilen içerik türü
    RECENCY: 10,              // Yeni içerikler
    POPULARITY: 10,           // Popüler içerikler
    DIFFICULTY_PROGRESSION: 10 // Zorluk artışı
};

// İçerik türü öncelikleri (yeni kullanıcılar için)
const DEFAULT_TYPE_ORDER = [
    'sector_article',
    'vocabulary_focus',
    'business_roleplay',
    'sector_podcast',
    'quiz'
];

class SectorRecommendationService {

    /**
     * Kullanıcı için kişiselleştirilmiş içerik önerileri
     * @param {string} userId
     * @param {number} sectorId
     * @param {Object} options - { limit, excludeIds, contentTypes }
     */
    async getRecommendations(userId, sectorId, options = {}) {
        try {
            const { limit = 5, excludeIds = [], contentTypes = null } = options;

            // Kullanıcı profilini ve tercihlerini al
            const userProfile = await this.getUserProfile(userId, sectorId);

            // Tüm uygun içerikleri al
            const allContent = await this.getAvailableContent(sectorId, excludeIds, contentTypes);

            if (allContent.length === 0) {
                return [];
            }

            // Her içerik için skor hesapla
            const scoredContent = allContent.map(content => ({
                ...content,
                score: this.calculateScore(content, userProfile)
            }));

            // Skora göre sırala ve limit uygula
            const recommendations = scoredContent
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

            // Öneri nedenlerini ekle
            return recommendations.map(rec => ({
                ...rec,
                recommendation_reason: this.getRecommendationReason(rec, userProfile)
            }));

        } catch (error) {
            logger.error('[Recommendation] getRecommendations error:', error);
            return [];
        }
    }

    /**
     * Kullanıcının "Şimdi Çalış" için en uygun içerik
     */
    async getNextBestContent(userId, sectorId) {
        try {
            // Önce devam eden içerik var mı?
            const inProgress = await this.getInProgressContent(userId, sectorId);
            if (inProgress) {
                return {
                    type: 'continue',
                    content: inProgress,
                    reason: 'Kaldığın yerden devam et'
                };
            }

            // Tekrar gereken kelimeler var mı?
            const dueVocab = await this.getDueVocabulary(userId, sectorId);
            if (dueVocab.length >= 5) {
                return {
                    type: 'vocabulary_review',
                    words: dueVocab.slice(0, 10),
                    reason: `${dueVocab.length} kelime tekrar bekliyor`
                };
            }

            // Yeni içerik öner
            const recommendations = await this.getRecommendations(userId, sectorId, { limit: 1 });
            if (recommendations.length > 0) {
                return {
                    type: 'new_content',
                    content: recommendations[0],
                    reason: recommendations[0].recommendation_reason
                };
            }

            return null;

        } catch (error) {
            logger.error('[Recommendation] getNextBestContent error:', error);
            return null;
        }
    }

    /**
     * Öğrenme yolu önerileri (path suggestions)
     */
    async getLearningPath(userId, sectorId, options = {}) {
        try {
            const { maxSteps = 5 } = options;

            const userProfile = await this.getUserProfile(userId, sectorId);
            const completedIds = userProfile.completedContentIds || [];

            // Modülleri ve içerikleri al
            const modules = await db.query(`
                SELECT
                    sm.id as module_id,
                    sm.name_tr as module_name,
                    sm.order_index as module_order,
                    sc.id as content_id,
                    sc.title,
                    sc.content_type,
                    sc.difficulty_level,
                    sc.cefr_level,
                    sc.estimated_time,
                    sc.xp_reward,
                    sc.order_index as content_order,
                    CASE
                        WHEN uscp.status = 'completed' THEN 'completed'
                        WHEN uscp.status = 'in_progress' THEN 'in_progress'
                        ELSE 'not_started'
                    END as status
                FROM sector_modules sm
                LEFT JOIN sector_content sc ON sc.module_id = sm.id AND sc.status = 'published'
                LEFT JOIN user_sector_content_progress uscp ON uscp.content_id = sc.id AND uscp.user_id = $1
                WHERE sm.sector_id = $2
                ORDER BY sm.order_index, sc.order_index
            `, [userId, sectorId]);

            // Kullanıcının seviyesine uygun ilk tamamlanmamış içerikleri al
            const pathSteps = [];
            let addedCount = 0;

            for (const item of modules.rows) {
                if (addedCount >= maxSteps) break;

                if (item.content_id && item.status !== 'completed') {
                    // Seviye kontrolü
                    if (this.isLevelAppropriate(item.cefr_level, userProfile.cefrLevel)) {
                        pathSteps.push({
                            id: item.content_id,
                            title: item.title,
                            content_type: item.content_type,
                            difficulty_level: item.difficulty_level,
                            cefr_level: item.cefr_level,
                            estimated_time: item.estimated_time,
                            xp_reward: item.xp_reward,
                            module_name: item.module_name,
                            status: item.status,
                            step_number: addedCount + 1,
                            is_next: addedCount === 0
                        });
                        addedCount++;
                    }
                }
            }

            return {
                steps: pathSteps,
                total_remaining: modules.rows.filter(m => m.status !== 'completed').length,
                user_level: userProfile.cefrLevel,
                completion_percentage: userProfile.contentProgress || 0
            };

        } catch (error) {
            logger.error('[Recommendation] getLearningPath error:', error);
            return { steps: [], total_remaining: 0 };
        }
    }

    /**
     * Kelime öğrenme önerileri
     */
    async getVocabularyRecommendations(userId, sectorId, options = {}) {
        try {
            const { limit = 10, mode = 'mixed' } = options;

            // Tekrar gereken kelimeler
            const dueWords = await this.getDueVocabulary(userId, sectorId);

            // Yeni öğrenilecek kelimeler
            const newWords = await this.getNewVocabulary(userId, sectorId, limit);

            if (mode === 'review') {
                return {
                    type: 'review',
                    words: dueWords.slice(0, limit),
                    total_due: dueWords.length
                };
            }

            if (mode === 'new') {
                return {
                    type: 'new',
                    words: newWords.slice(0, limit),
                    total_new: newWords.length
                };
            }

            // Mixed mode: önce tekrar, sonra yeni
            const reviewCount = Math.min(dueWords.length, Math.floor(limit * 0.6));
            const newCount = limit - reviewCount;

            return {
                type: 'mixed',
                review_words: dueWords.slice(0, reviewCount),
                new_words: newWords.slice(0, newCount),
                total_due: dueWords.length,
                total_new: newWords.length
            };

        } catch (error) {
            logger.error('[Recommendation] getVocabularyRecommendations error:', error);
            return { type: 'error', words: [] };
        }
    }

    /**
     * Context-aware vocabulary injection - İçerik için enjekte edilecek kelimeler
     */
    async getVocabularyInjection(userId, sectorId, contentId) {
        try {
            // İçerikle ilişkili kelimeleri al
            const contentVocab = await db.query(`
                SELECT sv.*, usvp.mastery_level, usvp.last_reviewed_at
                FROM sector_vocabulary sv
                LEFT JOIN user_sector_vocab_progress usvp
                    ON usvp.vocabulary_id = sv.id AND usvp.user_id = $1
                WHERE sv.sector_id = $2
                ORDER BY
                    CASE WHEN usvp.mastery_level IS NULL THEN 0 ELSE usvp.mastery_level END ASC,
                    sv.frequency_rank DESC
                LIMIT 5
            `, [userId, sectorId]);

            // Tekrar gereken kelimeleri ekle
            const dueWords = await this.getDueVocabulary(userId, sectorId);
            const dueToInject = dueWords.slice(0, 3);

            return {
                focus_words: contentVocab.rows,
                review_words: dueToInject,
                total_injection: contentVocab.rows.length + dueToInject.length
            };

        } catch (error) {
            logger.error('[Recommendation] getVocabularyInjection error:', error);
            return { focus_words: [], review_words: [], total_injection: 0 };
        }
    }

    /**
     * Günlük öneri özeti
     */
    async getDailySummary(userId, sectorId) {
        try {
            const [
                nextContent,
                dueVocab,
                learningPath,
                todayProgress
            ] = await Promise.all([
                this.getNextBestContent(userId, sectorId),
                this.getDueVocabulary(userId, sectorId),
                this.getLearningPath(userId, sectorId, { maxSteps: 3 }),
                this.getTodayProgress(userId, sectorId)
            ]);

            return {
                greeting: this.getGreeting(),
                next_action: nextContent,
                vocabulary_due: dueVocab.length,
                learning_path: learningPath.steps,
                today_stats: todayProgress,
                motivational_message: this.getMotivationalMessage(todayProgress)
            };

        } catch (error) {
            logger.error('[Recommendation] getDailySummary error:', error);
            return null;
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Kullanıcı profili ve tercihlerini al
     */
    async getUserProfile(userId, sectorId) {
        try {
            // Temel profil bilgileri
            const profileResult = await db.query(`
                SELECT
                    gp.current_level,
                    gp.archetype,
                    gp.assessed_cefr,
                    gp.target_cefr,
                    usp.vocabulary_goal,
                    usp.content_goal,
                    usp.sector_daily_minutes
                FROM gamification_profiles gp
                LEFT JOIN user_sector_preferences usp ON usp.user_id = gp.user_id
                WHERE gp.user_id = $1
            `, [userId]);

            // İçerik türü tercihleri (en çok tamamlanan)
            const typePreferences = await db.query(`
                SELECT sc.content_type, COUNT(*) as count
                FROM user_sector_content_progress uscp
                JOIN sector_content sc ON sc.id = uscp.content_id
                WHERE uscp.user_id = $1 AND uscp.status = 'completed'
                GROUP BY sc.content_type
                ORDER BY count DESC
            `, [userId]);

            // Tamamlanan içerik ID'leri
            const completedResult = await db.query(`
                SELECT content_id FROM user_sector_content_progress
                WHERE user_id = $1 AND status = 'completed'
            `, [userId]);

            // İçerik ilerleme yüzdesi
            const progressResult = await db.query(`
                SELECT
                    COUNT(*) FILTER (WHERE uscp.status = 'completed') as completed,
                    COUNT(*) as total
                FROM sector_content sc
                LEFT JOIN user_sector_content_progress uscp
                    ON uscp.content_id = sc.id AND uscp.user_id = $1
                WHERE sc.sector_id = $2 AND sc.status = 'published'
            `, [userId, sectorId]);

            const profile = profileResult.rows[0] || {};
            const progress = progressResult.rows[0] || {};

            return {
                cefrLevel: profile.assessed_cefr || 'A2',
                targetCefr: profile.target_cefr || 'B2',
                archetype: profile.archetype || 'career',
                vocabularyGoal: profile.vocabulary_goal || 50,
                contentGoal: profile.content_goal || 5,
                dailyMinutes: profile.sector_daily_minutes || 15,
                typePreferences: typePreferences.rows.map(t => t.content_type),
                completedContentIds: completedResult.rows.map(r => r.content_id),
                contentProgress: progress.total > 0
                    ? Math.round((progress.completed / progress.total) * 100)
                    : 0
            };

        } catch (error) {
            logger.error('[Recommendation] getUserProfile error:', error);
            return {
                cefrLevel: 'A2',
                targetCefr: 'B2',
                archetype: 'career',
                typePreferences: [],
                completedContentIds: [],
                contentProgress: 0
            };
        }
    }

    /**
     * Mevcut içerikleri al
     */
    async getAvailableContent(sectorId, excludeIds = [], contentTypes = null) {
        try {
            let query = `
                SELECT
                    sc.*,
                    COALESCE(sc.read_count, 0) + COALESCE(sc.listen_count, 0) as popularity
                FROM sector_content sc
                WHERE sc.sector_id = $1 AND sc.status = 'published'
            `;

            const params = [sectorId];
            let paramIndex = 2;

            if (excludeIds.length > 0) {
                query += ` AND sc.id != ALL($${paramIndex})`;
                params.push(excludeIds);
                paramIndex++;
            }

            if (contentTypes && contentTypes.length > 0) {
                query += ` AND sc.content_type = ANY($${paramIndex})`;
                params.push(contentTypes);
            }

            query += ` ORDER BY sc.created_at DESC`;

            const result = await db.query(query, params);
            return result.rows;

        } catch (error) {
            logger.error('[Recommendation] getAvailableContent error:', error);
            return [];
        }
    }

    /**
     * İçerik skoru hesapla
     */
    calculateScore(content, userProfile) {
        let score = 0;

        // 1. CEFR seviye uyumu
        const levelScore = this.getLevelScore(content.cefr_level, userProfile.cefrLevel);
        score += levelScore * (WEIGHTS.LEVEL_MATCH / 100);

        // 2. İçerik türü tercihi
        const typeIndex = userProfile.typePreferences.indexOf(content.content_type);
        if (typeIndex !== -1) {
            score += (10 - typeIndex) * (WEIGHTS.TYPE_PREFERENCE / 100);
        } else {
            // Varsayılan sıralama
            const defaultIndex = DEFAULT_TYPE_ORDER.indexOf(content.content_type);
            if (defaultIndex !== -1) {
                score += (5 - defaultIndex) * (WEIGHTS.TYPE_PREFERENCE / 200);
            }
        }

        // 3. Popülerlik
        const popularity = content.popularity || 0;
        score += Math.min(popularity / 10, 10) * (WEIGHTS.POPULARITY / 100);

        // 4. Yenilik (son 7 gün)
        const daysSinceCreation = this.daysSince(content.created_at);
        if (daysSinceCreation < 7) {
            score += (7 - daysSinceCreation) * (WEIGHTS.RECENCY / 100);
        }

        // 5. Zorluk ilerleme bonusu (kullanıcı seviyesinin biraz üstü)
        if (this.isSlightlyHarder(content.cefr_level, userProfile.cefrLevel)) {
            score += 5 * (WEIGHTS.DIFFICULTY_PROGRESSION / 100);
        }

        return Math.round(score * 100) / 100;
    }

    /**
     * Seviye skoru hesapla
     */
    getLevelScore(contentLevel, userLevel) {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const contentIdx = levels.indexOf(contentLevel);
        const userIdx = levels.indexOf(userLevel);

        if (contentIdx === -1 || userIdx === -1) return 5;

        const diff = Math.abs(contentIdx - userIdx);

        // Aynı seviye: 10 puan
        // 1 seviye fark: 8 puan
        // 2 seviye fark: 5 puan
        // 3+ seviye fark: 2 puan
        if (diff === 0) return 10;
        if (diff === 1) return 8;
        if (diff === 2) return 5;
        return 2;
    }

    /**
     * Seviye uygunluğu kontrolü
     */
    isLevelAppropriate(contentLevel, userLevel) {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const contentIdx = levels.indexOf(contentLevel);
        const userIdx = levels.indexOf(userLevel);

        if (contentIdx === -1 || userIdx === -1) return true;

        // Kullanıcının 1 seviye altından 2 seviye üstüne kadar uygun
        return contentIdx >= userIdx - 1 && contentIdx <= userIdx + 2;
    }

    /**
     * İçerik biraz daha zor mu?
     */
    isSlightlyHarder(contentLevel, userLevel) {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const contentIdx = levels.indexOf(contentLevel);
        const userIdx = levels.indexOf(userLevel);

        return contentIdx === userIdx + 1;
    }

    /**
     * Öneri nedeni oluştur
     */
    getRecommendationReason(content, userProfile) {
        const reasons = [];

        // Seviye uyumu
        if (content.cefr_level === userProfile.cefrLevel) {
            reasons.push('Senin seviyene uygun');
        } else if (this.isSlightlyHarder(content.cefr_level, userProfile.cefrLevel)) {
            reasons.push('Kendini biraz zorlayacak');
        }

        // Tercih edilen tür
        if (userProfile.typePreferences.includes(content.content_type)) {
            reasons.push('Sık tercih ettiğin tür');
        }

        // Yeni içerik
        if (this.daysSince(content.created_at) < 7) {
            reasons.push('Yeni eklendi');
        }

        // Popüler
        if ((content.popularity || 0) > 50) {
            reasons.push('Popüler içerik');
        }

        return reasons.length > 0 ? reasons[0] : 'Senin için önerildi';
    }

    /**
     * Devam eden içerik
     */
    async getInProgressContent(userId, sectorId) {
        try {
            const result = await db.query(`
                SELECT sc.*, uscp.progress_percentage, uscp.last_position_seconds
                FROM user_sector_content_progress uscp
                JOIN sector_content sc ON sc.id = uscp.content_id
                WHERE uscp.user_id = $1
                    AND sc.sector_id = $2
                    AND uscp.status = 'in_progress'
                ORDER BY uscp.updated_at DESC
                LIMIT 1
            `, [userId, sectorId]);

            return result.rows[0] || null;

        } catch (error) {
            logger.error('[Recommendation] getInProgressContent error:', error);
            return null;
        }
    }

    /**
     * Tekrar gereken kelimeler
     */
    async getDueVocabulary(userId, sectorId) {
        try {
            const result = await db.query(`
                SELECT sv.*, usvp.mastery_level, usvp.review_count, usvp.next_review_at
                FROM user_sector_vocab_progress usvp
                JOIN sector_vocabulary sv ON sv.id = usvp.vocabulary_id
                WHERE usvp.user_id = $1
                    AND sv.sector_id = $2
                    AND usvp.next_review_at <= NOW()
                ORDER BY usvp.next_review_at ASC
            `, [userId, sectorId]);

            return result.rows;

        } catch (error) {
            logger.error('[Recommendation] getDueVocabulary error:', error);
            return [];
        }
    }

    /**
     * Yeni öğrenilecek kelimeler
     */
    async getNewVocabulary(userId, sectorId, limit = 10) {
        try {
            const result = await db.query(`
                SELECT sv.*
                FROM sector_vocabulary sv
                LEFT JOIN user_sector_vocab_progress usvp
                    ON usvp.vocabulary_id = sv.id AND usvp.user_id = $1
                WHERE sv.sector_id = $2 AND usvp.id IS NULL
                ORDER BY sv.frequency_rank DESC, sv.id
                LIMIT $3
            `, [userId, sectorId, limit]);

            return result.rows;

        } catch (error) {
            logger.error('[Recommendation] getNewVocabulary error:', error);
            return [];
        }
    }

    /**
     * Bugünkü ilerleme
     */
    async getTodayProgress(userId, sectorId) {
        try {
            const today = new Date().toISOString().split('T')[0];

            const result = await db.query(`
                SELECT
                    COUNT(*) FILTER (WHERE uscp.status = 'completed' AND uscp.completed_at::date = $3) as content_completed,
                    COUNT(*) FILTER (WHERE usvp.last_reviewed_at::date = $3) as words_reviewed
                FROM sector_content sc
                LEFT JOIN user_sector_content_progress uscp ON uscp.content_id = sc.id AND uscp.user_id = $1
                LEFT JOIN sector_vocabulary sv ON sv.sector_id = sc.sector_id
                LEFT JOIN user_sector_vocab_progress usvp ON usvp.vocabulary_id = sv.id AND usvp.user_id = $1
                WHERE sc.sector_id = $2
            `, [userId, sectorId, today]);

            return {
                content_completed: parseInt(result.rows[0]?.content_completed) || 0,
                words_reviewed: parseInt(result.rows[0]?.words_reviewed) || 0,
                date: today
            };

        } catch (error) {
            logger.error('[Recommendation] getTodayProgress error:', error);
            return { content_completed: 0, words_reviewed: 0 };
        }
    }

    /**
     * Günün saatine göre selamlama
     */
    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Günaydın!';
        if (hour < 18) return 'İyi günler!';
        return 'İyi akşamlar!';
    }

    /**
     * Motivasyon mesajı
     */
    getMotivationalMessage(todayProgress) {
        if (todayProgress.content_completed >= 3) {
            return 'Bugün harika iş çıkardın! 🎉';
        }
        if (todayProgress.content_completed >= 1) {
            return 'İyi gidiyorsun, devam et! 💪';
        }
        if (todayProgress.words_reviewed >= 10) {
            return 'Kelime çalışman mükemmel! 📚';
        }
        return 'Bugün de bir şeyler öğrenmeye hazır mısın? 🚀';
    }

    /**
     * Tarihten bu yana geçen gün
     */
    daysSince(date) {
        if (!date) return 999;
        const then = new Date(date);
        const now = new Date();
        const diffTime = Math.abs(now - then);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
}

module.exports = new SectorRecommendationService();
