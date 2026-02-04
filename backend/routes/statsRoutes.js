const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authenticate } = require('../middleware/authMiddleware');
const { redisCache } = require('../middleware/redisCache');

// Get user dashboard statistics
router.get('/dashboard', authenticate, redisCache('stats:user', 60), statsController.getUserStats);

module.exports = router;
