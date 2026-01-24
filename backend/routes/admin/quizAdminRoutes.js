/**
 * 📝 Quiz Admin Routes
 * 
 * Admin panel quiz yönetimi route'ları
 */

const express = require('express');
const router = express.Router();
const quizController = require('../../controllers/quizController');
const { authenticate, authorizeAdmin } = require('../../middleware/auth');

// Tüm endpoint'ler admin auth gerektirir
router.use(authenticate);
router.use(authorizeAdmin);

// Sektöre quiz ekle
router.post('/sectors/:sectorId/quizzes', quizController.createQuiz);

// Tek quiz işlemleri
router.get('/:id', async (req, res) => {
    // Admin için cevaplarla birlikte getir
    const quizService = require('../../services/quizService');
    try {
        const quiz = await quizService.getQuizById(req.params.id, true);
        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz bulunamadı' });
        }
        res.json({ success: true, data: quiz });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Quiz getirilirken hata oluştu' });
    }
});
router.put('/:id', quizController.updateQuiz);
router.delete('/:id', quizController.deleteQuiz);

module.exports = router;
