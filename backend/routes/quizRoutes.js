/**
 * 📝 Quiz Routes
 * 
 * Sektör quiz kullanıcı route'ları
 * 
 * Endpoints:
 * - GET /api/quizzes/results - Kullanıcı quiz sonuçları
 * - GET /api/quizzes/stats - Quiz istatistikleri
 * - GET /api/quizzes/struggling-words - Zorlanılan kelimeler
 * - GET /api/quizzes/difficulty-profile - Kullanıcı zorluk profili
 * - POST /api/quizzes/generate - Dinamik quiz üret
 * - GET /api/quizzes/:id - Quiz detayı
 * - POST /api/quizzes/:id/submit - Quiz gönder
 */

const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { authenticate } = require('../middleware/auth');

// Tüm endpoint'ler auth gerektirir
router.use(authenticate);

// =====================================================
// KULLANICI İSTATİSTİK ENDPOINT'LERİ
// =====================================================

// Kullanıcı sonuçları ve istatistikler
router.get('/results', quizController.getUserQuizResults);
router.get('/stats', quizController.getUserQuizStats);

// Zorlanılan kelimeler (SRS için)
router.get('/struggling-words', quizController.getStrugglingWords);

// Kullanıcı zorluk profili
router.get('/difficulty-profile', quizController.getDifficultyProfile);

// =====================================================
// DİNAMİK QUIZ ÜRETİMİ
// =====================================================

// İçerik bazlı dinamik quiz üret
router.post('/generate', quizController.generateQuiz);

// =====================================================
// TEK QUIZ İŞLEMLERİ
// =====================================================

router.get('/:id', quizController.getQuizById);
router.post('/:id/submit', quizController.submitQuiz);

module.exports = router;

