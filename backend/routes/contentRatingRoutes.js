const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
    rateContent,
    submitFeedback,
    getUserRating
} = require('../controllers/contentRatingController');

// Rating endpoints
router.post('/rate', authenticateToken, rateContent);
router.get('/rating', authenticateToken, getUserRating);

// Feedback endpoint
router.post('/feedback', authenticateToken, submitFeedback);

module.exports = router;
