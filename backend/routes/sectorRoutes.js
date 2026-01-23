/**
 * 🏢 Sector English Routes
 * 
 * Public/User routes for accessing Sector English content.
 */

const express = require('express');
const router = express.Router();
const sectorController = require('../controllers/sectorController');
const { optionalAuth, authenticate } = require('../middleware/authMiddleware');

// ============ PUBLIC ROUTES ============

// Tüm sektörleri listele (Public)
router.get('/', optionalAuth, sectorController.getAllSectors);

// Kullanıcı istatistikleri (Auth required) - /stats must come before /:id
router.get('/stats', authenticate, sectorController.getUserSectorStats);

// Tek sektör detayı (Public)
router.get('/:id', optionalAuth, sectorController.getSectorById);

// Sektör içerikleri (Public)
router.get('/:id/content', optionalAuth, sectorController.getSectorContent);

// Sektör terminolojisi (Public)
router.get('/:id/vocabulary', optionalAuth, sectorController.getSectorVocabulary);

// Sektör ilerleme durumu (Auth required)
router.get('/:id/progress', authenticate, sectorController.getSectorProgress);

// Sektör için toplu TTS oluştur (Admin - requires auth)
router.post('/:id/generate-audio', authenticate, sectorController.generateSectorAudio);

// ============ CONTENT ROUTES ============

// İçerik detayı (Public - doğrudan contentId ile erişim için)
router.get('/content/:contentId', optionalAuth, sectorController.getContentById);

// İçerik için TTS ses oluştur/getir (on-demand)
router.post('/content/:contentId/audio', optionalAuth, sectorController.generateContentAudio);

// İçerik ilerleme durumu (Auth required)
router.get('/content/:contentId/progress', authenticate, sectorController.getContentProgress);
router.post('/content/:contentId/progress', authenticate, sectorController.updateContentProgress);

// ============ VOCABULARY ROUTES ============

// Kelimeyi SRS tekrar listesine ekle (Auth required)
router.post('/vocabulary/:wordId/add-to-review', authenticate, sectorController.addVocabularyToReview);

module.exports = router;
