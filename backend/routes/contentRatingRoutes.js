const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
    rateContent,
    submitFeedback,
    getUserRating
} = require('../controllers/contentRatingController');

// Rating endpoints
router.post('/rate', authenticate, rateContent);
router.get('/rating', authenticate, getUserRating);

// Feedback endpoint
router.post('/feedback', authenticate, submitFeedback);

module.exports = router;
