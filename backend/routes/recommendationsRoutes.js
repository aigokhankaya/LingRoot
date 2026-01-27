const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const userEmbeddingController = require('../controllers/userEmbeddingController');
const personalizedRecommendationService = require('../services/personalizedRecommendationService');
const logger = require('../utils/common/logger.js');

// Tüm route'lar authentication gerektirir
router.use(authenticate);

// ============================================
// PERSONALIZED RECOMMENDATIONS (YENİ)
// ============================================

/**
 * GET /api/recommendations/personalized
 * Kullanıcıya özel içerik önerilerini getir
 */
router.get('/personalized', async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = Math.min(parseInt(req.query.limit) || 10, 20);
        const categories = req.query.categories ? req.query.categories.split(',') : null;
        const refresh = req.query.refresh === 'true';

        const result = await personalizedRecommendationService.getRecommendations(userId, {
            limit,
            categories,
            refresh
        });

        res.json(result);

    } catch (error) {
        logger.error('[RecommendationRoutes] GET /personalized error:', error);
        res.status(500).json({
            success: false,
            error: 'Öneriler alınamadı',
            message: error.message
        });
    }
});

/**
 * GET /api/recommendations/continue-listening
 * Yarım kalan içerikleri getir
 */
router.get('/continue-listening', async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = Math.min(parseInt(req.query.limit) || 5, 10);

        const result = await personalizedRecommendationService.getRecommendationsByCategory(
            userId,
            'continue_listening',
            limit
        );

        res.json(result);

    } catch (error) {
        logger.error('[RecommendationRoutes] GET /continue-listening error:', error);
        res.status(500).json({
            success: false,
            error: 'Yarım kalan içerikler alınamadı'
        });
    }
});

/**
 * GET /api/recommendations/category/:category
 * Belirli bir kategorideki önerileri getir
 */
router.get('/category/:category', async (req, res) => {
    try {
        const userId = req.user.id;
        const { category } = req.params;
        const limit = Math.min(parseInt(req.query.limit) || 5, 10);

        const validCategories = [
            'continue_listening',
            'level_appropriate',
            'based_on_interests',
            'from_conversations',
            'sector_recommended',
            'smart_suggestions',
            'vocabulary_focus',
            'similar_users',
            'trending'
        ];

        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz kategori',
                validCategories
            });
        }

        const result = await personalizedRecommendationService.getRecommendationsByCategory(
            userId,
            category,
            limit
        );

        res.json(result);

    } catch (error) {
        logger.error('[RecommendationRoutes] GET /category error:', error);
        res.status(500).json({
            success: false,
            error: 'Kategori önerileri alınamadı'
        });
    }
});

/**
 * POST /api/recommendations/:id/interaction
 * Öneri etkileşimini kaydet (click, dismiss, complete)
 */
router.post('/:id/interaction', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { type } = req.body;

        const validTypes = ['click', 'dismiss', 'complete', 'view', 'skip'];

        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz etkileşim tipi',
                validTypes
            });
        }

        const result = await personalizedRecommendationService.recordInteraction(
            userId,
            id,
            type
        );

        res.json(result);

    } catch (error) {
        logger.error('[RecommendationRoutes] POST /interaction error:', error);
        res.status(500).json({
            success: false,
            error: 'Etkileşim kaydedilemedi'
        });
    }
});

/**
 * POST /api/recommendations/refresh
 * Önerileri yeniden hesapla
 */
router.post('/refresh', async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await personalizedRecommendationService.getRecommendations(userId, {
            refresh: true
        });

        res.json({
            success: true,
            message: 'Öneriler yenilendi',
            data: result.data,
            total: result.total
        });

    } catch (error) {
        logger.error('[RecommendationRoutes] POST /refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'Öneriler yenilenemedi'
        });
    }
});

// ============================================
// EMBEDDING-BASED RECOMMENDATIONS (Mevcut)
// ============================================

// Kullanıcıya özel içerik önerileri (embedding-based)
router.get('/', userEmbeddingController.getRecommendations);

// Benzer kullanıcıları getir
router.get('/similar-users', userEmbeddingController.getSimilarUsers);

// Embedding'i yeniden oluştur
router.post('/refresh-embedding', userEmbeddingController.refreshEmbedding);

// Preference summary getir
router.get('/preference-summary', userEmbeddingController.getPreferenceSummary);

module.exports = router;
