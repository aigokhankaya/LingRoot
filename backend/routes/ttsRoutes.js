// backend/routes/ttsRoutes.js

const express = require("express");
const multer = require("multer");
const {
  handleTTSRequest,
  translateToEnglish,
  adaptToCEFR,
  chunkTextAPI,
  synthesizeChunkAPI,
  mergeAudioAPI,
  listVoices,
  getAudioFile,
  getVttFile,
  getFilteredVoices,
  testVoices
} = require("../controllers/ttsController");
const {
  logSyncFeedback,
  analyzeSyncFeedback
} = require("../controllers/syncFeedbackController");
const logger = require("../utils/logger");
const { authenticate } = require('../middleware/auth');
const jobQueue = require('../utils/jobQueue');
const { sendPushNotification, getUnreadNotifications, markNotificationAsRead } = require('../utils/pushNotification');
const fetch = require('node-fetch');
const { supabase } = require('../utils/supabaseClient');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { mfaAligner } = require('../utils/mfaAligner');

const router = express.Router();

// Define allowed MIME types for file uploads
const allowedMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

// Configure multer for file uploads
const storage = multer.memoryStorage(); // In-memory storage
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      logger.info(`Multer: Allowing file upload - ${file.originalname} (${file.mimetype})`);
      cb(null, true);
    } else {
      logger.warn(`Multer: Rejecting file upload - ${file.originalname} (${file.mimetype})`);
      cb(new Error(`Invalid file type. Only PDF and DOCX files are allowed. Received: ${file.mimetype}`), false);
    }
  }
});

// POST /api/tts/process – Handles both JSON and multipart/form-data (SYNC)
router.post(
  "/process",
  authenticate,
  upload.single("file"),
  (req, res, next) => {
    if (req.fileValidationError) {
      logger.error(`File validation error: ${req.fileValidationError.message}`);
      return res.status(400).json({ success: false, message: req.fileValidationError.message });
    }
    handleTTSRequest(req, res, next);
  },
  (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      logger.error(`Multer error: ${error.message}`, { code: error.code });
      return res.status(400).json({ success: false, message: `File upload error: ${error.message}` });
    } else if (error) {
      logger.error(`File filter error: ${error.message}`);
      return res.status(400).json({ success: false, message: error.message });
    }
    next();
  }
);

// POST /api/tts/process-async – Async TTS processing with notification
router.post(
  "/process-async",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (req.fileValidationError) {
        logger.error(`File validation error: ${req.fileValidationError.message}`);
        return res.status(400).json({ success: false, message: req.fileValidationError.message });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      // Prevent multiple concurrent async TTS jobs per user
      const existingJob = jobQueue.getActiveJobForUser(userId);
      if (existingJob) {
        logger.info(`[AsyncTTS] Existing active job ${existingJob.id} for user ${userId}; rejecting new request`);
        return res.status(409).json({
          success: false,
          code: 'TTS_JOB_IN_PROGRESS',
          message: 'Zaten devam eden bir ses oluşturma işleminiz var. Lütfen bitmesini bekleyin.',
          jobId: existingJob.id,
          status: existingJob.status,
        });
      }

      // Create job
      const job = jobQueue.createJob(userId, {
        requestBody: req.body,
        file: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          buffer: req.file.buffer
        } : null
      });

      // Return job ID immediately
      res.json({
        success: true,
        jobId: job.id,
        message: 'Audio creation started. You will receive a notification when it\'s ready.',
        estimatedTime: '2-5 minutes'
      });

      // Process in background
      setImmediate(async () => {
        try {
          jobQueue.updateJob(job.id, { status: 'processing', progress: 10 });

          // Create a mock request/response for handleTTSRequest, preserving Express helpers like req.is()
          const mockReq = Object.assign(
            Object.create(Object.getPrototypeOf(req)),
            req,
            {
              body: job.data.requestBody,
              file: job.data.file
                ? {
                  originalname: job.data.file.originalname,
                  mimetype: job.data.file.mimetype,
                  buffer: job.data.file.buffer,
                }
                : null,
              user: req.user,
            }
          );

          let ttsResult = null;
          const mockRes = {
            status: (code) => mockRes,
            json: (data) => {
              ttsResult = data;
              return mockRes;
            },
          };

          // Call the actual TTS handler
          await handleTTSRequest(mockReq, mockRes, () => { });

          if (ttsResult && ttsResult.success) {
            // Update job as completed
            jobQueue.updateJob(job.id, {
              status: 'completed',
              progress: 100,
              result: ttsResult
            });

            // Send push notification
            await sendPushNotification(userId, {
              title: '🎵 Ses Oluşturuldu!',
              body: 'Sesiniz hazır. Dinlemek için tıklayın.',
              type: 'audio_created',
              data: {
                jobId: job.id,
                audioId: ttsResult.id || job.id,
                mp3_url: ttsResult.mp3_url,
                title: ttsResult.adapted_text || ttsResult.translated_text || 'Yeni Ses',
                level: ttsResult.level,
                duration: ttsResult.real_duration,
                // Highlight & text metadata for mobile client
                words: Array.isArray(ttsResult.words) ? ttsResult.words : [],
                timepoints: Array.isArray(ttsResult.timepoints) ? ttsResult.timepoints : [],
                translated_text: ttsResult.translated_text,
                adapted_text: ttsResult.adapted_text,
                // Use original request body for original Turkish text so mobile can show it immediately
                original_turkish:
                  (job?.data?.requestBody &&
                    (job.data.requestBody.input || job.data.requestBody.text)) ||
                  ''
              }
            });

            logger.info(`[AsyncTTS] Job ${job.id} completed successfully`);
          } else {
            // Update job as failed
            jobQueue.updateJob(job.id, {
              status: 'failed',
              error: ttsResult?.message || 'TTS processing failed'
            });

            // Send failure notification
            await sendPushNotification(userId, {
              title: '❌ Ses Oluşturulamadı',
              body: ttsResult?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.',
              type: 'audio_failed',
              data: {
                jobId: job.id,
                error: ttsResult?.message
              }
            });

            logger.error(`[AsyncTTS] Job ${job.id} failed:`, ttsResult?.message);
          }
        } catch (error) {
          logger.error(`[AsyncTTS] Job ${job.id} error:`, error);

          jobQueue.updateJob(job.id, {
            status: 'failed',
            error: error.message
          });

          // Send failure notification
          await sendPushNotification(userId, {
            title: '❌ Ses Oluşturulamadı',
            body: 'Bir hata oluştu. Lütfen tekrar deneyin.',
            type: 'audio_failed',
            data: {
              jobId: job.id,
              error: error.message
            }
          });
        }
      });
    } catch (error) {
      logger.error(`[AsyncTTS] Error creating job:`, error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      logger.error(`Multer error: ${error.message}`, { code: error.code });
      return res.status(400).json({ success: false, message: `File upload error: ${error.message}` });
    } else if (error) {
      logger.error(`File filter error: ${error.message}`);
      return res.status(400).json({ success: false, message: error.message });
    }
    next();
  }
);

// GET /api/tts/job/active – Get active job for current user (if any)
router.get("/job/active", authenticate, (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  const job = jobQueue.getActiveJobForUser(userId);

  if (!job) {
    return res.json({ success: true, hasActiveJob: false });
  }

  return res.json({
    success: true,
    hasActiveJob: true,
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

// GET /api/tts/job/:jobId – Get job status
router.get("/job/:jobId", authenticate, (req, res) => {
  const { jobId } = req.params;
  const job = jobQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }

  // Check if user owns this job
  if (job.userId !== req.user?.id) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  res.json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      result: job.result,
      error: job.error
    }
  });
});

// Add route to serve audio files
router.get("/audio/:id", (req, res, next) => {
  logger.info(`TTS audio route called: /audio/${req.params.id}`);
  logger.info(`Request headers:`, req.headers);
  getAudioFile(req, res, next);
});

// Add route to serve VTT subtitle files
router.get("/vtt/:vttId", (req, res, next) => {
  logger.info(`TTS VTT route called: /vtt/${req.params.vttId}`);
  getVttFile(req, res, next);
});

// Note: Mock endpoints removed - all audio/VTT files should be served from real storage

// Other TTS Utility Endpoints
router.post("/translateToEnglish", translateToEnglish);
router.post("/adaptToCEFR", adaptToCEFR);
// Create podcast from topic (supports Google TTS multi-speaker or n8n webhook)
router.post("/create-podcast", authenticate, async (req, res) => {
  try {
    const body = req.body || {};
    const rawTopic = body.topic;
    const topic = typeof rawTopic === 'string' ? rawTopic.trim() : '';
    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required'
      });
    }
    const level = (body.level || 'B1').toString().toUpperCase();
    const duration = body.duration != null ? body.duration : 10;
    // Default to 'google' instead of 'n8n'
    const ttsProvider = (body.ttsProvider || 'google').toLowerCase();

    logger.info(`📻 [PODCAST] Create podcast - Topic: "${topic}", Level: ${level}, Duration: ${duration}, Provider: ${ttsProvider}`);

    // Route to Google TTS multi-speaker (DEFAULT)
    if (ttsProvider !== 'n8n') {
      try {
        const allowedGeminiModels = new Set(['gemini-2.5-flash-tts', 'gemini-2.5-pro-tts']);
        const ttsModel = typeof body.ttsModel === 'string' ? body.ttsModel.trim() : '';
        if (ttsModel && !allowedGeminiModels.has(ttsModel)) {
          return res.status(400).json({
            success: false,
            code: 'TTS_MODEL_NOT_SUPPORTED',
            message: `Unsupported Gemini TTS model: ${ttsModel}`,
          });
        }

        const { createGoogleTTSPodcast } = require('../utils/googleTTSMultiSpeaker');

        const result = await createGoogleTTSPodcast({
          topic,
          level,
          duration,
          styleType: body.styleType,
          personalityA: body.personalityA,
          personalityB: body.personalityB,
          hostSpeakerId: body.hostSpeakerId,
          guestSpeakerId: body.guestSpeakerId,
          ttsModel: ttsModel || undefined,
          includeHumor: body.includeHumor !== false,
          includeFiller: body.includeFiller !== false,
          userId: req.user?.id,
        });

        return res.json(result);
      } catch (googleErr) {
        const msg = googleErr?.message || 'Google TTS podcast creation failed';
        const code = googleErr?.code || null;
        logger.error('[PODCAST] Google TTS podcast creation failed:', msg);

        if (code === 'GEMINI_INVALID_ARGUMENT' || code === 'TTS_MODEL_NOT_SUPPORTED') {
          return res.status(400).json({
            success: false,
            code,
            message: msg,
          });
        }

        return res.status(500).json({
          success: false,
          message: `Google TTS podcast creation failed: ${msg}`,
        });
      }
    }

    // n8n webhook flow (only if explicitly requested with ttsProvider: 'n8n')
    let serviceConfig = null;
    try {
      const { data, error } = await supabase
        .from('external_services')
        .select('api_url, api_token')
        .eq('service_name', 'podcast_generator')
        .eq('is_active', true)
        .single();
      if (error) {
        logger.warn('[PODCAST] Error loading podcast_generator config from external_services:', error.message);
      } else {
        serviceConfig = data;
      }
    } catch (configErr) {
      logger.warn('[PODCAST] Exception loading podcast_generator config:', configErr.message);
    }
    const envUrl = process.env.PODCAST_WEBHOOK_URL || process.env.N8N_PODCAST_WEBHOOK_URL;
    const envToken = process.env.PODCAST_WEBHOOK_TOKEN || process.env.N8N_PODCAST_WEBHOOK_TOKEN;
    let targetUrl = envUrl || (serviceConfig && serviceConfig.api_url);
    let targetToken = envToken || (serviceConfig && serviceConfig.api_token) || null;

    if (!targetUrl) {
      logger.error('[PODCAST] No podcast webhook URL configured. Define PODCAST_WEBHOOK_URL or configure podcast_generator in external_services.');
      return res.status(500).json({
        success: false,
        message: 'Podcast webhook URL not configured on server. Please contact support.',
      });
    }
    const payload = {
      topic,
      level,
      duration,
      styleType: body.styleType,
      voiceChoice: body.voiceChoice,
      personalityA: body.personalityA,
      personalityB: body.personalityB,
      includeHumor: body.includeHumor,
      includeFiller: body.includeFiller,
    };
    logger.info('[PODCAST] Forwarding request to n8n webhook', {
      url: targetUrl,
      level,
      duration,
      hasToken: !!targetToken,
    });
    const headers = { 'Content-Type': 'application/json' };
    if (targetToken) {
      let authHeader = targetToken;
      if (!/^Bearer\s+/i.test(authHeader)) {
        authHeader = `Bearer ${authHeader}`;
      }
      headers['Authorization'] = authHeader;
    }
    const n8nResponse = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const rawText = await n8nResponse.text();
    if (!n8nResponse.ok) {
      logger.error(`[#PODCAST] n8n webhook error response: status=${n8nResponse.status}, body=${rawText}`);
      let errJson = null;
      try {
        errJson = rawText ? JSON.parse(rawText) : null;
      } catch (_e) { /* ignore */ }
      return res.status(500).json({
        success: false,
        message: (errJson && errJson.message) || 'Podcast service error',
        status: n8nResponse.status,
      });
    }
    if (!rawText || !rawText.trim()) {
      logger.error('[PODCAST] n8n webhook returned empty body with 200');
      return res.status(500).json({
        success: false,
        message: 'Podcast service returned empty response body',
      });
    }
    let n8nResult;
    try {
      n8nResult = JSON.parse(rawText);
    } catch (parseErr) {
      logger.error('[PODCAST] Failed to parse n8n JSON response', {
        body: rawText.slice(0, 500),
        message: parseErr.message,
      });
      return res.status(500).json({
        success: false,
        message: 'Podcast service returned invalid JSON response',
      });
    }
    const audioUrl = n8nResult.audioUrl || n8nResult.podcast_url || n8nResult.audio_url;
    const vttUrl = n8nResult.subtitlesUrl || n8nResult.vtt_url || n8nResult.vtt_subtitles || '';
    if (!audioUrl) {
      logger.error('[PODCAST] n8n response missing audioUrl', { n8nResult });
      return res.status(500).json({
        success: false,
        message: 'Podcast service did not return audioUrl',
      });
    }
    // UI için: label'lı transcript 
    const transcriptText = n8nResult.transcript || '';
    // MFA ve wordsForTiming için: mümkünse label'siz versiyon
    const transcriptForMFA = n8nResult.transcriptPlain || transcriptText;
    let wordsForTiming = null;
    let timepoints = null;

    const useMFAAlignment = process.env.USE_MFA_ALIGNMENT === 'true';
    if (useMFAAlignment && transcriptForMFA && audioUrl) {
      try {
        const tempFileName = `podcast_mfa_${Date.now()}.mp3`;
        const tempAudioPath = path.join(os.tmpdir(), tempFileName);
        const audioResp = await fetch(audioUrl);
        if (audioResp.ok) {
          const audioBuffer = await audioResp.buffer();
          await fs.writeFile(tempAudioPath, audioBuffer);

          const voiceChoice = body.voiceChoice ? String(body.voiceChoice) : '';
          const locale = voiceChoice.includes('GB') ? 'en_GB' : 'en_US';

          const mfaWordTimings = await mfaAligner.generateWordTimestamps(
            tempAudioPath,
            transcriptForMFA,
            locale
          );

          await fs.unlink(tempAudioPath).catch(() => { });

          if (Array.isArray(mfaWordTimings) && mfaWordTimings.length > 0) {
            wordsForTiming = transcriptForMFA.split(/\s+/).filter(w => w.length > 0);
            timepoints = mfaWordTimings.map((timing, index) => ({
              word: timing.word,
              timeSeconds: timing.startTime,
              endTimeSeconds: timing.endTime,
              index,
              hasRealTiming: true,
              source: 'mfa',
            }));
            logger.info('[PODCAST] MFA alignment completed for podcast', {
              timepointCount: timepoints.length,
            });
          }
        } else {
          logger.warn('[PODCAST] Failed to download audio for MFA alignment', {
            status: audioResp.status,
          });
        }
      } catch (mfaErr) {
        logger.warn('[PODCAST] MFA alignment failed, continuing without timepoints', {
          message: mfaErr.message,
        });
      }
    }

    if (!timepoints && Array.isArray(n8nResult.timepoints)) {
      timepoints = n8nResult.timepoints;
    }
    if (!wordsForTiming && Array.isArray(n8nResult.words)) {
      wordsForTiming = n8nResult.words;
    }
    if (!wordsForTiming && transcriptText) {
      wordsForTiming = transcriptText.split(/\s+/).filter(w => w.length > 0);
    }
    let contentHistoryId = null;
    try {
      const userId = req.user && req.user.id;
      if (!supabase) {
        logger.warn('[PODCAST] Supabase client not initialized, skipping contenthistory save');
      } else if (!userId) {
        logger.warn('[PODCAST] No user ID on request, skipping contenthistory save');
      } else {
        const durationSeconds = Number(n8nResult.duration || n8nResult.duration_seconds || 0) || null;
        const { calculateTtsCost } = require('../utils/costTracker');
        const ttsCharacters = typeof transcriptText === 'string' ? transcriptText.length : 0;
        const ttsCategory = 'Premium';
        const ttsCostUsd = calculateTtsCost(ttsCharacters, ttsCategory);
        const totalCostUsd = Number((ttsCostUsd || 0).toFixed(6));
        const insertData = {
          user_id: userId,
          level: level || 'B1',
          mp3_url: audioUrl,
          input: topic,
          translated_text: transcriptText,
          adapted_text: transcriptText,
          input_type: 'podcast',
          created_at: new Date().toISOString(),
          // contenthistory.words/timepoints kolonları TEXT olduğu için JSON string olarak sakla
          words: Array.isArray(wordsForTiming) && wordsForTiming.length > 0 ? JSON.stringify(wordsForTiming) : null,
          timepoints: Array.isArray(timepoints) && timepoints.length > 0 ? JSON.stringify(timepoints) : null,
          openai_prompt_tokens: 0,
          openai_completion_tokens: 0,
          openai_total_tokens: 0,
          openai_cost_usd: 0,
          tts_characters: ttsCharacters,
          tts_category: ttsCategory,
          tts_cost_usd: ttsCostUsd,
          total_cost_usd: totalCostUsd,
          tts_provider: null,
          tts_voice_name: null,
          audio_duration_seconds: durationSeconds,
          entry_source: 'podcast',
        };

        logger.info('[PODCAST] Cost fields computed for contenthistory', {
          tts_characters: insertData.tts_characters,
          tts_category: insertData.tts_category,
          tts_cost_usd: insertData.tts_cost_usd,
          total_cost_usd: insertData.total_cost_usd,
        });

        logger.info('[PODCAST] Attempting to save podcast to contenthistory', {
          userId,
          durationSeconds,
          transcriptLength: transcriptText ? transcriptText.length : 0,
          insertData: JSON.stringify(insertData).slice(0, 500),
        });

        const { data, error } = await supabase
          .from('contenthistory')
          .insert(insertData)
          .select();

        if (error) {
          logger.error('[PODCAST] Error saving podcast to contenthistory:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
        } else if (data && data.length > 0) {
          contentHistoryId = data[0].id;
          logger.info(`[PODCAST] Podcast saved to contenthistory with id=${contentHistoryId}`);
        } else {
          logger.warn('[PODCAST] Insert into contenthistory returned no data array');
        }
      }
    } catch (dbErr) {
      logger.error('[PODCAST] Exception while saving podcast to contenthistory:', dbErr);
    }
    const responseBody = {
      success: true,
      status: 'success',
      message: `Podcast created: ${n8nResult.topic || topic}`,
      mp3_url: audioUrl,
      podcast_url: audioUrl,
      audio_url: audioUrl,
      vtt_url: vttUrl,
      vtt_subtitles: vttUrl,
      duration_seconds: n8nResult.duration || n8nResult.duration_seconds || '',
      topic: n8nResult.topic || topic,
      level,
      transcript: transcriptText,
      words: wordsForTiming || null,
      timepoints: timepoints || null,
      contenthistory_id: contentHistoryId,
      data: n8nResult,
    };
    return res.json(responseBody);
  } catch (error) {
    logger.error('[PODCAST] Error creating podcast via proxy:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create podcast',
      error: error.message,
    });
  }
});

// POST /api/tts/create-podcast-async – Async Google podcast creation with notification
router.post("/create-podcast-async", authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Prevent multiple concurrent async TTS jobs per user
    const existingJob = jobQueue.getActiveJobForUser(userId);
    if (existingJob) {
      logger.info(`[AsyncPodcast] Existing active job ${existingJob.id} for user ${userId}; rejecting new request`);
      return res.status(409).json({
        success: false,
        code: 'TTS_JOB_IN_PROGRESS',
        message: 'Zaten devam eden bir ses oluşturma işleminiz var. Lütfen bitmesini bekleyin.',
        jobId: existingJob.id,
        status: existingJob.status,
      });
    }

    const body = req.body || {};
    const rawTopic = body.topic;
    const topic = typeof rawTopic === 'string' ? rawTopic.trim() : '';
    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required'
      });
    }

    const level = (body.level || 'B1').toString().toUpperCase();
    const duration = body.duration != null ? body.duration : 10;
    const ttsProvider = (body.ttsProvider || 'google').toLowerCase();

    const allowedGeminiModels = new Set(['gemini-2.5-flash-tts', 'gemini-2.5-pro-tts']);
    const ttsModel = typeof body.ttsModel === 'string' ? body.ttsModel.trim() : '';
    if (ttsModel && !allowedGeminiModels.has(ttsModel)) {
      return res.status(400).json({
        success: false,
        code: 'TTS_MODEL_NOT_SUPPORTED',
        message: `Unsupported Gemini TTS model: ${ttsModel}`,
      });
    }

    // This async endpoint is for Google multi-speaker podcast generation
    if (!(ttsProvider === 'google' || ttsProvider === 'google-tts')) {
      return res.status(400).json({
        success: false,
        message: 'Async podcast endpoint only supports Google provider'
      });
    }

    const job = jobQueue.createJob(userId, {
      requestBody: body,
      kind: 'podcast',
      provider: 'google',
    });

    res.json({
      success: true,
      jobId: job.id,
      message: 'Podcast creation started. You will receive a notification when it\'s ready.',
      estimatedTime: '3-10 minutes'
    });

    setImmediate(async () => {
      try {
        jobQueue.updateJob(job.id, { status: 'processing', progress: 10 });
        const { createGoogleTTSPodcast } = require('../utils/googleTTSMultiSpeaker');

        const result = await createGoogleTTSPodcast({
          topic,
          level,
          duration,
          styleType: body.styleType,
          personalityA: body.personalityA,
          personalityB: body.personalityB,
          hostSpeakerId: body.hostSpeakerId,
          guestSpeakerId: body.guestSpeakerId,
          ttsModel: ttsModel || undefined,
          includeHumor: body.includeHumor !== false,
          includeFiller: body.includeFiller !== false,
          userId,
        });

        if (result && result.success) {
          jobQueue.updateJob(job.id, {
            status: 'completed',
            progress: 100,
            result,
          });

          const audioUrl = result.mp3_url || result.audio_url || result.podcast_url;
          const durationSeconds =
            typeof result.duration_seconds === 'number'
              ? result.duration_seconds
              : (typeof result.duration_seconds === 'string' ? parseFloat(result.duration_seconds) : null);

          await sendPushNotification(userId, {
            title: '🎧 Podcast Hazır!',
            body: 'Podcastiniz hazır. Dinlemek için tıklayın.',
            type: 'audio_created',
            data: {
              jobId: job.id,
              audioId: result.contenthistory_id || job.id,
              mp3_url: audioUrl,
              title: result.title || topic,
              level,
              duration: durationSeconds,
              contenthistory_id: result.contenthistory_id || null,
              transcript: result.transcript,
              dialogue: result.dialogue,
              dialogue_segments: result.dialogue_segments,
              words: Array.isArray(result.words) ? result.words : [],
              timepoints: Array.isArray(result.timepoints) ? result.timepoints : [],
              vtt_url: result.vtt_url || null,
              topic,
            }
          });

          logger.info(`[AsyncPodcast] Job ${job.id} completed successfully`);
        } else {
          const errMsg = result?.message || 'Podcast processing failed';
          jobQueue.updateJob(job.id, { status: 'failed', error: errMsg });
          await sendPushNotification(userId, {
            title: '❌ Podcast Oluşturulamadı',
            body: errMsg || 'Bir hata oluştu. Lütfen tekrar deneyin.',
            type: 'audio_failed',
            data: { jobId: job.id, error: errMsg }
          });
          logger.error(`[AsyncPodcast] Job ${job.id} failed: ${errMsg}`);
        }
      } catch (error) {
        const msg = error?.message || 'Podcast processing failed';
        const code = error?.code || null;
        logger.error(`[AsyncPodcast] Job ${job.id} error:`, error);
        jobQueue.updateJob(job.id, { status: 'failed', error: msg });
        await sendPushNotification(userId, {
          title: '❌ Podcast Oluşturulamadı',
          body: 'Bir hata oluştu. Lütfen tekrar deneyin.',
          type: 'audio_failed',
          data: { jobId: job.id, error: msg, code }
        });
      }
    });
  } catch (error) {
    logger.error('[AsyncPodcast] Error creating job:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Amazon Polly TTS endpoint
router.post("/polly", (req, res) => {
  // Implement your Amazon Polly TTS functionality here
  res.status(500).json({ error: "Not implemented yet" });
});

// Get current TTS provider setting (public endpoint for mobile app)
router.get('/provider', async (req, res) => {
  try {
    const { supabase } = require('../utils/supabaseClient');
    const { isPollyAvailable } = require('../utils/amazonPolly');

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'tts_provider')
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching tts_provider:', error);
      return res.status(500).json({ success: false, message: 'Error fetching tts_provider' });
    }

    const provider = data ? data.value : 'amazon'; // default: amazon
    const pollyAvailable = isPollyAvailable();
    const hasAwsCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

    logger.info(`TTS provider requested: ${provider}, Polly available: ${pollyAvailable}, AWS credentials: ${hasAwsCredentials}`);

    return res.json({
      success: true,
      provider,
      pollyAvailable,
      hasAwsCredentials,
      debug: {
        settingsProvider: provider,
        pollyInitialized: pollyAvailable,
        awsKeyExists: !!process.env.AWS_ACCESS_KEY_ID,
        awsSecretExists: !!process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  } catch (err) {
    logger.error('Server error while fetching tts_provider:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Filtrelenmiş ses listesi endpointi (önce tanımlanmalı)
router.get('/voices/filter', getFilteredVoices);

// Dinamik ses listesi endpointi
router.get('/voices', listVoices);

// Endpoint to get filtered voices
router.get("/voices/filtered", getFilteredVoices);

// Test endpoint to check available voices from Google TTS API
router.get("/test-voices", testVoices);

// SSML destekli sesler test endpoint'i
router.get('/test-ssml-voices', async (req, res) => {
  try {
    console.log('🎯 SSML VOICES TEST - Request received');

    const { languageCode = 'en-US' } = req.query;

    console.log(`🎯 Testing SSML-compatible voices for language: ${languageCode}`);

    // Tüm sesler ve SSML destekli olanları al
    const { listGoogleVoices } = require('../utils/googleTTS');
    const allVoices = await listGoogleVoices(languageCode);

    // SSML destekli olanları filtrele
    const ssmlSupportedVoices = allVoices.filter(voice => voice.ssmlSupport === true);
    const ssmlUnsupportedVoices = allVoices.filter(voice => voice.ssmlSupport === false);

    console.log(`🎯 SSML VOICES TEST Results:
      - Total voices: ${allVoices.length}
      - SSML supported: ${ssmlSupportedVoices.length}
      - SSML unsupported: ${ssmlUnsupportedVoices.length}`);

    // İlk 5 destekli ses örneği
    const sampleSupportedVoices = ssmlSupportedVoices.slice(0, 5);
    const sampleUnsupportedVoices = ssmlUnsupportedVoices.slice(0, 5);

    res.json({
      success: true,
      languageCode,
      stats: {
        total: allVoices.length,
        ssmlSupported: ssmlSupportedVoices.length,
        ssmlUnsupported: ssmlUnsupportedVoices.length,
        supportedPercentage: ((ssmlSupportedVoices.length / allVoices.length) * 100).toFixed(1)
      },
      sampleSupportedVoices,
      sampleUnsupportedVoices,
      allSupportedVoices: ssmlSupportedVoices.map(v => v.name),
      allUnsupportedVoices: ssmlUnsupportedVoices.map(v => v.name)
    });

  } catch (error) {
    console.error('🎯 SSML VOICES TEST failed:', error);
    res.status(500).json({
      success: false,
      error: 'SSML voices test failed',
      details: error.message
    });
  }
});

// Ultra hassas Google TTS test endpoint'i
router.post('/test-ultra-precision', async (req, res) => {
  try {
    console.log('🎯 ULTRA HASSAS TTS TEST - Request received');

    const { text, voice, speakingRate, languageCode } = req.body;

    // Validation
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Text is required'
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({
        error: 'Text too long (max 1000 characters for test)'
      });
    }

    console.log(`🎯 Testing ultra precise TTS with:
      - Text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"
      - Voice: ${voice || 'en-US-Standard-C'}
      - Speaking Rate: ${speakingRate || 1.0}x
      - Language: ${languageCode || 'en-US'}`);

    // Google TTS ile ultra hassas timing test
    const { synthesizeWithGoogle } = require('../utils/googleTTS');

    const startTime = Date.now();
    const result = await synthesizeWithGoogle({
      text: text,
      voiceName: voice || 'en-US-Standard-C',
      languageCode: languageCode || 'en-US',
      speakingRate: speakingRate || 1.0
    });

    const processingTime = Date.now() - startTime;

    console.log(`🎯 ULTRA HASSAS TTS TEST completed in ${processingTime}ms`);

    // Timing analizi
    const timingAnalysis = {
      totalWords: result.wordTimings.length,
      totalDuration: result.totalDuration,
      avgWordDuration: result.timingQuality.avgWordDuration,
      precisionLevel: result.timingQuality.markedWords / result.timingQuality.totalWords,
      timingMarks: result.timingQuality.totalMarks,
      sampleRate: '48kHz',
      processingTime: processingTime
    };

    // Response gönder
    res.json({
      success: true,
      message: 'Ultra hassas TTS test completed successfully',
      audioUrl: null, // Test için audio upload yapmıyoruz
      audioSize: result.audioContent.length,
      wordTimings: result.wordTimings,
      timingAnalysis: timingAnalysis,
      timingQuality: result.timingQuality,
      sampleWordTimings: result.wordTimings.slice(0, 10), // İlk 10 kelime
      metadata: {
        voice: voice || 'en-US-Standard-C',
        speakingRate: speakingRate || 1.0,
        languageCode: languageCode || 'en-US',
        totalDuration: result.totalDuration,
        fallbackUsed: result.fallbackUsed || false,
        ultraPrecisionEnabled: true
      }
    });

  } catch (error) {
    console.error('🎯 ULTRA HASSAS TTS TEST failed:', error);
    res.status(500).json({
      success: false,
      error: 'Ultra hassas TTS test failed',
      details: error.message
    });
  }
});

// Test endpoint for SSML filter debug
router.get('/test-client', (req, res) => {
  try {
    const { listGoogleVoices } = require('../utils/googleTTS');
    res.json({
      message: 'Google TTS client test',
      hasClient: !!listGoogleVoices,
      env: {
        hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Google TTS client test failed',
      error: error.message
    });
  }
});

// New API endpoint for text translation and audio generation
router.post("/translate-and-speak", async (req, res) => {
  const { text, level, speakingRate, voice } = req.body;

  if (!text || !level) {
    return res.status(400).json({
      success: false,
      message: "Text and level are required parameters"
    });
  }

  try {
    // 1. Translate text to English
    const translationResult = await translateToEnglish(req, res);

    // 2. Adapt to CEFR level
    const adaptedText = await adaptToCEFR({
      text: translationResult.text,
      level: level
    }, res);

    // 3. Generate audio
    const audioResult = await synthesizeChunkAPI({
      text: adaptedText,
      voice: voice || "en-US-Neural2-F",
      rate: speakingRate || 1.0
    }, res);

    return res.json({
      success: true,
      translatedText: translationResult.text,
      adaptedText: adaptedText,
      audio: audioResult
    });
  } catch (error) {
    logger.error(`Error in translate-and-speak: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Error processing request",
      error: error.message
    });
  }
});

// ==================== NOTIFICATION ROUTES ====================
// Get unread notifications
router.get('/notifications/unread', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const result = await getUnreadNotifications(userId);

    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }

    res.json({ success: true, notifications: result.data });
  } catch (error) {
    logger.error('[Notifications] Error fetching unread notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark notification as read
router.post('/notifications/:notificationId/read', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const result = await markNotificationAsRead(notificationId);

    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }

    res.json({ success: true, notification: result.data });
  } catch (error) {
    logger.error('[Notifications] Error marking notification as read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== SYNC FEEDBACK ROUTES ====================
// Kullanıcıdan senkronizasyon feedback'i al
router.post('/sync-feedback', authenticate, logSyncFeedback);

// Sync feedback analizi (admin için)
router.get('/sync-feedback/analyze', authenticate, analyzeSyncFeedback);

module.exports = router;
