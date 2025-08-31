const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// User routes
router.get('/conversations', authenticate, chatController.getUserConversations);
router.post('/conversations', authenticate, chatController.createConversation);
router.get('/conversations/:conversationId/messages', authenticate, chatController.getConversationMessages);
router.post('/conversations/:conversationId/messages', authenticate, chatController.sendMessage);
router.post('/conversations/:conversationId/reopen', authenticate, chatController.reopenConversation);

// Admin routes
router.get('/admin/conversations', authenticate, authorizeAdmin, chatController.getAdminConversations);
router.put('/admin/conversations/:conversationId', authenticate, authorizeAdmin, chatController.updateConversationStatus);
router.get('/admin/stats', authenticate, authorizeAdmin, chatController.getConversationStats);

module.exports = router;
