const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authenticate } = require('../middleware/authMiddleware');

// Get user dashboard statistics
router.get('/dashboard', authenticate, statsController.getUserStats);

module.exports = router;
