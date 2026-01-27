/**
 * YouTube Routes V2
 * New transcript fetching system using youtube-transcript npm package
 * Completely independent from the old Playwright-based system
 */

const express = require('express');
const router = express.Router();
const {
    fetchYoutubeTranscriptV2,
    checkTranscriptServiceHealthV2
} = require('../utils/content/youtubeTranscriptServiceV2.js');
const logger = require('../utils/common/logger.js');

/**
 * POST /api/youtube-v2/transcript
 * Fetches YouTube video transcript using V2 service (npm package)
 */
router.post('/transcript', async (req, res) => {
    try {
        const { url, language_code } = req.body;

        if (!url || typeof url !== 'string') {
            logger.warn('[YT-V2-ROUTE] Request missing URL');
            return res.status(400).json({
                success: false,
                error: 'MISSING_URL',
                message: 'Geçerli bir YouTube URL\'si gerekli'
            });
        }

        // Basic URL validation
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i;
        if (!youtubeRegex.test(url)) {
            logger.warn(`[YT-V2-ROUTE] Invalid YouTube URL format: ${url}`);
            return res.status(400).json({
                success: false,
                error: 'INVALID_URL',
                message: 'Geçerli bir YouTube URL\'si girin'
            });
        }

        logger.info(`[YT-V2-ROUTE] Processing transcript request for: ${url}`);

        const result = await fetchYoutubeTranscriptV2(url, language_code || 'en');

        if (!result.success) {
            const statusCode = result.error === 'NO_SUBTITLES' ? 404 : 400;
            return res.status(statusCode).json(result);
        }

        return res.status(200).json(result);

    } catch (error) {
        logger.error('[YT-V2-ROUTE] Unexpected error:', error);
        return res.status(500).json({
            success: false,
            error: 'SERVER_ERROR',
            message: 'Sunucu hatası oluştu',
            details: error.message
        });
    }
});

/**
 * GET /api/youtube-v2/health
 * Health check for V2 transcript service
 */
router.get('/health', async (req, res) => {
    try {
        const health = await checkTranscriptServiceHealthV2();
        return res.status(200).json({
            ...health,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('[YT-V2-ROUTE] Health check error:', error);
        return res.status(503).json({
            healthy: false,
            service: 'youtube-transcript-v2',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
