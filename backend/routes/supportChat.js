const express = require('express');
const router = express.Router();
const multer = require('multer');
const logger = require('../utils/common/logger.js');
const supportChatController = require('../controllers/supportChatController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// Multer memory storage for support chat attachments (uploaded to Supabase)
const supportChatStorage = multer.memoryStorage();

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
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/ogg',
];

const upload = multer({
  storage: supportChatStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      logger.info(`Accepting support file upload: ${file.originalname} (${file.mimetype})`);
      return cb(null, true);
    }
    logger.warn(`Rejecting support file upload: ${file.originalname} (${file.mimetype})`);
    const err = new Error(`Geçersiz dosya türü: ${file.mimetype}`);
    err.statusCode = 400;
    return cb(err, false);
  },
});

// USER ROUTES (mount these under e.g. /api/support-chat)
router.get('/conversations', authenticate, supportChatController.getUserSupportConversations);
router.post('/conversations', authenticate, supportChatController.createSupportConversation);
router.get('/conversations/:conversationId/messages', authenticate, supportChatController.getSupportConversationMessages);
router.post(
  '/conversations/:conversationId/messages',
  authenticate,
  upload.array('files', 5),
  (req, res, next) => {
    next();
  },
  supportChatController.sendSupportMessage,
  (error, req, res, next) => {
    if (error) {
      logger.error('Support chat upload error:', error);
      return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
    next();
  },
);
router.post('/conversations/:conversationId/reopen', authenticate, supportChatController.reopenSupportConversation);

// Protected attachment download
router.get('/attachments/:attachmentId', authenticate, supportChatController.getSupportAttachment);

// ADMIN ROUTES
router.get('/admin/conversations', authenticate, authorizeAdmin, supportChatController.getAdminSupportConversations);
router.put('/admin/conversations/:conversationId', authenticate, authorizeAdmin, supportChatController.updateSupportConversationStatus);
router.get('/admin/stats', authenticate, authorizeAdmin, supportChatController.getSupportConversationStats);

module.exports = router;
