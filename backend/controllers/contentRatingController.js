const db = require('../config/db');
const logger = require('../utils/logger');

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
