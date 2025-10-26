const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Debug endpoint: Son TTS isteğinin timing kalitesini göster
let lastTTSDebugInfo = null;

router.post('/tts-debug', (req, res) => {
  lastTTSDebugInfo = req.body;
  logger.info('🔍 TTS Debug Info Received:', lastTTSDebugInfo);
  res.json({ success: true });
});

router.get('/tts-debug', (req, res) => {
  if (!lastTTSDebugInfo) {
    return res.json({ success: false, message: 'No debug info available' });
  }
  res.json({ success: true, data: lastTTSDebugInfo });
});

module.exports = router;
