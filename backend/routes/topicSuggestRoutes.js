const express = require('express');
const router = express.Router();
const { suggestTopics } = require('../controllers/topicSuggestController');

router.post('/', suggestTopics);

module.exports = router; 