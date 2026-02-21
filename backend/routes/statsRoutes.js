const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authenticate } = require('../middleware/authMiddleware');
const { redisCache } = require('../middleware/redisCache');

// Get user dashboard statistics (300s cache - 5 minutes)
router.get('/dashboard', authenticate, redisCache('stats:user', 300), statsController.getUserStats);

module.exports = router;
