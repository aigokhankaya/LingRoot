const express = require('express');
const router = express.Router();
const srsController = require('../controllers/srsController');
const { authenticate } = require('../middleware/authMiddleware');

// Tüm route'lar authentication gerektirir
router.use(authenticate);

// Get words due for review
router.get('/due', srsController.getDueWords);

// Submit a review (or add new word with review)
router.post('/review', srsController.reviewWord);

// Add a new word manually (Plandaki API şeması)
router.post('/words', srsController.addWord);

// Get SRS statistics
router.get('/stats', srsController.getStats);

module.exports = router;
