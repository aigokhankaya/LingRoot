// backend/routes/mfaRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { mfaAligner } = require('../utils/mfaAligner');
const logger = require('../utils/logger');

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

/**
 * Health check endpoint
 * GET /api/mfa/health
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'MFA Alignment Service',
    timestamp: new Date().toISOString()
  });
});

/**
 * MFA Alignment endpoint
 * POST /api/mfa/align
 * 
 * Request body:
 * - audioBuffer: Base64 encoded audio file (or multipart file upload)
 * - transcript: Text transcript for alignment
 * - locale: Language locale (default: 'en_US')
 */
router.post('/align', upload.single('audio'), async (req, res) => {
  const requestId = req.headers['x-request-id'] || `mfa_${Date.now()}`;
  let tempAudioPath = null;

  try {
    logger.info(`[${requestId}] MFA alignment request received`);

    // Get transcript from request
    const { transcript, locale = 'en_US' } = req.body;

    if (!transcript) {
      return res.status(400).json({
        success: false,
        error: 'Transcript is required'
      });
    }

    // Handle audio input (either file upload or base64)
    let audioBuffer;
    
    if (req.file) {
      // Multipart file upload
      audioBuffer = req.file.buffer;
      logger.info(`[${requestId}] Audio received via multipart upload: ${req.file.size} bytes`);
    } else if (req.body.audioBuffer) {
      // Base64 encoded audio
      audioBuffer = Buffer.from(req.body.audioBuffer, 'base64');
      logger.info(`[${requestId}] Audio received via base64: ${audioBuffer.length} bytes`);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required (either as multipart upload or base64 audioBuffer)'
      });
    }

    // Save audio to temporary file
    const tempDir = os.tmpdir();
    tempAudioPath = path.join(tempDir, `mfa_audio_${requestId}.mp3`);
    await fs.writeFile(tempAudioPath, audioBuffer);
    logger.info(`[${requestId}] Audio saved to temp file: ${tempAudioPath}`);

    // Perform MFA alignment
    logger.info(`[${requestId}] Starting MFA alignment...`);
    const timepoints = await mfaAligner.generateWordTimestamps(tempAudioPath, transcript, locale);
    
    logger.info(`[${requestId}] MFA alignment completed: ${timepoints.length} words`);

    // Return results
    res.json({
      success: true,
      timepoints,
      wordCount: timepoints.length,
      requestId
    });

  } catch (error) {
    logger.error(`[${requestId}] MFA alignment failed:`, error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'MFA alignment failed',
      requestId
    });
  } finally {
    // Cleanup temp file
    if (tempAudioPath) {
      try {
        await fs.unlink(tempAudioPath);
        logger.info(`[${requestId}] Temp audio file cleaned up`);
      } catch (err) {
        logger.warn(`[${requestId}] Failed to cleanup temp file:`, err.message);
      }
    }
  }
});

/**
 * Check MFA availability
 * GET /api/mfa/status
 */
router.get('/status', async (req, res) => {
  try {
    const isAvailable = await mfaAligner.checkMFAAvailability();
    const modelsReady = await mfaAligner.checkLocalModels();

    res.json({
      success: true,
      available: isAvailable,
      modelsReady,
      message: isAvailable 
        ? 'MFA is available and ready' 
        : 'MFA is not available (Docker not running or models missing)'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      available: false,
      error: error.message
    });
  }
});

module.exports = router;
