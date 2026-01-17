// backend/routes/ttsRoutes.js

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
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
const logger = require('../utils/common/logger.js');
const { authenticate } = require('../middleware/auth');
const { ttsLimiter, podcastLimiter } = require('../middleware/security');
const { limiters } = require('../utils/infra/concurrencyLimiter.js');
const { addJob, getPriorityByPlan } = require('../utils/infra/bullQueue.js'); // ✅ BullMQ
const jobQueue = require('../utils/infra/jobQueue.js'); // Legacy support
const { sendPushNotification, getUnreadNotifications, markNotificationAsRead } = require('../utils/notifications/pushNotification.js');

// Helper function to write podcast-specific logs
const podcastLogPath = path.join(__dirname, '../logs/podcast_logs.log');
function logPodcast(message, data = {}) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message} ${JSON.stringify(data)}\n`;
  fs.appendFileSync(podcastLogPath, logLine);
  logger.info(`[PODCAST-LOG] ${message}`, data);
}
const fetch = require('node-fetch');
const { supabase } = require('../utils/storage/supabaseClient.js');
const fsPromises = require('fs').promises;
const os = require('os');
const { mfaAligner } = require('../utils/audio/mfaAligner.js');

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
  ttsLimiter,
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
  ttsLimiter,
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

      // Check for existing active jobs using BullMQ?
      // Note: BullMQ doesn't easily support "one active job per user" check without scanning.
      // For now, we rely on the worker to handle concurrency or rate limits.
      // Or we can keep using a lightweight Redis key for this check if strictly needed.

      // Prepare job data
      const jobData = {
        userId,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        requestBody: req.body,
        file: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          buffer: req.file.buffer.toString('base64'), // Buffer to string for JSON safety
          encoding: req.file.encoding
        } : null
      };

      // Get priority based on user plan
      const userPlan = req.user.current_plan || 'free';
      const priority = getPriorityByPlan(userPlan);

      // Add to BullMQ
      const job = await addJob('tts-processing', 'process-tts', jobData, {
        priority,
        removeOnComplete: true
      });

      logger.info(`[AsyncTTS] Job ${job.id} created for user ${userId} with priority ${priority}`);

      // Return job ID immediately
      res.json({
        success: true,
        jobId: job.id,
        message: 'Audio creation started. You will receive a notification when it\'s ready.',
        estimatedTime: '2-5 minutes'
      });

    } catch (error) {
      logger.error(`[AsyncTTS] Error creating job:`, error);
      res.status(500).json({ success: false, message: 'Failed to start audio processing' });
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
router.post("/chunkText", chunkTextAPI);
router.post("/synthesizeChunk", synthesizeChunkAPI);
router.post("/mergeAudio", mergeAudioAPI);

// Google TTS Multi-Speaker Podcast Creator
const { createGoogleTTSPodcast } = require('../utils/audio/googleTTSMultiSpeaker.js');

// Create podcast from topic (Direct Google TTS Implementation)
router.post("/create-podcast", podcastLimiter, authenticate, async (req, res) => {
  // Global podcast limiti kontrolü
  const globalSlot = await limiters.podcast.acquire(60000); // 60 saniye timeout
  if (!globalSlot.acquired) {
    logger.warn(`🚫 [PODCAST] Global limit - reason: ${globalSlot.reason}`);
    return res.status(503).json({
      success: false,
      code: globalSlot.reason === 'QUEUE_FULL' ? 'SERVER_BUSY' : 'TIMEOUT',
      message: 'Podcast sunucusu şu anda yoğun. Lütfen 1 dakika sonra tekrar deneyin.',
      retryAfter: 60
    });
  }

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
    const duration = body.duration != null ? Number(body.duration) : 10;

    logger.info(`📻 [PODCAST APP] Received create-podcast request:`, {
      topic,
      level,
      duration,
      hostSpeakerId: body.hostSpeakerId,
      guestSpeakerId: body.guestSpeakerId,
      userId: req.user?.id
    });

    // Call Direct Google TTS implementation
    const result = await createGoogleTTSPodcast({
      topic,
      level,
      duration,
      styleType: body.styleType,
      voiceChoice: body.voiceChoice,
      personalityA: body.personalityA,
      personalityB: body.personalityB,
      hostSpeakerId: body.hostSpeakerId,
      guestSpeakerId: body.guestSpeakerId,
      includeHumor: body.includeHumor,
      includeFiller: body.includeFiller,
      userId: req.user?.id
    });

    return res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('[PODCAST APP] Error creating podcast:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create podcast',
      error: error.message,
    });
  } finally {
    limiters.podcast.release();
  }
});

// Async Podcast Creation with Notification
router.post("/create-podcast-async", podcastLimiter, authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Prevent multiple concurrent async podcast jobs per user
    const existingJob = jobQueue.getActiveJobForUser(userId);
    if (existingJob) {
      logger.info(`[AsyncPodcast] Existing active job ${existingJob.id} for user ${userId}; rejecting new request`);
      return res.status(409).json({
        success: false,
        code: 'PODCAST_JOB_IN_PROGRESS',
        message: 'Zaten devam eden bir podcast oluşturma işleminiz var. Lütfen bitmesini bekleyin.',
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
    const duration = body.duration != null ? Number(body.duration) : 10;

    // Create job
    const job = jobQueue.createJob(userId, {
      type: 'podcast',
      topic,
      level,
      duration,
      styleType: body.styleType,
      voiceChoice: body.voiceChoice,
      personalityA: body.personalityA,
      personalityB: body.personalityB,
      hostSpeakerId: body.hostSpeakerId,
      guestSpeakerId: body.guestSpeakerId,
      includeHumor: body.includeHumor,
      includeFiller: body.includeFiller,
    });

    logger.info(`📻 [AsyncPodcast] Job ${job.id} created for user ${userId}`, { topic, level, duration });

    // Return job ID immediately
    res.json({
      success: true,
      jobId: job.id,
      message: 'Podcast oluşturma başlatıldı. Hazır olduğunda bildirim alacaksınız.',
      estimatedTime: '3-7 minutes'
    });

    // Process in background
    setImmediate(async () => {
      // Global podcast limiti - arka plan işlemi için
      const globalSlot = await limiters.podcast.acquire(120000); // 2 dakika timeout
      if (!globalSlot.acquired) {
        logger.warn(`🚫 [AsyncPodcast] Global limit - reason: ${globalSlot.reason}, jobId: ${job.id}`);
        jobQueue.updateJob(job.id, {
          status: 'failed',
          error: 'Sunucu yoğun, lütfen daha sonra tekrar deneyin'
        });
        await sendPushNotification(userId, {
          title: '❌ Podcast Oluşturulamadı',
          body: 'Sunucu yoğun. Lütfen daha sonra tekrar deneyin.',
          type: 'podcast_failed',
          data: { jobId: job.id, error: 'SERVER_BUSY' }
        });
        return;
      }

      try {
        jobQueue.updateJob(job.id, { status: 'processing', progress: 10 });

        // Call Direct Google TTS implementation
        const result = await createGoogleTTSPodcast({
          topic,
          level,
          duration,
          styleType: body.styleType,
          voiceChoice: body.voiceChoice,
          personalityA: body.personalityA,
          personalityB: body.personalityB,
          hostSpeakerId: body.hostSpeakerId,
          guestSpeakerId: body.guestSpeakerId,
          includeHumor: body.includeHumor,
          includeFiller: body.includeFiller,
          userId
        });

        if (result && result.mp3_url) {
          // Try to use the contenthistory_id from createGoogleTTSPodcast
          const savedContentId = result.contenthistory_id || null;

          // If createGoogleTTSPodcast failed to save, throw error - no fallback
          if (!savedContentId) {
            const saveError = new Error('createGoogleTTSPodcast failed to save to contenthistory');
            logPodcast('SAVE_FAILED', { reason: 'contenthistory_id is null', topic, level, userId });
            throw saveError;
          }

          logPodcast('PRIMARY_SAVE_SUCCESS', { contenthistory_id: savedContentId, topic });

          // Update job as completed
          jobQueue.updateJob(job.id, {
            status: 'completed',
            progress: 100,
            result: { ...result, contenthistory_id: savedContentId }
          });

          // Send push notification - keep payload small to avoid FCM "message too big" error
          // Use 'audio_created' type so iOS notification handler can process it (same as TTS)
          await sendPushNotification(userId, {
            title: '🎙️ Podcast Hazır!',
            body: 'Podcast\'iniz hazır. Dinlemek için tıklayın.',
            type: 'audio_created',
            data: {
              jobId: job.id,
              audioId: savedContentId,
              contenthistory_id: savedContentId,
              mp3_url: result.mp3_url,
              title: result.title || topic,
              level: level,
              duration: result.duration_seconds,
              input_type: 'podcast',
            }
          });

          logger.info(`[AsyncPodcast] Job ${job.id} completed successfully`);
        } else {
          // Update job as failed
          jobQueue.updateJob(job.id, {
            status: 'failed',
            error: result?.message || 'Podcast oluşturulamadı'
          });

          // Send failure notification
          await sendPushNotification(userId, {
            title: '❌ Podcast Oluşturulamadı',
            body: result?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.',
            type: 'podcast_failed',
            data: {
              jobId: job.id,
              error: result?.message
            }
          });

          logger.error(`[AsyncPodcast] Job ${job.id} failed:`, result?.message);
        }
      } catch (error) {
        logger.error(`[AsyncPodcast] Job ${job.id} error:`, error);

        jobQueue.updateJob(job.id, {
          status: 'failed',
          error: error.message
        });

        // Send failure notification
        await sendPushNotification(userId, {
          title: '❌ Podcast Oluşturulamadı',
          body: 'Bir hata oluştu. Lütfen tekrar deneyin.',
          type: 'podcast_failed',
          data: {
            jobId: job.id,
            error: error.message
          }
        });
      } finally {
        limiters.podcast.release();
      }
    });
  } catch (error) {
    logger.error(`[AsyncPodcast] Error creating job:`, error);
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
    const { supabase } = require('../utils/storage/supabaseClient.js');
    const { isPollyAvailable } = require('../utils/audio/amazonPolly.js');

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
    const { listGoogleVoices } = require('../utils/audio/googleTTS.js');
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
    const { synthesizeWithGoogle } = require('../utils/audio/googleTTS.js');

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
    const { listGoogleVoices } = require('../utils/audio/googleTTS.js');
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
