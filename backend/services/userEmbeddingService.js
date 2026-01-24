/**
 * 🧬 User Embedding Service
 * 
 * Kullanıcı insight'larını embedding'e dönüştürme ve benzerlik arama
 * 
 * Özellikler:
 * - Insight'lardan preference summary oluşturma
 * - OpenAI embedding API ile vektör oluşturma
 * - Benzer kullanıcı arama (cosine similarity)
 * - İçerik önerileri
 */

const pool = require('../config/db');
const logger = require('../utils/common/logger.js');
const openaiClient = require('../utils/ai/openaiClient.js');
const { withRetry, withGracefulDegradation } = require('../utils/common/retryUtils.js');

class UserEmbeddingService {

    /**
     * Kullanıcının tüm insight'larından bir preference summary oluştur
     */
    async generatePreferenceSummary(userId) {
        try {
            // Kullanıcının insight'larını al
            const insightsResult = await pool.query(`
                SELECT insight_type, insight_value, confidence, source
                FROM user_insights
                WHERE user_id = $1
                ORDER BY confidence DESC, updated_at DESC
                LIMIT 50
            `, [userId]);

            if (insightsResult.rows.length === 0) {
                return null;
            }

            const insights = insightsResult.rows;

            // Insight'ları kategorize et
            const categorized = {
                likes: [],
                dislikes: [],
                preferences: [],
                habits: [],
                goals: []
            };

            for (const insight of insights) {
                const type = insight.insight_type;
                if (categorized[type]) {
                    categorized[type].push(insight.insight_value);
                } else {
                    categorized.preferences.push(insight.insight_value);
                }
            }

            // Doğal dilde özet oluştur (embedding için)
            const summaryParts = [];

            if (categorized.likes.length > 0) {
                summaryParts.push(`Likes: ${categorized.likes.slice(0, 10).join(', ')}`);
            }
            if (categorized.dislikes.length > 0) {
                summaryParts.push(`Dislikes: ${categorized.dislikes.slice(0, 5).join(', ')}`);
            }
            if (categorized.preferences.length > 0) {
                summaryParts.push(`Preferences: ${categorized.preferences.slice(0, 10).join(', ')}`);
            }
            if (categorized.habits.length > 0) {
                summaryParts.push(`Learning habits: ${categorized.habits.slice(0, 5).join(', ')}`);
            }
            if (categorized.goals.length > 0) {
                summaryParts.push(`Goals: ${categorized.goals.slice(0, 5).join(', ')}`);
            }

            const summary = summaryParts.join('. ');

            // Cache'e kaydet
            await pool.query(`
                INSERT INTO user_preference_cache (user_id, aggregated_insights, preference_summary, insight_count, last_updated_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (user_id) DO UPDATE
                SET aggregated_insights = $2, preference_summary = $3, insight_count = $4, last_updated_at = NOW()
            `, [userId, JSON.stringify(categorized), summary, insights.length]);

            logger.info(`[UserEmbedding] Generated preference summary for user ${userId}`);
            return summary;

        } catch (error) {
            logger.error('[UserEmbedding] generatePreferenceSummary error:', error);
            return null;
        }
    }

    /**
     * OpenAI ile text embedding oluştur
     */
    async createEmbedding(text) {
        if (!text || text.trim().length === 0) {
            return null;
        }

        try {
            return await withRetry(async () => {
                const response = await openaiClient.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: text.slice(0, 8000), // Max token limit
                    dimensions: 1536
                });

                return response.data[0].embedding;
            }, {
                maxRetries: 3,
                baseDelayMs: 1000,
                context: 'OpenAI Embedding'
            });

        } catch (error) {
            logger.error('[UserEmbedding] createEmbedding error:', error);
            return null;
        }
    }

    /**
     * Kullanıcının embedding'ini güncelle
     */
    async updateUserEmbedding(userId) {
        try {
            // 1. Preference summary oluştur
            const summary = await this.generatePreferenceSummary(userId);

            if (!summary) {
                logger.warn(`[UserEmbedding] No insights found for user ${userId}`);
                return false;
            }

            // 2. Embedding oluştur
            const embedding = await this.createEmbedding(summary);

            if (!embedding) {
                logger.warn(`[UserEmbedding] Failed to create embedding for user ${userId}`);
                return false;
            }

            // 3. Users tablosunu güncelle
            await pool.query(`
                UPDATE users
                SET insight_embedding = $2, embedding_updated_at = NOW()
                WHERE id = $1
            `, [userId, JSON.stringify(embedding)]);

            logger.info(`[UserEmbedding] Updated embedding for user ${userId}`);
            return true;

        } catch (error) {
            logger.error('[UserEmbedding] updateUserEmbedding error:', error);
            return false;
        }
    }

    /**
     * Benzer kullanıcıları bul (cosine similarity)
     */
    async findSimilarUsers(userId, limit = 5) {
        try {
            // Mevcut kullanıcının embedding'ini al
            const userResult = await pool.query(
                `SELECT insight_embedding FROM users WHERE id = $1`,
                [userId]
            );

            if (!userResult.rows[0]?.insight_embedding) {
                logger.warn(`[UserEmbedding] User ${userId} has no embedding`);
                return [];
            }

            const userEmbedding = userResult.rows[0].insight_embedding;

            // Cosine similarity ile benzer kullanıcıları bul
            const similarResult = await pool.query(`
                SELECT 
                    u.id,
                    u.display_name,
                    1 - (u.insight_embedding <=> $1) as similarity
                FROM users u
                WHERE u.id != $2
                  AND u.insight_embedding IS NOT NULL
                ORDER BY u.insight_embedding <=> $1
                LIMIT $3
            `, [userEmbedding, userId, limit]);

            return similarResult.rows;

        } catch (error) {
            logger.error('[UserEmbedding] findSimilarUsers error:', error);
            return [];
        }
    }

    /**
     * Benzer kullanıcıların beğendiği içerikleri öner
     */
    async getRecommendationsFromSimilarUsers(userId, limit = 10) {
        try {
            const similarUsers = await this.findSimilarUsers(userId, 10);

            if (similarUsers.length === 0) {
                return [];
            }

            const similarUserIds = similarUsers.map(u => u.id);

            // Benzer kullanıcıların beğendiği içerikler
            const recommendationsResult = await pool.query(`
                SELECT 
                    ch.id,
                    ch.input as title,
                    ch.level,
                    ch.topic_id,
                    COUNT(DISTINCT cr.user_id) as like_count,
                    AVG(cr.rating) as avg_rating
                FROM content_ratings cr
                JOIN contenthistory ch ON cr.content_id = ch.id
                WHERE cr.user_id = ANY($1)
                  AND cr.rating = 1
                  AND ch.id NOT IN (
                      SELECT content_id FROM content_ratings WHERE user_id = $2
                  )
                GROUP BY ch.id, ch.input, ch.level, ch.topic_id
                ORDER BY like_count DESC, avg_rating DESC
                LIMIT $3
            `, [similarUserIds, userId, limit]);

            return recommendationsResult.rows;

        } catch (error) {
            logger.error('[UserEmbedding] getRecommendationsFromSimilarUsers error:', error);
            return [];
        }
    }

    /**
     * Batch embedding güncelleme (cron job için)
     */
    async updateStaleEmbeddings(olderThanDays = 7, batchSize = 50) {
        try {
            // Input sanitization
            const safeDays = Math.min(Math.max(1, parseInt(olderThanDays) || 7), 365);
            const safeBatchSize = Math.min(Math.max(1, parseInt(batchSize) || 50), 100);

            // Eski veya hiç embedding'i olmayan kullanıcıları bul
            const staleUsersResult = await pool.query(`
                SELECT u.id
                FROM users u
                JOIN user_insights ui ON ui.user_id = u.id
                WHERE u.embedding_updated_at IS NULL
                   OR u.embedding_updated_at < NOW() - INTERVAL '1 day' * $1
                GROUP BY u.id
                HAVING COUNT(ui.id) >= 5
                LIMIT $2
            `, [safeDays, safeBatchSize]);

            const staleUsers = staleUsersResult.rows;
            let updated = 0;

            for (const user of staleUsers) {
                const success = await this.updateUserEmbedding(user.id);
                if (success) updated++;

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            logger.info(`[UserEmbedding] Batch update completed: ${updated}/${staleUsers.length} users`);
            return { total: staleUsers.length, updated };

        } catch (error) {
            logger.error('[UserEmbedding] updateStaleEmbeddings error:', error);
            return { total: 0, updated: 0 };
        }
    }
}

module.exports = new UserEmbeddingService();
