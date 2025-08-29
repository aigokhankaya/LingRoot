const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

// User routes
router.get('/conversations', authenticateToken, chatController.getUserConversations);
router.post('/conversations', authenticateToken, chatController.createConversation);
router.get('/conversations/:conversationId/messages', authenticateToken, chatController.getConversationMessages);
router.post('/conversations/:conversationId/messages', authenticateToken, chatController.sendMessage);

// Admin routes
router.get('/admin/conversations', authenticateToken, chatController.getAdminConversations);
router.put('/admin/conversations/:conversationId', authenticateToken, chatController.updateConversationStatus);
router.get('/admin/stats', authenticateToken, chatController.getConversationStats);

module.exports = router;
