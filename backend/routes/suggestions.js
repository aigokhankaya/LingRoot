const express = require('express');
const router = express.Router();
const { generateSuggestions } = require('../controllers/suggestionsController');

router.post('/', generateSuggestions);

module.exports = router; 