/**
 * 🗂️ Vocabulary Routes
 * 
 * SRS review system endpoints.
 */

const express = require('express');
const router = express.Router();
const vocabularyController = require('../controllers/vocabularyController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Get Flashcards (Daily Mix)
router.get('/due', vocabularyController.getDueWords);

// Submit Review (Flashcard Swipe)
router.post('/review', vocabularyController.submitReview);

// Add Word (from Context Menu etc.)
router.post('/add', vocabularyController.addWord);

module.exports = router;