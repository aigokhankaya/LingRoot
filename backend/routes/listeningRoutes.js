/**
 * 🎧 Listening Routes
 *
 * Dinleme oturumu yonetimi, LQS tracking ve Memory Palace API'lari
 */

const express = require('express');
const router = express.Router();
const listeningService = require('../services/listeningService');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/common/logger.js');
const rateLimit = require('express-rate-limit');

// Tum route'lar authentication gerektirir
router.use(authenticate);

// Rate limiter'lar
const sessionStartLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 dakika
    max: 10, // Dakikada max 10 session
    message: { success: false, error: 'Cok fazla oturum baslatildi. Lutfen bekleyin.' }
});

const eventLimiter = rateLimit({
    windowMs: 1000, // 1 saniye
    max: 10, // Saniyede max 10 event
    message: { success: false, error: 'Cok fazla event gonderildi.' }
});

const statsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { success: false, error: 'Cok fazla istek.' }
});

// Gecerli event tipleri
const VALID_EVENT_TYPES = ['pause', 'play', 'replay', 'word_tap', 'speed_change', 'subtitle_toggle', 'seek'];
const VALID_CONTENT_TYPES = ['podcast', 'article', 'book_chapter', 'document', 'youtube'];
const VALID_REVIEW_RESULTS = ['again', 'hard', 'good', 'easy'];

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * POST /api/listening/session/start
 * Yeni dinleme oturumu baslat
 */
router.post('/session/start', sessionStartLimiter, async (req, res) => {
    try {
        const userId = req.user.id;
        const { contentId, contentType, contentDuration } = req.body;

        // Validation
        if (!contentId) {
            return res.status(400).json({ success: false, error: 'contentId gerekli' });
        }

        if (contentType && !VALID_CONTENT_TYPES.includes(contentType)) {
            return res.status(400).json({ success: false, error: 'Gecersiz contentType' });
        }

        if (contentDuration !== undefined && (typeof contentDuration !== 'number' || contentDuration < 0)) {
            return res.status(400).json({ success: false, error: 'Gecersiz contentDuration' });
        }

        const result = await listeningService.startSession(
            userId,
            contentId,
            contentType || 'article',
            contentDuration || null
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[Listening API] Start session error:', error);
        res.status(500).json({ success: false, error: 'Oturum baslatilamadi' });
    }
});

/**
 * POST /api/listening/session/:id/event
 * Oturuma event ekle (pause, replay, word_tap, vb.)
 */
router.post('/session/:id/event', eventLimiter, async (req, res) => {
    try {
        const { id: sessionId } = req.params;
        const { eventType, eventData } = req.body;

        // Validation
        if (!sessionId || sessionId.length > 50) {
            return res.status(400).json({ success: false, error: 'Gecersiz session ID' });
        }

        if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
            return res.status(400).json({
                success: false,
                error: `Gecersiz eventType. Gecerli tipler: ${VALID_EVENT_TYPES.join(', ')}`
            });
        }

        // eventData icin temel guvenlik kontrolleri
        const sanitizedEventData = {};
        if (eventData) {
            if (typeof eventData.currentTime === 'number') {
                sanitizedEventData.currentTime = Math.max(0, eventData.currentTime);
            }
            if (typeof eventData.newSpeed === 'number') {
                sanitizedEventData.newSpeed = Math.max(0.5, Math.min(2.0, eventData.newSpeed));
            }
            if (typeof eventData.word === 'string') {
                sanitizedEventData.word = eventData.word.slice(0, 100).toLowerCase().trim();
            }
            if (typeof eventData.fromTime === 'number') {
                sanitizedEventData.fromTime = Math.max(0, eventData.fromTime);
            }
            if (typeof eventData.toTime === 'number') {
                sanitizedEventData.toTime = Math.max(0, eventData.toTime);
            }
        }

        const result = await listeningService.addEvent(sessionId, eventType, sanitizedEventData);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        if (error.message === 'Session not found') {
            return res.status(404).json({ success: false, error: 'Oturum bulunamadi' });
        }
        logger.error('[Listening API] Add event error:', error);
        res.status(500).json({ success: false, error: 'Event eklenemedi' });
    }
});

/**
 * POST /api/listening/session/:id/complete
 * Oturumu tamamla ve LQS hesapla
 */
router.post('/session/:id/complete', async (req, res) => {
    try {
        const { id: sessionId } = req.params;
        const { comprehensionScore, completionPercentage } = req.body;

        // Validation
        if (!sessionId || sessionId.length > 50) {
            return res.status(400).json({ success: false, error: 'Gecersiz session ID' });
        }

        if (comprehensionScore !== undefined && comprehensionScore !== null) {
            if (typeof comprehensionScore !== 'number' || comprehensionScore < 0 || comprehensionScore > 100) {
                return res.status(400).json({ success: false, error: 'comprehensionScore 0-100 arasi olmali' });
            }
        }

        if (completionPercentage !== undefined) {
            if (typeof completionPercentage !== 'number' || completionPercentage < 0 || completionPercentage > 100) {
                return res.status(400).json({ success: false, error: 'completionPercentage 0-100 arasi olmali' });
            }
        }

        const result = await listeningService.completeSession(
            sessionId,
            comprehensionScore || null,
            completionPercentage || 100
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        if (error.message === 'Session not found') {
            return res.status(404).json({ success: false, error: 'Oturum bulunamadi' });
        }
        logger.error('[Listening API] Complete session error:', error);
        res.status(500).json({ success: false, error: 'Oturum tamamlanamadi' });
    }
});

/**
 * POST /api/listening/session/:id/abandon
 * Oturumu terk et
 */
router.post('/session/:id/abandon', async (req, res) => {
    try {
        const { id: sessionId } = req.params;

        if (!sessionId || sessionId.length > 50) {
            return res.status(400).json({ success: false, error: 'Gecersiz session ID' });
        }

        const result = await listeningService.abandonSession(sessionId);

        res.json(result);
    } catch (error) {
        logger.error('[Listening API] Abandon session error:', error);
        res.status(500).json({ success: false, error: 'Oturum terk edilemedi' });
    }
});

// ============================================
// STATS & TRENDS
// ============================================

/**
 * GET /api/listening/stats
 * Kullanicinin dinleme istatistiklerini getir
 */
router.get('/stats', statsLimiter, async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await listeningService.getUserStats(userId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('[Listening API] Get stats error:', error);
        res.status(500).json({ success: false, error: 'Istatistikler alinamadi' });
    }
});

/**
 * GET /api/listening/quality-trend
 * Son 7 veya 30 gunluk LQS trend'i getir
 */
router.get('/quality-trend', statsLimiter, async (req, res) => {
    try {
        const userId = req.user.id;
        const days = parseInt(req.query.days) || 7;

        // Guvenlik: max 90 gun
        const safeDays = Math.min(90, Math.max(1, days));

        const trend = await listeningService.getQualityTrend(userId, safeDays);

        res.json({
            success: true,
            data: trend
        });
    } catch (error) {
        logger.error('[Listening API] Get quality trend error:', error);
        res.status(500).json({ success: false, error: 'Trend alinamadi' });
    }
});

// ============================================
// MEMORY PALACE (VOCABULARY)
// ============================================

/**
 * GET /api/listening/palace
 * Memory Palace verisini getir
 */
router.get('/palace', statsLimiter, async (req, res) => {
    try {
        const userId = req.user.id;
        const palace = await listeningService.getMemoryPalace(userId);

        res.json({
            success: true,
            data: palace
        });
    } catch (error) {
        logger.error('[Listening API] Get palace error:', error);
        res.status(500).json({ success: false, error: 'Memory Palace alinamadi' });
    }
});

/**
 * GET /api/listening/due-reviews
 * Bugun tekrar edilecek kelimeleri getir
 */
router.get('/due-reviews', statsLimiter, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

        const reviews = await listeningService.getDueReviews(userId, limit);

        res.json({
            success: true,
            data: {
                dueCount: reviews.length,
                words: reviews
            }
        });
    } catch (error) {
        logger.error('[Listening API] Get due reviews error:', error);
        res.status(500).json({ success: false, error: 'Tekrar edilecek kelimeler alinamadi' });
    }
});

/**
 * POST /api/listening/vocabulary/:word/review
 * Kelime tekrar sonucunu kaydet
 */
router.post('/vocabulary/:word/review', async (req, res) => {
    try {
        const userId = req.user.id;
        const { word } = req.params;
        const { result } = req.body;

        // Validation
        if (!word || word.length > 100) {
            return res.status(400).json({ success: false, error: 'Gecersiz kelime' });
        }

        if (!result || !VALID_REVIEW_RESULTS.includes(result)) {
            return res.status(400).json({
                success: false,
                error: `Gecersiz result. Gecerli degerler: ${VALID_REVIEW_RESULTS.join(', ')}`
            });
        }

        const reviewResult = await listeningService.recordReviewResult(userId, word.toLowerCase().trim(), result);

        res.json({
            success: true,
            data: reviewResult
        });
    } catch (error) {
        if (error.message === 'Word not found') {
            return res.status(404).json({ success: false, error: 'Kelime bulunamadi' });
        }
        logger.error('[Listening API] Record review error:', error);
        res.status(500).json({ success: false, error: 'Tekrar sonucu kaydedilemedi' });
    }
});

/**
 * GET /api/listening/vocabulary/progress
 * Kelime ilerleme istatistikleri
 */
router.get('/vocabulary/progress', statsLimiter, async (req, res) => {
    try {
        const userId = req.user.id;

        // Room counts
        const palace = await listeningService.getMemoryPalace(userId);

        // Son hafta tekrar istatistikleri
        const db = require('../config/db');
        const weeklyStats = await db.query(`
            SELECT
                COUNT(*) as total_reviews,
                COUNT(*) FILTER (WHERE last_review_result IN ('good', 'easy')) as successful_reviews,
                COUNT(*) FILTER (WHERE last_review_result = 'again') as failed_reviews
            FROM vocabulary_mastery_extended
            WHERE user_id = $1
                AND last_reviewed_at >= NOW() - INTERVAL '7 days'
        `, [userId]);

        res.json({
            success: true,
            data: {
                palace: palace.rooms,
                totalWords: palace.totalWords,
                weeklyStats: {
                    totalReviews: parseInt(weeklyStats.rows[0]?.total_reviews || 0),
                    successfulReviews: parseInt(weeklyStats.rows[0]?.successful_reviews || 0),
                    failedReviews: parseInt(weeklyStats.rows[0]?.failed_reviews || 0),
                    successRate: weeklyStats.rows[0]?.total_reviews > 0
                        ? Math.round((weeklyStats.rows[0].successful_reviews / weeklyStats.rows[0].total_reviews) * 100)
                        : 0
                }
            }
        });
    } catch (error) {
        logger.error('[Listening API] Get vocabulary progress error:', error);
        res.status(500).json({ success: false, error: 'Kelime ilerlemesi alinamadi' });
    }
});

module.exports = router;
