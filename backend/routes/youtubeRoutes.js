// backend/routes/youtubeRoutes.js

const express = require('express');
const router = express.Router();
const { fetchYoutubeTranscript } = require('../utils/youtubeTranscriptService');
const logger = require('../utils/logger');

/**
 * POST /api/youtube-transcript
 * YouTube videosundan altyazı çeker (yerel Playwright servisi kullanır)
 */
router.post('/youtube-transcript', async (req, res) => {
  try {
    const { url, language_code } = req.body;
    
    if (!url || typeof url !== 'string') {
      logger.warn('YouTube transcript request missing URL');
      return res.status(400).json({ 
        success: false, 
        error: 'Geçerli bir YouTube URL\'si gerekli' 
      });
    }

    // URL formatını kontrol et
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i;
    if (!youtubeRegex.test(url)) {
      logger.warn(`Invalid YouTube URL format: ${url}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Geçerli bir YouTube URL\'si girin' 
      });
    }

    logger.info(`Fetching YouTube transcript for: ${url}`);

    // Yerel Playwright servisini çağır (localhost:8000)
    const languageCode = language_code || 'tr';
    const transcript = await fetchYoutubeTranscript(url, languageCode);
    
    if (!transcript) {
      logger.warn(`No transcript found for: ${url}`);
      return res.status(404).json({ 
        success: false, 
        errorCode: 'NO_SUBTITLES',
        message: 'Bu videoda altyazı bulunmamaktadır' 
      });
    }

    logger.info(`Successfully fetched transcript for: ${url} (${transcript.length} chars)`);
    
    return res.status(200).json({ 
      success: true, 
      text: transcript 
    });
    
  } catch (error) {
    logger.error('YouTube transcript error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Altyazı çekilirken bir hata oluştu',
      details: error.message 
    });
  }
});

/**
 * GET /api/youtube-transcript/health
 * Yerel Playwright servisinin sağlık kontrolü
 */
router.get('/youtube-transcript/health', async (req, res) => {
  try {
    const { checkTranscriptServiceHealth } = require('../utils/youtubeTranscriptService');
    const isHealthy = await checkTranscriptServiceHealth();
    
    if (isHealthy) {
      return res.status(200).json({
        service: 'youtube-transcript',
        status: 'healthy',
        backend: 'local-playwright',
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(503).json({
        service: 'youtube-transcript',
        status: 'unhealthy',
        backend: 'local-playwright',
        error: 'Playwright servisi erişilebilir değil',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('YouTube transcript health check error:', error);
    return res.status(503).json({
      service: 'youtube-transcript',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
