// backend/routes/mfaRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { mfaAligner } = require('../utils/mfaAligner');
const logger = require('../utils/logger');

const mfaJobs = new Map();
const mfaJobQueue = [];
let mfaActiveJobs = 0;

const getMfaMaxConcurrentJobs = () => {
  const raw = process.env.MFA_ASYNC_MAX_CONCURRENT;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
};

const createMfaJobId = () => `mfa_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const updateMfaJob = (jobId, updates) => {
  const job = mfaJobs.get(jobId);
  if (!job) return null;
  Object.assign(job, updates, { updatedAt: new Date().toISOString() });
  mfaJobs.set(jobId, job);
  return job;
};

const cleanupMfaTempFile = async (tempAudioPath) => {
  if (!tempAudioPath) return;
  try {
    await fs.unlink(tempAudioPath);
  } catch {
    // ignore
  }
};

const cleanupOldMfaJobs = async () => {
  const maxAgeMs = Number(process.env.MFA_ASYNC_JOB_MAX_AGE_MS || 6 * 60 * 60 * 1000);
  const cutoff = Date.now() - (Number.isFinite(maxAgeMs) ? maxAgeMs : 6 * 60 * 60 * 1000);
  for (const [jobId, job] of mfaJobs.entries()) {
    const createdAt = new Date(job.createdAt).getTime();
    if (!Number.isFinite(createdAt) || createdAt >= cutoff) continue;
    if (job && job.tempAudioPath) {
      await cleanupMfaTempFile(job.tempAudioPath);
    }
    mfaJobs.delete(jobId);
  }
};

setInterval(() => {
  cleanupOldMfaJobs().catch(() => {});
}, 30 * 60 * 1000);

const processNextMfaJob = () => {
  const maxConcurrent = getMfaMaxConcurrentJobs();
  if (mfaActiveJobs >= maxConcurrent) return;

  const nextJobId = mfaJobQueue.shift();
  if (!nextJobId) return;

  const job = mfaJobs.get(nextJobId);
  if (!job || job.status !== 'pending') {
    setImmediate(processNextMfaJob);
    return;
  }

  mfaActiveJobs += 1;
  updateMfaJob(nextJobId, { status: 'processing', progress: 10 });

  setImmediate(async () => {
    try {
      const mfaDebugEnabled = process.env.MFA_DEBUG_DUMP === 'true';
      const timepoints = await mfaAligner.generateWordTimestamps(job.tempAudioPath, job.transcript, job.locale, {
        forceLocal: true,
        debug: mfaDebugEnabled
          ? {
              id: job.debugId || job.id,
              source: 'mfaRoutes:align-async',
              requestId: job.requestId || job.id,
            }
          : null,
      });

      updateMfaJob(nextJobId, {
        status: 'completed',
        progress: 100,
        result: {
          timepoints,
          wordCount: Array.isArray(timepoints) ? timepoints.length : 0,
        },
        error: null,
      });
    } catch (err) {
      updateMfaJob(nextJobId, {
        status: 'failed',
        progress: 100,
        error: err?.message || String(err),
      });
    } finally {
      await cleanupMfaTempFile(job && job.tempAudioPath);
      if (job) {
        job.tempAudioPath = null;
        mfaJobs.set(nextJobId, job);
      }
      mfaActiveJobs = Math.max(0, mfaActiveJobs - 1);
      setImmediate(processNextMfaJob);
    }
  });
};

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
 * Async MFA Alignment endpoint
 * POST /api/mfa/align-async
 * Returns immediately with a jobId.
 */
router.post('/align-async', upload.single('audio'), async (req, res) => {
  const requestId = req.headers['x-request-id'] || `mfa_${Date.now()}`;
  let tempAudioPath = null;

  try {
    logger.info(`[${requestId}] MFA async alignment request received`);

    const { transcript, locale = 'en_US' } = req.body;
    if (!transcript) {
      return res.status(400).json({ success: false, error: 'Transcript is required' });
    }

    let audioBuffer;
    if (req.file) {
      audioBuffer = req.file.buffer;
      logger.info(`[${requestId}] Audio received via multipart upload: ${req.file.size} bytes`);
    } else if (req.body.audioBuffer) {
      audioBuffer = Buffer.from(req.body.audioBuffer, 'base64');
      logger.info(`[${requestId}] Audio received via base64: ${audioBuffer.length} bytes`);
    } else {
      return res.status(400).json({ success: false, error: 'Audio file is required (either as multipart upload or base64 audioBuffer)' });
    }

    const tempDir = os.tmpdir();
    let tempExt = '.mp3';
    const originalName = req.file && req.file.originalname ? String(req.file.originalname) : '';
    const mime = req.file && req.file.mimetype ? String(req.file.mimetype) : '';
    const lowerName = originalName.toLowerCase();
    const lowerMime = mime.toLowerCase();
    if (lowerName.endsWith('.wav') || lowerMime.includes('wav')) tempExt = '.wav';
    else if (lowerName.endsWith('.m4a') || lowerMime.includes('mp4') || lowerMime.includes('m4a')) tempExt = '.m4a';
    else if (lowerName.endsWith('.ogg') || lowerMime.includes('ogg')) tempExt = '.ogg';
    else if (lowerName.endsWith('.mp3') || lowerMime.includes('mpeg') || lowerMime.includes('mp3')) tempExt = '.mp3';
    tempAudioPath = path.join(tempDir, `mfa_audio_${requestId}${tempExt}`);
    await fs.writeFile(tempAudioPath, audioBuffer);

    const jobId = createMfaJobId();
    const debugIdFromHeader = req.headers['x-mfa-debug-id'];
    const job = {
      id: jobId,
      requestId: String(requestId),
      debugId: debugIdFromHeader ? String(debugIdFromHeader) : null,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transcript: String(transcript),
      locale: String(locale || 'en_US'),
      tempAudioPath,
      result: null,
      error: null,
    };

    mfaJobs.set(jobId, job);
    mfaJobQueue.push(jobId);
    processNextMfaJob();

    return res.json({
      success: true,
      jobId,
      status: job.status,
    });
  } catch (error) {
    await cleanupMfaTempFile(tempAudioPath);
    return res.status(500).json({
      success: false,
      error: error.message || 'MFA alignment failed',
      requestId,
    });
  }
});

/**
 * Get MFA async job status
 * GET /api/mfa/job/:jobId
 */
router.get('/job/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = mfaJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }

  return res.json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      result: job.result,
      error: job.error,
    },
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
    let tempExt = '.mp3';
    const originalName = req.file && req.file.originalname ? String(req.file.originalname) : '';
    const mime = req.file && req.file.mimetype ? String(req.file.mimetype) : '';
    const lowerName = originalName.toLowerCase();
    const lowerMime = mime.toLowerCase();
    if (lowerName.endsWith('.wav') || lowerMime.includes('wav')) tempExt = '.wav';
    else if (lowerName.endsWith('.m4a') || lowerMime.includes('mp4') || lowerMime.includes('m4a')) tempExt = '.m4a';
    else if (lowerName.endsWith('.ogg') || lowerMime.includes('ogg')) tempExt = '.ogg';
    else if (lowerName.endsWith('.mp3') || lowerMime.includes('mpeg') || lowerMime.includes('mp3')) tempExt = '.mp3';
    tempAudioPath = path.join(tempDir, `mfa_audio_${requestId}${tempExt}`);
    await fs.writeFile(tempAudioPath, audioBuffer);
    logger.info(`[${requestId}] Audio saved to temp file: ${tempAudioPath}`);

    // Perform MFA alignment
    logger.info(`[${requestId}] Starting MFA alignment...`);
    const mfaDebugEnabled = process.env.MFA_DEBUG_DUMP === 'true';
    const debugIdFromHeader = req.headers['x-mfa-debug-id'];
    const timepoints = await mfaAligner.generateWordTimestamps(tempAudioPath, transcript, locale, {
      forceLocal: true,
      debug: mfaDebugEnabled
        ? {
            id: debugIdFromHeader ? String(debugIdFromHeader) : String(requestId),
            source: 'mfaRoutes',
            requestId: String(requestId),
          }
        : null,
    });
    
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
