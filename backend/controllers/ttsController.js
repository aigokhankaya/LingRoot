// backend/controllers/ttsController.js
const path = require("path");
const os = require("os");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const logger = require('../utils/common/logger.js'); // Import Winston logger
const { limiters } = require('../utils/infra/concurrencyLimiter.js');
const { extractTextFromInput, generateTopicText, generateEnglishNarrationForTopic, translateToEnglishWithOpenAI } = require('../utils/ai/inputExtractor.js');
const { getTopicPathInternal, formatTopicHierarchy, getRootTopic } = require('../utils/topic/topicPathHelper.js');
const { cleanText, chunkText, chunkTextByCharLimit, preChunkTextByByteLimit, chunkTextForChirpVoices, isChirpVoice } = require('../utils/content/textProcessor.js');
const { adaptToCEFR: adaptToCEFRFunc } = require('../utils/ai/cefrAdapter.js');
const { translateAndAdaptToCEFR } = require('../utils/ai/translateAndAdapt.js');
const { synthesizeWithGoogle, listGoogleVoices, getVoiceGender } = require('../utils/audio/googleTTS.js');
const { synthesizeWithAzure, listAzureVoices, isAzureTTSAvailable } = require('../utils/audio/azureTTS.js');
const { synthesizeWithPolly, listPollyVoices, isPollyAvailable } = require('../utils/audio/amazonPolly.js');
const { synthesizeWithOpenAI, listOpenAIVoices, isOpenAITTSAvailable } = require('../utils/audio/openaiTTS.js');
const { mergeAudioSegments, mergeAudioSegmentsToBuffer } = require('../utils/audio/audioMerger.js');
const { uploadToSupabase } = require('../utils/storage/storageUploader.js');
const { analyzeAndAdjustTimings } = require('../utils/audio/audioAnalyzer.js');
const { mfaAligner } = require('../utils/audio/mfaAligner.js');
const { extractDailyUsagePatterns } = require('../utils/content/dailyPatternExtractor.js');
const tmp = require("tmp");
const { logStep } = require('../utils/common/stepLogger.js');
const { logRequestStep } = require('../utils/common/requestLogger.js');
const { supabase } = require('../utils/storage/supabaseClient.js');
const { checkLimits } = require('../utils/infra/usageLimiter.js');
const { getLingrootVoices, getLingrootVoiceById, mapLingrootToProviderVoice, getDefaultLingrootVoiceId } = require('../utils/audio/lingrootVoices.js');
const directorAgentService = require('../services/directorAgentService');
const {
  createVTTFile,
  createWordLevelVTT,
  createWordLevelVTTFromTimings,
  createWordLevelVTTFromOptimizedTimings,
  matchWordsWithTimings
} = require('../services/subtitleService');
const { notifyUserOfError, USER_FACING_ERROR_TYPES } = require('../utils/notifications/aiErrorNotifier.js');

// Store references to temp files so they can be accessed via API
const tempAudioFiles = new Map();
const tempVttFiles = new Map();

// Concurrent TTS request limiter per user
// Prevents resource exhaustion when user clicks multiple topics rapidly
const activeTtsRequests = new Map(); // userId -> count
const MAX_CONCURRENT_TTS_PER_USER = 2;

const voiceModelService = require('../services/voiceModelService');

/**
 * Check and increment active TTS request count for user
 * @param {string} userId - User ID
 * @returns {{ allowed: boolean, current: number, max: number }}
 */
const acquireTtsSlot = (userId) => {
  if (!userId) return { allowed: true, current: 0, max: MAX_CONCURRENT_TTS_PER_USER };

  const current = activeTtsRequests.get(userId) || 0;
  if (current >= MAX_CONCURRENT_TTS_PER_USER) {
    return { allowed: false, current, max: MAX_CONCURRENT_TTS_PER_USER };
  }

  activeTtsRequests.set(userId, current + 1);
  logger.debug(`🔒 [TTS Limiter] User ${userId} acquired slot ${current + 1}/${MAX_CONCURRENT_TTS_PER_USER}`);
  return { allowed: true, current: current + 1, max: MAX_CONCURRENT_TTS_PER_USER };
};

/**
 * Release TTS slot for user
 * @param {string} userId - User ID
 */
const releaseTtsSlot = (userId) => {
  if (!userId) return;

  const current = activeTtsRequests.get(userId) || 0;
  if (current > 0) {
    activeTtsRequests.set(userId, current - 1);
    logger.debug(`🔓 [TTS Limiter] User ${userId} released slot, now ${current - 1}/${MAX_CONCURRENT_TTS_PER_USER}`);
  }

  // Cleanup if no active requests
  if (current <= 1) {
    activeTtsRequests.delete(userId);
  }
};

// Subtitle helper functions moved to services/subtitleService.js

// Helper function for consistent temp file cleanup
const cleanupTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      logger.debug(`Cleaned up temporary file: ${filePath}`);
    } catch (e) {
      logger.error(`Error removing temporary file ${filePath}: ${e.message}`);
      // Log error but don't fail the request just for cleanup failure
    }
  }
};

// getTtsProvider ve getDefaultVoiceForProvider voiceModelService'e taşındı
const { getTtsProvider, getDefaultVoiceForProvider } = voiceModelService;



/**
 * Handles the text-to-speech processing request.
 * Orchestrates the workflow: extract -> clean -> translate? -> adapt -> chunk -> synthesize -> merge -> upload.
 * Includes improved logging and file cleanup.
 * @param {import("express").Request} req Express request object.
 * @param {import("express").Response} res Express response object.
 */
const processTtsRequest = async (req, res) => {
  const requestId = uuidv4();
  const processingStartTime = Date.now();
  let stepSequence = 1;
  logger.info(`[${requestId}] Received TTS request.`);

  // Get user ID for rate limiting
  const userId = req.user?.id || null;
  const skipConcurrency = !!req._skipConcurrencyCheck;

  // 1. Global TTS limiti kontrolü (skip for async background workers)
  let globalSlotAcquired = false;
  if (!skipConcurrency) {
    const globalSlot = await limiters.tts.acquire(30000); // 30 saniye timeout
    if (!globalSlot.acquired) {
      logger.warn(`[${requestId}] 🚫 Global TTS limit - reason: ${globalSlot.reason}, userId: ${userId}`);
      return res.status(503).json({
        success: false,
        code: globalSlot.reason === 'QUEUE_FULL' ? 'SERVER_BUSY' : 'TIMEOUT',
        message: 'Sunucu şu anda yoğun. Lütfen 1 dakika sonra tekrar deneyin.',
        retryAfter: 60
      });
    }
    globalSlotAcquired = true;
  } else {
    logger.info(`[${requestId}] Skipping concurrency checks (async background worker)`);
  }

  // 2. Per-user TTS limiti (skip for async background workers)
  if (!skipConcurrency) {
    const slotCheck = acquireTtsSlot(userId);
    if (!slotCheck.allowed) {
      limiters.tts.release(); // Global slot'u serbest bırak
      logger.warn(`[${requestId}] ⚠️ User ${userId} exceeded concurrent TTS limit (${slotCheck.current}/${slotCheck.max})`);
      return res.status(429).json({
        success: false,
        message: `Çok fazla eşzamanlı ses oluşturma isteği. Lütfen mevcut işlemlerin tamamlanmasını bekleyin. (${slotCheck.current}/${slotCheck.max} aktif)`,
        retryAfter: 30 // Suggest retry after 30 seconds
      });
    }
  }

  // CRITICAL DEBUG: Log raw request essentials (sanitized)
  try {
    const logBody = {
      type: req.body?.type,
      level: req.body?.level,
      speakingRate: req.body?.speakingRate || req.body?.SesHızı || req.body?.sesHizi,
      voice: req.body?.voice || req.body?.voiceName,
      gender: req.body?.gender,
      accent: req.body?.accent,
      hasFile: !!req.file,
      inputPreview: (req.body?.input || '').toString().slice(0, 80)
    };
    logger.debug(`[${requestId}] [INCOMING TTS PARAMS]`, logBody);
  } catch (e) {
    logger.warn(`[${requestId}] Could not log incoming params: ${e.message}`);
  }
  let tempFilePath = null;
  let detectedLang = 'en';
  let languageCode = 'en-US';
  let detectedMood = 'Neutral'; // Director Agent Mood
  // Mock TTS disabled in production

  try {
    // --- Input Parsing ---
    logRequestStep(requestId, 'input:parse', { body: req.body });
    logStep({
      requestId,
      stepName: 'tts:input:parse',
      stepSequence: stepSequence++,
      serviceName: 'Express',
      endpoint: '/api/tts/process',
      inputData: req.body
    });
    let inputData, inputType, level, speakingRate, file;

    // Debug: Log full request body
    logger.debug(`[${requestId}] 🔍 FULL REQUEST BODY:`, JSON.stringify(req.body, null, 2));

    if (req.is("multipart/form-data")) {
      logger.debug(`[${requestId}] Processing multipart/form-data request.`);
      inputData = req.body.input;
      inputType = req.body.type || req.body.input_type;
      level = req.body.level || "A1";
      speakingRate = parseFloat(req.body.speakingRate || (level === "A1" ? "0.8" : "1.0"));
      file = req.file;
      logger.debug(`[${requestId}] FormData details: type=${inputType}, level=${level}, rate=${speakingRate}, file=${file?.originalname}`);
    } else if (req.is("application/json")) {
      logger.debug(`[${requestId}] Processing application/json request.`);
      inputData = req.body.input;
      inputType = req.body.type || req.body.input_type || "text";
      level = req.body.level || "A1";
      speakingRate = parseFloat(req.body.speakingRate || (level === "A1" ? "0.8" : "1.0"));
      file = undefined;
      logger.debug(`[${requestId}] JSON details: type=${inputType}, level=${level}, rate=${speakingRate}`);
    } else {
      const contentType = req.get("Content-Type");
      logger.error(`[${requestId}] Unsupported Content-Type: ${contentType}`);
      return res.status(415).json({ success: false, message: `Unsupported Content-Type: ${contentType}` });
    }

    // Normalize input type: 'subject' -> 'topic'
    logger.debug(`[${requestId}] 🔍 RAW INPUT TYPE BEFORE NORMALIZATION: "${inputType}"`);
    if (inputType === 'subject') {
      inputType = 'topic';
      logger.debug(`[${requestId}] ✅ Normalized input type from 'subject' to 'topic'`);
    }
    logger.debug(`[${requestId}] 🔍 FINAL INPUT TYPE AFTER NORMALIZATION: "${inputType}"`);

    // --- DIRECTOR MODE: CHAPTER FLOW ---
    if (inputType === 'chapter') {
      const chapterId = req.body.chapter_id || req.body.chapterId;
      logger.debug(`[${requestId}] 🎬 DIRECTOR MODE: Processing book chapter ${chapterId}`);

      if (!chapterId) {
        logger.error(`[${requestId}] Missing chapter_id for chapter input type`);
        return res.status(400).json({ success: false, message: "Missing chapter_id for chapter input type" });
      }

      // 1. Intelligent Caching: Check if audio exists for this level
      // We accept ANY voice model for cache hits to save costs, assuming previous generation was good.
      const { data: cachedAudio } = await supabase
        .from('chapter_audio')
        .select('mp3_url, vtt_url, level')
        .eq('chapter_id', chapterId)
        .eq('level', level)
        .limit(1)
        .maybeSingle();

      if (cachedAudio) {
        logger.info(`[${requestId}] 🎯 CACHE HIT: Found existing audio for chapter ${chapterId} level ${level}`);
        return res.json({
          success: true,
          mp3_url: cachedAudio.mp3_url,
          vtt_url: cachedAudio.vtt_url,
          level: cachedAudio.level,
          drift_corrected: false,
          timing_source: 'cache',
          message: 'Audio retrieved from cache'
        });
      }
      logger.debug(`[${requestId}] 💨 CACHE MISS: Proceeding to generation`);

      // 2. Director Analysis: Check or Perform
      const { data: chapterData } = await supabase
        .from('book_chapters')
        .select('chapter_text, director_analysis')
        .eq('id', chapterId)
        .single();

      if (!chapterData) {
        return res.status(404).json({ success: false, message: "Chapter not found in database" });
      }

      inputData = chapterData.chapter_text; // Ensure inputData is the full text
      let analysis = chapterData.director_analysis;

      if (!analysis) {
        logger.debug(`[${requestId}] 🕵️ DIRECTOR AGENT: Analyzing chapter content...`);
        try {
          analysis = await directorAgentService.analyzeChapter(inputData);

          // Persist analysis
          await supabase
            .from('book_chapters')
            .update({ director_analysis: analysis })
            .eq('id', chapterId);

          logger.debug(`[${requestId}] 💾 Analysis saved to database.`);
        } catch (err) {
          logger.warn(`[${requestId}] Director analysis failed, using defaults: ${err.message}`);
          analysis = { mood: 'Neutral', narrator_tone: 'Clear' };
        }
      } else {
        logger.debug(`[${requestId}] 🧠 Using existing Director Analysis from DB`);
      }

      // Set context for later steps
      detectedMood = analysis.mood || 'Neutral';
      // We can also attach narrator instructions to req for later use if we want
      req.directorAnalysis = analysis;
    }
    // -----------------------------------

    // Validate essential parameters
    if (!inputType || (inputType !== "file" && !inputData) || (inputType === "file" && !file)) {
      logger.error(`[${requestId}] Missing required input parameters. inputType=${inputType}, inputData=${inputData}, file=${file?.originalname}`);
      return res.status(400).json({ success: false, message: "Missing required input parameters (type, input/file, level)" });
    }

    // Parse targetDurationMinutes from request body
    // Valid options: 1.5, 5, 10, 15 (minutes)
    let targetDurationMinutes = null;
    const rawDuration = req.body.targetDurationMinutes || req.body.target_duration_minutes || req.body.durationMinutes;
    if (rawDuration) {
      const parsedDuration = parseFloat(rawDuration);
      if ([1.5, 5, 10, 15].includes(parsedDuration)) {
        targetDurationMinutes = parsedDuration;
        logger.debug(`[${requestId}] ⏱️ Target duration set: ${targetDurationMinutes} minutes`);
      } else {
        logger.warn(`[${requestId}] Invalid duration ${rawDuration}, ignoring. Valid options: 1.5, 5, 10, 15`);
      }
    }

    // Detect language for topic input (check for Turkish characters)
    if (inputType === "topic" && inputData) {
      const hasTurkishChars = /[ğüşıöçĞÜŞİÖÇ]/g.test(inputData);
      detectedLang = hasTurkishChars ? 'tr' : 'en';
      logger.debug(`[${requestId}] Detected language for topic: ${detectedLang}`);
    }

    // --- Step 1: Extract Text ---
    logRequestStep(requestId, 'extractText:start', { inputData, inputType, file, level, detectedLang });
    logStep({
      requestId,
      stepName: 'tts:extractText:start',
      stepSequence: stepSequence++,
      serviceName: 'LocalFunction',
      endpoint: 'extractTextFromInput',
      inputData: { inputData, inputType, file, level, detectedLang }
    });
    let rawText;
    let translatedText = null; // For display/storage (topic only)
    let englishNarration = null;
    // Store topic generation LLM usage to add to openaiUsage later
    let topicGenerationUsage = null;
    let topicGenerationModel = null;

    logger.debug(`[${requestId}] 🔍 CHECKING IF TOPIC: inputType="${inputType}" (comparing with "topic")`);
    if (inputType === "topic") {
      logger.debug(`[${requestId}] ✅ TOPIC FLOW ACTIVATED!`);

      // Pre-check for explicitly requested mood (e.g. from Topic Hierarchy)
      if (req.body.mood) {
        detectedMood = req.body.mood;
        logger.debug(`[${requestId}] 🎭 Using requested mood from input: ${detectedMood}`);
      } else {
        // MOOD ANALYSIS (DIRECTOR AGENT)
        // detectedMood variable is declared at the top of processTtsRequest
        try {
          detectedMood = await directorAgentService.analyzeMood(`Topic: ${inputData}\nLevel: ${level}`);
          logger.debug(`[${requestId}] 🎭 Director Agent Detected Mood (Topic): ${detectedMood}`);
        } catch (err) {
          logger.warn(`[${requestId}] Mood analysis failed, defaulting to Neutral. Error: ${err.message}`);
        }
      }

      // Get topic hierarchy context if topic_id is provided
      let topicContext = null;
      if (req.body.topic_id && userId) {
        try {
          const topicPath = await getTopicPathInternal(req.body.topic_id, userId);
          if (topicPath && topicPath.length > 0) {
            const hierarchyStr = formatTopicHierarchy(topicPath);
            const rootTopic = getRootTopic(topicPath);
            topicContext = {
              hierarchy: hierarchyStr,
              rootTopic: rootTopic?.title || null
            };
            logger.info(`[${requestId}] 📍 Topic hierarchy context: ${hierarchyStr}`);
          }
        } catch (pathErr) {
          logger.warn(`[${requestId}] Failed to get topic path: ${pathErr.message}`);
        }
      }

      // Topic input returns {englishText, translatedText, usage, model}
      // Pass targetDurationMinutes to control content length
      // Pass topicContext for parent-aware content generation
      const topicResult = await extractTextFromInput(inputData, inputType, file, undefined, level, detectedLang, null, targetDurationMinutes, { mood: detectedMood, topicContext }, userId);
      if (!topicResult || !topicResult.englishText) {
        logger.error(`[${requestId}] Failed to generate narration for topic.`);
        return res.status(500).json({ success: false, message: "Failed to generate narration for topic." });
      }
      rawText = topicResult.englishText; // English text for TTS
      translatedText = topicResult.translatedText; // Translated text for display/storage
      // Capture LLM usage from topic generation
      if (topicResult.usage) {
        topicGenerationUsage = topicResult.usage;
        topicGenerationModel = topicResult.model || 'gpt-4o';
        logger.debug(`[${requestId}] 📊 Topic generation LLM usage: ${topicGenerationUsage.total_tokens} tokens (model: ${topicGenerationModel})`);
      }
      logger.debug(`[${requestId}] Topic processing: English text for TTS (${rawText.length} chars), Translated text for storage (${translatedText.length} chars)`);
    } else {
      logger.debug(`[${requestId}] ❌ NON-TOPIC FLOW: Using old translate+adapt flow for inputType="${inputType}"`);
      rawText = await extractTextFromInput(inputData, inputType, file, undefined, level, detectedLang, null, null, {}, userId);
    }
    if (rawText === null) {
      logger.error(`[${requestId}] Failed to extract text from input.`);
      logRequestStep(requestId, 'extractText:error', { error: 'Failed to extract text from input.' });
      if (["youtube", "spotify"].includes(inputType)) { // Removed 'file' as it's handled
        logger.warn(`[${requestId}] Input type '${inputType}' processing is not implemented yet.`);
        return res.status(501).json({ success: false, message: `Processing for input type '${inputType}' is not implemented yet.` });
      }
      return res.status(400).json({ success: false, message: "Could not extract text from the provided input." });
    }
    if (!rawText.trim()) {
      logger.warn(`[${requestId}] Extracted text is empty or whitespace only.`);
      logRequestStep(requestId, 'extractText:empty', { error: 'Extracted text is empty.' });
      return res.status(400).json({ success: false, message: "Extracted text is empty." });
    }
    logger.debug(`[${requestId}] Text extracted successfully.`);
    logStep({
      requestId,
      stepName: 'tts:extractText:end',
      stepSequence: stepSequence++,
      serviceName: 'LocalFunction',
      endpoint: 'extractTextFromInput',
      outputData: { rawText }
    });
    logRequestStep(requestId, 'extractText:end', { rawText });

    // --- Step 2: Clean Text ---
    const cleanedText = cleanText(rawText);
    logRequestStep(requestId, 'cleanText', { rawText, cleanedText });
    logStep({
      requestId,
      stepName: 'tts:cleanText',
      stepSequence: stepSequence++,
      serviceName: 'LocalFunction',
      endpoint: 'cleanText',
      inputData: { rawText },
      outputData: { cleanedText }
    });
    logger.debug(`[${requestId}] Text cleaned successfully.`);

    // For topic input, text is already in target language at correct CEFR level
    // Skip translate and adapt steps
    let skipTranslateAndAdapt = (inputType === "topic");
    if (skipTranslateAndAdapt) {
      logger.debug(`[${requestId}] Topic input detected - skipping translate/adapt (already processed in extractTextFromInput).`);
    }

    // Enforce subscription usage limits before heavy operations
    try {
      const userId = req.user?.id;
      if (userId) {
        const limitState = await checkLimits(userId);
        // If user has no active plan or subscription expired, block TTS
        if (!limitState?.hasPlan) {
          const isExpired = limitState?.isExpired;
          const message = isExpired
            ? limitState.message || 'Paket süreniz dolmuştur. Lütfen yeni bir paket satın alın.'
            : 'Aktif paketiniz yok. Lütfen paket seçin ve aboneliğinizi başlatın.';

          logger.warn(`[${requestId}] ${isExpired ? 'Subscription expired' : 'No active subscription'} for user ${userId}`);

          return res.status(200).json({
            success: false,
            code: isExpired ? 'SUBSCRIPTION_EXPIRED' : 'NO_ACTIVE_PLAN',
            message,
            expiredAt: limitState?.expiredAt,
          });
        }

        // Free Trial için tek ses başına 10 dk (10,000 karakter) limiti
        if (limitState.plan?.name === 'Free Trial') {
          const textLength = cleanedText.length;
          const maxCharsPerAudio = 10000; // 10 dakika

          if (textLength > maxCharsPerAudio) {
            logger.warn(`[${requestId}] Free Trial text too long: ${textLength} > ${maxCharsPerAudio}`);
            return res.status(200).json({
              success: false,
              code: 'FREE_TRIAL_TEXT_TOO_LONG',
              message: `Ücretsiz deneme ile her ses maksimum ${Math.floor(maxCharsPerAudio / 1000)} dakika olabilir. Metniniz ${Math.ceil(textLength / 1000)} dakika. Lütfen metni kısaltın veya premium pakete geçin.`,
              details: {
                textLength,
                maxLength: maxCharsPerAudio,
                estimatedMinutes: Math.ceil(textLength / 1000),
                maxMinutes: Math.floor(maxCharsPerAudio / 1000),
              },
            });
          }
        }

        // If plan exists but limits exceeded, block
        if (limitState.isExceeded) {
          logger.warn(`[${requestId}] Usage limit exceeded for user ${userId}`);

          // Free Trial özel mesajı
          if (limitState.isFreeTrialExhausted) {
            return res.status(200).json({
              success: false,
              code: 'FREE_TRIAL_EXHAUSTED',
              message: limitState.message || 'Ücretsiz deneme hakkınız doldu. Premium pakete geçin.',
              details: {
                audioCreationCount: limitState.audioCreationCount,
                maxAudioCount: limitState.maxAudioCount,
                planName: 'Free Trial',
              },
            });
          }

          return res.status(200).json({
            success: false,
            code: 'USAGE_LIMIT_EXCEEDED',
            message: 'Paket kullanım sınırınız aşıldı. Lütfen paket yükseltin veya sonraki dönemi bekleyin.',
            details: {
              limits: limitState.limits,
              usage: limitState.usage,
            }
          });
        }
      }
    } catch (limitErr) {
      logger.error(`[${requestId}] Failed to check usage limits: ${limitErr?.message}`);
    }

    // Track OpenAI usage/cost
    let openaiUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    /** @type {{model: string, prompt_tokens: number, completion_tokens: number, total_tokens: number, prompt_name?: string}[]} */
    const usageBreakdown = [];
    let openaiCallCount = 0;
    let googleTtsCallCount = 0;
    let textToAdapt = cleanedText;
    let translationResult = '';
    // Global language code used across TTS steps (default en-US)
    let languageCode = 'en-US';

    // Add topic generation usage if available (captured earlier in topic flow)
    if (topicGenerationUsage) {
      openaiUsage.prompt_tokens += topicGenerationUsage.prompt_tokens || 0;
      openaiUsage.completion_tokens += topicGenerationUsage.completion_tokens || 0;
      openaiUsage.total_tokens += topicGenerationUsage.total_tokens || 0;
      openaiCallCount += 1;
      usageBreakdown.push({
        model: topicGenerationModel || 'gpt-4o',
        prompt_tokens: topicGenerationUsage.prompt_tokens || 0,
        completion_tokens: topicGenerationUsage.completion_tokens || 0,
        total_tokens: topicGenerationUsage.total_tokens || 0,
        prompt_name: 'content_generation_bilingual'
      });
      logger.debug(`[${requestId}] 📊 Added topic generation usage to tracking: ${openaiUsage.total_tokens} tokens, ${openaiCallCount} calls`);
    }

    if (!skipTranslateAndAdapt) {
      // --- OPTIMIZED Step 2.5: Translate + Adapt in SINGLE LLM call ---
      // Token savings: ~43% compared to old 2-step method
      logRequestStep(requestId, 'translateAndAdapt:start', { cleanedText, level });
      logStep({
        requestId,
        stepName: 'tts:translateAndAdapt:start',
        stepSequence: stepSequence++,
        serviceName: 'OpenAI',
        endpoint: 'translateAndAdaptToCEFR',
        promptName: 'translate_and_adapt',
        inputData: { textLength: cleanedText.length, level }
      });

      // Detect source language - check for Turkish characters OR common Turkish words
      const hasTurkishChars = /[ğüşıöçĞÜŞİÖÇ]/g.test(cleanedText);
      const commonTurkishWords = /\b(ve|bir|bu|ne|var|için|ile|da|de|mi|mı|mu|mü|ben|sen|biz|siz|ama|veya|ki|gibi|kadar|sonra|önce|şimdi|nasıl|naber|selam|merhaba|tamam|evet|hayır|teşekkür|lütfen|belki|çok|az|iyi|kötü|büyük|küçük|yeni|eski|güzel|olan|olarak|daha|en|her|hiç|sadece|artık|hala|bile|zaten|yine|ancak|fakat|lakin|çünkü|eğer|acaba|neden|nasıl|nerede|ne zaman|kim|hangi)\b/gi.test(cleanedText);
      const sourceLanguage = (hasTurkishChars || commonTurkishWords) ? 'Turkish' : 'Auto-detect';

      // Determine prompt variant: 'narrator' for book/document content, 'standard' otherwise
      const isBookOrDocument = inputType === 'book' || inputType === 'document';
      const promptVariant = isBookOrDocument ? 'narrator' : 'standard';

      logger.debug(`[${requestId}] [TTS] Starting unified translate+adapt: ${sourceLanguage} -> EN at ${level} (variant: ${promptVariant})`);

      // MOOD ANALYSIS FOR NON-TOPIC INPUTS (Director Agent)
      if (!skipTranslateAndAdapt && isBookOrDocument) {
        try {
          detectedMood = await directorAgentService.analyzeMood(`Text: ${cleanedText.substring(0, 500)}...`);
          logger.debug(`[${requestId}] 🎭 Director Agent Detected Mood (Text): ${detectedMood}`);
        } catch (err) {
          logger.warn(`[${requestId}] Mood analysis failed, defaulting to Neutral. Error: ${err.message}`);
        }
      }

      try {
        // OPTIMIZED: Single LLM call instead of 2 separate calls
        // Use narrator variant for book/document content (audiobook-style narration)
        const result = await translateAndAdaptToCEFR(cleanedText, sourceLanguage, level, null, promptVariant, detectedMood, userId);
        openaiCallCount += 1; // Only 1 call now instead of 2!

        if (result && result.text) {
          textToAdapt = result.text;
          translationResult = cleanedText; // Original text is the "translation" (user's input)

          if (result.usage) {
            openaiUsage = {
              prompt_tokens: result.usage.prompt_tokens || 0,
              completion_tokens: result.usage.completion_tokens || 0,
              total_tokens: result.usage.total_tokens || 0
            };
            if (result.model) {
              usageBreakdown.push({
                model: result.model,
                ...openaiUsage,
                prompt_name: 'translate_and_adapt'
              });
            }
          }

          logger.debug(`[${requestId}] [TTS] Translate+Adapt complete in single call: ${textToAdapt.length} chars, ${openaiUsage.total_tokens} tokens`);
        } else {
          throw new Error('Optimized translate+adapt returned empty result');
        }

        if (!textToAdapt || textToAdapt.trim() === "") {
          logger.error(`[${requestId}] Translate+Adapt result is empty.`);
          logRequestStep(requestId, 'translateAndAdapt:error', { error: 'Result is empty.' });
          return res.status(400).json({ success: false, message: "Translation and adaptation result is empty." });
        }

        logRequestStep(requestId, 'translateAndAdapt:success', { resultLength: textToAdapt.length });

      } catch (optimizedError) {
        logger.error(`[${requestId}] Optimized translate+adapt failed: ${optimizedError.message}`);
        return res.status(500).json({
          success: false,
          message: 'Translation and adaptation failed',
          error: optimizedError.message
        });
      }

      logStep({
        requestId,
        stepName: 'tts:translateAndAdapt:end',
        stepSequence: stepSequence++,
        serviceName: 'OpenAI',
        endpoint: 'translateAndAdaptToCEFR',
        outputData: { textLength: textToAdapt.length, tokens: openaiUsage.total_tokens }
      });
      logRequestStep(requestId, 'translateAndAdapt:end', { textToAdapt: textToAdapt.substring(0, 200) + '...' });
    } else {
      // Topic input: text is already in target language at correct CEFR level
      translationResult = cleanedText;
      logger.debug(`[${requestId}] Skipped translate/adapt for topic input.`);
      logRequestStep(requestId, 'topic:skip_translate_adapt', { reason: 'Topic input already processed' });
    }

    // --- Step 2.7: Extract Daily Usage Patterns ---
    logger.debug(`[${requestId}] [TTS] STEP 2.7: Starting daily pattern extraction`);
    let dailyUsagePatterns = [];
    let patternUsage = null;
    try {
      logger.debug(`[${requestId}] [TTS] Extracting daily usage patterns from adapted text (length: ${textToAdapt.length})`);
      logRequestStep(requestId, 'dailyPatterns:start', { textLength: textToAdapt.length });

      const patternExtraction = await extractDailyUsagePatterns(textToAdapt, level, requestId);
      dailyUsagePatterns = patternExtraction.parsed?.daily_patterns || [];
      patternUsage = patternExtraction.usage;

      // Check if extraction was skipped
      if (patternExtraction.skipped) {
        logger.debug(`[${requestId}] [TTS] Daily pattern extraction skipped: ${patternExtraction.reason} (existing: ${patternExtraction.existingCount || 0})`);
      } else if (patternUsage) {
        // Detailed token log for Daily Pattern Extraction
        logger.debug(`[${requestId}] [TTS] Daily patterns OpenAI call - Model: ${patternUsage.model || 'gpt-4o-mini'}, Input: ${patternUsage.prompt_tokens || 0}, Output: ${patternUsage.completion_tokens || 0}, Total: ${patternUsage.total_tokens || 0} tokens`);
      }

      logger.debug(`[${requestId}] Daily usage patterns extracted: ${dailyUsagePatterns.length} patterns`);
      logRequestStep(requestId, 'dailyPatterns:end', { count: dailyUsagePatterns.length, skipped: patternExtraction.skipped || false });

      // Persist to database if supabase is available
      if (supabase && dailyUsagePatterns.length > 0) {
        const insertPayload = {
          user_id: req.user?.id || null,
          topic: req.body.input?.substring(0, 200) || 'TTS Request',
          level,
          request_id: requestId,
          pattern_count: dailyUsagePatterns.length,
          patterns: dailyUsagePatterns,
          raw_response: patternExtraction.rawResponse,
          adapted_text_length: textToAdapt?.length || 0
        };

        const { error: insertError } = await supabase
          .from('daily_usage_patterns')
          .insert([insertPayload]);

        if (insertError) {
          logger.error(`[${requestId}] Failed to persist daily usage patterns`, {
            error: insertError.message
          });
        } else {
          logger.debug(`[${requestId}] Daily usage patterns persisted successfully`);
        }
      }

      // Add pattern usage to OpenAI usage tracking
      if (patternUsage) {
        openaiUsage.prompt_tokens = (openaiUsage.prompt_tokens || 0) + (patternUsage.prompt_tokens || 0);
        openaiUsage.completion_tokens = (openaiUsage.completion_tokens || 0) + (patternUsage.completion_tokens || 0);
        openaiUsage.total_tokens = (openaiUsage.total_tokens || 0) + (patternUsage.total_tokens || 0);
        openaiCallCount += 1;
        usageBreakdown.push({
          model: patternUsage.model || 'gpt-4o-mini',
          prompt_tokens: patternUsage.prompt_tokens || 0,
          completion_tokens: patternUsage.completion_tokens || 0,
          total_tokens: patternUsage.total_tokens || 0,
          prompt_name: 'daily_usage_patterns'
        });
      }

      // Summary log for all OpenAI calls
      logger.debug(`[${requestId}] [TTS] Total OpenAI usage - Calls: ${openaiCallCount}, Input: ${openaiUsage.prompt_tokens}, Output: ${openaiUsage.completion_tokens}, Total: ${openaiUsage.total_tokens} tokens`);
    } catch (patternError) {
      logger.error(`[${requestId}] [TTS] Daily usage pattern extraction failed: ${patternError.message}`, {
        stack: patternError.stack,
        name: patternError.name
      });
      logRequestStep(requestId, 'dailyPatterns:error', { error: patternError.message });
      // Continue with TTS even if pattern extraction fails
    }
    logger.debug(`[${requestId}] [TTS] Pattern extraction complete. Patterns found: ${dailyUsagePatterns.length}`);

    // --- Check if no_tts flag is set (text generation only) ---
    if (req.body.no_tts === true) {
      logger.debug(`[${requestId}] no_tts flag detected. Skipping TTS synthesis, returning text only.`);
      logRequestStep(requestId, 'tts:skipped', { reason: 'no_tts flag set' });

      // Log OpenAI cost for content generation (preview mode)
      try {
        const userId = req.user?.id;
        if (userId && openaiUsage && openaiUsage.total_tokens > 0) {
          const { calculateOpenAiCost, logApiCost } = require('../utils/infra/costTracker.js');
          // Determine model from breakdown or default
          const model = usageBreakdown.length > 0 ? usageBreakdown[0].model : 'gpt-4o-mini';
          const costInfo = calculateOpenAiCost(openaiUsage, model);
          await logApiCost({
            userId,
            feature: 'content_preview',
            provider: 'openai',
            model: model,
            inputQuantity: openaiUsage.prompt_tokens || 0,
            outputQuantity: openaiUsage.completion_tokens || 0,
            costUsd: costInfo.totalCostUsd,
            metadata: { level, input_type: inputType },
          });
          logger.debug(`[${requestId}] 💰 Preview content cost logged: $${costInfo.totalCostUsd.toFixed(6)}`);
        }
      } catch (costErr) {
        logger.warn(`[${requestId}] Failed to log preview cost:`, costErr?.message);
      }

      return res.json({
        success: true,
        message: "Text generation complete. TTS synthesis skipped.",
        data: {
          adapted_text: textToAdapt,
          translated_text: translatedText || translationResult || textToAdapt,
          level,
          languageCode,
          daily_usage_patterns: dailyUsagePatterns,
          openai_usage: openaiUsage,
          openai_call_count: openaiCallCount,
          usage_breakdown: usageBreakdown
        }
      });
    }

    // --- Step 3: Chunk Text (ilk, translate sonrası) ---
    if (!textToAdapt || textToAdapt.trim() === "") {
      logger.error(`[${requestId}] textToAdapt is empty, chunkText will not be called.`);
      logRequestStep(requestId, 'chunkText:preTTS:error', { error: 'textToAdapt is empty.' });
      return res.status(400).json({ success: false, message: "No text to chunk after translation." });
    }
    logger.debug(`[TTS] chunkText input (preTTS): ${textToAdapt}`);
    const preChunks = preChunkTextByByteLimit(textToAdapt, 4500);
    const initialChunks = preChunks.flatMap(part => chunkText(part, 4500));
    logRequestStep(requestId, 'chunkText:preTTS:start', { textToAdapt, chunkCount: initialChunks.length });
    logStep({
      requestId,
      stepName: 'tts:chunkText:preTTS:start',
      stepSequence: stepSequence++,
      serviceName: 'LocalFunction',
      endpoint: 'chunkText',
      inputData: { textToAdapt },
      outputData: { chunkCount: initialChunks.length }
    });
    if (!initialChunks || initialChunks.length === 0) {
      logger.warn(`[${requestId}] Text resulted in zero chunks after translate.`);
      logRequestStep(requestId, 'chunkText:preTTS:error', { error: 'No chunks generated.' });
      return res.status(400).json({ success: false, message: "Processed text resulted in no content for audio generation." });
    }
    logRequestStep(requestId, 'chunkText:preTTS:end', { chunkCount: initialChunks.length });
    logStep({
      requestId,
      stepName: 'tts:chunkText:preTTS:end',
      stepSequence: stepSequence++,
      serviceName: 'LocalFunction',
      endpoint: 'chunkText',
      outputData: { chunkCount: initialChunks.length }
    });

    // --- Step 4: (Opsiyonel) CEFR adaptasyonu burada yapılacaksa, her preTtsChunk için yapılabilir ---
    // ...

    // --- Get and validate voice BEFORE chunking ---
    const requestedVoice = req.body.voice || req.body.voiceName;
    const requestedEngine = req.body.engine; // Capture engine preference (e.g. generative)

    let selectedVoice;
    let lingrootVoiceId = null;
    let pollyEngine = requestedEngine || null;
    const ttsProvider = await getTtsProvider();

    // --- CUSTOM LOGGING FOR CREATE CONTENT ---
    try {
      const logVoiceName = requestedVoice || 'default';
      const logApiName = ttsProvider;
      // rawText is extracted earlier in the function
      const logFirst25 = rawText ? rawText.substring(0, 25).replace(/\n/g, ' ') : (req.body.input ? String(req.body.input).substring(0, 25) : '');

      const logEntry = `VOICE_NAME=${logVoiceName}\nAPI_NAME=${logApiName}\nFIRST_25=${logFirst25}\n\n`;
      fs.appendFileSync(path.join(__dirname, '../logs/create_content.log'), logEntry);
      logger.debug(`[${requestId}] 📝 Logged creation request to logs/create_content.log`);
    } catch (logErr) {
      logger.warn(`[${requestId}] ⚠️ Failed to log to logs/create_content.log: ${logErr.message}`);
    }

    if (!requestedVoice) {
      // 1. Check if Book has a persistent voice setting for this level
      let bookVoiceSetting = null;
      let bookData = null;

      try {
        const { data: book } = await supabase
          .from('books')
          .select('id, title, subjects, voice_settings')
          .eq('id', bookId)
          .single();

        if (book) {
          bookData = book;
          const settings = book.voice_settings || {};
          // Check specific level first, then fallback to 'default' or any existing
          bookVoiceSetting = settings[level] || settings['default'];
        }
      } catch (err) {
        logger.warn(`[${requestId}] Failed to fetch book voice settings: ${err.message}`);
      }

      if (bookVoiceSetting && bookVoiceSetting.voice_id) {
        selectedVoice = bookVoiceSetting.voice_id;
        logger.debug(`[${requestId}] 📖 Using persisted book voice for ${level}: ${selectedVoice} (${bookVoiceSetting.style})`);
      } else if (bookData && req.directorAnalysis) {
        // 2. No setting exists -> Ask Director to Cast and Save
        logger.debug(`[${requestId}] 🎬 Director Mode: Casting new voice for book "${bookData.title}" (${level})...`);
        const newSetting = await DirectorAgentService.suggestAndSaveBookVoice(bookData, level, bookData.voice_settings);
        selectedVoice = newSetting.voice_id;
      } else {
        // 3. Fallback to old logic (Director dynamic or Lingroot mapping)
        if (req.directorAnalysis) {
          if (ttsProvider === 'openai') selectedVoice = 'onyx'; // Old hardcoded fallback
          else selectedVoice = 'Joanna';
          logger.debug(`[${requestId}] 🎬 Director Mode: Dynamic fallback voice (${selectedVoice})`);
        } else {
          // ... existing Lingroot mapping logic ...
          lingrootVoiceId = getDefaultLingrootVoiceId(languageCode);
          const mapped = mapLingrootToProviderVoice(lingrootVoiceId, ttsProvider);
          if (mapped && mapped.name) {
            selectedVoice = mapped.name;
            languageCode = mapped.languageCode || languageCode;
            if (mapped.engine) pollyEngine = mapped.engine;
            logger.debug(`[${requestId}] 🎯 No voice requested, using default Lingroot voice: ${selectedVoice}`);
          } else {
            selectedVoice = await getDefaultVoiceForProvider(ttsProvider, languageCode);
            logger.debug(`[${requestId}] 🎯 No voice requested, using provider default: ${selectedVoice}`);
          }
        }
      }
    } else {
      const maybeLingroot = getLingrootVoiceById(requestedVoice);
      if (maybeLingroot) {
        lingrootVoiceId = requestedVoice;
        const mapped = mapLingrootToProviderVoice(lingrootVoiceId, ttsProvider);
        if (mapped && mapped.name) {
          selectedVoice = mapped.name;
          languageCode = mapped.languageCode || languageCode;
          if (mapped.engine) {
            pollyEngine = mapped.engine;
          }
          logger.debug(`[${requestId}] 🎯 Requested Lingroot voice: ${lingrootVoiceId} | Provider: ${ttsProvider} | Selected: ${selectedVoice}`);
        } else {
          selectedVoice = await getDefaultVoiceForProvider(ttsProvider, languageCode);
          logger.warn(`[${requestId}] ⚠️ Lingroot mapping not found for ${lingrootVoiceId}, falling back to provider default: ${selectedVoice}`);
        }
      } else {
        // Backwards compatibility: treat as provider-specific voice name
        selectedVoice = requestedVoice;
        logger.debug(`[${requestId}] 🎯 Requested provider voice: ${requestedVoice} | Selected: ${selectedVoice}`);
      }
    }

    // Trust client-selected voice (Lingroot-mapped or raw) and defer detailed validation to synthesis stage
    logger.debug(`[${requestId}] 🎙️ Using selected voice for synthesis: ${selectedVoice}`);

    // Log gender/accent from request for mismatch diagnostics
    logger.debug(`[${requestId}] 🎯 Client filters -> gender: ${req.body?.gender || 'n/a'}, accent: ${req.body?.accent || 'n/a'}`);

    // --- Step 5: Her chunk için tekrar chunkText (TTS öncesi) ---
    let finalChunks = [];

    // Check if selected voice is a Chirp voice that needs special handling
    const isChirpSelected = isChirpVoice(selectedVoice);

    if (isChirpSelected) {
      logger.debug(`[${requestId}] 🎙️ CHIRP VOICE DETECTED: ${selectedVoice} - Using special 900-byte chunking`);
    }

    for (let i = 0; i < initialChunks.length; i++) {
      let chunks;

      if (isChirpSelected) {
        // Chirp voices: Use special chunking with 600-byte limit for safety
        chunks = chunkTextForChirpVoices(initialChunks[i], 600);
        logger.debug(`[${requestId}] 🎙️ [CHIRP CHUNK ${i + 1}] Generated ${chunks.length} chirp-safe chunks`);
      } else {
        // Regular voices: Use normal chunking with 1000 character limit
        // Daha küçük parçalara böl (bazı videolarda uzun paragraflar sorun çıkarıyor)
        chunks = chunkTextByCharLimit(initialChunks[i], 600);
        chunks = chunks.map((chunk, j) => {
          if (chunk.length > 600) {
            logger.warn(`[Regular chunk] [${i}.${j}] length exceeds safe limit: ${chunk.length}, truncating to 600.`);
            return chunk.substring(0, 600);
          }
          return chunk;
        });
        logger.debug(`[${requestId}] [Regular chunk ${i + 1}] Generated ${chunks.length} standard chunks`);
      }

      chunks.forEach((chunk, j) => {
        const chunkBytes = Buffer.byteLength(chunk, "utf-8");
        logger.debug(`[${isChirpSelected ? 'CHIRP' : 'Regular'} chunk] [${i}.${j}] length: ${chunk.length} chars, ${chunkBytes} bytes`);

        // Final safety check for Chirp voices
        if (isChirpSelected && chunkBytes > 900) {
          logger.error(`🚨 [CHIRP SAFETY] Chunk [${i}.${j}] exceeds 900 bytes (${chunkBytes})! This should not happen.`);
        }
      });

      finalChunks = finalChunks.concat(chunks);
    }

    // Dynamically determine language code based on voice name
    languageCode = "en-US"; // Default to US English
    if (selectedVoice) {
      if (selectedVoice.includes("en-GB")) {
        languageCode = "en-GB";
      } else if (selectedVoice.includes("en-AU")) {
        languageCode = "en-AU";
      } else if (selectedVoice.includes("en-CA")) {
        languageCode = "en-CA";
      } else if (selectedVoice.includes("en-IN")) {
        languageCode = "en-IN";
      } else if (selectedVoice.includes("en-US")) {
        languageCode = "en-US";
      }
    }
    const adaptedText = finalChunks.join('\n\n');

    // --- DUAL CACHE CHECK: contenthistory + chapter_audio ---
    logger.debug(`[${requestId}] 🎯 CHECKING CACHE: text(${adaptedText.length}chars) + level(${level}) + voice(${selectedVoice})`);

    try {
      // 1. Önce chapter_audio tablosunda kontrol et (eğer chapter_id varsa)
      if (req.body.chapter_id) {
        logger.debug(`[${requestId}] 🔍 Checking chapter_audio for chapter_id: ${req.body.chapter_id}`);
        const { data: chapterAudio, error: chapterError } = await supabase
          .from('chapter_audio')
          .select('mp3_url, vtt_url, created_at, id')
          .eq('chapter_id', req.body.chapter_id)
          .eq('voice_model', selectedVoice)
          .eq('speaking_rate', speakingRate)
          .eq('level', level)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!chapterError && chapterAudio && chapterAudio.length > 0) {
          const cached = chapterAudio[0];
          logger.info(`[${requestId}] 🎯 CHAPTER CACHE HIT! Using existing chapter audio ID: ${cached.id}`);

          // Create VTT for cached content
          const words = adaptedText.split(/\s+/).filter(word => word.length > 0);
          const estimatedDuration = (words.length / (150 * speakingRate)) * 60;

          const vttContent = createWordLevelVTT(adaptedText, estimatedDuration);
          const vttId = `cached_chapter_vtt_${Date.now()}`;
          tempVttFiles.set(vttId, {
            content: vttContent,
            createdAt: new Date(),
            text: adaptedText,
            duration: estimatedDuration,
            isChapterCached: true
          });

          // For cached content, try to load real timing if available from VTT
          let realTimepoints = words.map((word, index) => ({
            timeSeconds: (index / words.length) * estimatedDuration,
            endTimeSeconds: ((index + 1) / words.length) * estimatedDuration,
            word: word
          }));

          // If cached VTT URL exists, try to get real timings
          if (cached.vtt_url) {
            logger.debug(`[${requestId}] Cached VTT available, using for timing: ${cached.vtt_url}`);
          }

          // RETURN CHAPTER CACHED RESULT IMMEDIATELY!
          logger.debug(`[${requestId}] [TTS] Using chapter cache return`);
          return res.status(200).json({
            success: true,
            message: adaptedText,
            level: level,
            mp3_url: cached.mp3_url,
            vtt_url: cached.vtt_url || `/api/tts/vtt/${vttId}`,
            words: words,
            timepoints: realTimepoints,
            // Chapter cache indicators
            is_cached: true,
            chapter_cache_hit: true,
            chapter_audio_id: cached.id,
            speaking_rate: speakingRate,
            estimated_duration: estimatedDuration,
            cache_source: 'chapter_audio',
            // Çeviri ve adaptasyon sonuçları (database kayıt için)
            translated_text: translationResult || '',
            adapted_text: adaptedText,
            // Frontend için camelCase versiyonları da ekle (TEST VALUES)
            translatedText: translationResult || 'TEST_CACHE1_EMPTY',
            adaptedText: adaptedText || 'TEST_CACHE1_ADAPTED'
          });
        }
      }

      // 2. Sonra contenthistory tablosunda kontrol et
      logger.debug(`[${requestId}] 🔍 Checking contenthistory table...`);
      const { data: cachedContent, error: cacheError } = await supabase
        .from('contenthistory')
        .select('mp3_url, created_at, id')
        .eq('input', adaptedText)
        .eq('level', level)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!cacheError && cachedContent && cachedContent.length > 0) {
        const cached = cachedContent[0];
        logger.info(`[${requestId}] 🎯 CONTENT CACHE HIT! Using existing audio from ${cached.created_at}`);

        // Create VTT for cached content
        const words = adaptedText.split(/\s+/).filter(word => word.length > 0);
        const estimatedDuration = (words.length / (150 * speakingRate)) * 60;

        const vttContent = createWordLevelVTT(adaptedText, estimatedDuration);
        const vttId = `cached_content_vtt_${Date.now()}`;
        tempVttFiles.set(vttId, {
          content: vttContent,
          createdAt: new Date(),
          text: adaptedText,
          duration: estimatedDuration,
          isContentCached: true
        });

        // RETURN CONTENT CACHED RESULT IMMEDIATELY!
        logger.debug(`[${requestId}] [TTS] Using content cache return`);
        return res.status(200).json({
          success: true,
          message: adaptedText,
          level: level,
          mp3_url: cached.mp3_url,
          vtt_url: `/api/tts/vtt/${vttId}`,
          words: words,
          timepoints: words.map((word, index) => ({
            timeSeconds: (index / words.length) * estimatedDuration,
            endTimeSeconds: ((index + 1) / words.length) * estimatedDuration,
            word: word
          })),
          // Content cache indicators
          is_cached: true,
          content_cache_hit: true,
          content_record_id: cached.id,
          speaking_rate: speakingRate,
          estimated_duration: estimatedDuration,
          // Çeviri ve adaptasyon sonuçları (database kayıt için)
          translated_text: translationResult || '',
          adapted_text: adaptedText,
          // Frontend için camelCase versiyonları da ekle (TEST VALUES)
          translatedText: translationResult || 'TEST_CACHE2_EMPTY',
          adaptedText: adaptedText || 'TEST_CACHE2_ADAPTED'
        });
      }

      logger.debug(`[${requestId}] 🎯 CACHE MISS - No cached version found. Will create new TTS`);
    } catch (cacheError) {
      logger.warn(`[${requestId}] Cache check failed: ${cacheError.message}`);
    }

    // Skip old TTS implementation - using real timing approach below
    logger.debug(`[${requestId}] 🔧 TTS Provider: ${ttsProvider} (Real Timing Mode)`);

    // --- Step 6: Synthesize Audio with TTS Provider (Google / Amazon / Azure) ---
    // Track TTS characters and category for cost
    let ttsCharactersTotal = 0;
    let ttsCategory = 'Premium';

    // If we have a Lingroot voice, prefer its quality as the cost category
    if (lingrootVoiceId) {
      const lingrootVoice = getLingrootVoiceById(lingrootVoiceId);
      if (lingrootVoice && lingrootVoice.quality) {
        const q = String(lingrootVoice.quality).toLowerCase();
        if (q === 'basic') ttsCategory = 'Basic';
        else if (q === 'premium') ttsCategory = 'Premium';
        else if (q === 'gold') ttsCategory = 'Gold';
        else if (q === 'marketing') ttsCategory = 'Platinum'; // Marketing/Studio
        else if (q === 'ultra') ttsCategory = 'Gold'; // Journey/Chirp is typically Gold tier
        else if (q === 'platinum') ttsCategory = 'Platinum';
      }
    }
    logger.debug(`[${requestId}] Starting ${ttsProvider} TTS synthesis...`);
    logStep({
      requestId,
      stepName: 'tts:synthesis:start',
      stepSequence: stepSequence++,
      serviceName: 'Google TTS',
      inputData: {
        text: adaptedText.substring(0, 100) + "...",
        voice: selectedVoice,
        rate: speakingRate,
        chunks: finalChunks.length
      }
    });

    // Her chunk için sentez yap - optimized timing bilgileriyle
    const audioSegments = [];
    let allWordTimings = []; // let kullan - drift correction için reassign gerekli
    const allCleanWords = [];
    const allOriginalWords = [];
    let cumulativeTimeOffset = 0;

    for (let i = 0; i < finalChunks.length; i++) {
      const chunk = finalChunks[i];
      logger.debug(`[${requestId}] Synthesizing chunk ${i + 1}/${finalChunks.length} (${chunk.length} chars)...`);

      try {
        let ttsResult;

        // Use Amazon Polly, Azure or Google based on provider setting
        if ((ttsProvider === 'polly' || ttsProvider === 'amazon') && isPollyAvailable()) {
          logger.debug(`[${requestId}] Using Amazon Polly for chunk ${i + 1}`);
          const pollyOptions = {
            text: chunk,
            voiceName: selectedVoice,
            languageCode: languageCode,
            speakingRate: speakingRate
          };
          // For Lingroot BASIC voices we explicitly use Polly STANDARD engine
          if (pollyEngine) {
            pollyOptions.engine = pollyEngine;
          }
          ttsResult = await synthesizeWithPolly(pollyOptions);
        } else if (ttsProvider === 'azure' && isAzureTTSAvailable()) {
          logger.debug(`[${requestId}] Using Azure TTS for chunk ${i + 1}`);
          ttsResult = await synthesizeWithAzure({
            text: chunk,
            voiceName: selectedVoice,
            languageCode: languageCode,
            speakingRate: speakingRate
          });
        } else if (ttsProvider === 'openai' && isOpenAITTSAvailable()) {
          logger.debug(`[${requestId}] Using OpenAI TTS for chunk ${i + 1}`);
          // Get OpenAI voice config from Lingroot mapping
          const openaiVoiceConfig = lingrootVoiceId
            ? mapLingrootToProviderVoice(lingrootVoiceId, 'openai')
            : null;
          const openaiVoice = openaiVoiceConfig?.name || selectedVoice || 'nova';
          const openaiModel = openaiVoiceConfig?.model || 'tts-1';

          ttsResult = await synthesizeWithOpenAI({
            text: chunk,
            voice: openaiVoice,
            model: openaiModel,
            speed: speakingRate
          });
        } else {
          // Default to Google TTS
          if (ttsProvider === 'azure') {
            logger.warn(`[${requestId}] Azure TTS not available, falling back to Google TTS`);
          } else if (ttsProvider === 'polly' || ttsProvider === 'amazon') {
            logger.warn(`[${requestId}] Amazon Polly not available, falling back to Google TTS`);
          } else if (ttsProvider === 'openai') {
            logger.warn(`[${requestId}] OpenAI TTS not available, falling back to Google TTS`);
          }
          logger.debug(`[${requestId}] Using Google TTS for chunk ${i + 1}`);
          ttsResult = await synthesizeWithGoogle({
            text: chunk,
            voiceName: selectedVoice,
            languageCode: languageCode,
            speakingRate: speakingRate,
            userId
          });
        }

        if (!ttsResult.success || !ttsResult.audioContent) {
          throw new Error('TTS synthesis failed');
        }

        // 🎯 Voice ve gender bilgilerini log'la
        logger.debug(`[${requestId}] 🎙️ TTS Chunk ${i + 1} Success - Voice: ${ttsResult.voiceName || selectedVoice}, Gender: ${ttsResult.actualGender || 'unknown'}, Method: ${ttsResult.timingMethod || 'unknown'}`);
        if (ttsResult.actualGender) {
          logger.debug(`[TTS] Chunk ${i + 1} - Expected Voice: ${selectedVoice} -> Actual Gender: ${ttsResult.actualGender}`);
        }

        // Audio segment'ini sakla
        audioSegments.push({
          audioContent: ttsResult.audioContent,
          chunkIndex: i,
          duration: ttsResult.totalDuration,
          wordCount: ttsResult.wordTimings.length
        });

        // Cost tracking for TTS
        ttsCharactersTotal += chunk.length;
        googleTtsCallCount += 1;
        // Determine package category from voice name only for Google TTS
        if (ttsProvider === 'google') {
          if (selectedVoice?.includes('Standard')) ttsCategory = 'Basic';
          else if (selectedVoice?.includes('Wavenet') || selectedVoice?.includes('Neural2')) ttsCategory = 'Premium';
          else if (selectedVoice?.includes('Chirp') || selectedVoice?.includes('Journey')) ttsCategory = 'Gold';
          else if (selectedVoice?.includes('Studio')) ttsCategory = 'Platinum';
        } else if (ttsProvider === 'openai') {
          // OpenAI TTS pricing: tts-1 = standard, tts-1-hd = HD
          // NOTE: HD model disabled for now - always use standard
          // const openaiModel = req.body.openaiModel || 'tts-1';
          // ttsCategory = openaiModel === 'tts-1-hd' ? 'openai-hd' : 'openai-standard';
          ttsCategory = 'openai-standard';
        }

        // Clean ve original words'leri topla
        if (ttsResult.cleanWords) {
          allCleanWords.push(...ttsResult.cleanWords);
        }
        if (ttsResult.originalWords) {
          allOriginalWords.push(...ttsResult.originalWords);
        }

        // Word timing'leri birleştir - optimized format ile offset
        ttsResult.wordTimings.forEach(wordTiming => {
          allWordTimings.push({
            word: wordTiming.word,
            timeSeconds: wordTiming.timeSeconds + cumulativeTimeOffset,
            endTimeSeconds: wordTiming.endTimeSeconds + cumulativeTimeOffset,
            chunkIndex: i,
            originalMarkName: wordTiming.markName,
            hasDirectTiming: wordTiming.hasDirectTiming
          });
        });

        // Bir sonraki chunk için offset'i güncelle
        cumulativeTimeOffset += ttsResult.totalDuration;

        logger.debug(`[${requestId}] Chunk ${i + 1} completed - Duration: ${ttsResult.totalDuration.toFixed(1)}s, Clean words: ${ttsResult.cleanWords?.length || 0}, Fallback: ${ttsResult.fallbackUsed ? 'Yes' : 'No'}`);

      } catch (chunkError) {
        logger.error(`[${requestId}] Chunk ${i + 1} synthesis failed:`, chunkError.message);
        throw new Error(`TTS synthesis failed for chunk ${i + 1}: ${chunkError.message}`);
      }
    }

    // Toplam süre ve kelime sayısı
    const totalRealDuration = cumulativeTimeOffset;
    const totalWords = allWordTimings.length;

    logger.info(`[${requestId}] All chunks synthesized - Total duration: ${totalRealDuration.toFixed(1)}s, Total words: ${totalWords}, Segments: ${audioSegments.length}`);
    logger.debug(`[${requestId}] 📊 API Call Counts -> OpenAI: ${openaiCallCount}, Google TTS: ${googleTtsCallCount}`);

    // --- Step 7: Merge Audio Segments ---
    logger.debug(`[${requestId}] Merging ${audioSegments.length} audio segments...`);

    const audioBuffers = audioSegments.map(segment => segment.audioContent);
    const mergedAudioBuffer = await mergeAudioSegmentsToBuffer(audioBuffers);

    if (!mergedAudioBuffer) {
      throw new Error('Audio merging failed');
    }

    const mergedAudioBase64 = mergedAudioBuffer.toString('base64');
    const uniqueId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.debug(`[${requestId}] Audio merged successfully - Final size: ${mergedAudioBuffer.length} bytes, ID: ${uniqueId}`);

    // --- Step 7.5: Analyze Audio and Adjust Timings (Hybrid Approach) ---
    logger.debug(`[${requestId}] 🎯 Analyzing audio for drift correction...`);

    const analysisResult = await analyzeAndAdjustTimings(
      mergedAudioBuffer,
      allWordTimings,
      totalRealDuration
    );

    // DEBUG: Log analysisResult
    logger.debug(`🔍 [ANALYSIS RESULT]:`, {
      driftDetected: analysisResult.driftDetected,
      driftAmount: analysisResult.driftAmount,
      driftPercentage: analysisResult.driftPercentage,
      actualDuration: analysisResult.actualDuration,
      estimatedDuration: analysisResult.estimatedDuration
    });

    // Use adjusted timings if drift was detected
    if (analysisResult.driftDetected) {
      logger.warn(`[${requestId}] ⚠️ Drift corrected: ${analysisResult.driftAmount.toFixed(2)}s (${analysisResult.driftPercentage.toFixed(1)}%)`);
      allWordTimings = analysisResult.wordTimings;
    }

    // Update total duration with actual audio duration
    const actualTotalDuration = analysisResult.actualDuration || totalRealDuration;
    logger.debug(`[${requestId}] 🎯 Final duration: ${actualTotalDuration.toFixed(2)}s (estimated: ${totalRealDuration.toFixed(2)}s)`);

    // --- Step 8: Create VTT with Optimized Timings ---
    logger.debug(`[${requestId}] Creating VTT with optimized word timings...`);

    // Kullanıcıya gösterilecek temiz text oluştur (noktalama olmadan)
    const cleanTextForDisplay = allCleanWords.join(' ');

    // Optimized timing'lerle VTT oluştur
    const vttContent = createWordLevelVTTFromOptimizedTimings(allWordTimings, allCleanWords, allOriginalWords);
    const vttUniqueId = `vtt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // VTT dosyasını temp olarak sakla
    tempVttFiles.set(vttUniqueId, {
      content: vttContent,
      createdAt: new Date(),
      text: cleanTextForDisplay, // Temiz text sakla
      originalText: translatedText || textToAdapt, // Topic için çevrilmiş metin (kullanıcıya gösterilen)
      duration: actualTotalDuration,
      words: totalWords,
      wordTimings: allWordTimings,
      cleanWords: allCleanWords,
      originalWords: allOriginalWords,
      speakingRate: speakingRate,
      isRealTiming: true,
      isOptimized: true,
      driftCorrected: analysisResult.driftDetected || false
    });

    const vttUrl = `/api/tts/vtt/${vttUniqueId}`;

    logger.debug(`[${requestId}] Optimized VTT created - ID: ${vttUniqueId}, Duration: ${totalRealDuration.toFixed(1)}s, Clean words: ${allCleanWords.length}, Original words: ${allOriginalWords.length}`);

    // --- Step 9: Forced Alignment (High-Accuracy Word Timestamps) ---
    let mfaWordTimings = null;
    const useMFA = process.env.USE_MFA_ALIGNMENT === 'true';
    const mfaDebugEnabled = process.env.MFA_DEBUG_DUMP === 'true';

    if (mfaDebugEnabled) {
      logger.debug(`[${requestId}] Alignment debug dump enabled (file id will be: text_${requestId}_${uniqueId})`);
    }

    if (useMFA) {
      const alignStartTime = Date.now();
      try {
        logger.debug(`[${requestId}] 🎯 Starting MFA alignment for high-accuracy timestamps...`);

        // Save merged audio to temp file for MFA processing
        const tempAudioPath = path.join(os.tmpdir(), `mfa_audio_${uniqueId}.mp3`);
        await fs.promises.writeFile(tempAudioPath, mergedAudioBuffer);

        // Detect locale from voice name (e.g., en-US-*, en-GB-*)
        const locale = selectedVoice?.includes('GB') ? 'en_GB' : 'en_US';

        // Run MFA alignment
        mfaWordTimings = await mfaAligner.generateWordTimestamps(
          tempAudioPath,
          adaptedText,
          locale,
          {
            debug: mfaDebugEnabled
              ? {
                id: `text_${requestId}_${uniqueId}`,
                source: 'ttsController',
                requestId,
                uniqueId,
              }
              : null,
          }
        );

        // Cleanup temp audio file
        await fs.promises.unlink(tempAudioPath).catch(() => { });

        const alignElapsed = Math.round((Date.now() - alignStartTime) / 1000);
        logger.info(`[${requestId}] ✅ MFA alignment complete - ${mfaWordTimings.length} words aligned`);
        logger.debug(`[${requestId}] ⏱️ MFA running time: ${alignElapsed} seconds`);
        logger.debug(`[${requestId}] 🔍 MFA sample timing:`, mfaWordTimings.slice(0, 3));

      } catch (mfaError) {
        const alignElapsed = Math.round((Date.now() - alignStartTime) / 1000);
        logger.warn(`[${requestId}] ⚠️ MFA alignment failed after ${alignElapsed} seconds, falling back to TTS timepoints: ${mfaError.message}`);
        // Continue with TTS timepoints if MFA fails
      }
    }

    // --- Step 10: Upload to Supabase (optional) ---
    let mp3Url = null;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      try {
        logger.debug(`[${requestId}] Uploading to Supabase...`);
        mp3Url = await uploadToSupabase(mergedAudioBuffer, `tts_${uniqueId}.mp3`);
        logger.info(`[${requestId}] Supabase upload successful: ${mp3Url}`);
      } catch (uploadError) {
        logger.warn(`[${requestId}] Supabase upload failed, will serve locally: ${uploadError.message}`);
      }
    }

    // Evict oldest entry if map exceeds size limit (prevent memory leak)
    if (tempAudioFiles.size >= 500) {
      const oldestKey = tempAudioFiles.keys().next().value;
      tempAudioFiles.delete(oldestKey);
    }

    // Store in memory for API serving
    tempAudioFiles.set(uniqueId, {
      path: null,
      buffer: mergedAudioBuffer,
      createdAt: new Date(),
      supabaseUrl: mp3Url,
      duration: actualTotalDuration,
      wordCount: totalWords,
      driftCorrected: analysisResult.driftDetected || false
    });

    logger.debug(`[${requestId}] 🔄 tempAudioFiles size after: ${tempAudioFiles.size}`);

    // --- Step 11: Return Success Response ---
    logger.debug(`[${requestId}] Processing complete with ${mfaWordTimings ? 'MFA' : 'optimized'} timings.`);

    const finalMp3Url = mp3Url;

    // Use MFA timings if available, otherwise fall back to TTS timepoints
    // Ensure words is always an array
    const words = Array.isArray(allOriginalWords) ? allOriginalWords : allOriginalWords.split(/\s+/).filter(w => w.length > 0);
    let timepoints;

    if (mfaWordTimings && mfaWordTimings.length > 0) {
      // Convert MFA alignment timings to our timepoint format
      timepoints = mfaWordTimings.map((timing, index) => ({
        word: timing.word,
        timeSeconds: timing.startTime,
        endTimeSeconds: timing.endTime,
        index: index,
        hasRealTiming: true,
        source: 'mfa'
      }));

      logger.debug(`✅ Using MFA timepoints - ${timepoints.length} words with acoustic alignment`);
    } else {
      // Fall back to TTS timepoints
      timepoints = matchWordsWithTimings(allOriginalWords, allWordTimings, totalRealDuration);
      logger.debug(`⚠️ Using TTS timepoints - ${timepoints.length} words with estimated timing`);
    }

    // DEBUG: Timepoints kontrolü
    logger.debug(`🔍 FINAL TIMEPOINTS DEBUG - Total words: ${words.length}, Timepoints: ${timepoints.length}`);
    logger.debug(`🔍 First 5 timepoints:`, timepoints.slice(0, 5));
    logger.debug(`🔍 Timing source: ${mfaWordTimings ? 'MFA (acoustic)' : 'TTS (estimated)'}`);

    // Post-process: check limits and deactivate subscription if exceeded
    try {
      const stateAfter = await checkLimits(req.user?.id);
      if (stateAfter?.hasPlan && stateAfter.isExceeded) {
        logger.warn(`[${requestId}] Usage exceeded after TTS generation. Deactivating active subscription.`);
        const { data: activeSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', req.user?.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (activeSub?.id) {
          await supabase
            .from('subscriptions')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('id', activeSub.id);
        }
      }
    } catch (postLimitErr) {
      logger.error(`[${requestId}] Post-limit check failed: ${postLimitErr?.message}`);
    }
    logger.debug(`🔍 Sample word timing:`, allWordTimings[0]);

    logStep({
      requestId,
      stepName: 'tts:success',
      stepSequence: stepSequence++,
      status: 'success',
      outputData: {
        mp3_url: finalMp3Url,
        vtt_url: vttUrl,
        supabase_url: mp3Url,
        words_count: totalWords,
        real_duration: totalRealDuration,
        speaking_rate: speakingRate,
        chunks_processed: audioSegments.length,
        timepoints_count: timepoints.length
      }
    });

    // Kitap bölümü için ses oluşturulmuşsa chapter_audio tablosuna kaydet
    if (req.body.chapter_id) {
      try {
        const { data, error } = await supabase
          .from('chapter_audio')
          .upsert({
            chapter_id: req.body.chapter_id,
            voice_model: selectedVoice || 'en-US-Standard-C',
            speaking_rate: speakingRate || 1.0,
            level: level || 'a1',
            mp3_url: finalMp3Url,
            vtt_url: vttUrl,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'chapter_id,voice_model,speaking_rate,level'
          })
          .select();

        if (error) {
          throw error;
        }

        logger.debug(`[${requestId}] Chapter audio saved to database via Supabase: ${data[0]?.id}`);
      } catch (dbError) {
        logger.error(`[${requestId}] Error saving chapter audio to database: ${dbError.message}`);
        // Don't fail the request if database save fails
      }
    }

    // Konu ağacı üzerinden gelen istekler için topic_contents tablosuna kaydet
    if (req.body.topic_id) {
      try {
        const topicId = req.body.topic_id;

        logger.debug(`[${requestId}] Saving topic audio for topic_id=${topicId} to topic_contents`);

        const insertPayload = {
          topic_id: topicId,
          mp3_url: finalMp3Url,
          vtt_url: vttUrl,
          text_content: cleanTextForDisplay || null,
          translated_text: translatedText || translationResult || null,
          adapted_text: adaptedText || null,
          level: level || null,
          voice_model: selectedVoice || null,
          speaking_rate: speakingRate || null,
          duration_seconds: Math.round(actualTotalDuration || 0),
          words: Array.isArray(words) && words.length > 0 ? words : null,
          timepoints: Array.isArray(timepoints) && timepoints.length > 0 ? timepoints : null
        };

        const { data, error } = await supabase
          .from('topic_contents')
          .insert(insertPayload)
          .select();

        if (error) {
          throw error;
        }

        logger.debug(`[${requestId}] Topic audio saved to topic_contents: ${data[0]?.id}`);
      } catch (dbError) {
        logger.error(`[${requestId}] Error saving topic audio to topic_contents: ${dbError.message}`);
        // İstek başarısız sayılmamalı; sadece logla
      }
    }

    // Genel TTS istekleri için contenthistory tablosuna kaydet
    let contentHistoryId = null;
    try {
      logger.debug(`[${requestId}] 💾 Saving to contenthistory table...`);

      // Get user ID from JWT token
      const authHeader = req.headers.authorization;
      logger.debug(`[${requestId}] 🔑 Auth header present: ${!!authHeader}`);
      let userId = null;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        logger.debug(`[${requestId}] 🎫 Token extracted: ${token.substring(0, 20)}...`);
        const jwt = require('jsonwebtoken');
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.id;
          logger.debug(`[${requestId}] 👤 User ID from token: ${userId}`);
        } catch (jwtError) {
          logger.warn(`[${requestId}] ❌ Could not decode JWT token: ${jwtError.message}`);
        }
      } else {
        logger.warn(`[${requestId}] ❌ No valid auth header found`);
      }
      if (userId) {
        // Calculate costs
        const { calculateOpenAiCost, calculateTtsCost, logApiCost } = require('../utils/infra/costTracker.js');
        // Sum costs per model using detailed breakdown if available; fallback to total with default model
        let openaiCost = { totalCostUsd: 0 };
        if (usageBreakdown.length > 0) {
          let totalCost = 0;
          usageBreakdown.forEach((u) => {
            const c = calculateOpenAiCost({ prompt_tokens: u.prompt_tokens, completion_tokens: u.completion_tokens, total_tokens: u.total_tokens }, u.model);
            totalCost += c.totalCostUsd || 0;
          });
          openaiCost.totalCostUsd = Number(totalCost.toFixed(6));
        } else {
          openaiCost = calculateOpenAiCost(openaiUsage, 'gpt-4o');
        }
        const ttsCostUsd = calculateTtsCost(ttsCharactersTotal, ttsCategory);
        const totalCostUsd = Number(((openaiCost.totalCostUsd || 0) + (ttsCostUsd || 0)).toFixed(6));

        // Additional metadata for cost analytics
        const audioDurationSeconds = Math.round((actualTotalDuration || totalRealDuration || 0));
        const normalizedEntrySource = (req.body.entrySource || req.body.entry_source || req.body.section || req.body.source || req.body.type || inputType || 'unknown');

        const insertData = {
          user_id: userId,
          level: level || 'B1',
          mp3_url: finalMp3Url,
          input: inputType === 'file' ? (rawText || req.body.input || '') : (req.body.input || ''),
          translated_text: translatedText || translationResult || '',
          adapted_text: textToAdapt || '',
          input_type: req.body.type || 'text',
          created_at: new Date().toISOString(),
          words: words && words.length > 0 ? JSON.stringify(words) : null,
          timepoints: timepoints && timepoints.length > 0 ? JSON.stringify(timepoints) : null,
          // cost fields
          openai_prompt_tokens: openaiUsage.prompt_tokens || 0,
          openai_completion_tokens: openaiUsage.completion_tokens || 0,
          openai_total_tokens: openaiUsage.total_tokens || (openaiUsage.prompt_tokens || 0) + (openaiUsage.completion_tokens || 0),
          openai_cost_usd: openaiCost.totalCostUsd || 0,
          tts_characters: ttsCharactersTotal,
          tts_category: ttsCategory,
          tts_cost_usd: ttsCostUsd,
          total_cost_usd: totalCostUsd,
          // cost dashboard metadata
          tts_provider: ttsProvider || null,
          tts_voice_name: selectedVoice || null,
          audio_duration_seconds: audioDurationSeconds > 0 ? audioDurationSeconds : null,
          entry_source: normalizedEntrySource,
          // LLM usage breakdown for detailed cost analytics (prompt-level detail)
          llm_usage_details: usageBreakdown.length > 0 ? JSON.stringify(usageBreakdown) : null,
          detected_mood: detectedMood || null,
          processing_duration_ms: Date.now() - processingStartTime,
        };

        logger.debug(`[${requestId}] 📋 Insert data:`, JSON.stringify(insertData, null, 2));

        // If a record with same mp3_url already exists for this user, update it instead of inserting a new one
        let data, error;
        try {
          const existingQuery = await supabase
            .from('contenthistory')
            .select('id')
            .eq('user_id', userId)
            .eq('mp3_url', finalMp3Url)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!existingQuery.error && existingQuery.data && existingQuery.data.length > 0) {
            const existingId = existingQuery.data[0].id;
            ({ data, error } = await supabase
              .from('contenthistory')
              .update(insertData)
              .eq('id', existingId)
              .select());
            logger.debug(`[${requestId}] ♻️ Updated existing contenthistory ID: ${existingId} for same mp3_url`);
          } else {
            ({ data, error } = await supabase
              .from('contenthistory')
              .insert(insertData)
              .select());
          }
        } catch (upsertErr) {
          error = upsertErr;
        }

        if (error) {
          logger.error(`[${requestId}] 🚨 Supabase insert error:`, error);
          throw error;
        }

        logger.debug(`[${requestId}] ✅ Audio saved to contenthistory table: ${data[0]?.id}`);
        logger.debug(`[${requestId}] 📊 Saved data:`, JSON.stringify(data[0], null, 2));
        contentHistoryId = data?.[0]?.id || null;

        // Free Trial için ses oluşturma sayacını artır
        try {
          const { data: activeSub, error: subError } = await supabase
            .from('subscriptions')
            .select('id, plantype, audio_creation_count')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (subError) {
            logger.warn(`[${requestId}] Error fetching subscription for counter update:`, subError.message);
          } else if (activeSub && activeSub.plantype === 'Free Trial') {
            const currentCount = Number(activeSub.audio_creation_count || 0);
            const { error: updateError } = await supabase
              .from('subscriptions')
              .update({
                audio_creation_count: currentCount + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', activeSub.id);

            if (updateError) {
              logger.warn(`[${requestId}] Failed to update Free Trial counter:`, updateError.message);
            } else {
              logger.debug(`[${requestId}] 🎯 Free Trial counter updated: ${currentCount} -> ${currentCount + 1}`);
            }
          }
        } catch (counterErr) {
          logger.warn(`[${requestId}] Failed to update Free Trial counter:`, counterErr?.message);
        }

        // Log costs to api_costs table
        try {
          // Log OpenAI cost (if any)
          if (openaiCost.totalCostUsd > 0) {
            await logApiCost({
              userId,
              feature: 'standard_tts_openai',
              provider: 'openai',
              model: 'gpt-4o',
              inputQuantity: openaiUsage.prompt_tokens || 0,
              outputQuantity: openaiUsage.completion_tokens || 0,
              costUsd: openaiCost.totalCostUsd,
              metadata: { entry_source: normalizedEntrySource, level },
            });
          }
          // Log TTS cost
          if (ttsCostUsd > 0) {
            const ttsProviderName = (ttsProvider === 'polly' || ttsProvider === 'amazon') ? 'aws_polly' : 'google_tts';
            await logApiCost({
              userId,
              feature: 'standard_tts',
              provider: ttsProviderName,
              model: selectedVoice,
              inputQuantity: ttsCharactersTotal,
              outputQuantity: 0,
              costUsd: ttsCostUsd,
              metadata: { duration_seconds: audioDurationSeconds, entry_source: normalizedEntrySource },
            });
          }
        } catch (costLogErr) {
          logger.warn(`[${requestId}] Failed to log api_costs:`, costLogErr?.message);
        }
      } else {
        logger.warn(`[${requestId}] ⚠️ No user ID found, skipping contenthistory save`);
        logger.warn(`[${requestId}] 🔍 Auth header: ${authHeader ? 'present' : 'missing'}`);
      }
    } catch (dbError) {
      logger.error(`[${requestId}] ❌ Error saving to contenthistory table: ${dbError.message}`);
      logger.error(`[${requestId}] 📋 Error details:`, dbError);
      // Don't fail the request if database save fails
    }

    // Debug: Çeviri ve adaptasyon sonuçlarını logla
    logger.debug(`[TTS] Response debug`, {
      translationResult: translationResult ? translationResult.substring(0, 100) + '...' : 'EMPTY',
      adaptedText: adaptedText ? adaptedText.substring(0, 100) + '...' : 'EMPTY',
      isCacheHit: req.body.is_cached || false,
      hasTranslationResult: !!translationResult,
      hasAdaptedText: !!adaptedText
    });

    logger.info(`[${requestId}] [TTS] Using main return statement with translated fields`);

    const responseData = {
      success: true,
      // Expose the contenthistory row ID so that async notifications
      // can reference the correct audioId for hydration on mobile.
      // "data" comes from the Supabase upsert above and may be
      // undefined when no userId is present, so guard with optional
      // chaining.
      id: contentHistoryId,
      message: cleanTextForDisplay, // Kullanıcıya temiz text göster (noktalama olmadan)
      originalMessage: translatedText || textToAdapt, // Topic için çevrilmiş metin (kullanıcıya gösterilen)
      level: level,
      input_language: detectedLang,
      mp3_url: finalMp3Url,
      words: words, // Temiz kelimeler (allCleanWords)
      timepoints: timepoints, // Optimized timing'ler
      vtt_url: vttUrl,
      // Ek bilgiler
      real_duration: actualTotalDuration,
      estimated_duration: totalRealDuration,
      speaking_rate: speakingRate,
      word_timings_count: allWordTimings.length,
      clean_words_count: allCleanWords.length,
      original_words_count: allOriginalWords.length,
      audio_segments: audioSegments.length,
      is_real_timing: true,
      is_optimized: true,
      // Hybrid Approach - Drift Correction Info
      drift_corrected: analysisResult.driftDetected || false,
      drift_amount: analysisResult.driftAmount || 0,
      drift_percentage: analysisResult.driftPercentage || 0,
      // Timing Source Info
      timing_source: mfaWordTimings ? 'MFA' : 'TTS',
      timing_accuracy: mfaWordTimings ? 'high' : 'estimated',
      // Çeviri ve adaptasyon sonuçları (database kayıt için)
      translated_text: translatedText || translationResult || '',
      adapted_text: adaptedText,
      // Frontend için camelCase versiyonları da ekle
      translatedText: translatedText || translationResult || '',
      adaptedText: adaptedText || '',
      cleanText: cleanTextForDisplay, // Temiz text ayrı field olarak da gönder
      daily_usage_patterns: dailyUsagePatterns, // Günlük kullanım kalıpları
      detected_mood: detectedMood
    };

    // DEBUG: Final response'u kontrol et
    logger.debug(`🔍 RESPONSE DEBUG - Timepoints in response: ${responseData.timepoints?.length || 0}`);
    logger.debug(`🔍 Response timepoints sample:`, responseData.timepoints?.slice(0, 3));
    logger.debug(`🔍 Words in response: ${responseData.words?.length || 0}, Type: ${typeof responseData.words}, Is Array: ${Array.isArray(responseData.words)}`);
    logger.debug(`🔍 Response fields:`, Object.keys(responseData));
    logger.debug(`🔍 [TIMING SOURCE IN RESPONSE]:`, {
      timing_source: responseData.timing_source,
      timing_accuracy: responseData.timing_accuracy
    });
    logger.debug(`🔍 [DRIFT FIELDS IN RESPONSE]:`, {
      drift_corrected: responseData.drift_corrected,
      drift_amount: responseData.drift_amount,
      drift_percentage: responseData.drift_percentage,
      estimated_duration: responseData.estimated_duration,
      real_duration: responseData.real_duration
    });

    return res.status(200).json(responseData);

  } catch (error) {
    logRequestStep(requestId, 'error', { error: error.message, stack: error.stack });
    logger.error(`[${requestId}] Uncaught error: ${error.message}`, { stack: error.stack });
    logger.error(`[${requestId}] Full error details:`, {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
      userFacing: error.userFacing
    });
    logStep({
      requestId,
      stepName: 'tts:error',
      stepSequence: stepSequence++,
      status: 'failure',
      error: error.message,
      stack: error.stack
    });

    // Send push notification to user for user-facing errors
    if (userId && error.userFacing) {
      const errorType = error.userErrorType || USER_FACING_ERROR_TYPES.PROCESSING_ERROR;
      notifyUserOfError(userId, errorType, {
        requestId,
        retryable: error.retryable || false
      }).catch(e => logger.warn(`[${requestId}] Failed to send user error notification:`, e.message));
    }

    // Determine error message for response
    let errorMessage;
    let errorCode = 'PROCESSING_ERROR';

    if (error.userFacing) {
      // Use user-friendly message for user-facing errors
      errorMessage = error.userMessage || 'Bir hata oluştu. Lütfen tekrar deneyin.';
      errorCode = error.userErrorType === USER_FACING_ERROR_TYPES.TEMPORARY_ERROR
        ? 'TEMPORARY_ERROR'
        : 'AI_SERVICE_ERROR';
    } else if (process.env.NODE_ENV === 'development') {
      errorMessage = `TTS Error: ${error.message}`;
    } else {
      errorMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';
    }

    return res.status(500).json({
      success: false,
      code: errorCode,
      message: errorMessage,
      retryable: error.retryable || false,
      ...(process.env.NODE_ENV === 'development' && {
        errorDetails: error.message,
        errorName: error.name,
        originalMessage: error.originalMessage
      })
    });
  } finally {
    // --- Final Step: Ensure Temporary File Cleanup ---
    logger.debug(`[${requestId}] Performing final cleanup.`);

    // Release TTS slot for this user (only if acquired)
    if (!skipConcurrency) {
      releaseTtsSlot(userId);
    }

    // Release global TTS slot (only if acquired)
    if (globalSlotAcquired) {
      limiters.tts.release();
    }

    // Do NOT clean up temp file that we need for API access
    // cleanupTempFile(tempFilePath);

    // Add cleanup code for temporary files
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

// Endpoint to serve audio files
const getAudioFile = async (req, res) => {
  const audioId = req.params.id;
  logger.debug(`🎵 getAudioFile called with audioId: ${audioId}`);
  logger.debug(`📦 tempAudioFiles size: ${tempAudioFiles.size}`);
  logger.debug(`🔑 tempAudioFiles keys: ${Array.from(tempAudioFiles.keys()).join(', ')}`);

  const audioData = tempAudioFiles.get(audioId);

  if (!audioData) {
    logger.warn(`❌ Audio file not found in temp storage: ${audioId}. Checking Supabase Storage...`);

    // Check if file exists in Supabase Storage
    try {
      const { data: contentData, error: contentError } = await supabase
        .from('contenthistory')
        .select('mp3_url')
        .eq('id', audioId)
        .single();

      if (contentError || !contentData?.mp3_url) {
        logger.warn(`❌ Audio file not found in database: ${audioId}`);
        return res.status(404).json({
          success: false,
          message: 'Audio file not found'
        });
      }

      // If mp3_url is a Supabase Storage URL, redirect to it
      if (contentData.mp3_url.includes('supabase')) {
        logger.debug(`🔄 Redirecting to Supabase Storage URL: ${contentData.mp3_url}`);
        return res.redirect(contentData.mp3_url);
      } else {
        // If it's an external URL (like mock), redirect to it
        logger.debug(`🔄 Redirecting to external URL: ${contentData.mp3_url}`);
        return res.redirect(contentData.mp3_url);
      }
    } catch (error) {
      logger.error(`❌ Error checking Supabase Storage: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving audio file'
      });
    }
  }

  logger.debug(`✅ Audio file found in temp storage: ${audioId}, buffer size: ${audioData.buffer.length}`);

  // Debug: Log first few bytes to check if it's a valid MP3
  const firstBytes = audioData.buffer.slice(0, 16);
  logger.debug(`🔍 First 16 bytes of audio buffer: ${Array.from(firstBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
  logger.debug(`🔍 First 4 bytes as string: ${firstBytes.slice(0, 4).toString()}`);

  // Check if it starts with MP3 header (0xFF 0xFB or ID3)
  const isMP3Header = (firstBytes[0] === 0xFF && (firstBytes[1] & 0xE0) === 0xE0) ||
    firstBytes.slice(0, 3).toString() === 'ID3';
  logger.debug(`🔍 Is valid MP3 header: ${isMP3Header}`);

  // Set proper CORS and cache headers
  const headers = {
    'Content-Type': 'audio/mpeg',
    'Content-Disposition': `inline; filename="audio_${audioId}.mp3"`,
    'Content-Length': audioData.buffer.length,
    'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges'
  };

  logger.debug(`📋 Setting headers:`, headers);
  res.set(headers);

  // Handle range requests for better audio streaming
  const range = req.headers.range;
  if (range) {
    logger.debug(`📏 Range request detected: ${range}`);
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : audioData.buffer.length - 1;
    const chunksize = (end - start) + 1;

    const rangeHeaders = {
      'Content-Range': `bytes ${start}-${end}/${audioData.buffer.length}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/mpeg',
      'Access-Control-Allow-Origin': '*'
    };

    logger.debug(`📏 Range headers:`, rangeHeaders);
    res.writeHead(206, rangeHeaders);
    const bufferSlice = audioData.buffer.slice(start, end + 1);
    logger.debug(`📏 Sending range response: ${start}-${end}/${audioData.buffer.length}, chunk size: ${chunksize}`);
    return res.end(bufferSlice);
  }

  logger.debug(`📤 Sending full audio buffer: ${audioData.buffer.length} bytes`);
  return res.send(audioData.buffer);
};

/**
 * Serves VTT subtitle files stored in memory
 * @param {import("express").Request} req Express request object
 * @param {import("express").Response} res Express response object
 */
const getVttFile = async (req, res) => {
  const vttId = req.params.vttId;
  logger.debug(`📝 VTT file requested: ${vttId}`);

  try {
    const vttData = tempVttFiles.get(vttId);

    if (!vttData) {
      logger.warn(`📝 VTT file not found: ${vttId}`);
      logger.debug(`📝 Available VTT files: ${Array.from(tempVttFiles.keys()).join(', ')}`);
      return res.status(404).json({ success: false, message: 'VTT file not found' });
    }

    logger.debug(`📝 Serving VTT file: ${vttId}`);
    res.setHeader('Content-Type', 'text/vtt');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours cache

    return res.send(vttData.content);
  } catch (error) {
    logger.error(`📝 Error serving VTT file ${vttId}:`, error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Cleanup old audio and VTT files every hour
setInterval(() => {
  const now = new Date();

  // Cleanup audio files
  tempAudioFiles.forEach((data, id) => {
    // Delete files older than 1 hour
    if (now - data.createdAt > 60 * 60 * 1000) {
      if (fs.existsSync(data.path)) {
        try {
          fs.unlinkSync(data.path);
        } catch (e) {
          logger.error(`Error removing old temporary file ${data.path}: ${e.message}`);
        }
      }
      tempAudioFiles.delete(id);
    }
  });

  // Cleanup VTT files
  tempVttFiles.forEach((data, id) => {
    // Delete VTT files older than 1 hour
    if (now - data.createdAt > 60 * 60 * 1000) {
      tempVttFiles.delete(id);
      logger.debug(`Cleaned up VTT file: ${id}`);
    }
  });

  logger.debug(`Cleanup completed - Audio files: ${tempAudioFiles.size}, VTT files: ${tempVttFiles.size}`);
}, 15 * 60 * 1000); // Run every 15 minutes

// --- TTS Step Endpoints ---
const translateToEnglish = async (req, res) => {
  const { text, level } = req.body;
  const requestId = uuidv4();
  try {
    logStep({ requestId, stepName: 'tts:translateToEnglish', inputData: { text, level } });
    // Select the appropriate CEFR prompt based on the level
    const promptFile = `cefr_${level}.txt`;
    const promptPath = path.join(__dirname, '../prompts', promptFile);
    logger.debug(`[TTS] Selected prompt file: ${promptFile} for level: ${level}`);
    const promptText = fs.readFileSync(promptPath, 'utf-8');
    // Use the prompt in the translation process
    const result = await translateToEnglishWithOpenAI(text, promptText);
    logStep({ requestId, stepName: 'tts:translateToEnglish:end', outputData: result });
    res.json({ text: result.text });
  } catch (e) {
    logStep({ requestId, stepName: 'tts:translateToEnglish:error', error: e.message });
    res.status(500).json({ error: e.message });
  }
};

const adaptToCEFR = async (req, res) => {
  const { text, level } = req.body;
  const requestId = uuidv4();
  try {
    logStep({ requestId, stepName: 'tts:adaptToCEFR', inputData: { text, level } });
    const result = await adaptToCEFRFunc(text, level);
    logStep({ requestId, stepName: 'tts:adaptToCEFR:end', outputData: result });
    res.json({ text: result });
  } catch (e) {
    logStep({ requestId, stepName: 'tts:adaptToCEFR:error', error: e.message });
    res.status(500).json({ error: e.message });
  }
};

const chunkTextAPI = (req, res) => {
  const { text } = req.body;
  const requestId = uuidv4();
  try {
    logStep({ requestId, stepName: 'tts:chunkText', inputData: { text } });
    const chunks = chunkText(text);
    logStep({ requestId, stepName: 'tts:chunkText:end', outputData: { chunks } });
    res.json({ chunks });
  } catch (e) {
    logStep({ requestId, stepName: 'tts:chunkText:error', error: e.message });
    res.status(500).json({ error: e.message });
  }
};

const synthesizeChunkAPI = async (req, res) => {
  const { text, voice, rate } = req.body;
  const requestId = uuidv4();
  try {
    logStep({ requestId, stepName: 'tts:synthesizeChunk', inputData: { text, voice, rate } });

    let languageCode = "en-US"; // Default to US English
    let selectedVoice = voice;

    const ttsProvider = await getTtsProvider();

    // If a Lingroot voice ID is provided, map it to provider-specific voice
    if (voice) {
      const maybeLingroot = getLingrootVoiceById(voice);
      if (maybeLingroot) {
        const mapped = mapLingrootToProviderVoice(voice, ttsProvider);
        if (mapped && mapped.name) {
          selectedVoice = mapped.name;
          languageCode = mapped.languageCode || languageCode;
          logger.debug(`[${requestId}] 🎯 ChunkAPI Lingroot voice: ${voice} -> ${ttsProvider}:${selectedVoice}`);
        } else {
          logger.warn(`[${requestId}] ⚠️ ChunkAPI Lingroot mapping not found for ${voice}, using raw provider voice if possible`);
        }
      }
    }

    // If still not determined from mapping, infer language from provider voice name
    if (selectedVoice) {
      if (selectedVoice.includes("en-GB")) {
        languageCode = "en-GB";
      } else if (selectedVoice.includes("en-AU")) {
        languageCode = "en-AU";
      } else if (selectedVoice.includes("en-CA")) {
        languageCode = "en-CA";
      } else if (selectedVoice.includes("en-IN")) {
        languageCode = "en-IN";
      } else if (selectedVoice.includes("en-US")) {
        languageCode = "en-US";
      }
    }

    const result = await synthesizeWithGoogle({
      text: text,
      voiceName: selectedVoice || "en-US-Standard-B",
      languageCode: languageCode,
      speakingRate: rate || 1.0,
      userId: req.user?.id
    });
    logStep({ requestId, stepName: 'tts:synthesizeChunk:end', outputData: result });
    res.json(result);
  } catch (e) {
    logStep({ requestId, stepName: 'tts:synthesizeChunk:error', error: e.message });
    res.status(500).json({ error: e.message });
  }
};

const mergeAudioAPI = async (req, res) => {
  const { files } = req.body;
  const requestId = uuidv4();
  try {
    logStep({ requestId, stepName: 'tts:mergeAudio', inputData: { files } });
    const result = await mergeAudioSegments(files);
    logStep({ requestId, stepName: 'tts:mergeAudio:end', outputData: result });
    res.json(result);
  } catch (e) {
    logStep({ requestId, stepName: 'tts:mergeAudio:error', error: e.message });
    res.status(500).json({ error: e.message });
  }
};

// Ses listesi endpointi (Lingroot abstraction) - provider-agnostik liste döner
const listVoices = async (req, res) => {
  try {
    const { languageCode = 'en-US' } = req.query;
    const result = await voiceModelService.listVoices(languageCode);
    res.json(result);
  } catch (error) {
    logger.error(`🎯 [VOICE LIST] Error building Lingroot voice list: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Failed to build Lingroot voice list: ${error.message}`
    });
  }
};

// Filtrelenmiş ses listesi endpointi (Lingroot abstraction)
const getFilteredVoices = async (req, res) => {
  try {
    const { accent, gender, category } = req.query;
    const result = await voiceModelService.getFilteredVoices({ accent, gender, category });
    res.json(result);
  } catch (error) {
    logger.error(`Error filtering Lingroot voices: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Error filtering voices' });
  }
};

// handleTTSRequest adıyla alias oluştur (geriye dönük uyumluluk)
const handleTTSRequest = processTtsRequest;

// Test endpoint to check available voices
const testVoices = async (req, res) => {
  try {
    const { languageCode = 'en-GB' } = req.query;
    const result = await voiceModelService.testVoices(languageCode);
    res.json({ ...result, success: true });
  } catch (error) {
    logger.error(`Error testing voices: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Word timing helpers moved to services/subtitleService.js

// Helper function to create optimized timepoints for frontend (legacy)
const createOptimizedTimepoints = (wordTimings) => {
  return wordTimings.map((timing, index) => ({
    timeSeconds: timing.timeSeconds || timing.startTime || 0,
    endTimeSeconds: timing.endTimeSeconds || timing.endTime || (timing.timeSeconds + 0.5),
    word: timing.word,
    index: index
  }));
};

module.exports = {
  processTtsRequest,
  handleTTSRequest, // Alias olarak ekledik
  translateToEnglish,
  adaptToCEFR,
  chunkTextAPI,
  synthesizeChunkAPI,
  mergeAudioAPI,
  listVoices,
  getAudioFile, // New endpoint to serve audio
  getVttFile, // New endpoint to serve VTT files
  getFilteredVoices,
  testVoices, // New test endpoint
};