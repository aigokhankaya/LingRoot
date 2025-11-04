const express = require('express');
const router = express.Router();
const aiChatController = require('../controllers/aiChatController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Conversation routes
router.get('/conversations', aiChatController.getConversations);
router.post('/conversations', aiChatController.createConversation);
router.delete('/conversations/:conversationId', aiChatController.deleteConversation);

// Message routes
router.get('/conversations/:conversationId/messages', aiChatController.getMessages);
router.post('/conversations/:conversationId/messages', aiChatController.sendMessage);

// Topic suggestions
router.get('/suggestions', aiChatController.getPopularTopics);
router.get('/conversations/:conversationId/suggestions', aiChatController.getTopicSuggestions);

module.exports = router;
