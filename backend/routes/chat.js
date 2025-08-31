const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const logger = require('../utils/logger');
const chatController = require('../controllers/chatController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// Multer memory storage for chat attachments (will upload to Supabase)
const chatStorage = multer.memoryStorage();

const allowedMimeTypes = [
  // images
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  // docs
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  // spreadsheets & presentations
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // audio (limited)
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/ogg'
];

const upload = multer({
  storage: chatStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 5 }, // 20MB per file, max 5 files
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      logger.info(`Accepting file upload: ${file.originalname} (${file.mimetype})`);
      return cb(null, true);
    }
    logger.warn(`Rejecting file upload: ${file.originalname} (${file.mimetype})`);
    const err = new Error(`Geçersiz dosya türü: ${file.mimetype}`);
    err.statusCode = 400;
    return cb(err, false);
  }
});

// User routes
router.get('/conversations', authenticate, chatController.getUserConversations);
router.post('/conversations', authenticate, chatController.createConversation);
router.get('/conversations/:conversationId/messages', authenticate, chatController.getConversationMessages);
router.post(
  '/conversations/:conversationId/messages',
  authenticate,
  upload.array('files', 5),
  (req, res, next) => {
    next();
  },
  chatController.sendMessage,
  (error, req, res, next) => {
    // Multer errors
    if (error) {
      logger.error('Chat upload error:', error);
      return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
    next();
  }
);
router.post('/conversations/:conversationId/reopen', authenticate, chatController.reopenConversation);

// Protected attachment download
router.get('/attachments/:attachmentId', authenticate, chatController.getAttachment);

// Admin routes
router.get('/admin/conversations', authenticate, authorizeAdmin, chatController.getAdminConversations);
router.put('/admin/conversations/:conversationId', authenticate, authorizeAdmin, chatController.updateConversationStatus);
router.get('/admin/stats', authenticate, authorizeAdmin, chatController.getConversationStats);

module.exports = router;
