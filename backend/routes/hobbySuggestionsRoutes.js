const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { 
  generateAndStoreHobbySuggestions, 
  getRandomHobbySuggestions,
  checkHobbyExists
} = require('../controllers/hobbySuggestionsController');

// Generate 200 suggestions for a hobby (admin/one-time)
router.post('/generate', authenticate, generateAndStoreHobbySuggestions);

// Get 5 random suggestions for a hobby
router.post('/random', authenticate, getRandomHobbySuggestions);

// Check if hobby suggestions exist
router.get('/check', authenticate, checkHobbyExists);

module.exports = router;
