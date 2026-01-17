/**
 * 🎯 Topic Mastery Controller
 */

const topicMasteryService = require('../services/topicMasteryService');
const logger = require('../utils/common/logger.js');

/**
 * GET /api/topic-mastery/:topicNodeId
 * Belirli bir konunun mastery bilgisini getir
 */
const getMastery = async (req, res) => {
    try {
        const userId = req.user.id;
        const { topicId } = req.params;

        if (!topicId) {
            return res.status(400).json({ success: false, error: 'topicId is required' });
        }

        const mastery = await topicMasteryService.getMastery(userId, topicId);

        return res.json({
            success: true,
            mastery: mastery
        });

    } catch (error) {
        logger.error('[TopicMastery Controller] getMastery error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch mastery' });
    }
};

/**
 * GET /api/topic-mastery
 * Kullanıcının tüm topic mastery'lerini getir
 */
const getUserMasteries = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, limit } = req.query;

        const masteries = await topicMasteryService.getUserMasteries(userId, {
            status,
            limit: limit ? parseInt(limit) : 50
        });

        return res.json({
            success: true,
            count: masteries.length,
            masteries: masteries
        });

    } catch (error) {
        logger.error('[TopicMastery Controller] getUserMasteries error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch masteries' });
    }
};

/**
 * GET /api/topic-mastery/stats
 * Genel mastery istatistiklerini getir
 */
const getOverallStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await topicMasteryService.getOverallStats(userId);

        return res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        logger.error('[TopicMastery Controller] getOverallStats error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
};

/**
 * POST /api/topic-mastery/:topicNodeId/interaction
 * İçerik etkileşimi bildirimi (internal kullanım veya test için)
 */
const recordInteraction = async (req, res) => {
    try {
        const userId = req.user.id;
        const { topicId } = req.params;
        const { completionPercentage, rating, listeningSeconds } = req.body;

        if (!topicId) {
            return res.status(400).json({ success: false, error: 'topicId is required' });
        }

        const mastery = await topicMasteryService.updateMastery(userId, topicId, {
            completionPercentage: completionPercentage || 0,
            rating: rating || 0,
            listeningSeconds: listeningSeconds || 0
        });

        return res.json({
            success: true,
            mastery: mastery
        });

    } catch (error) {
        logger.error('[TopicMastery Controller] recordInteraction error:', error);
        return res.status(500).json({ success: false, error: 'Failed to record interaction' });
    }
};

module.exports = {
    getMastery,
    getUserMasteries,
    getOverallStats,
    recordInteraction
};
