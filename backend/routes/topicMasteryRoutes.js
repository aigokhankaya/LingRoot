const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const topicMasteryController = require('../controllers/topicMasteryController');

// Tüm route'lar authentication gerektirir
router.use(authenticate);

// Genel istatistikler (önce tanımla, :topicNodeId ile çakışmasın)
router.get('/stats', topicMasteryController.getOverallStats);

// Tüm mastery'leri getir
router.get('/', topicMasteryController.getUserMasteries);

// Belirli bir konunun mastery'si
router.get('/:topicId', topicMasteryController.getMastery);

// İçerik etkileşimi kaydet (internal/test)
router.post('/:topicId/interaction', topicMasteryController.recordInteraction);

module.exports = router;
