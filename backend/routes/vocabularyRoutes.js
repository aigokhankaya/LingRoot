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

// Lookup word in global vocabulary
router.get('/lookup', vocabularyController.lookupWord);

// Get Flashcards (Daily Mix)
router.get('/due', vocabularyController.getDueWords);

// Get User Stats (for dashboard)
router.get('/stats', vocabularyController.getStats);

// Get User Collection (all words)
router.get('/collection', vocabularyController.getCollection);

// Get Random Words (for variety practice)
router.get('/random', vocabularyController.getRandomWords);

// Submit Review (Flashcard Swipe)
router.post('/review', vocabularyController.submitReview);

// Add Word (from Context Menu etc.)
router.post('/add', vocabularyController.addWord);

module.exports = router;