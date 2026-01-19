const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const userEmbeddingController = require('../controllers/userEmbeddingController');

// Tüm route'lar authentication gerektirir
router.use(authenticate);

// Kullanıcıya özel içerik önerileri
router.get('/', userEmbeddingController.getRecommendations);

// Benzer kullanıcıları getir
router.get('/similar-users', userEmbeddingController.getSimilarUsers);

// Embedding'i yeniden oluştur
router.post('/refresh-embedding', userEmbeddingController.refreshEmbedding);

// Preference summary getir
router.get('/preference-summary', userEmbeddingController.getPreferenceSummary);

module.exports = router;
