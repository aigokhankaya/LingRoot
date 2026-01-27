/**
 * 🎯 Personalized Recommendation Service
 *
 * Kullanıcıya özel içerik önerileri oluşturur.
 * Dinleme odaklı, tüm veri kaynaklarını birleştirir.
 *
 * Öneri Kategorileri:
 * - continue_listening: Yarım kalan içerikler
 * - level_appropriate: Seviyeye uygun yeni içerikler
 * - based_on_interests: İlgi alanlarına göre öneriler
 * - sector_recommended: Sektör içerikleri
 * - vocabulary_focus: Kelime tekrarı önerileri
 * - similar_users: Benzer kullanıcıların beğenileri
 * - trending: Popüler içerikler
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');

// Lazy-loaded services (circular dependency önleme)
let userEmbeddingService = null;
let userInsightService = null;

const getUserEmbeddingService = () => {
    if (!userEmbeddingService) {
        userEmbeddingService = require('./userEmbeddingService');
    }
    return userEmbeddingService;
};

const getUserInsightService = () => {
    if (!userInsightService) {
        userInsightService = require('./userInsightService');
    }
    return userInsightService;
};

// Kategori ağırlıkları (dinleme odaklı)
const CATEGORY_WEIGHTS = {
    continue_listening: 100,    // En yüksek öncelik
    level_appropriate: 80,
    based_on_interests: 70,
    from_conversations: 65,     // Liro sohbetlerinden
    sector_recommended: 60,
    smart_suggestions: 55,      // AI-powered akıllı öneriler
    vocabulary_focus: 50,
    similar_users: 40,
    trending: 30
};

// CEFR seviye sıralaması
const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

class PersonalizedRecommendationService {
    constructor() {
        this.maxRecommendationsPerCategory = 5;
        this.totalMaxRecommendations = 15;
    }

    /**
     * Kullanıcı için tüm önerileri getir
     * @param {string} userId
     * @param {Object} options - limit, categories, refresh
     */
    async getRecommendations(userId, options = {}) {
        const { limit = 10, categories = null, refresh = false } = options;

        try {
            // Önce cache'den kontrol et
            if (!refresh) {
                const cached = await this.getCachedRecommendations(userId, limit, categories);
                if (cached && cached.length > 0) {
                    return { success: true, data: cached, source: 'cache' };
                }
            }

            // Cache boş veya yenileme istendi - yeni hesapla
            const recommendations = await this.generateRecommendations(userId);

            return {
                success: true,
                data: recommendations.slice(0, limit),
                source: 'generated',
                total: recommendations.length
            };

        } catch (error) {
            logger.error('[PersonalizedRecommendation] getRecommendations error:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    /**
     * Cache'den önerileri getir
     */
    async getCachedRecommendations(userId, limit, categories = null) {
        let query = `
            SELECT *
            FROM user_content_recommendations
            WHERE user_id = $1
              AND is_dismissed = false
              AND expires_at > NOW()
        `;
        const params = [userId];

        if (categories && categories.length > 0) {
            query += ` AND category = ANY($2)`;
            params.push(categories);
        }

        query += ` ORDER BY score DESC, rank ASC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Tüm önerileri hesapla ve kaydet
     */
    async generateRecommendations(userId) {
        logger.info(`[PersonalizedRecommendation] Generating recommendations for user ${userId}`);

        // Kullanıcı verilerini topla
        const userData = await this.gatherUserData(userId);

        if (!userData) {
            logger.warn(`[PersonalizedRecommendation] No user data found for ${userId}`);
            return [];
        }

        // Her kategoriden öneriler oluştur
        const allRecommendations = [];

        // 1. Yarım kalan içerikler (EN ÖNCELİKLİ)
        const continueListening = await this.getContinueListeningRecommendations(userId, userData);
        allRecommendations.push(...continueListening);

        // 2. Seviyeye uygun yeni içerikler
        const levelAppropriate = await this.getLevelAppropriateRecommendations(userId, userData);
        allRecommendations.push(...levelAppropriate);

        // 3. İlgi alanlarına göre
        const basedOnInterests = await this.getInterestBasedRecommendations(userId, userData);
        allRecommendations.push(...basedOnInterests);

        // 4. Sektör içerikleri
        if (userData.sectorId) {
            const sectorRecs = await this.getSectorRecommendations(userId, userData);
            allRecommendations.push(...sectorRecs);
        }

        // 5. Kelime tekrarı
        const vocabRecs = await this.getVocabularyRecommendations(userId, userData);
        allRecommendations.push(...vocabRecs);

        // 6. Benzer kullanıcıların beğenileri (YENİ - ARTIK ÇALIŞIYOR)
        const similarUserRecs = await this.getSimilarUsersRecommendations(userId, userData);
        allRecommendations.push(...similarUserRecs);

        // 7. Liro sohbetlerinden öneriler (YENİ)
        const conversationRecs = await this.getConversationBasedRecommendations(userId, userData);
        allRecommendations.push(...conversationRecs);

        // 8. AI-powered akıllı öneriler (YENİ)
        const smartRecs = await this.getSmartSuggestionRecommendations(userId, userData);
        allRecommendations.push(...smartRecs);

        // 9. Popüler içerikler (trending)
        const trendingRecs = await this.getTrendingRecommendations(userId, userData);
        allRecommendations.push(...trendingRecs);

        // Sırala ve kaydet
        const sortedRecs = this.sortAndRankRecommendations(allRecommendations);
        await this.saveRecommendations(userId, sortedRecs);

        logger.info(`[PersonalizedRecommendation] Generated ${sortedRecs.length} recommendations for user ${userId}`);

        return sortedRecs;
    }

    /**
     * Kullanıcı verilerini topla
     */
    async gatherUserData(userId) {
        try {
            // Temel kullanıcı bilgileri
            const userResult = await db.query(`
                SELECT
                    u.id,
                    u.cefr_level,
                    ug.current_xp,
                    ug.archetype,
                    ug.onboarding_completed
                FROM users u
                LEFT JOIN user_gamification ug ON u.id = ug.user_id
                WHERE u.id = $1
            `, [userId]);

            if (userResult.rows.length === 0) return null;

            const user = userResult.rows[0];

            // Sektör bilgisi
            const sectorResult = await db.query(`
                SELECT sector_id, job_position, is_primary
                FROM user_sectors
                WHERE user_id = $1 AND is_primary = true
                LIMIT 1
            `, [userId]);

            // İlgi alanları (insights)
            const insightsResult = await db.query(`
                SELECT insight_type, insight_value, confidence
                FROM user_insights
                WHERE user_id = $1 AND is_active = true
                ORDER BY confidence DESC
                LIMIT 30
            `, [userId]);

            // Son dinlenen içerikler (tip analizi için)
            const recentContentResult = await db.query(`
                SELECT input_type, COUNT(*) as count
                FROM contenthistory
                WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
                GROUP BY input_type
                ORDER BY count DESC
            `, [userId]);

            // Tamamlanmış içerik ID'leri (tekrar önermemek için)
            // topic_contents'ta user_id yok, topics üzerinden bağlanmalı
            const completedResult = await db.query(`
                SELECT DISTINCT tc.topic_id
                FROM topic_contents tc
                JOIN topics t ON tc.topic_id = t.id
                WHERE t.user_id = $1 AND tc.is_completed = true
            `, [userId]);

            return {
                userId,
                cefrLevel: user.cefr_level || 'B1',
                gamificationLevel: Math.floor((user.current_xp || 0) / 100) + 1, // XP'den seviye hesapla
                archetype: user.archetype,
                onboardingCompleted: user.onboarding_completed,
                sectorId: sectorResult.rows[0]?.sector_id || null,
                jobPosition: sectorResult.rows[0]?.job_position || null,
                insights: this.groupInsights(insightsResult.rows),
                preferredContentTypes: recentContentResult.rows,
                completedContentIds: completedResult.rows.map(r => r.topic_id)
            };

        } catch (error) {
            logger.error('[PersonalizedRecommendation] gatherUserData error:', error);
            return null;
        }
    }

    /**
     * Insight'ları grupla
     */
    groupInsights(insights) {
        const grouped = {
            likes: [],
            dislikes: [],
            goals: [],
            preferences: [],
            habits: []
        };

        for (const insight of insights) {
            if (grouped[insight.insight_type]) {
                grouped[insight.insight_type].push({
                    value: insight.insight_value,
                    confidence: insight.confidence
                });
            }
        }

        return grouped;
    }

    /**
     * 1. Yarım kalan içerikler
     */
    async getContinueListeningRecommendations(userId, userData) {
        try {
            // topic_contents'ta user_id yok, topics üzerinden bağla
            const result = await db.query(`
                SELECT
                    tc.id,
                    tc.topic_id,
                    t.title,
                    t.description,
                    t.level,
                    tc.progress_percentage,
                    tc.last_position_seconds,
                    tc.created_at,
                    tc.duration_seconds
                FROM topic_contents tc
                JOIN topics t ON tc.topic_id = t.id
                WHERE t.user_id = $1
                  AND tc.is_completed = false
                  AND tc.progress_percentage > 5
                  AND tc.progress_percentage < 95
                ORDER BY tc.created_at DESC
                LIMIT $2
            `, [userId, this.maxRecommendationsPerCategory]);

            return result.rows.map((item, index) => ({
                category: 'continue_listening',
                content_type: 'topic',
                content_id: item.topic_id,
                title: item.title,
                description: item.description,
                target_url: `/content/${item.topic_id}`,
                cefr_level: item.level,
                duration_minutes: Math.ceil((item.duration_seconds || 300) / 60),
                reason: `%${Math.round(item.progress_percentage)} tamamladın - kaldığın yerden devam et`,
                reason_key: 'recommendation_continue_listening',
                score: CATEGORY_WEIGHTS.continue_listening - index,
                rank: index + 1,
                source_data: {
                    progress: item.progress_percentage,
                    lastPosition: item.last_position_seconds,
                    lastAccessed: item.created_at
                }
            }));

        } catch (error) {
            logger.error('[PersonalizedRecommendation] getContinueListeningRecommendations error:', error);
            return [];
        }
    }

    /**
     * 2. Seviyeye uygun yeni içerikler
     */
    async getLevelAppropriateRecommendations(userId, userData) {
        try {
            const userLevel = userData.cefrLevel || 'B1';
            const levelIndex = CEFR_ORDER.indexOf(userLevel);

            // Uygun seviyeler: kendi seviyesi + bir alt + bir üst
            const appropriateLevels = [
                CEFR_ORDER[levelIndex - 1],
                userLevel,
                CEFR_ORDER[levelIndex + 1]
            ].filter(Boolean);

            // Tamamlanmamış içerikler hariç
            const excludeIds = userData.completedContentIds.length > 0
                ? userData.completedContentIds
                : ['00000000-0000-0000-0000-000000000000'];

            const result = await db.query(`
                SELECT
                    t.id,
                    t.title,
                    t.description,
                    t.level,
                    t.created_at,
                    t.keywords,
                    tc.duration_seconds
                FROM topics t
                LEFT JOIN topic_contents tc ON t.id = tc.topic_id
                WHERE t.user_id = $1
                  AND t.level = ANY($2)
                  AND t.id != ALL($3)
                  AND tc.mp3_url IS NOT NULL
                ORDER BY t.created_at DESC
                LIMIT $4
            `, [userId, appropriateLevels, excludeIds, this.maxRecommendationsPerCategory]);

            return result.rows.map((item, index) => ({
                category: 'level_appropriate',
                content_type: 'topic',
                content_id: item.id,
                title: item.title,
                description: item.description,
                target_url: `/content/${item.id}`,
                cefr_level: item.level,
                duration_minutes: Math.ceil((item.duration_seconds || 300) / 60),
                reason: `${item.level} seviyesine uygun içerik`,
                reason_key: 'recommendation_level_appropriate',
                score: CATEGORY_WEIGHTS.level_appropriate - index,
                rank: index + 1,
                source_data: {
                    userLevel: userLevel,
                    contentLevel: item.level,
                    keywords: item.keywords
                }
            }));

        } catch (error) {
            logger.error('[PersonalizedRecommendation] getLevelAppropriateRecommendations error:', error);
            return [];
        }
    }

    /**
     * 3. İlgi alanlarına göre öneriler
     */
    async getInterestBasedRecommendations(userId, userData) {
        try {
            const likes = userData.insights?.likes || [];
            if (likes.length === 0) return [];

            // İlgi alanlarından anahtar kelimeler
            const keywords = likes.slice(0, 5).map(l => l.value.toLowerCase());

            // Hobby suggestions tablosundan eşleşen öneriler
            const result = await db.query(`
                SELECT DISTINCT ON (hs.hobby)
                    hs.hobby,
                    hs.suggestions,
                    hs.level
                FROM hobby_suggestions hs
                WHERE LOWER(hs.hobby) = ANY($1)
                   OR hs.hobby ILIKE ANY($2)
                LIMIT $3
            `, [keywords, keywords.map(k => `%${k}%`), this.maxRecommendationsPerCategory]);

            const recommendations = [];

            for (const row of result.rows) {
                // Her hobi için rastgele bir öneri seç
                const suggestions = row.suggestions || [];
                if (suggestions.length > 0) {
                    const randomSuggestion = suggestions[Math.floor(Math.random() * Math.min(5, suggestions.length))];

                    recommendations.push({
                        category: 'based_on_interests',
                        content_type: 'hobby_suggestion',
                        content_id: null,
                        title: randomSuggestion.topic || randomSuggestion,
                        description: `${row.hobby} ile ilgili içerik`,
                        target_url: `/welcome?action=create&topic=${encodeURIComponent(randomSuggestion.topic || randomSuggestion)}`,
                        cefr_level: row.level || userData.cefrLevel,
                        duration_minutes: 10,
                        reason: `"${row.hobby}" ilgi alanına göre`,
                        reason_key: 'recommendation_based_on_interests',
                        score: CATEGORY_WEIGHTS.based_on_interests - recommendations.length,
                        rank: recommendations.length + 1,
                        source_data: {
                            hobby: row.hobby,
                            matchedKeywords: keywords
                        }
                    });
                }
            }

            return recommendations;

        } catch (error) {
            logger.error('[PersonalizedRecommendation] getInterestBasedRecommendations error:', error);
            return [];
        }
    }

    /**
     * 4. Sektör içerikleri
     */
    async getSectorRecommendations(userId, userData) {
        if (!userData.sectorId) return [];

        try {
            // Sektör bilgisi
            const sectorResult = await db.query(
                'SELECT name_tr, name_en, code FROM sectors WHERE id = $1',
                [userData.sectorId]
            );
            const sector = sectorResult.rows[0];
            if (!sector) return [];

            // Sektör içerikleri
            const contentResult = await db.query(`
                SELECT
                    sc.id,
                    sc.title,
                    sc.description,
                    sc.content_type,
                    sc.cefr_level,
                    sc.estimated_minutes
                FROM sector_content sc
                LEFT JOIN user_sector_content_progress uscp
                    ON sc.id = uscp.content_id AND uscp.user_id = $1
                WHERE sc.sector_id = $2
                  AND sc.is_active = true
                  AND (uscp.id IS NULL OR uscp.is_completed = false)
                ORDER BY
                    CASE WHEN sc.cefr_level = $3 THEN 0 ELSE 1 END,
                    sc.created_at DESC
                LIMIT $4
            `, [userId, userData.sectorId, userData.cefrLevel, this.maxRecommendationsPerCategory]);

            return contentResult.rows.map((item, index) => ({
                category: 'sector_recommended',
                content_type: 'sector_content',
                content_id: item.id,
                title: item.title,
                description: item.description,
                target_url: `/sectors/${userData.sectorId}/content/${item.id}`,
                cefr_level: item.cefr_level,
                duration_minutes: item.estimated_minutes || 10,
                reason: `${sector.name_tr} sektörü için önerilen`,
                reason_key: 'recommendation_sector',
                score: CATEGORY_WEIGHTS.sector_recommended - index,
                rank: index + 1,
                source_data: {
                    sectorId: userData.sectorId,
                    sectorName: sector.name_tr,
                    contentType: item.content_type
                }
            }));

        } catch (error) {
            logger.error('[PersonalizedRecommendation] getSectorRecommendations error:', error);
            return [];
        }
    }

    /**
     * 5. Kelime tekrarı önerileri
     */
    async getVocabularyRecommendations(userId, userData) {
        try {
            // Tekrar edilmesi gereken kelime sayısı
            const dueResult = await db.query(`
                SELECT COUNT(*) as due_count
                FROM user_vocabulary
                WHERE user_id = $1
                  AND next_review_at <= NOW()
                  AND status != 'mastered'
            `, [userId]);

            const dueCount = parseInt(dueResult.rows[0]?.due_count || 0);

            if (dueCount < 3) return [];

            return [{
                category: 'vocabulary_focus',
                content_type: 'vocabulary_review',
                content_id: null,
                title: 'Kelime Tekrarı',
                description: `${dueCount} kelime tekrar bekliyor`,
                target_url: '/vocabulary?mode=due',
                cefr_level: userData.cefrLevel,
                duration_minutes: Math.ceil(dueCount * 0.5),
                reason: `${dueCount} kelime bugün tekrar edilmeli`,
                reason_key: 'recommendation_vocabulary',
                score: CATEGORY_WEIGHTS.vocabulary_focus,
                rank: 1,
                source_data: {
                    dueCount,
                    estimatedTime: Math.ceil(dueCount * 0.5)
                }
            }];

        } catch (error) {
            logger.error('[PersonalizedRecommendation] getVocabularyRecommendations error:', error);
            return [];
        }
    }

    /**
     * 6. Popüler/Trending içerikler
     */
    async getTrendingRecommendations(userId, userData) {
        try {
            // Son 7 günde en çok dinlenen içerikler
            const result = await db.query(`
                SELECT
                    t.id,
                    t.title,
                    t.description,
                    t.level,
                    MAX(tc.duration_seconds) as duration_seconds,
                    COUNT(tc.id) as listen_count
                FROM topics t
                JOIN topic_contents tc ON t.id = tc.topic_id
                WHERE tc.created_at > NOW() - INTERVAL '7 days'
                  AND t.user_id != $1
                  AND t.id != ALL($2)
                  AND (t.level = $3 OR t.level = $4 OR t.level = $5)
                GROUP BY t.id, t.title, t.description, t.level
                HAVING COUNT(tc.id) >= 2
                ORDER BY listen_count DESC
                LIMIT $6
            `, [
                userId,
                userData.completedContentIds.length > 0 ? userData.completedContentIds : ['00000000-0000-0000-0000-000000000000'],
                userData.cefrLevel,
                CEFR_ORDER[CEFR_ORDER.indexOf(userData.cefrLevel) - 1] || userData.cefrLevel,
                CEFR_ORDER[CEFR_ORDER.indexOf(userData.cefrLevel) + 1] || userData.cefrLevel,
                this.maxRecommendationsPerCategory
            ]);

            return result.rows.map((item, index) => ({
                category: 'trending',
                content_type: 'topic',
                content_id: item.id,
                title: item.title,
                description: item.description,
                target_url: `/content/${item.id}`,
                cefr_level: item.level,
                duration_minutes: Math.ceil((item.duration_seconds || 300) / 60),
                reason: `${item.listen_count} kişi dinledi`,
                reason_key: 'recommendation_trending',
                score: CATEGORY_WEIGHTS.trending - index,
                rank: index + 1,
                source_data: {
                    listenCount: item.listen_count
                }
            }));

        } catch (error) {
            logger.error('[PersonalizedRecommendation] getTrendingRecommendations error:', error);
            return [];
        }
    }

    /**
     * 7. Benzer kullanıcıların beğendiği içerikler
     * userEmbeddingService entegrasyonu
     */
    async getSimilarUsersRecommendations(userId, userData) {
        try {
            const embeddingService = getUserEmbeddingService();

            // Benzer kullanıcıların beğendiği içerikleri al
            const similarUserContent = await embeddingService.getRecommendationsFromSimilarUsers(userId, 10);

            if (!similarUserContent || similarUserContent.length === 0) {
                logger.debug(`[PersonalizedRecommendation] No similar user recommendations for ${userId}`);
                return [];
            }

            // Zaten tamamlanmış içerikleri filtrele
            const completedIds = userData.completedContentIds || [];
            const filtered = similarUserContent.filter(item =>
                !completedIds.includes(item.topic_id) && !completedIds.includes(item.id)
            );

            return filtered.slice(0, this.maxRecommendationsPerCategory).map((item, index) => ({
                category: 'similar_users',
                content_type: 'topic',
                content_id: item.topic_id || item.id,
                title: item.title || item.input,
                description: `Benzer kullanıcıların beğendiği içerik`,
                target_url: `/content/${item.topic_id || item.id}`,
                cefr_level: item.level || userData.cefrLevel,
                duration_minutes: 10,
                reason: `${item.like_count || 1} benzer kullanıcı beğendi`,
                reason_key: 'recommendation_similar_users',
                score: CATEGORY_WEIGHTS.similar_users - index,
                rank: index + 1,
                source_data: {
                    likeCount: item.like_count || 1,
                    avgRating: item.avg_rating || 1,
                    source: 'user_embedding'
                }
            }));

        } catch (error) {
            logger.error('[PersonalizedRecommendation] getSimilarUsersRecommendations error:', error);
            return [];
        }
    }

    /**
     * 8. Liro sohbetlerinden öneriler
     * Kullanıcının son sohbet konularına dayalı içerik önerileri
     */
    async getConversationBasedRecommendations(userId, userData) {
        try {
            // Son 30 gündeki sohbet konularını al
            const conversationsResult = await db.query(`
                SELECT DISTINCT c.subject, c.updated_at
                FROM conversations c
                WHERE c.user_id = $1
                  AND c.subject IS NOT NULL
                  AND LENGTH(c.subject) > 3
                  AND c.updated_at > NOW() - INTERVAL '30 days'
                ORDER BY c.updated_at DESC
                LIMIT 10
            `, [userId]);

            if (conversationsResult.rows.length === 0) {
                return [];
            }

            const conversationTopics = conversationsResult.rows.map(r => r.subject);
            const recommendations = [];

            // Her sohbet konusu için mevcut içerik ara
            for (const topic of conversationTopics.slice(0, 5)) {
                // Önce kullanıcının mevcut topics'lerinde ara
                // topic_contents'ta user_id yok, sadece topic_id üzerinden bağla
                const existingTopicResult = await db.query(`
                    SELECT t.id, t.title, t.description, t.level, tc.duration_seconds
                    FROM topics t
                    LEFT JOIN topic_contents tc ON t.id = tc.topic_id
                    WHERE t.user_id = $1
                      AND (
                          LOWER(t.title) LIKE LOWER($2)
                          OR LOWER(t.keywords::text) LIKE LOWER($2)
                      )
                      AND (tc.is_completed IS NULL OR tc.is_completed = false)
                      AND tc.mp3_url IS NOT NULL
                    LIMIT 1
                `, [userId, `%${topic.substring(0, 30)}%`]);

                if (existingTopicResult.rows.length > 0) {
                    const item = existingTopicResult.rows[0];
                    recommendations.push({
                        category: 'from_conversations',
                        content_type: 'topic',
                        content_id: item.id,
                        title: item.title,
                        description: item.description,
                        target_url: `/content/${item.id}`,
                        cefr_level: item.level || userData.cefrLevel,
                        duration_minutes: Math.ceil((item.duration_seconds || 300) / 60),
                        reason: `"${topic.substring(0, 25)}..." hakkında konuştun`,
                        reason_key: 'recommendation_from_conversation',
                        score: CATEGORY_WEIGHTS.from_conversations - recommendations.length,
                        rank: recommendations.length + 1,
                        source_data: {
                            conversationTopic: topic,
                            source: 'liro_conversation'
                        }
                    });
                } else {
                    // Mevcut içerik yoksa yeni içerik oluşturma önerisi
                    recommendations.push({
                        category: 'from_conversations',
                        content_type: 'suggestion',
                        content_id: null,
                        title: `${topic.substring(0, 50)}${topic.length > 50 ? '...' : ''}`,
                        description: `Liro ile konuştuğun konuda dinleme içeriği oluştur`,
                        target_url: `/welcome?action=create&topic=${encodeURIComponent(topic)}`,
                        cefr_level: userData.cefrLevel,
                        duration_minutes: 10,
                        reason: `Liro ile "${topic.substring(0, 20)}..." hakkında konuştun`,
                        reason_key: 'recommendation_from_conversation',
                        score: CATEGORY_WEIGHTS.from_conversations - recommendations.length - 2,
                        rank: recommendations.length + 1,
                        source_data: {
                            conversationTopic: topic,
                            source: 'liro_conversation',
                            isNewSuggestion: true
                        }
                    });
                }

                if (recommendations.length >= this.maxRecommendationsPerCategory) break;
            }

            return recommendations;

        } catch (error) {
            logger.error('[PersonalizedRecommendation] getConversationBasedRecommendations error:', error);
            return [];
        }
    }

    /**
     * 9. AI-powered akıllı öneriler
     * userInsightService.generateSmartSuggestions() entegrasyonu
     */
    async getSmartSuggestionRecommendations(userId, userData) {
        try {
            const insightService = getUserInsightService();

            // AI-powered akıllı öneriler oluştur
            const smartSuggestions = await insightService.generateSmartSuggestions(userId);

            if (!smartSuggestions || smartSuggestions.length === 0) {
                logger.debug(`[PersonalizedRecommendation] No smart suggestions for ${userId}`);
                return [];
            }

            return smartSuggestions.slice(0, this.maxRecommendationsPerCategory).map((suggestion, index) => {
                // Öneri tipine göre emoji
                const typeEmoji = {
                    'deep_cut': '🔬',
                    'lateral': '🔀',
                    'foundation': '📚',
                    'challenge': '🚀'
                }[suggestion.type] || '💡';

                return {
                    category: 'smart_suggestions',
                    content_type: 'ai_suggestion',
                    content_id: null,
                    title: suggestion.topic,
                    description: suggestion.reason || 'AI tarafından senin için önerildi',
                    target_url: `/welcome?action=create&topic=${encodeURIComponent(suggestion.topic)}`,
                    cefr_level: userData.cefrLevel,
                    duration_minutes: 10,
                    reason: `${typeEmoji} ${suggestion.connection || 'İlgi alanlarına göre'}`,
                    reason_key: 'recommendation_smart_ai',
                    score: CATEGORY_WEIGHTS.smart_suggestions - index,
                    rank: index + 1,
                    source_data: {
                        suggestionType: suggestion.type,
                        reason: suggestion.reason,
                        connection: suggestion.connection,
                        source: 'ai_insight_service'
                    }
                };
            });

        } catch (error) {
            logger.error('[PersonalizedRecommendation] getSmartSuggestionRecommendations error:', error);
            return [];
        }
    }

    /**
     * Önerileri sırala ve rank ver
     */
    sortAndRankRecommendations(recommendations) {
        // Önce score'a göre sırala
        const sorted = recommendations.sort((a, b) => b.score - a.score);

        // Global rank ver
        return sorted.slice(0, this.totalMaxRecommendations).map((rec, index) => ({
            ...rec,
            global_rank: index + 1
        }));
    }

    /**
     * Önerileri veritabanına kaydet
     */
    async saveRecommendations(userId, recommendations) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // Eski önerileri temizle (sadece expired ve dismissed olmayanları)
            await client.query(`
                DELETE FROM user_content_recommendations
                WHERE user_id = $1
                  AND is_clicked = false
                  AND is_completed = false
            `, [userId]);

            // Yeni önerileri ekle
            for (const rec of recommendations) {
                await client.query(`
                    INSERT INTO user_content_recommendations (
                        user_id, category, content_type, content_id, title, description,
                        target_url, cefr_level, duration_minutes, reason, reason_key,
                        score, rank, source_data, expires_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW() + INTERVAL '24 hours')
                    ON CONFLICT (user_id, content_type, content_id)
                    WHERE content_id IS NOT NULL
                    DO UPDATE SET
                        score = EXCLUDED.score,
                        rank = EXCLUDED.rank,
                        reason = EXCLUDED.reason,
                        expires_at = NOW() + INTERVAL '24 hours',
                        updated_at = NOW()
                `, [
                    userId, rec.category, rec.content_type, rec.content_id, rec.title, rec.description,
                    rec.target_url, rec.cefr_level, rec.duration_minutes, rec.reason, rec.reason_key,
                    rec.score, rec.global_rank || rec.rank, JSON.stringify(rec.source_data)
                ]);
            }

            // Generation status güncelle
            await client.query(`
                INSERT INTO recommendation_generation_status (user_id, last_generated_at, generation_count, next_generation_at)
                VALUES ($1, NOW(), 1, NOW() + INTERVAL '24 hours')
                ON CONFLICT (user_id)
                DO UPDATE SET
                    last_generated_at = NOW(),
                    generation_count = recommendation_generation_status.generation_count + 1,
                    next_generation_at = NOW() + INTERVAL '24 hours',
                    last_error = NULL
            `, [userId]);

            await client.query('COMMIT');

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('[PersonalizedRecommendation] saveRecommendations error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Öneri etkileşimini kaydet
     */
    async recordInteraction(userId, recommendationId, interactionType) {
        try {
            // Interaction kaydı
            await db.query(`
                INSERT INTO recommendation_interactions (user_id, recommendation_id, interaction_type, category, content_type, content_id)
                SELECT $1, $2, $3, category, content_type, content_id
                FROM user_content_recommendations
                WHERE id = $2
            `, [userId, recommendationId, interactionType]);

            // Recommendation durumunu güncelle
            const updateField = {
                click: 'is_clicked',
                dismiss: 'is_dismissed',
                complete: 'is_completed'
            }[interactionType];

            if (updateField) {
                await db.query(`
                    UPDATE user_content_recommendations
                    SET ${updateField} = true, updated_at = NOW()
                    WHERE id = $1 AND user_id = $2
                `, [recommendationId, userId]);
            }

            return { success: true };

        } catch (error) {
            logger.error('[PersonalizedRecommendation] recordInteraction error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Belirli bir kategori için önerileri getir
     */
    async getRecommendationsByCategory(userId, category, limit = 5) {
        return this.getRecommendations(userId, { limit, categories: [category] });
    }

    /**
     * Tüm kullanıcılar için önerileri güncelle (cron job için)
     */
    async regenerateAllRecommendations(batchSize = 50) {
        try {
            // Güncellenmesi gereken kullanıcıları bul
            const usersResult = await db.query(`
                SELECT DISTINCT u.id
                FROM users u
                JOIN user_gamification ug ON u.id = ug.user_id
                LEFT JOIN recommendation_generation_status rgs ON u.id = rgs.user_id
                WHERE ug.onboarding_completed = true
                  AND (rgs.next_generation_at IS NULL OR rgs.next_generation_at <= NOW())
                LIMIT $1
            `, [batchSize]);

            const results = {
                processed: 0,
                success: 0,
                failed: 0,
                errors: []
            };

            for (const user of usersResult.rows) {
                try {
                    await this.generateRecommendations(user.id);
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({ userId: user.id, error: error.message });

                    // Hata kaydı
                    await db.query(`
                        UPDATE recommendation_generation_status
                        SET last_error = $2, next_generation_at = NOW() + INTERVAL '1 hour'
                        WHERE user_id = $1
                    `, [user.id, error.message]);
                }
                results.processed++;

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            logger.info(`[PersonalizedRecommendation] Batch regeneration complete:`, results);
            return results;

        } catch (error) {
            logger.error('[PersonalizedRecommendation] regenerateAllRecommendations error:', error);
            throw error;
        }
    }
}

module.exports = new PersonalizedRecommendationService();
