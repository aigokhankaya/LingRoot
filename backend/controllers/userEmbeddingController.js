/**
 * 🧬 User Embedding Controller
 */

const userEmbeddingService = require('../services/userEmbeddingService');
const logger = require('../utils/common/logger.js');

/**
 * GET /api/recommendations
 * Kullanıcıya özel içerik önerileri
 */
const getRecommendations = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;

        const recommendations = await userEmbeddingService.getRecommendationsFromSimilarUsers(userId, limit);

        return res.json({
            success: true,
            count: recommendations.length,
            recommendations: recommendations
        });

    } catch (error) {
        logger.error('[UserEmbedding Controller] getRecommendations error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch recommendations' });
    }
};

/**
 * GET /api/recommendations/similar-users
 * Benzer kullanıcıları getir (debug/admin)
 */
const getSimilarUsers = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 5;

        const similarUsers = await userEmbeddingService.findSimilarUsers(userId, limit);

        return res.json({
            success: true,
            count: similarUsers.length,
            similarUsers: similarUsers.map(u => ({
                id: u.id,
                displayName: u.display_name,
                similarity: parseFloat(u.similarity).toFixed(4)
            }))
        });

    } catch (error) {
        logger.error('[UserEmbedding Controller] getSimilarUsers error:', error);
        return res.status(500).json({ success: false, error: 'Failed to find similar users' });
    }
};

/**
 * POST /api/recommendations/refresh-embedding
 * Kullanıcının embedding'ini yeniden oluştur
 */
const refreshEmbedding = async (req, res) => {
    try {
        const userId = req.user.id;

        const success = await userEmbeddingService.updateUserEmbedding(userId);

        return res.json({
            success: success,
            message: success ? 'Embedding updated successfully' : 'Failed to update embedding (not enough insights?)'
        });

    } catch (error) {
        logger.error('[UserEmbedding Controller] refreshEmbedding error:', error);
        return res.status(500).json({ success: false, error: 'Failed to refresh embedding' });
    }
};

/**
 * GET /api/recommendations/preference-summary
 * Kullanıcının preference summary'sini getir
 */
const getPreferenceSummary = async (req, res) => {
    try {
        const userId = req.user.id;

        const summary = await userEmbeddingService.generatePreferenceSummary(userId);

        return res.json({
            success: true,
            summary: summary || 'No insights available yet'
        });

    } catch (error) {
        logger.error('[UserEmbedding Controller] getPreferenceSummary error:', error);
        return res.status(500).json({ success: false, error: 'Failed to get preference summary' });
    }
};

module.exports = {
    getRecommendations,
    getSimilarUsers,
    refreshEmbedding,
    getPreferenceSummary
};
