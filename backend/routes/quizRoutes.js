/**
 * 📝 Quiz Routes
 * 
 * Sektör quiz kullanıcı route'ları
 */

const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { authenticate } = require('../middleware/auth');

// Tüm endpoint'ler auth gerektirir
router.use(authenticate);

// Quiz listesi (sektör bazlı - sectorRoutes'tan erişilir)
// GET /api/sectors/:sectorId/quizzes -> sectorRoutes'ta tanımlı

// Kullanıcı sonuçları ve istatistikler
router.get('/results', quizController.getUserQuizResults);
router.get('/stats', quizController.getUserQuizStats);

// Tek quiz işlemleri
router.get('/:id', quizController.getQuizById);
router.post('/:id/submit', quizController.submitQuiz);

module.exports = router;
