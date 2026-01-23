const db = require('../config/db');
const logger = require('../utils/common/logger.js');
const userInsightService = require('../services/userInsightService');
const topicMasteryService = require('../services/topicMasteryService');

/**
 * İçeriği beğen/beğenme
 */
async function rateContent(req, res) {
    const { content_id, content_type, rating } = req.body;
    const userId = req.user.id;

    // Validation
    if (!content_id || !content_type) {
        return res.status(400).json({ error: 'content_id and content_type are required' });
    }

    if (![-1, 1].includes(rating)) {
        return res.status(400).json({ error: 'Rating must be 1 (like) or -1 (dislike)' });
    }

    try {
        // Upsert (varsa güncelle, yoksa ekle)
        await db.query(`
            INSERT INTO content_ratings (user_id, content_id, content_type, rating)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, content_id, content_type)
            DO UPDATE SET rating = $4, updated_at = NOW()
        `, [userId, content_id, content_type, rating]);

        logger.info(`[ContentRating] User ${userId} rated content ${content_id} with ${rating}`);

        // 🔄 Insight extraction ve Topic Mastery güncelleme arka planda
        setImmediate(async () => {
            try {
                // Insight extraction
                await userInsightService.processContentRating(userId, content_id, rating, null);

                // Topic Mastery güncelleme
                let targetTopicId = null;
                if (content_type === 'topic') {
                    targetTopicId = content_id;
                } else {
                    const contentResult = await db.query(
                        `SELECT topic_id FROM contenthistory WHERE id = $1`,
                        [content_id]
                    );
                    targetTopicId = contentResult.rows[0]?.topic_id;
                }

                if (targetTopicId) {
                    await topicMasteryService.updateMastery(userId, targetTopicId, {
                        rating: rating,
                        completionPercentage: 0, // Rating tek başına completion değil
                        listeningSeconds: 0
                    });
                }
            } catch (err) {
                logger.error('[ContentRating] Background processing failed:', err);
            }
        });

        res.json({ success: true, message: 'Rating saved' });
    } catch (error) {
        logger.error('[ContentRating] Rating save error:', error);
        res.status(500).json({ error: 'Failed to save rating' });
    }
}

/**
 * Detaylı geri bildirim gönder
 */
async function submitFeedback(req, res) {
    const { content_id, content_type, feedback_type, feedback_text } = req.body;
    const userId = req.user.id;

    // Validation
    if (!content_id || !content_type || !feedback_type) {
        return res.status(400).json({ error: 'content_id, content_type, and feedback_type are required' });
    }

    const validFeedbackTypes = ['too_easy', 'too_hard', 'boring', 'factual_error', 'too_long', 'too_short', 'other'];
    if (!validFeedbackTypes.includes(feedback_type)) {
        return res.status(400).json({ error: 'Invalid feedback_type' });
    }

    try {
        await db.query(`
            INSERT INTO content_feedback (user_id, content_id, content_type, feedback_type, feedback_text)
            VALUES ($1, $2, $3, $4, $5)
        `, [userId, content_id, content_type, feedback_type, feedback_text || null]);

        logger.info(`[ContentFeedback] User ${userId} submitted feedback for content ${content_id}: ${feedback_type}`);

        // 🔄 Feedback'e göre insight extraction (arka planda)
        // Negatif feedback olarak işle (rating = -1)
        if (['too_easy', 'too_hard', 'boring', 'too_long', 'too_short'].includes(feedback_type)) {
            setImmediate(() => {
                userInsightService.processContentRating(userId, content_id, -1, feedback_type)
                    .catch(err => logger.error('[ContentFeedback] Insight extraction failed:', err));
            });
        }

        res.json({ success: true, message: 'Feedback saved, thank you!' });
    } catch (error) {
        logger.error('[ContentFeedback] Feedback save error:', error);
        res.status(500).json({ error: 'Failed to save feedback' });
    }
}

/**
 * Kullanıcının bir içerik için mevcut rating'ini getir
 */
async function getUserRating(req, res) {
    const { content_id, content_type } = req.query;
    const userId = req.user.id;

    if (!content_id || !content_type) {
        return res.status(400).json({ error: 'content_id and content_type are required' });
    }

    try {
        const result = await db.query(`
            SELECT rating FROM content_ratings
            WHERE user_id = $1 AND content_id = $2 AND content_type = $3
        `, [userId, content_id, content_type]);

        logger.info(`[ContentRating] getUserRating: user=${userId}, content=${content_id}, type=${content_type}, found=${result.rows.length > 0 ? result.rows[0].rating : 'null'}`);


        if (result.rows.length === 0) {
            return res.json({ rating: null });
        }

        res.json({ rating: result.rows[0].rating });
    } catch (error) {
        logger.error('[ContentRating] Get rating error:', error);
        res.status(500).json({ error: 'Failed to fetch rating' });
    }
}

module.exports = {
    rateContent,
    submitFeedback,
    getUserRating
};
