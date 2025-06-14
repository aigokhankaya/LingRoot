const express = require('express');
const router = express.Router();
const { rewriteToNarration } = require('../controllers/narrationController');
const { authenticate } = require('../middleware/authMiddleware');

// Giriş yapmış kullanıcılar için metin anlatım formatına dönüştürme
router.post('/rewrite', authenticate, rewriteToNarration);

module.exports = router; 