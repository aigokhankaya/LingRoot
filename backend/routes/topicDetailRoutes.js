const express = require('express');
const router = express.Router();
const { getTopicDetailSuggestions } = require('../controllers/topicDetailController');
const { authenticate } = require('../middleware/authMiddleware');

// Giriş yapmış kullanıcılar için detaylı konu önerileri al
router.post('/suggestions', authenticate, getTopicDetailSuggestions);

module.exports = router; 