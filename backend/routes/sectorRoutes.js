/**
 * 🏢 Sector English Routes
 * 
 * Public/User routes for accessing Sector English content.
 */

const express = require('express');
const router = express.Router();
const sectorController = require('../controllers/sectorController');
const { optionalAuth, authenticate } = require('../middleware/authMiddleware');

// Tüm sektörleri listele (Public)
router.get('/', optionalAuth, sectorController.getAllSectors);

// Tek sektör detayı (Public)
router.get('/:id', optionalAuth, sectorController.getSectorById);

// Sektör içerikleri (Public)
router.get('/:id/content', optionalAuth, sectorController.getSectorContent);

// Sektör terminolojisi (Public)
router.get('/:id/vocabulary', optionalAuth, sectorController.getSectorVocabulary);

// Sektör için toplu TTS oluştur (Admin - requires auth)
router.post('/:id/generate-audio', authenticate, sectorController.generateSectorAudio);

// İçerik detayı (Public - doğrudan contentId ile erişim için)
router.get('/content/:contentId', optionalAuth, sectorController.getContentById);

// İçerik için TTS ses oluştur/getir (on-demand)
router.post('/content/:contentId/audio', optionalAuth, sectorController.generateContentAudio);

module.exports = router;

