/**
 * 🎯 Topic Mastery Service
 * 
 * Kullanıcıların konu bazlı ilerleme ve ustalık (mastery) takibi
 * 
 * Özellikler:
 * - Content tamamlandığında mastery güncelleme
 * - Mastery score hesaplama (completion + rating + listening)
 * - Status yönetimi: not_started → in_progress → completed → mastered
 */

const pool = require('../config/db');
const logger = require('../utils/logger');
const { withRetry, withGracefulDegradation } = require('../utils/retryUtils');

class TopicMasteryService {

    /**
     * İçerik etkileşimi sonrası mastery güncelle
     * 
     * @param {string} userId 
     * @param {number} topicNodeId 
     * @param {object} interaction - { completionPercentage, rating, listeningSeconds }
     */
    async updateMastery(userId, topicNodeId, interaction = {}) {
        try {
            const { completionPercentage = 0, rating = 0, listeningSeconds = 0 } = interaction;

            // 1. Mevcut kaydı bul veya oluştur
            const existing = await pool.query(
                `SELECT * FROM user_topic_mastery WHERE user_id = $1 AND topic_id = $2`,
                [userId, topicNodeId]
            );

            if (existing.rows.length === 0) {
                // İlk etkileşim - yeni kayıt oluştur
                await pool.query(`
                    INSERT INTO user_topic_mastery (
                        user_id, topic_id, content_completed, content_total,
                        total_listening_seconds, avg_completion_percentage, avg_rating,
                        status, first_interaction_at, last_interaction_at
                    ) VALUES ($1, $2, $3, 1, $4, $5, $6, 'in_progress', NOW(), NOW())
                `, [
                    userId,
                    topicNodeId,
                    completionPercentage >= 90 ? 1 : 0,
                    listeningSeconds,
                    completionPercentage,
                    rating
                ]);
            } else {
                // Mevcut kaydı güncelle
                const current = existing.rows[0];
                const newTotal = (parseInt(current.content_total) || 0) + 1;
                const newCompleted = (parseInt(current.content_completed) || 0) + (completionPercentage >= 90 ? 1 : 0);
                const newListening = (parseInt(current.total_listening_seconds) || 0) + listeningSeconds;

                // Running average hesapla
                const oldAvgCompletion = parseFloat(current.avg_completion_percentage) || 0;
                const newAvgCompletion = ((oldAvgCompletion * (newTotal - 1)) + completionPercentage) / newTotal;

                const oldAvgRating = parseFloat(current.avg_rating) || 0;
                const newAvgRating = rating !== 0
                    ? ((oldAvgRating * (newTotal - 1)) + rating) / newTotal
                    : oldAvgRating;

                await pool.query(`
                    UPDATE user_topic_mastery
                    SET 
                        content_completed = $3,
                        content_total = $4,
                        total_listening_seconds = $5,
                        avg_completion_percentage = $6,
                        avg_rating = $7,
                        last_interaction_at = NOW()
                    WHERE user_id = $1 AND topic_id = $2
                `, [
                    userId, topicNodeId,
                    newCompleted, newTotal, newListening,
                    newAvgCompletion, newAvgRating
                ]);
            }

            // 2. Mastery score ve status hesapla
            await this.recalculateMastery(userId, topicNodeId);

            logger.info(`[TopicMastery] Updated mastery for user=${userId}, topic=${topicNodeId}`);

            return await this.getMastery(userId, topicNodeId);

        } catch (error) {
            logger.error('[TopicMastery] updateMastery error:', error);
            throw error;
        }
    }

    /**
     * Mastery score ve status yeniden hesapla
     */
    async recalculateMastery(userId, topicNodeId) {
        try {
            const result = await pool.query(
                `SELECT * FROM user_topic_mastery WHERE user_id = $1 AND topic_id = $2`,
                [userId, topicNodeId]
            );

            if (result.rows.length === 0) return;

            const mastery = result.rows[0];

            // Mastery Score Formülü:
            // 40% Completion Rate + 30% Rating (normalized) + 30% Content Count (max 10)
            const completionRate = parseFloat(mastery.avg_completion_percentage) || 0;
            const ratingNormalized = ((parseFloat(mastery.avg_rating) || 0) + 1) / 2 * 100; // -1,1 → 0,100
            const contentScore = Math.min((parseInt(mastery.content_completed) || 0) * 10, 100);

            const masteryScore = Math.round(
                (completionRate * 0.4) +
                (ratingNormalized * 0.3) +
                (contentScore * 0.3)
            );

            // Status belirleme
            let status = 'in_progress';
            let completedAt = null;

            if (masteryScore >= 85 && (parseInt(mastery.content_completed) || 0) >= 5) {
                status = 'mastered';
                completedAt = mastery.completed_at || 'NOW()';
            } else if (masteryScore >= 70 && (parseInt(mastery.content_completed) || 0) >= 3) {
                status = 'completed';
                completedAt = mastery.completed_at || 'NOW()';
            }

            await pool.query(`
                UPDATE user_topic_mastery
                SET mastery_score = $3, status = $4, completed_at = ${completedAt ? '$5' : 'completed_at'}
                WHERE user_id = $1 AND topic_id = $2
            `, completedAt
                ? [userId, topicNodeId, masteryScore, status, completedAt === 'NOW()' ? new Date() : completedAt]
                : [userId, topicNodeId, masteryScore, status]
            );

        } catch (error) {
            logger.error('[TopicMastery] recalculateMastery error:', error);
        }
    }

    /**
     * Tek bir konunun mastery bilgisini getir
     */
    async getMastery(userId, topicNodeId) {
        try {
            const result = await pool.query(
                `SELECT * FROM user_topic_mastery WHERE user_id = $1 AND topic_id = $2`,
                [userId, topicNodeId]
            );
            return result.rows[0] || null;
        } catch (error) {
            logger.error('[TopicMastery] getMastery error:', error);
            return null;
        }
    }

    /**
     * Kullanıcının tüm topic mastery'lerini getir
     */
    async getUserMasteries(userId, options = {}) {
        try {
            const { status, limit = 50, orderBy = 'mastery_score DESC' } = options;

            // SQL Injection koruması: Sadece izin verilen orderBy değerleri
            const allowedOrderBy = [
                'mastery_score DESC', 'mastery_score ASC',
                'last_interaction_at DESC', 'last_interaction_at ASC',
                'content_completed DESC', 'created_at DESC'
            ];
            const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'mastery_score DESC';
            const safeLimit = Math.min(Math.max(1, parseInt(limit) || 50), 100); // 1-100 arası

            let query = `
                SELECT 
                    utm.*,
                    t.title as topic_name,
                    t.parent_id,
                    t.level as topic_level
                FROM user_topic_mastery utm
                JOIN topics t ON utm.topic_id = t.id
                WHERE utm.user_id = $1
            `;

            const params = [userId];

            if (status) {
                query += ` AND utm.status = $2`;
                params.push(status);
            }

            query += ` ORDER BY ${safeOrderBy} LIMIT ${safeLimit}`;

            const result = await pool.query(query, params);
            return result.rows;

        } catch (error) {
            logger.error('[TopicMastery] getUserMasteries error:', error);
            return [];
        }
    }

    /**
     * Kullanıcının genel mastery istatistiklerini getir
     */
    async getOverallStats(userId) {
        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as total_topics,
                    COUNT(CASE WHEN status = 'mastered' THEN 1 END) as mastered_count,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
                    AVG(mastery_score) as avg_mastery_score,
                    SUM(total_listening_seconds) as total_listening_seconds,
                    SUM(content_completed) as total_content_completed
                FROM user_topic_mastery
                WHERE user_id = $1
            `, [userId]);

            return result.rows[0] || {};

        } catch (error) {
            logger.error('[TopicMastery] getOverallStats error:', error);
            return {};
        }
    }
}

module.exports = new TopicMasteryService();
