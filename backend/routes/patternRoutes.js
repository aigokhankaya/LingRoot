const express = require('express');
const router = express.Router();
const patternController = require('../controllers/patternController');
const llmPatternController = require('../controllers/llmPatternController');
const { authenticate } = require('../middleware/authMiddleware');

// Get patterns by level
router.get('/level/:level', authenticate, patternController.getPatternsByLevel);

// Find patterns in text
router.post('/find', authenticate, patternController.findPatternsInText);

// Search pattern library (Pattern Lab) - Public for testing
router.get('/search', patternController.searchPatterns);

// Get user's pattern history
router.get('/history', authenticate, patternController.getUserPatternHistory);

// LLM Pattern Generator endpoints
router.get('/llm/models', llmPatternController.getModels);
router.post('/llm/generate', authenticate, llmPatternController.generatePatterns);

module.exports = router;
