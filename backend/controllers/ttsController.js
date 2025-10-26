// backend/controllers/ttsController.js
const path = require("path");
const os = require("os");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger"); // Import Winston logger
const { extractTextFromInput, generateTopicText, generateEnglishNarrationForTopic, translateToEnglishWithOpenAI } = require("../utils/inputExtractor");
const { cleanText, chunkText, chunkTextByCharLimit, preChunkTextByByteLimit, chunkTextForChirpVoices, isChirpVoice } = require("../utils/textProcessor");
const { adaptToCEFR: adaptToCEFRFunc } = require("../utils/cefrAdapter");
const { synthesizeWithGoogle, listGoogleVoices, getVoiceGender } = require("../utils/googleTTS");
const { mergeAudioSegments, mergeAudioSegmentsToBuffer } = require("../utils/audioMerger");
const { uploadToSupabase } = require("../utils/storageUploader");
const { analyzeAndAdjustTimings } = require('../utils/audioAnalyzer');
const tmp = require("tmp");
const { logStep } = require('../utils/stepLogger');
const { logRequestStep } = require("../utils/requestLogger");
const { supabase } = require("../utils/supabaseClient");
const { checkLimits } = require("../utils/usageLimiter");

// Store references to temp files so they can be accessed via API
const tempAudioFiles = new Map();
const tempVttFiles = new Map();

// Helper function to create VTT file from text
const createVTTFile = (text, duration = 30) => {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const wordsPerLine = 5; // Kaç kelime per subtitle satırı
    
    let vttContent = 'WEBVTT\n\n';
    
    for (let i = 0; i < words.length; i += wordsPerLine) {
        const lineWords = words.slice(i, i + wordsPerLine);
        const startTime = (i / words.length) * duration;
        const endTime = ((i + wordsPerLine) / words.length) * duration;
        
        // Format time as MM:SS.mmm
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            const millisecs = Math.floor((seconds % 1) * 1000);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millisecs.toString().padStart(3, '0')}`;
        };
        
        vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
        vttContent += `${lineWords.join(' ')}\n\n`;
    }
    
    return vttContent;
};

// Helper function to create word-level VTT file
const createWordLevelVTT = (text, duration = 30) => {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    
    let vttContent = 'WEBVTT\n\n';
    
    words.forEach((word, index) => {
        const startTime = (index / words.length) * duration;
        const endTime = ((index + 1) / words.length) * duration;
        
        // Format time as MM:SS.mmm
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            const millisecs = Math.floor((seconds % 1) * 1000);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millisecs.toString().padStart(3, '0')}`;
        };
        
        vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
        vttContent += `${word}\n\n`;
    });
    
    return vttContent;
};

// Helper function to create VTT from real word timings
const createWordLevelVTTFromTimings = (wordTimings, totalDuration) => {
    let vttContent = 'WEBVTT\n\n';
    
    // Format time as MM:SS.mmm
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const millisecs = Math.floor((seconds % 1) * 1000);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millisecs.toString().padStart(3, '0')}`;
    };
    
    wordTimings.forEach((timing, index) => {
        vttContent += `${formatTime(timing.startTime)} --> ${formatTime(timing.endTime)}\n`;
        vttContent += `${timing.word}\n\n`;
    });
    
    return vttContent;
};

// Helper function for consistent temp file cleanup
const cleanupTempFile = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            logger.info(`Cleaned up temporary file: ${filePath}`);
        } catch (e) {
            logger.error(`Error removing temporary file ${filePath}: ${e.message}`);
            // Log error but don't fail the request just for cleanup failure
        }
    }
};

// Yardımcı: tts_provider'ı settings tablosundan oku (default: google)
async function getTtsProvider() {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'tts_provider')
    .single();
  if (error || !data) return 'google';
  return data.value;
}

function enforceTTSByteLimit(text, maxBytes = 4500) {
  if (Buffer.byteLength(text, "utf-8") <= maxBytes) return [text];

  const safeParts = [];
  let current = "";
  let currentBytes = 0;
  const words = text.split(/\s+/);

  for (const word of words) {
    const wordBytes = Buffer.byteLength(word, "utf-8");
    const spaceBytes = current ? 1 : 0;

    if (currentBytes + wordBytes + spaceBytes > maxBytes) {
      safeParts.push(current.trim());
      current = word;
      currentBytes = wordBytes;
    } else {
      current += (current ? " " : "") + word;
      currentBytes += wordBytes + spaceBytes;
    }
  }

  if (current) safeParts.push(current.trim());
  return safeParts;
}

/**
 * Handles the text-to-speech processing request.
 * Orchestrates the workflow: extract -> clean -> translate? -> adapt -> chunk -> synthesize -> merge -> upload.
 * Includes improved logging and file cleanup.
 * @param {import("express").Request} req Express request object.
 * @param {import("express").Response} res Express response object.
 */
const processTtsRequest = async (req, res) => {
    const requestId = uuidv4();
    let stepSequence = 1;
    logger.info(`[${requestId}] Received TTS request.`);
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
    logger.info(`[${requestId}] [INCOMING TTS PARAMS]`, logBody);
    } catch (e) {
      logger.warn(`[${requestId}] Could not log incoming params: ${e.message}`);
    }
    let tempFilePath = null;
    let detectedLang = 'en';
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

        if (req.is("multipart/form-data")) {
            logger.info(`[${requestId}] Processing multipart/form-data request.`);
            inputData = req.body.input;
            inputType = req.body.type;
            level = req.body.level || "A1";
            speakingRate = parseFloat(req.body.speakingRate || (level === "A1" ? "0.8" : "1.0"));
            file = req.file;
            logger.info(`[${requestId}] FormData details: type=${inputType}, level=${level}, rate=${speakingRate}, file=${file?.originalname}`);
        } else if (req.is("application/json")) {
            logger.info(`[${requestId}] Processing application/json request.`);
            inputData = req.body.input;
            inputType = req.body.type || "text";
            level = req.body.level || "A1";
            speakingRate = parseFloat(req.body.speakingRate || (level === "A1" ? "0.8" : "1.0"));
            file = undefined;
            logger.info(`[${requestId}] JSON details: type=${inputType}, level=${level}, rate=${speakingRate}`);
        } else {
            const contentType = req.get("Content-Type");
            logger.error(`[${requestId}] Unsupported Content-Type: ${contentType}`);
            return res.status(415).json({ success: false, message: `Unsupported Content-Type: ${contentType}` });
        }

        // Validate essential parameters
        if (!inputType || (inputType !== "file" && !inputData) || (inputType === "file" && !file)) {
            logger.error(`[${requestId}] Missing required input parameters. inputType=${inputType}, inputData=${inputData}, file=${file?.originalname}`);
            return res.status(400).json({ success: false, message: "Missing required input parameters (type, input/file, level)" });
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
        let originalTurkishText = null;
        let englishNarration = null;
        if (inputType === "topic") {
            // Konu başlığından doğrudan İngilizce anlatım metni oluştur (yeni prompt ile)
            rawText = await extractTextFromInput(inputData, inputType, file, undefined, level, detectedLang);
            if (!rawText) {
                logger.error(`[${requestId}] Failed to generate narration for topic.`);
                return res.status(500).json({ success: false, message: "Failed to generate narration for topic." });
            }
        } else {
            rawText = await extractTextFromInput(inputData, inputType, file, undefined, level, detectedLang);
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
        logger.info(`[${requestId}] Text extracted successfully.`);
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
        logger.info(`[${requestId}] Text cleaned successfully.`);

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
              const textLength = adaptedText.length;
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

        // --- Step 2.5: Detect Language and Translate if Necessary ---
        logRequestStep(requestId, 'translate:start', { cleanedText });
        logStep({
            requestId,
            stepName: 'tts:translate:openai:start',
            stepSequence: stepSequence++,
            serviceName: 'OpenAI',
            endpoint: 'https://api.openai.com/v1/completions',
            promptName: 'translateToEnglishWithOpenAI',
            promptText: cleanedText
        });
        let textToAdapt = cleanedText;
        let translationResult = '';
        // Track OpenAI usage/cost
        let openaiUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        /** @type {{model: string, prompt_tokens: number, completion_tokens: number, total_tokens: number}[]} */
        const usageBreakdown = [];
        let openaiCallCount = 0;
        let googleTtsCallCount = 0;
        try {
            // translateToEnglishWithOpenAI may return string; we enhance to capture usage via try/catch below
            const trResult = await translateToEnglishWithOpenAI(cleanedText);
            openaiCallCount += 1; // translate call aggregates chunk usages
            if (typeof trResult === 'object' && trResult !== null && trResult.text) {
                translationResult = trResult.text;
                if (trResult.usage) {
                    openaiUsage = {
                        prompt_tokens: trResult.usage.prompt_tokens || 0,
                        completion_tokens: trResult.usage.completion_tokens || 0,
                        total_tokens: trResult.usage.total_tokens || (trResult.usage.prompt_tokens || 0) + (trResult.usage.completion_tokens || 0)
                    };
                    if (trResult.model) {
                        usageBreakdown.push({ model: trResult.model, ...openaiUsage });
                    }
                }
            } else {
                translationResult = String(trResult || '');
            }
            if (!translationResult || translationResult.trim() === "") {
                logger.error(`[${requestId}] Translation result is empty, chunkText will not be called.`);
                logRequestStep(requestId, 'translate:error', { error: 'Translation result is empty.' });
                return res.status(400).json({ success: false, message: "Translation result is empty." });
            }
            textToAdapt = translationResult;
            logger.info(`[${requestId}] Translation successful.`);
            logRequestStep(requestId, 'translate:success', { translationResult });

            // Restore the removed console.log statements
            console.log("📄 Gelen dosya:", req.file);
            console.log("✏️  Text input:", req.body.input);
            console.log("📥  Input type:", req.body.input_type);
            console.log("[DEBUG] Translated result:", translationResult);
        } catch (translateError) {
            logger.error(`[${requestId}] Error during language detection/translation: ${translateError.message}.`);
            logRequestStep(requestId, 'translate:error', { error: translateError.message });
            // Return 4xx instead of silently continuing with original text
            const status = translateError?.status || translateError?.code === 'insufficient_quota' ? 429 : 422;
            return res.status(status).json({
                success: false,
                message: 'Translation failed',
                error: translateError.message,
                code: translateError?.code
            });
        }
        logStep({
            requestId,
            stepName: 'tts:translate:openai:end',
            stepSequence: stepSequence++,
            serviceName: 'OpenAI',
            endpoint: 'https://api.openai.com/v1/completions',
            outputData: { textToAdapt }
        });
        logRequestStep(requestId, 'translate:end', { textToAdapt });

        // --- Step 2.6: Adapt to CEFR Level ---
        logRequestStep(requestId, 'adaptToCEFR:start', { textToAdapt, level });
        logStep({
            requestId,
            stepName: 'tts:adaptToCEFR:start',
            stepSequence: stepSequence++,
            serviceName: 'LocalFunction',
            endpoint: 'adaptToCEFR',
            inputData: { text: textToAdapt, level }
        });

        try {
            const adaptedResult = await adaptToCEFRFunc(textToAdapt, level);
            openaiCallCount += 1; // adapt call aggregates chunk usages
            if (typeof adaptedResult === 'object' && adaptedResult !== null && adaptedResult.text) {
                textToAdapt = adaptedResult.text;
                // accumulate CEFR usage into openaiUsage as well
                if (adaptedResult.usage) {
                    openaiUsage.prompt_tokens = (openaiUsage.prompt_tokens || 0) + (adaptedResult.usage.prompt_tokens || 0);
                    openaiUsage.completion_tokens = (openaiUsage.completion_tokens || 0) + (adaptedResult.usage.completion_tokens || 0);
                    openaiUsage.total_tokens = (openaiUsage.total_tokens || 0) + (adaptedResult.usage.total_tokens || 0);
                    if (adaptedResult.model) {
                        usageBreakdown.push({ model: adaptedResult.model, ...adaptedResult.usage });
                    }
                }
            } else {
                textToAdapt = adaptedResult;
            }
            logger.info(`[${requestId}] CEFR adaptation successful.`);
            logRequestStep(requestId, 'adaptToCEFR:end', { adaptedResult });
            logStep({
                requestId,
                stepName: 'tts:adaptToCEFR:end',
                stepSequence: stepSequence++,
                serviceName: 'LocalFunction',
                endpoint: 'adaptToCEFR',
                outputData: { textToAdapt }
            });
        } catch (adaptError) {
            logger.error(`[${requestId}] Error during CEFR adaptation: ${adaptError.message}. Proceeding with untranslated text.`);
            logRequestStep(requestId, 'adaptToCEFR:error', { error: adaptError.message });
        }

        // --- Step 3: Chunk Text (ilk, translate sonrası) ---
        if (!textToAdapt || textToAdapt.trim() === "") {
            logger.error(`[${requestId}] textToAdapt is empty, chunkText will not be called.`);
            logRequestStep(requestId, 'chunkText:preTTS:error', { error: 'textToAdapt is empty.' });
            return res.status(400).json({ success: false, message: "No text to chunk after translation." });
        }
        console.log("[DEBUG] chunkText input (preTTS):", textToAdapt);
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
        let selectedVoice = requestedVoice || 'en-US-Neural2-D';
        logger.info(`[${requestId}] 🎯 Requested voice: ${requestedVoice || 'undefined'} | Initial selected: ${selectedVoice}`);
        
        // Trust client-selected voice and defer fallback to synthesis stage
        logger.info(`[${requestId}] 🎙️ Using selected voice (no pre-validation): ${selectedVoice}`);

        // Log gender/accent from request for mismatch diagnostics
        logger.info(`[${requestId}] 🎯 Client filters -> gender: ${req.body?.gender || 'n/a'}, accent: ${req.body?.accent || 'n/a'}`);

        // --- Step 5: Her chunk için tekrar chunkText (TTS öncesi) ---
        let finalChunks = [];
        
        // Check if selected voice is a Chirp voice that needs special handling
        const isChirpSelected = isChirpVoice(selectedVoice);
        
        if (isChirpSelected) {
            logger.info(`[${requestId}] 🎙️ CHIRP VOICE DETECTED: ${selectedVoice} - Using special 900-byte chunking`);
        }
        
        for (let i = 0; i < initialChunks.length; i++) {
            let chunks;
            
            if (isChirpSelected) {
                // Chirp voices: Use special chunking with 600-byte limit for safety
                chunks = chunkTextForChirpVoices(initialChunks[i], 600);
                logger.info(`[${requestId}] 🎙️ [CHIRP CHUNK ${i + 1}] Generated ${chunks.length} chirp-safe chunks`);
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
                logger.info(`[${requestId}] [Regular chunk ${i + 1}] Generated ${chunks.length} standard chunks`);
            }
            
            chunks.forEach((chunk, j) => {
                const chunkBytes = Buffer.byteLength(chunk, "utf-8");
                logger.info(`[${isChirpSelected ? 'CHIRP' : 'Regular'} chunk] [${i}.${j}] length: ${chunk.length} chars, ${chunkBytes} bytes`);
                
                // Final safety check for Chirp voices
                if (isChirpSelected && chunkBytes > 900) {
                    logger.error(`🚨 [CHIRP SAFETY] Chunk [${i}.${j}] exceeds 900 bytes (${chunkBytes})! This should not happen.`);
                }
            });
            
            finalChunks = finalChunks.concat(chunks);
        }
        
        // Dynamically determine language code based on voice name
        let languageCode = "en-US"; // Default to US English
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
        logger.info(`[${requestId}] 🎯 CHECKING CACHE: text(${adaptedText.length}chars) + level(${level}) + voice(${selectedVoice})`);
        
        try {
            // 1. Önce chapter_audio tablosunda kontrol et (eğer chapter_id varsa)
            if (req.body.chapter_id) {
                logger.info(`[${requestId}] 🔍 Checking chapter_audio for chapter_id: ${req.body.chapter_id}`);
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
                        logger.info(`[${requestId}] Cached VTT available, using for timing: ${cached.vtt_url}`);
                    }

                    // RETURN CHAPTER CACHED RESULT IMMEDIATELY!
                    console.log('🎯 [CHAPTER CACHE RETURN] Using chapter cache return');
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
            logger.info(`[${requestId}] 🔍 Checking contenthistory table...`);
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
                console.log('🎯 [CONTENT CACHE RETURN] Using content cache return');
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
            
            logger.info(`[${requestId}] 🎯 CACHE MISS - No cached version found. Will create new TTS`);
        } catch (cacheError) {
            logger.warn(`[${requestId}] Cache check failed: ${cacheError.message}`);
        }
        
        // Skip old TTS implementation - using real timing approach below
        const ttsProvider = await getTtsProvider();
        logger.info(`[${requestId}] 🔧 TTS Provider: ${ttsProvider} (Real Timing Mode)`);

        // --- Step 6: Synthesize Audio with Google TTS ---
        // Track TTS characters and category for cost
        let ttsCharactersTotal = 0;
        let ttsCategory = 'Premium';
        logger.info(`[${requestId}] Starting Google TTS synthesis...`);
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
            logger.info(`[${requestId}] Synthesizing chunk ${i + 1}/${finalChunks.length} (${chunk.length} chars)...`);
            
            try {
                const ttsResult = await synthesizeWithGoogle({
                    text: chunk,
                    voiceName: selectedVoice,
                    languageCode: languageCode,
                    speakingRate: speakingRate
                });

                if (!ttsResult.success || !ttsResult.audioContent) {
                    throw new Error('TTS synthesis failed');
                }

                // 🎯 Voice ve gender bilgilerini log'la
                logger.info(`[${requestId}] 🎙️ TTS Chunk ${i + 1} Success - Voice: ${ttsResult.voiceName || selectedVoice}, Gender: ${ttsResult.actualGender || 'unknown'}, Method: ${ttsResult.timingMethod || 'unknown'}`);
                if (ttsResult.actualGender) {
                    console.log(`🎙️ [VOICE DEBUG] Chunk ${i + 1} - Expected Voice: ${selectedVoice} -> Actual Gender: ${ttsResult.actualGender}`);
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
                // Determine package category from utils/googleTTS voice list heuristics in ttsResult or voice name
                if (selectedVoice?.includes('Standard')) ttsCategory = 'Basic';
                else if (selectedVoice?.includes('Wavenet') || selectedVoice?.includes('Neural2')) ttsCategory = 'Premium';
                else if (selectedVoice?.includes('Chirp') || selectedVoice?.includes('Journey')) ttsCategory = 'Gold';
                else if (selectedVoice?.includes('Studio')) ttsCategory = 'Platinum';

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

                logger.info(`[${requestId}] Chunk ${i + 1} completed - Duration: ${ttsResult.totalDuration.toFixed(1)}s, Clean words: ${ttsResult.cleanWords?.length || 0}, Fallback: ${ttsResult.fallbackUsed ? 'Yes' : 'No'}`);

            } catch (chunkError) {
                logger.error(`[${requestId}] Chunk ${i + 1} synthesis failed:`, chunkError.message);
                throw new Error(`TTS synthesis failed for chunk ${i + 1}: ${chunkError.message}`);
            }
        }

        // Toplam süre ve kelime sayısı
        const totalRealDuration = cumulativeTimeOffset;
        const totalWords = allWordTimings.length;
        
        logger.info(`[${requestId}] All chunks synthesized - Total duration: ${totalRealDuration.toFixed(1)}s, Total words: ${totalWords}, Segments: ${audioSegments.length}`);
        logger.info(`[${requestId}] 📊 API Call Counts -> OpenAI: ${openaiCallCount}, Google TTS: ${googleTtsCallCount}`);

        // --- Step 7: Merge Audio Segments ---
        logger.info(`[${requestId}] Merging ${audioSegments.length} audio segments...`);
        
        const audioBuffers = audioSegments.map(segment => segment.audioContent);
        const mergedAudioBuffer = await mergeAudioSegmentsToBuffer(audioBuffers);
        
        if (!mergedAudioBuffer) {
            throw new Error('Audio merging failed');
        }

        const mergedAudioBase64 = mergedAudioBuffer.toString('base64');
        const uniqueId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        logger.info(`[${requestId}] Audio merged successfully - Final size: ${mergedAudioBuffer.length} bytes, ID: ${uniqueId}`);

        // --- Step 7.5: Analyze Audio and Adjust Timings (Hybrid Approach) ---
        logger.info(`[${requestId}] 🎯 Analyzing audio for drift correction...`);
        
        const analysisResult = await analyzeAndAdjustTimings(
          mergedAudioBuffer,
          allWordTimings,
          totalRealDuration
        );
        
        // Use adjusted timings if drift was detected
        if (analysisResult.driftDetected) {
          logger.warn(`[${requestId}] ⚠️ Drift corrected: ${analysisResult.driftAmount.toFixed(2)}s (${analysisResult.driftPercentage.toFixed(1)}%)`);
          allWordTimings = analysisResult.wordTimings;
        }
        
        // Update total duration with actual audio duration
        const actualTotalDuration = analysisResult.actualDuration || totalRealDuration;
        logger.info(`[${requestId}] 🎯 Final duration: ${actualTotalDuration.toFixed(2)}s (estimated: ${totalRealDuration.toFixed(2)}s)`);

        // --- Step 8: Create VTT with Optimized Timings ---
        logger.info(`[${requestId}] Creating VTT with optimized word timings...`);
        
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
            originalText: adaptedText, // Original text de sakla
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
        
        logger.info(`[${requestId}] Optimized VTT created - ID: ${vttUniqueId}, Duration: ${totalRealDuration.toFixed(1)}s, Clean words: ${allCleanWords.length}, Original words: ${allOriginalWords.length}`);

        // --- Step 9: Upload to Supabase (optional) ---
        let mp3Url = null;
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
            try {
                logger.info(`[${requestId}] Uploading to Supabase...`);
                mp3Url = await uploadToSupabase(mergedAudioBuffer, `tts_${uniqueId}.mp3`);
                logger.info(`[${requestId}] Supabase upload successful: ${mp3Url}`);
            } catch (uploadError) {
                logger.warn(`[${requestId}] Supabase upload failed, will serve locally: ${uploadError.message}`);
            }
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
        
        logger.info(`[${requestId}] 🔄 tempAudioFiles size after: ${tempAudioFiles.size}`);

        // --- Step 10: Return Success Response ---
        logger.info(`[${requestId}] Processing complete with optimized timings.`);

        // Use Supabase URL if available, otherwise use API endpoint URL
        const finalMp3Url = mp3Url || `/api/tts/audio/${uniqueId}`;
        
        // Kullanıcıya temiz kelimeler göster, ama timing'ler kesin olsun
        const words = allCleanWords; // Temiz kelimeler (noktalama olmadan)
        const timepoints = createOptimizedTimepoints(allWordTimings); // Optimized timepoints
        
        // DEBUG: Timepoints kontrolü
        logger.info(`🔍 FINAL TIMEPOINTS DEBUG - Total words: ${words.length}, Timepoints: ${timepoints.length}`);
        logger.info(`🔍 First 5 timepoints:`, timepoints.slice(0, 5));
        logger.info(`🔍 All word timings count: ${allWordTimings.length}`);

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
        logger.info(`🔍 Sample word timing:`, allWordTimings[0]);
        
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
                
                logger.info(`[${requestId}] Chapter audio saved to database via Supabase: ${data[0]?.id}`);
            } catch (dbError) {
                logger.error(`[${requestId}] Error saving chapter audio to database: ${dbError.message}`);
                // Don't fail the request if database save fails
            }
        }

        // Genel TTS istekleri için contenthistory tablosuna kaydet
        try {
            logger.info(`[${requestId}] 💾 Saving to contenthistory table...`);
            
            // Get user ID from JWT token
            const authHeader = req.headers.authorization;
            logger.info(`[${requestId}] 🔑 Auth header present: ${!!authHeader}`);
            let userId = null;
            
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                logger.info(`[${requestId}] 🎫 Token extracted: ${token.substring(0, 20)}...`);
                const jwt = require('jsonwebtoken');
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    userId = decoded.id;
                    logger.info(`[${requestId}] 👤 User ID from token: ${userId}`);
                } catch (jwtError) {
                    logger.warn(`[${requestId}] ❌ Could not decode JWT token: ${jwtError.message}`);
                }
            } else {
                logger.warn(`[${requestId}] ❌ No valid auth header found`);
            }
            
            if (userId) {
                // Calculate costs
                const { calculateOpenAiCost, calculateTtsCost } = require('../utils/costTracker');
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

                const insertData = {
                    user_id: userId,
                    level: level || 'B1',
                    mp3_url: finalMp3Url,
                    input: originalTurkishText || req.body.input || '',
                    translated_text: translationResult || '',
                    adapted_text: adaptedText || '',
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
                };
                
                logger.info(`[${requestId}] 📋 Insert data:`, JSON.stringify(insertData, null, 2));
                
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
                        logger.info(`[${requestId}] ♻️ Updated existing contenthistory ID: ${existingId} for same mp3_url`);
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
                
                logger.info(`[${requestId}] ✅ Audio saved to contenthistory table: ${data[0]?.id}`);
                logger.info(`[${requestId}] 📊 Saved data:`, JSON.stringify(data[0], null, 2));
                
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
                            logger.info(`[${requestId}] 🎯 Free Trial counter updated: ${currentCount} -> ${currentCount + 1}`);
                        }
                    }
                } catch (counterErr) {
                    logger.warn(`[${requestId}] Failed to update Free Trial counter:`, counterErr?.message);
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
        console.log('🔍 [TTS RESPONSE DEBUG]', {
            translationResult: translationResult ? translationResult.substring(0, 100) + '...' : 'EMPTY',
            adaptedText: adaptedText ? adaptedText.substring(0, 100) + '...' : 'EMPTY',
            isCacheHit: req.body.is_cached || false,
            hasTranslationResult: !!translationResult,
            hasAdaptedText: !!adaptedText
        });

        console.log('🎯 [MAIN RETURN] Using main return statement with translated fields');

        const responseData = {
            success: true,
            message: cleanTextForDisplay, // Kullanıcıya temiz text göster (noktalama olmadan)
            originalMessage: adaptedText, // Original adapted text de gönder (reference için)
            level: level,
            input_language: detectedLang,
            mp3_url: finalMp3Url,
            words: words, // Temiz kelimeler (allCleanWords)
            timepoints: timepoints, // Optimized timing'ler
            vtt_url: vttUrl,
            original_turkish: originalTurkishText || undefined,
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
            // Çeviri ve adaptasyon sonuçları (database kayıt için)
            translated_text: translationResult || '',
            adapted_text: adaptedText,
            // Frontend için camelCase versiyonları da ekle
            translatedText: translationResult || '',
            adaptedText: adaptedText || '',
            cleanText: cleanTextForDisplay // Temiz text ayrı field olarak da gönder
        };
        
        // DEBUG: Final response'u kontrol et
        logger.info(`🔍 RESPONSE DEBUG - Timepoints in response: ${responseData.timepoints?.length || 0}`);
        logger.info(`🔍 Response timepoints sample:`, responseData.timepoints?.slice(0, 3));
        logger.info(`🔍 Words in response: ${responseData.words?.length || 0}`);
        logger.info(`🔍 Response fields:`, Object.keys(responseData));
        
        return res.status(200).json(responseData);

    } catch (error) {
        logRequestStep(requestId, 'error', { error: error.message, stack: error.stack });
        logger.error(`[${requestId}] Uncaught error: ${error.message}`, { stack: error.stack });
        logStep({
            requestId,
            stepName: 'tts:error',
            stepSequence: stepSequence++,
            status: 'failure',
            error: error.message,
            stack: error.stack
        });
        return res.status(500).json({ success: false, message: "An internal server error occurred." });
    } finally {
        // --- Final Step: Ensure Temporary File Cleanup ---
        logger.info(`[${requestId}] Performing final cleanup.`);
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
    logger.info(`🎵 getAudioFile called with audioId: ${audioId}`);
    logger.info(`📦 tempAudioFiles size: ${tempAudioFiles.size}`);
    logger.info(`🔑 tempAudioFiles keys: ${Array.from(tempAudioFiles.keys()).join(', ')}`);
    
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
                logger.info(`🔄 Redirecting to Supabase Storage URL: ${contentData.mp3_url}`);
                return res.redirect(contentData.mp3_url);
            } else {
                // If it's an external URL (like mock), redirect to it
                logger.info(`🔄 Redirecting to external URL: ${contentData.mp3_url}`);
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
    
    logger.info(`✅ Audio file found in temp storage: ${audioId}, buffer size: ${audioData.buffer.length}`);
    
    // Debug: Log first few bytes to check if it's a valid MP3
    const firstBytes = audioData.buffer.slice(0, 16);
    logger.info(`🔍 First 16 bytes of audio buffer: ${Array.from(firstBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
    logger.info(`🔍 First 4 bytes as string: ${firstBytes.slice(0, 4).toString()}`);
    
    // Check if it starts with MP3 header (0xFF 0xFB or ID3)
    const isMP3Header = (firstBytes[0] === 0xFF && (firstBytes[1] & 0xE0) === 0xE0) || 
                       firstBytes.slice(0, 3).toString() === 'ID3';
    logger.info(`🔍 Is valid MP3 header: ${isMP3Header}`);
    
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
    
    logger.info(`📋 Setting headers:`, headers);
    res.set(headers);
    
    // Handle range requests for better audio streaming
    const range = req.headers.range;
    if (range) {
        logger.info(`📏 Range request detected: ${range}`);
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
        
        logger.info(`📏 Range headers:`, rangeHeaders);
        res.writeHead(206, rangeHeaders);
        const bufferSlice = audioData.buffer.slice(start, end + 1);
        logger.info(`📏 Sending range response: ${start}-${end}/${audioData.buffer.length}, chunk size: ${chunksize}`);
        return res.end(bufferSlice);
    }
    
    logger.info(`📤 Sending full audio buffer: ${audioData.buffer.length} bytes`);
    return res.send(audioData.buffer);
};

/**
 * Serves VTT subtitle files stored in memory
 * @param {import("express").Request} req Express request object
 * @param {import("express").Response} res Express response object
 */
const getVttFile = async (req, res) => {
    const vttId = req.params.vttId;
    logger.info(`📝 VTT file requested: ${vttId}`);
    
    try {
        const vttData = tempVttFiles.get(vttId);
        
        if (!vttData) {
            logger.warn(`📝 VTT file not found: ${vttId}`);
            logger.info(`📝 Available VTT files: ${Array.from(tempVttFiles.keys()).join(', ')}`);
            return res.status(404).json({ success: false, message: 'VTT file not found' });
        }
        
        logger.info(`📝 Serving VTT file: ${vttId}`);
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
            logger.info(`Cleaned up VTT file: ${id}`);
        }
    });
    
    logger.info(`Cleanup completed - Audio files: ${tempAudioFiles.size}, VTT files: ${tempVttFiles.size}`);
}, 60 * 60 * 1000); // Run every hour

// --- TTS Step Endpoints ---
const translateToEnglish = async (req, res) => {
    const { text, level } = req.body;
    const requestId = uuidv4();
    try {
      logStep({ requestId, stepName: 'tts:translateToEnglish', inputData: { text, level } });
      // Select the appropriate CEFR prompt based on the level
      const promptFile = `cefr_${level}.txt`;
      const promptPath = path.join(__dirname, '../prompts', promptFile);
      console.log(`🎯 [TTS CONTROLLER] Using prompt file: ${promptFile} for level: ${level}`);
      logger.info(`🎯 TTS Controller - Selected prompt file: ${promptFile} for level: ${level}`);
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
      
      // Dynamically determine language code based on voice name
      let languageCode = "en-US"; // Default to US English
      
      if (voice) {
        if (voice.includes("en-GB")) {
          languageCode = "en-GB";
        } else if (voice.includes("en-AU")) {
          languageCode = "en-AU";
        } else if (voice.includes("en-CA")) {
          languageCode = "en-CA";
        } else if (voice.includes("en-IN")) {
          languageCode = "en-IN";
        } else if (voice.includes("en-US")) {
          languageCode = "en-US";
        }
      }
      
      const result = await synthesizeWithGoogle({
          text: text,
          voiceName: voice || "en-US-Standard-B",
          languageCode: languageCode,
          speakingRate: rate || 1.0
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
  
  // Ses listesi endpointi (dinamik) - fiyatlandırma kategorileri ile
  const listVoices = async (req, res) => {
    const ttsProvider = await getTtsProvider();
    if (ttsProvider === 'google') {
      try {
        const { languageCode = 'en-US' } = req.query;
        
        logger.info(`🎯 [VOICE LIST] Fetching voices from Google API for language: ${languageCode}`);
        
        // Gerçek Google API'den sesleri al
        const googleVoices = await listGoogleVoices(languageCode);
        
        // SSML desteği istatistikleri
        const ssmlSupportedCount = googleVoices.filter(voice => voice.ssmlSupport).length;
        const ssmlUnsupportedCount = googleVoices.filter(voice => !voice.ssmlSupport).length;
        
        // Ses kategorilerini sayla
        const categoryStats = {
          Basic: googleVoices.filter(voice => voice.package === 'Basic').length,
          Premium: googleVoices.filter(voice => voice.package === 'Premium').length,
          Gold: googleVoices.filter(voice => voice.package === 'Gold').length,
          Platinum: googleVoices.filter(voice => voice.package === 'Platinum').length
        };
        
        // Paket önceliğine göre sırala
        const packagePriority = { 'Basic': 1, 'Premium': 2, 'Gold': 3, 'Platinum': 4 };
        googleVoices.sort((a, b) => {
          if (packagePriority[a.package] !== packagePriority[b.package]) {
            return packagePriority[a.package] - packagePriority[b.package];
          }
          return a.name.localeCompare(b.name);
        });
        
        logger.info(`🎯 [VOICE LIST] Retrieved ${googleVoices.length} voices:`);
        logger.info(`🎯 [VOICE LIST] SSML supported: ${ssmlSupportedCount}, unsupported: ${ssmlUnsupportedCount}`);
        logger.info(`🎯 [VOICE LIST] Categories:`, categoryStats);
        
        return res.json({ 
          provider: 'google', 
          voices: googleVoices,
          stats: {
            total: googleVoices.length,
            ssmlSupported: ssmlSupportedCount,
            ssmlUnsupported: ssmlUnsupportedCount,
            categories: categoryStats
          }
        });
        
      } catch (error) {
        logger.error(`🎯 [VOICE LIST] Error fetching voices: ${error.message}`);
        
        // Fallback: static voice list with SSML support - more categories
        const fallbackVoices = [
          // Standard voices (Basic package)
          { name: 'en-US-Standard-C', displayName: 'US English Female (Standard)', gender: 'FEMALE', languageCode: 'en-US', accent: 'US', emotion: 'Standard', ssmlSupport: false, package: 'Basic' },
          { name: 'en-US-Standard-D', displayName: 'US English Male (Standard)', gender: 'MALE', languageCode: 'en-US', accent: 'US', emotion: 'Standard', ssmlSupport: false, package: 'Basic' },
          { name: 'en-GB-Standard-A', displayName: 'UK English Female (Standard)', gender: 'FEMALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Standard', ssmlSupport: false, package: 'Basic' },
          { name: 'en-GB-Standard-B', displayName: 'UK English Male (Standard)', gender: 'MALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Standard', ssmlSupport: false, package: 'Basic' },
          
          // Wavenet voices (Premium package)
          { name: 'en-US-Wavenet-F', displayName: 'US English Female (Wavenet)', gender: 'FEMALE', languageCode: 'en-US', accent: 'US', emotion: 'Natural', ssmlSupport: true, package: 'Premium' },
          { name: 'en-US-Wavenet-A', displayName: 'US English Male (Wavenet)', gender: 'MALE', languageCode: 'en-US', accent: 'US', emotion: 'Natural', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Wavenet-B', displayName: 'UK English Male (Wavenet)', gender: 'MALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Natural', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Wavenet-C', displayName: 'UK English Female (Wavenet)', gender: 'FEMALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Natural', ssmlSupport: true, package: 'Premium' },
          
          // Neural2 voices (Premium package)
          { name: 'en-US-Neural2-H', displayName: 'US English Female (Neural2)', gender: 'FEMALE', languageCode: 'en-US', accent: 'US', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          { name: 'en-US-Neural2-J', displayName: 'US English Male (Neural2)', gender: 'MALE', languageCode: 'en-US', accent: 'US', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          
          // British Neural2 voices (Premium package)
          { name: 'en-GB-Neural2-A', displayName: 'UK English Female (Neural2)', gender: 'FEMALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Neural2-B', displayName: 'UK English Male (Neural2)', gender: 'MALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Neural2-C', displayName: 'UK English Female (Neural2)', gender: 'FEMALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Neural2-D', displayName: 'UK English Male (Neural2)', gender: 'MALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Neural2-F', displayName: 'UK English Female (Neural2)', gender: 'FEMALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Neural2-N', displayName: 'UK English Female (Neural2)', gender: 'FEMALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Neural2-O', displayName: 'UK English Male (Neural2)', gender: 'MALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          
          // Studio voices (Platinum package)
          { name: 'en-US-Studio-M', displayName: 'US English Male (Studio)', gender: 'MALE', languageCode: 'en-US', accent: 'US', emotion: 'Professional', ssmlSupport: false, package: 'Platinum' },
          { name: 'en-US-Studio-O', displayName: 'US English Female (Studio)', gender: 'FEMALE', languageCode: 'en-US', accent: 'US', emotion: 'Professional', ssmlSupport: false, package: 'Platinum' },
          { name: 'en-US-Studio-Q', displayName: 'US English Female (Studio)', gender: 'FEMALE', languageCode: 'en-US', accent: 'US', emotion: 'Professional', ssmlSupport: false, package: 'Platinum' },
          { name: 'en-GB-Studio-B', displayName: 'UK English Male (Studio)', gender: 'MALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Professional', ssmlSupport: false, package: 'Platinum' },
          { name: 'en-GB-Studio-C', displayName: 'UK English Female (Studio)', gender: 'FEMALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Professional', ssmlSupport: false, package: 'Platinum' },
          
          // Chirp HD voices (Gold package) - British
          { name: 'en-GB-Chirp-HD-D', displayName: 'UK English Male (Chirp HD)', gender: 'MALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Chirp-HD-F', displayName: 'UK English Female (Chirp HD)', gender: 'FEMALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Chirp-HD-O', displayName: 'UK English Female (Chirp HD)', gender: 'FEMALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          
          // Chirp 3 HD voices (Gold package) - British
          { name: 'en-GB-Chirp3-HD-Achernar', displayName: 'UK English Female (Chirp 3 HD)', gender: 'FEMALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Chirp3-HD-Achird', displayName: 'UK English Male (Chirp 3 HD)', gender: 'MALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Chirp3-HD-Algenib', displayName: 'UK English Male (Chirp 3 HD)', gender: 'MALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Chirp3-HD-Algieba', displayName: 'UK English Male (Chirp 3 HD)', gender: 'MALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Chirp3-HD-Alnilam', displayName: 'UK English Male (Chirp 3 HD)', gender: 'MALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Chirp3-HD-Aoede', displayName: 'UK English Female (Chirp 3 HD)', gender: 'FEMALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          
          // Journey/Chirp voices (Gold package)
          { name: 'en-US-Journey-D', displayName: 'US English Female (Journey)', gender: 'FEMALE', languageCode: 'en-US', accent: 'US', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Journey-F', displayName: 'UK English Female (Journey)', gender: 'FEMALE', languageCode: 'en-GB', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' }
        ];
        
        const ssmlSupportedCount = fallbackVoices.filter(voice => voice.ssmlSupport).length;
        const ssmlUnsupportedCount = fallbackVoices.filter(voice => !voice.ssmlSupport).length;
        
        logger.info(`🎯 [VOICE LIST] Using fallback voice list with ${fallbackVoices.length} voices (Google API unavailable)`);
        logger.info(`🎯 [VOICE LIST] Fallback SSML supported: ${ssmlSupportedCount}, unsupported: ${ssmlUnsupportedCount}`);
        
        return res.json({ 
          provider: 'google', 
          voices: fallbackVoices,
          fallback: true,
          stats: {
            total: fallbackVoices.length,
            ssmlSupported: ssmlSupportedCount,
            ssmlUnsupported: ssmlUnsupportedCount
          }
        });
      }
    } else {
      logger.error(`Unsupported TTS provider: ${ttsProvider}`);
      return res.status(500).json({ success: false, message: `Unsupported TTS provider: ${ttsProvider}` });
    }
  };
  
  // Filtrelenmiş ses listesi endpointi
  const getFilteredVoices = async (req, res) => {
    try {
      const { accent, emotion, gender, category } = req.query;
      
      // Önce tüm sesleri al (accent'e göre doğru dil kodunu seç)
      let languageCode = 'en-US';
      if (accent && accent !== 'all') {
        const a = String(accent).toLowerCase();
        if (a === 'british') languageCode = 'en-GB';
        else if (a === 'american') languageCode = 'en-US';
        else if (a === 'australian') languageCode = 'en-AU';
        else if (a === 'canadian') languageCode = 'en-CA';
        else if (a === 'indian') languageCode = 'en-IN';
      }

      const mockReq = { query: { languageCode } };
      const mockRes = {
        json: (data) => data
      };
      
      let allVoicesResponse;
      let allVoices;
      
      try {
        allVoicesResponse = await listVoices(mockReq, mockRes);
        allVoices = allVoicesResponse.voices;
      } catch (voiceError) {
        logger.error(`Error fetching voices from Google API: ${voiceError.message}`);
        
        // Fallback: hardcoded voice list with SSML support info
        allVoices = [
          { name: 'en-US-Standard-C', gender: 'FEMALE', accent: 'US', emotion: 'Standard', ssmlSupport: false, package: 'Basic' },
          { name: 'en-US-Standard-D', gender: 'MALE', accent: 'US', emotion: 'Standard', ssmlSupport: false, package: 'Basic' },
          { name: 'en-US-Wavenet-F', gender: 'FEMALE', accent: 'US', emotion: 'Natural', ssmlSupport: true, package: 'Premium' },
          { name: 'en-US-Wavenet-A', gender: 'MALE', accent: 'US', emotion: 'Natural', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Standard-A', gender: 'FEMALE', accent: 'GB', emotion: 'Standard', ssmlSupport: false, package: 'Basic' },
          { name: 'en-GB-Standard-B', gender: 'MALE', accent: 'GB', emotion: 'Standard', ssmlSupport: false, package: 'Basic' },
          { name: 'en-GB-Wavenet-B', gender: 'MALE', accent: 'GB', emotion: 'Natural', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Wavenet-C', gender: 'FEMALE', accent: 'GB', emotion: 'Natural', ssmlSupport: true, package: 'Premium' },
          
          // British Neural2 voices (Premium package)
          { name: 'en-GB-Neural2-A', gender: 'FEMALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Neural2-B', gender: 'MALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Neural2-C', gender: 'FEMALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Neural2-D', gender: 'MALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Neural2-F', gender: 'FEMALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Neural2-N', gender: 'FEMALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          { name: 'en-GB-Neural2-O', gender: 'MALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: true, package: 'Premium' },
          
          // British Chirp HD voices (Gold package)
          { name: 'en-GB-Chirp-HD-D', gender: 'MALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Chirp-HD-F', gender: 'FEMALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Chirp-HD-O', gender: 'FEMALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          
          // British Chirp 3 HD voices (Gold package)
          { name: 'en-GB-Chirp3-HD-Achernar', gender: 'FEMALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Chirp3-HD-Achird', gender: 'MALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Chirp3-HD-Algenib', gender: 'MALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Chirp3-HD-Algieba', gender: 'MALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Chirp3-HD-Alnilam', gender: 'MALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          { name: 'en-GB-Chirp3-HD-Aoede', gender: 'FEMALE', accent: 'GB', emotion: 'Advanced', ssmlSupport: false, package: 'Gold' },
          
          // Studio voices (Platinum package)
          { name: 'en-US-Studio-M', gender: 'MALE', accent: 'US', emotion: 'Professional', ssmlSupport: false, package: 'Platinum' },
          { name: 'en-US-Studio-O', gender: 'FEMALE', accent: 'US', emotion: 'Professional', ssmlSupport: false, package: 'Platinum' },
          { name: 'en-US-Studio-Q', gender: 'MALE', accent: 'US', emotion: 'Professional', ssmlSupport: false, package: 'Platinum' },
          { name: 'en-GB-Studio-B', gender: 'MALE', accent: 'GB', emotion: 'Professional', ssmlSupport: false, package: 'Platinum' },
          { name: 'en-GB-Studio-C', gender: 'FEMALE', accent: 'GB', emotion: 'Professional', ssmlSupport: false, package: 'Platinum' }
        ];
        logger.info('🎯 [VOICE FILTER] Using fallback voice list');
      }
      
      // 🔍 DEBUG: İlk durumu logla
      logger.info(`🎯 [VOICE FILTER DEBUG] Starting with ${allVoices.length} total voices`);
      logger.info(`🎯 [VOICE FILTER DEBUG] Incoming filters:`, { accent, emotion, gender, category });
      
      // İlk birkaç voice'ın özelliklerini logla
      if (allVoices.length > 0) {
        const sampleVoice = allVoices[0];
        logger.info(`🎯 [VOICE FILTER DEBUG] Sample voice structure:`, {
          name: sampleVoice.name,
          gender: sampleVoice.gender,
          accent: sampleVoice.accent,
          package: sampleVoice.package,
          ssmlSupport: sampleVoice.ssmlSupport
        });
      }
      
      // Filtreleme uygula
      let filteredVoices = allVoices;
      logger.info(`🎯 [VOICE FILTER DEBUG] Step 0 - Initial: ${filteredVoices.length} voices`);
      
      // 🔧 Frontend-Backend mapping düzeltmeleri
      if (accent && accent !== 'all') {
        // Frontend'den gelen accent'leri backend accent'leriyle eşleştir
        let backendAccent = accent;
        switch (accent.toLowerCase()) {
          case 'british':
            backendAccent = 'GB';
            break;
          case 'american':
            backendAccent = 'US';
            break;
          case 'australian':
            backendAccent = 'AU';
            break;
          case 'canadian':
            backendAccent = 'CA';
            break;
          case 'indian':
            backendAccent = 'IN';
            break;
        }
        
        filteredVoices = filteredVoices.filter(voice => voice.accent === backendAccent);
        logger.info(`🎯 [VOICE FILTER] Accent filter applied - ${accent} (mapped to ${backendAccent})`);
        logger.info(`🎯 [VOICE FILTER DEBUG] Step 1 - After accent filter: ${filteredVoices.length} voices`);
      }
      
      if (emotion && emotion !== 'all') {
        filteredVoices = filteredVoices.filter(voice => voice.emotion === emotion);
        logger.info(`🎯 [VOICE FILTER] Emotion filter applied - ${emotion}`);
        logger.info(`🎯 [VOICE FILTER DEBUG] Step 2 - After emotion filter: ${filteredVoices.length} voices`);
      }
      
      // 🔧 Gender mapping düzeltmesi
      if (gender && gender !== 'all') {
        // Frontend'den gelen gender'ları backend gender'larıyla eşleştir
        let backendGender = gender.toUpperCase(); // "female" -> "FEMALE", "male" -> "MALE"
        
        filteredVoices = filteredVoices.filter(voice => voice.gender === backendGender);
        logger.info(`🎯 [VOICE FILTER] Gender filter applied - ${gender} (mapped to ${backendGender})`);
        logger.info(`🎯 [VOICE FILTER DEBUG] Step 3 - After gender filter: ${filteredVoices.length} voices`);
      }
      
      // SSML filtresi kaldırıldı - kullanıcılar için gereksiz karmaşıklık
      logger.info(`🎯 [VOICE FILTER] SSML filter REMOVED - no longer filtering by SSML support`);
      logger.info(`🎯 [VOICE FILTER DEBUG] Step 4 - SSML filter disabled: ${filteredVoices.length} voices`);
      
      // 🔧 Kategori filtresi (sadece seçilen kategori için kontrol)
      if (category && category !== 'all') {
        filteredVoices = filteredVoices.filter(voice => {
          let matches = false;
          
          // Her kategori için ayrı ayrı kontrol et (yanlış pozitif sonuçları önle)
          switch (category) {
            case 'standard':
              matches = voice.name.includes('Standard') || voice.package === 'Basic';
              break;
            case 'wavenet':
              matches = voice.name.includes('Wavenet');
              break;
            case 'neural2':
              matches = voice.name.includes('Neural2');
              break;
            case 'studio':
              matches = voice.name.includes('Studio') || voice.package === 'Platinum';
              break;
            case 'chirp3d':
              matches = voice.name.includes('Journey') || voice.name.includes('Chirp') || voice.package === 'Gold';
              break;
            default:
              matches = false;
          }
          
          if (matches) {
            logger.debug(`🎯 [CATEGORY MATCH] ${voice.name} matches ${category} category`);
          }
          
          return matches;
        });
        logger.info(`🎯 [VOICE FILTER] Category filter applied - ${category} category`);
        logger.info(`🎯 [VOICE FILTER DEBUG] Step 5 - After category filter: ${filteredVoices.length} voices`);
      }
      
      // 🔧 If Studio + Male combos are missing from Google API, inject known voices
      if ((category === 'studio') && (gender && gender !== 'all') && (accent && accent !== 'all')) {
        const desiredGender = gender.toUpperCase();
        const desiredAccent = (accent || '').toUpperCase() === 'BRITISH' ? 'GB' :
                               (accent || '').toUpperCase() === 'AMERICAN' ? 'US' :
                               (accent || '').toUpperCase() === 'AUSTRALIAN' ? 'AU' :
                               (accent || '').toUpperCase() === 'CANADIAN' ? 'CA' :
                               (accent || '').toUpperCase() === 'INDIAN' ? 'IN' : (accent || '').toUpperCase();

        // Known Studio voices by accent/gender
        const studioVoiceMap = {
          'US:MALE':   { name: 'en-US-Studio-M', displayName: 'US English Male (Studio)', languageCode: 'en-US', accent: 'US' },
          'US:FEMALE': { name: 'en-US-Studio-Q', displayName: 'US English Female (Studio)', languageCode: 'en-US', accent: 'US' },
          'GB:MALE':   { name: 'en-GB-Studio-B', displayName: 'UK English Male (Studio)', languageCode: 'en-GB', accent: 'GB' },
          'GB:FEMALE': { name: 'en-GB-Studio-C', displayName: 'UK English Female (Studio)', languageCode: 'en-GB', accent: 'GB' },
        };

        const key = `${desiredAccent}:${desiredGender}`;
        if (filteredVoices.length === 0 && studioVoiceMap[key]) {
          // Only inject if not already present in allVoices
          const existsInAll = allVoices.some(v => v.name === studioVoiceMap[key].name);
          if (!existsInAll) {
            filteredVoices.push({
              name: studioVoiceMap[key].name,
              displayName: studioVoiceMap[key].displayName,
              gender: desiredGender,
              languageCode: studioVoiceMap[key].languageCode,
              accent: studioVoiceMap[key].accent,
              emotion: 'Professional',
              ssmlSupport: false,
              package: 'Platinum'
            });
            logger.warn(`🎯 [VOICE FILTER INJECT] Injected Studio voice: ${studioVoiceMap[key].name} for ${key}`);
          }
        }
      }

      // 🔧 Wavenet + Australian / Canadian / Indian için Google API eksik dönerse fallback ekle
      if ((category === 'wavenet') && (accent && accent !== 'all')) {
        const desiredAccent = (accent || '').toLowerCase();
        const desiredGender = (gender && gender !== 'all') ? gender.toUpperCase() : null;
        const wavenetMap = {
          'australian:MALE':   'en-AU-Wavenet-D',
          'australian:FEMALE': 'en-AU-Wavenet-A',
          'canadian:MALE':     'en-CA-Wavenet-D',
          'canadian:FEMALE':   'en-CA-Wavenet-A',
          'indian:MALE':       'en-IN-Wavenet-D',
          'indian:FEMALE':     'en-IN-Wavenet-A',
        };
        const key = `${desiredAccent}:${desiredGender || 'FEMALE'}`;
        if (filteredVoices.length === 0 && wavenetMap[key]) {
          filteredVoices.push({
            name: wavenetMap[key],
            displayName: wavenetMap[key].split('-').slice(-1)[0],
            gender: desiredGender || 'FEMALE',
            languageCode: desiredAccent === 'australian' ? 'en-AU' : desiredAccent === 'canadian' ? 'en-CA' : 'en-IN',
            accent: desiredAccent === 'australian' ? 'AU' : desiredAccent === 'canadian' ? 'CA' : 'IN',
            emotion: 'Natural',
            ssmlSupport: true,
            package: 'Premium'
          });
          logger.warn(`🎯 [VOICE FILTER INJECT] Injected Wavenet voice fallback for ${key}`);
        }
      }

      // Allowlist validation for selected voice (avoid false fallback)
      const allowList = new Set([
        'en-US-Chirp-HD-D','en-US-Chirp-HD-F','en-US-Chirp-HD-O',
        'en-GB-Chirp-HD-D','en-GB-Chirp-HD-F','en-GB-Chirp-HD-O',
        'en-AU-Chirp-HD-D','en-AU-Chirp-HD-F','en-AU-Chirp-HD-O'
      ]);

      // 🔍 FINAL DEBUG: Detaylı sonuç analizi
      logger.info(`🎯 [VOICE FILTER] Applied filters - accent: ${accent}, emotion: ${emotion}, gender: ${gender}, category: ${category}`);
      logger.info(`🎯 [VOICE FILTER] Filtered voices count: ${filteredVoices.length} / ${allVoices.length}`);
      
      // Eğer hiç voice kalmamışsa, mevcut olanları göster
      if (filteredVoices.length === 0 && allVoices.length > 0) {
        logger.warn(`🔴 [VOICE FILTER] NO VOICES FOUND! Available voice properties:`);
        
        const uniqueAccents = [...new Set(allVoices.map(v => v.accent))];
        const uniqueGenders = [...new Set(allVoices.map(v => v.gender))];
        const uniqueCategories = [...new Set(allVoices.map(v => v.package))];
        
        logger.warn(`🔴 Available accents: ${uniqueAccents.join(', ')}`);
        logger.warn(`🔴 Available genders: ${uniqueGenders.join(', ')}`);
        logger.warn(`🔴 Available packages: ${uniqueCategories.join(', ')}`);
        
        // Neural2 voice'ları özellikle kontrol et
        const neural2Voices = allVoices.filter(v => v.name.includes('Neural2'));
        logger.warn(`🔴 Neural2 voices available: ${neural2Voices.length}`);
        neural2Voices.slice(0, 3).forEach(voice => {
          logger.warn(`🔴 Neural2 sample: ${voice.name} - Gender: ${voice.gender}, Accent: ${voice.accent}, Package: ${voice.package}`);
        });
        
        // Chirp voice'ları özellikle kontrol et
        const chirpVoices = allVoices.filter(v => v.name.includes('Chirp') || v.name.includes('Journey'));
        logger.warn(`🔴 Chirp/Journey voices available: ${chirpVoices.length}`);
        chirpVoices.slice(0, 3).forEach(voice => {
          logger.warn(`🔴 Chirp sample: ${voice.name} - Gender: ${voice.gender}, Accent: ${voice.accent}, Package: ${voice.package}`);
        });
      } else if (filteredVoices.length > 0) {
        // Başarılı filtreleme durumunda örnek göster
        logger.info(`🎯 [VOICE FILTER SUCCESS] Sample filtered voices:`);
        filteredVoices.slice(0, 3).forEach(voice => {
          logger.info(`🎯 Filtered voice: ${voice.name} - Gender: ${voice.gender}, Accent: ${voice.accent}, Package: ${voice.package}`);
        });
      }
      
      return res.json({ 
        provider: 'google', 
        voices: filteredVoices,
        filters: { accent, emotion, gender, category },
        totalCount: allVoices.length,
        filteredCount: filteredVoices.length
      });
      
    } catch (error) {
      logger.error(`Error filtering voices: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Error filtering voices' });
    }
  };
  
  // handleTTSRequest adıyla alias oluştur (geriye dönük uyumluluk)
  const handleTTSRequest = processTtsRequest;
  
  // Test endpoint to check available voices
  const testVoices = async (req, res) => {
    try {
      const { languageCode = 'en-GB' } = req.query;
      logger.info(`Testing available voices for language: ${languageCode}`);
      
      const availableVoices = await listGoogleVoices(languageCode);
      
      // Filter for Neural2 voices specifically
      const neural2Voices = availableVoices.filter(voice => 
        voice.name.includes('Neural2') && voice.name.includes(languageCode)
      );
      
      logger.info(`Found ${neural2Voices.length} Neural2 voices for ${languageCode}:`);
      neural2Voices.forEach(voice => {
        logger.info(`- ${voice.name} (${voice.gender})`);
      });
      
      return res.json({
        success: true,
        languageCode,
        totalVoices: availableVoices.length,
        neural2Voices: neural2Voices,
        allVoices: availableVoices
      });
      
    } catch (error) {
      logger.error(`Error testing voices: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
  
  // Helper function to create word-level VTT file from optimized timings
  const createWordLevelVTTFromOptimizedTimings = (wordTimings, cleanWords, originalWords) => {
    let vttContent = 'WEBVTT\n\n';
    
    // Format time as MM:SS.mmm
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const millisecs = Math.floor((seconds % 1) * 1000);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millisecs.toString().padStart(3, '0')}`;
    };
    
    // Her temiz kelime için VTT cue oluştur
    wordTimings.forEach((timing, index) => {
        // Timing'de endTimeSeconds kullan
        const startTime = timing.timeSeconds || timing.startTime || 0;
        const endTime = timing.endTimeSeconds || timing.endTime || (startTime + 0.5);
        
        vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
        vttContent += `${timing.word}\n\n`;
    });
    
    return vttContent;
  };
  
  // Helper function to create optimized timepoints for frontend
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