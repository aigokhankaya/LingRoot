const express = require('express');
const router = express.Router();
const translationController = require('../controllers/translationController');
const { authenticate } = require('../middleware/authMiddleware');

// Test Translation API (for Lab UI) - Public for testing
router.post('/test', translationController.testTranslationAPI);

module.exports = router;
