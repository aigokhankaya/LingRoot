const express = require('express');
const router = express.Router();
const aiChatController = require('../controllers/aiChatController');
const { authenticate } = require('../middleware/auth');
const { chatLimiter, chatDailyLimiter } = require('../middleware/security');

// All routes require authentication
router.use(authenticate);

// Conversation routes (normal limit)
router.get('/conversations', aiChatController.getConversations);
router.post('/conversations', aiChatController.createConversation);
router.put('/conversations/:conversationId', aiChatController.updateConversationTitle);
router.delete('/conversations/:conversationId', aiChatController.deleteConversation);

// Message routes (rate limited - AI API calls)
router.get('/conversations/:conversationId/messages', aiChatController.getMessages);
router.post('/conversations/:conversationId/messages', chatLimiter, chatDailyLimiter, aiChatController.sendMessage);

// Topic suggestions
router.get('/suggestions', aiChatController.getPopularTopics);
router.get('/conversations/:conversationId/suggestions', aiChatController.getTopicSuggestions);

// Daily personalized suggestions for Liro chat
router.get('/daily-suggestions', aiChatController.getDailySuggestions);

// Daily topic for empty state card
router.get('/daily-topic', aiChatController.getDailyTopic);

// Feedback for daily suggestions (clicks, not_relevant etc.)
router.post('/daily-suggestions/feedback', aiChatController.saveDailySuggestionFeedback);

// Mini activities (ChatGPT-Quality Enhancement)
router.post('/mini-activity', chatLimiter, aiChatController.generateMiniActivity);

// Recommendation interactions
router.post('/recommendations/interaction', aiChatController.recordRecommendationInteraction);

// User long-term memories
router.get('/memories', aiChatController.getUserMemories);
router.delete('/memories/:memoryId', aiChatController.deactivateMemory);

module.exports = router;
