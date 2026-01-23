/**
 * Admin Metrics Routes
 * 
 * Sistem durumunu izlemek için admin endpoint'leri.
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const { limiters } = require('../utils/infra/concurrencyLimiter.js');
const { getAllQueueStats } = require('../utils/infra/bullQueue.js');
const { checkRedisAvailability, REDIS_URL } = require('../utils/storage/redisClient.js');
const logger = require('../utils/common/logger.js');

/**
 * GET /api/admin/metrics/concurrency
 * Concurrency limiter durumlarını getir
 */
router.get('/concurrency', authenticate, authorizeAdmin, (req, res) => {
    try {
        const stats = {
            timestamp: new Date().toISOString(),
            limiters: {
                tts: limiters.tts.getStats(),
                podcast: limiters.podcast.getStats(),
                openai: limiters.openai.getStats()
            }
        };

        logger.info('[Metrics] Concurrency stats requested', { requestedBy: req.user?.id });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('[Metrics] Error getting concurrency stats:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/admin/metrics/queues
 * BullMQ queue durumlarını getir
 */
router.get('/queues', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const redisAvailable = checkRedisAvailability();

        if (!redisAvailable) {
            return res.json({
                success: true,
                data: {
                    redis: { available: false, url: REDIS_URL?.replace(/:[^:]*@/, ':***@') },
                    queues: {},
                    message: 'Redis not connected, using fallback mode'
                }
            });
        }

        const queueStats = await getAllQueueStats();

        res.json({
            success: true,
            data: {
                timestamp: new Date().toISOString(),
                redis: { available: true },
                queues: queueStats
            }
        });
    } catch (error) {
        logger.error('[Metrics] Error getting queue stats:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/admin/metrics/health
 * Sistem sağlık kontrolü
 */
router.get('/health', (req, res) => {
    const redisAvailable = checkRedisAvailability();

    res.json({
        success: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        redis: {
            available: redisAvailable,
            url: REDIS_URL?.replace(/:[^:]*@/, ':***@') // Mask password
        }
    });
});

/**
 * GET /api/admin/metrics/all
 * Tüm metrikleri tek seferde getir
 */
router.get('/all', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const redisAvailable = checkRedisAvailability();
        const queueStats = redisAvailable ? await getAllQueueStats() : {};

        res.json({
            success: true,
            data: {
                timestamp: new Date().toISOString(),
                system: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    nodeVersion: process.version
                },
                redis: {
                    available: redisAvailable
                },
                concurrency: {
                    tts: limiters.tts.getStats(),
                    podcast: limiters.podcast.getStats(),
                    openai: limiters.openai.getStats()
                },
                queues: queueStats
            }
        });
    } catch (error) {
        logger.error('[Metrics] Error getting all metrics:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;

