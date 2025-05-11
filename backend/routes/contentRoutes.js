const express = require('express'); 
const router = express.Router();
const contentController = require('../controllers/contentController');
const { authenticate } = require('../middleware/auth');

// Process content routes
router.post('/process-link', contentController.processLink);
router.post('/process-text', contentController.processText);
router.post('/process-file', contentController.processFile);

// ✅ Yeni eklenen route:
router.post('/submit', contentController.submitContent);

// Content history routes
router.get('/history', authenticate, contentController.getContentHistory);
router.get('/history/:id', authenticate, contentController.getContentById);
router.delete('/history/:id', authenticate, contentController.deleteContent);

module.exports = router;
