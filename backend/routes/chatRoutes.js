const express = require('express');
const router = express.Router();
const { chatConversation, getInitialMessage } = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

// Get initial chat message
router.get('/initial', authenticate, getInitialMessage);

// Send message to chat
router.post('/message', authenticate, chatConversation);

module.exports = router; 