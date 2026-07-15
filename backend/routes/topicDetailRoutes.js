const express = require('express');
const router = express.Router();
const { getTopicDetailSuggestions, getGeneratedSuggestions } = require('../controllers/topicDetailController');
const { authenticate } = require('../middleware/auth');

// Giriş yapmış kullanıcılar için detaylı konu önerileri al
router.post('/suggestions', authenticate, getTopicDetailSuggestions);

// Generated suggestions tablosundan konu başlıklarını al (authentication gerekmez)
router.get('/generated-suggestions', getGeneratedSuggestions);

module.exports = router; 
