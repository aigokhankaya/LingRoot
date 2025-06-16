// backend/controllers/ttsController.js
const path = require("path");
const os = require("os");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger"); // Import Winston logger
const { extractTextFromInput, generateTopicText, generateEnglishNarrationForTopic, translateToEnglishWithOpenAI } = require("../utils/inputExtractor");
const { cleanText, chunkText, chunkTextByCharLimit, preChunkTextByByteLimit } = require("../utils/textProcessor");
const { adaptToCEFR: adaptToCEFRFunc } = require("../utils/cefrAdapter");
const { synthesizeWithGoogle, listGoogleVoices } = require("../utils/googleTTS");
const { mergeAudioSegments, mergeAudioSegmentsToBuffer } = require("../utils/audioMerger");
const { uploadToSupabase } = require("../utils/storageUploader");
const tmp = require("tmp");
const { logStep } = require('../utils/stepLogger');
const { logRequestStep } = require("../utils/requestLogger");
const { createClient } = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    let tempFilePath = null;
    let detectedLang = 'en';

    // Check if mock TTS mode is enabled from parameters table
    try {
        const { data: paramData, error: paramError } = await supabase
            .from('parameters')
            .select('value')
            .eq('key', 'mock_tts_enabled')
            .single();

        const mockTtsEnabled = paramData?.value === 'true' || paramData?.value === true;

        if (mockTtsEnabled) {
            logger.info(`[${requestId}] Mock TTS mode enabled - returning mock TTS response with realistic timing`);
            
            // Mock English text based on input type
            let mockEnglishText = "This is a sample English text for testing purposes with multiple words to demonstrate the word-level highlighting feature.";
            
            // For mock mode, use realistic speaking rate calculation
            const mockSpeakingRate = speakingRate || 1.0;
            const mockWords = mockEnglishText.split(/\s+/).filter(word => word.length > 0);
            const mockDuration = (mockWords.length / (150 * mockSpeakingRate)) * 60; // 150 WPM base
            
            // Create realistic word timings
            const mockWordTimings = mockWords.map((word, index) => ({
                word: word,
                startTime: (index / mockWords.length) * mockDuration,
                endTime: ((index + 1) / mockWords.length) * mockDuration,
                markName: `mock_word_${index}`
            }));
            
            // For mock mode, return external mock audio URL
            const mockMp3Url = "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3";
            
            // Create mock VTT file with real timings
            const mockVttContent = createWordLevelVTTFromTimings(mockWordTimings, mockDuration);
            const mockVttId = `mock_vtt_${Date.now()}`;
            tempVttFiles.set(mockVttId, {
                content: mockVttContent,
                createdAt: new Date(),
                text: mockEnglishText,
                duration: mockDuration,
                wordTimings: mockWordTimings,
                speakingRate: mockSpeakingRate,
                isRealTiming: false,
                isMock: true
            });
            const mockVttUrl = `/api/tts/vtt/${mockVttId}`;
            
            // Create mock timepoints
            const mockTimepoints = mockWordTimings.map(w => ({
                timeSeconds: w.startTime,
                endTimeSeconds: w.endTime,
                word: w.word
            }));
            
            return res.status(200).json({
                success: true,
                message: mockEnglishText,
                mp3_url: mockMp3Url,
                vtt_url: mockVttUrl,
                level: level,
                timepoints: mockTimepoints,
                words: mockWords,
                original_turkish: req.body.input || "Bu test modunda örnek bir Türkçe metindir.",
                // Mock ek bilgileri
                real_duration: mockDuration,
                speaking_rate: mockSpeakingRate,
                word_timings_count: mockWordTimings.length,
                audio_segments: 1,
                is_real_timing: false,
                is_mock: true
            });
        }
    } catch (paramError) {
        logger.warn(`[${requestId}] Could not check mock_tts_enabled parameter: ${paramError.message}`);
        // Continue with normal processing if parameter check fails
    }

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
        try {
            const translationResult = await translateToEnglishWithOpenAI(cleanedText);
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
            logger.error(`[${requestId}] Error during language detection/translation: ${translateError.message}. Proceeding with original cleaned text.`);
            textToAdapt = cleanedText;
            detectedLang = 'en';
            logRequestStep(requestId, 'translate:error', { error: translateError.message });
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
            textToAdapt = adaptedResult;
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

        // --- Step 5: Her chunk için tekrar chunkText (TTS öncesi) ---
        let finalChunks = [];
        for (let i = 0; i < initialChunks.length; i++) {
            // Polly için güvenli sınır: 1000 karakter
            let pollyChunks = chunkTextByCharLimit(initialChunks[i], 1000);
            pollyChunks = pollyChunks.map((chunk, i) => {
                if (chunk.length > 1000) {
                    logger.warn(`[Polly chunk] [${i}] length exceeds safe limit: ${chunk.length}, truncating to 1000.`);
                    return chunk.substring(0, 1000);
                }
                return chunk;
            });
            pollyChunks.forEach((chunk, i) => {
                logger.info(`[Polly chunk] [${i}] length: ${chunk.length}`);
            });
            finalChunks = finalChunks.concat(pollyChunks);
        }
        // Polly'ye gönderme işlemi burada finalChunks ile devam edecek
        // Get voice from request with validation against our API voices
        let selectedVoice = req.body.voice || 'en-US-Neural2-D';
        
        // Get all available voices from our voices API
        const availableVoices = [
            // Standard voices (Basic)
            'en-US-Standard-A', 'en-US-Standard-B', 'en-US-Standard-C', 'en-US-Standard-D', 'en-US-Standard-E',
            'en-US-Standard-F', 'en-US-Standard-G', 'en-US-Standard-H', 'en-US-Standard-I', 'en-US-Standard-J',
            // WaveNet voices (Premium) - US
            'en-US-Wavenet-A', 'en-US-Wavenet-B', 'en-US-Wavenet-C', 'en-US-Wavenet-D', 'en-US-Wavenet-E',
            'en-US-Wavenet-F', 'en-US-Wavenet-G', 'en-US-Wavenet-H', 'en-US-Wavenet-I', 'en-US-Wavenet-J',
            // WaveNet voices (Premium) - British
            'en-GB-Wavenet-A', 'en-GB-Wavenet-B', 'en-GB-Wavenet-C', 'en-GB-Wavenet-D',
            // WaveNet voices (Premium) - Australian
            'en-AU-Wavenet-A', 'en-AU-Wavenet-B', 'en-AU-Wavenet-C', 'en-AU-Wavenet-D',
            // WaveNet voices (Premium) - Canadian
            'en-CA-Wavenet-A', 'en-CA-Wavenet-B', 'en-CA-Wavenet-C', 'en-CA-Wavenet-D',
            // WaveNet voices (Premium) - Indian
            'en-IN-Wavenet-A', 'en-IN-Wavenet-B', 'en-IN-Wavenet-C', 'en-IN-Wavenet-D',
            // Neural2 voices (Premium) - US
            'en-US-Neural2-A', 'en-US-Neural2-C', 'en-US-Neural2-D', 'en-US-Neural2-E', 'en-US-Neural2-F',
            'en-US-Neural2-G', 'en-US-Neural2-H', 'en-US-Neural2-I', 'en-US-Neural2-J',
            // Neural2 voices (Premium) - British
            'en-GB-Neural2-B', 'en-GB-Neural2-C',
            // Neural2 voices (Premium) - Australian  
            'en-AU-Neural2-A', 'en-AU-Neural2-C', 'en-AU-Neural2-D',
            // Chirp HD voices (Gold)
            'en-US-Chirp-HD-D', 'en-US-Chirp-HD-F', 'en-US-Chirp-HD-O',
            // Chirp 3 HD voices (Gold)  
            'en-US-Chirp3-HD-Achernar', 'en-US-Chirp3-HD-Achird', 'en-US-Chirp3-HD-Aoede', 
            'en-US-Chirp3-HD-Despina', 'en-US-Chirp3-HD-Charon',
            // Studio voices (Platin)
            'en-US-Studio-M', 'en-US-Studio-O', 'en-US-Studio-Q',
            'en-GB-Studio-B', 'en-GB-Studio-C',
            // Journey voices (Chirp 3D - Gold)
            'en-US-Journey-D', 'en-US-Journey-O',
            'en-GB-Journey-F', 'en-GB-Journey-M',
            // News voices (Premium)
            'en-US-News-K', 'en-US-News-L', 'en-US-News-N',
            // Polyglot voices (Premium)
            'en-US-Polyglot-1'
        ];
        
        // Validate selected voice
        if (!availableVoices.includes(selectedVoice)) {
            logger.warn(`[${requestId}] 🔴 UNSUPPORTED VOICE '${selectedVoice}' - Using fallback 'en-US-Neural2-D'`);
            console.log(`🔴 [TTS CONTROLLER] UNSUPPORTED VOICE: ${selectedVoice} -> Fallback: en-US-Neural2-D`);
            selectedVoice = 'en-US-Neural2-D';
        } else {
            console.log(`🎙️ [TTS CONTROLLER] USING SELECTED VOICE: ${selectedVoice}`);
            logger.info(`[${requestId}] 🎙️ Using selected voice: ${selectedVoice}`);
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
        logRequestStep(requestId, 'tts:start', { chunkCount: finalChunks.length, voice: selectedVoice, speakingRate });
        // --- TTS Processing ---
        logger.info(`[${requestId}] Step 5: Starting TTS processing...`);
        const ttsProvider = await getTtsProvider();
        logger.info(`[${requestId}] 🔧 TTS Provider: ${ttsProvider}`);
        
        let audioBase64 = null;
        if (ttsProvider === 'google') {
            const audioBuffers = [];
            for (const [i, chunk] of finalChunks.entries()) {
                const safeSubChunks = enforceTTSByteLimit(chunk, 4500);
                for (const [j, part] of safeSubChunks.entries()) {
                    const bytes = Buffer.byteLength(part, "utf-8");
                    logger.info(`🟢 TTS-safe chunk [${i + 1}.${j + 1}] - ${bytes} bytes`);
                    const result = await synthesizeWithGoogle({
                        text: part,
                        voiceName: selectedVoice,
                        languageCode: languageCode,
                        speakingRate: speakingRate
                    });
                    if (result && result.audioContent) {
                        audioBuffers.push(result.audioContent);
                    }
                }
            }
            
            if (audioBuffers.length > 0) {
                const mergedBuffer = await mergeAudioSegmentsToBuffer(audioBuffers);
                if (mergedBuffer) {
                    audioBase64 = mergedBuffer.toString('base64');
                }
            }
        } else {
            logger.error(`[${requestId}] Unsupported TTS provider: ${ttsProvider}`);
            return res.status(500).json({ success: false, message: `Unsupported TTS provider: ${ttsProvider}` });
        }
        if (!audioBase64) {
            logger.error(`[${requestId}] Failed to synthesize speech with ${ttsProvider}.`);
            logRequestStep(requestId, 'tts:error', { error: `Failed to synthesize speech with ${ttsProvider}.` });
            return res.status(500).json({ success: false, message: `Failed to generate audio with ${ttsProvider === 'google' ? 'Google TTS' : 'Unsupported TTS provider'}.` });
        }
        logger.info(`[${requestId}] Audio processing completed successfully.`);
        logStep({
            requestId,
            stepName: 'tts:googleTTS:end',
            stepSequence: stepSequence++,
            serviceName: 'GoogleTTS',
            endpoint: 'https://texttospeech.googleapis.com/v1/text:synthesize',
            outputData: { audioLength: audioBase64.length }
        });
        logRequestStep(requestId, 'tts:end', { audioLength: audioBase64.length });

        // --- Step 6: Synthesize Audio with Google TTS ---
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

        // Her chunk için sentez yap - timing bilgileriyle
        const audioSegments = [];
        const allWordTimings = [];
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

                // Audio segment'ini sakla
                audioSegments.push({
                    audioContent: ttsResult.audioContent,
                    chunkIndex: i,
                    duration: ttsResult.totalDuration,
                    wordCount: ttsResult.wordTimings.length
                });

                // Word timing'leri birleştir - offset ile
                ttsResult.wordTimings.forEach(wordTiming => {
                    allWordTimings.push({
                        word: wordTiming.word,
                        startTime: wordTiming.startTime + cumulativeTimeOffset,
                        endTime: wordTiming.endTime + cumulativeTimeOffset,
                        chunkIndex: i,
                        originalMarkName: wordTiming.markName
                    });
                });

                // Bir sonraki chunk için offset'i güncelle
                cumulativeTimeOffset += ttsResult.totalDuration;

                logger.info(`[${requestId}] Chunk ${i + 1} completed - Duration: ${ttsResult.totalDuration.toFixed(1)}s, Words: ${ttsResult.wordTimings.length}, Fallback: ${ttsResult.isFallback ? 'Yes' : 'No'}`);

            } catch (chunkError) {
                logger.error(`[${requestId}] Chunk ${i + 1} synthesis failed:`, chunkError.message);
                throw new Error(`TTS synthesis failed for chunk ${i + 1}: ${chunkError.message}`);
            }
        }

        // Toplam süre ve kelime sayısı
        const totalRealDuration = cumulativeTimeOffset;
        const totalWords = allWordTimings.length;
        
        logger.info(`[${requestId}] All chunks synthesized - Total duration: ${totalRealDuration.toFixed(1)}s, Total words: ${totalWords}, Segments: ${audioSegments.length}`);

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

        // --- Step 8: Create VTT with Real Timings ---
        logger.info(`[${requestId}] Creating VTT with real word timings...`);
        
        // Gerçek timing'lerle VTT oluştur
        const vttContent = createWordLevelVTTFromTimings(allWordTimings, totalRealDuration);
        const vttUniqueId = `vtt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // VTT dosyasını temp olarak sakla
        tempVttFiles.set(vttUniqueId, {
            content: vttContent,
            createdAt: new Date(),
            text: adaptedText,
            duration: totalRealDuration,
            words: totalWords,
            wordTimings: allWordTimings,
            speakingRate: speakingRate,
            isRealTiming: true
        });
        
        const vttUrl = `/api/tts/vtt/${vttUniqueId}`;
        
        logger.info(`[${requestId}] VTT created with real timings - ID: ${vttUniqueId}, Duration: ${totalRealDuration.toFixed(1)}s, Words: ${totalWords}`);

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
            duration: totalRealDuration,
            wordCount: totalWords
        });
        
        logger.info(`[${requestId}] 🔄 tempAudioFiles size after: ${tempAudioFiles.size}`);

        // --- Step 10: Return Success Response ---
        logger.info(`[${requestId}] Processing complete with real timings.`);

        // Use Supabase URL if available, otherwise use API endpoint URL
        const finalMp3Url = mp3Url || `/api/tts/audio/${uniqueId}`;
        
        // Kelime listesi ve timepoints gerçek timing'lerden (startTime ve endTime ile)
        const words = allWordTimings.map(w => w.word);
        const timepoints = allWordTimings.map(w => ({
            timeSeconds: w.startTime,
            endTimeSeconds: w.endTime,
            word: w.word
        }));
        
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
                chunks_processed: audioSegments.length
            }
        });
        
        // Kitap bölümü için ses oluşturulmuşsa chapter_audio tablosuna kaydet
        if (req.body.chapter_id) {
            try {
                const { Pool } = require('pg');
                const pool = new Pool({
                    connectionString: process.env.DATABASE_URL,
                    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
                });
                
                const insertQuery = `
                    INSERT INTO chapter_audio (chapter_id, voice_model, speaking_rate, level, mp3_url, vtt_url, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW())
                    ON CONFLICT (chapter_id, voice_model, speaking_rate, level) 
                    DO UPDATE SET mp3_url = EXCLUDED.mp3_url, vtt_url = EXCLUDED.vtt_url, created_at = NOW()
                    RETURNING id
                `;
                
                const result = await pool.query(insertQuery, [
                    req.body.chapter_id,
                    voice || 'en-US-Standard-C',
                    speakingRate || 1.0,
                    level || 'a1',
                    finalMp3Url,
                    vttUrl
                ]);
                
                logger.info(`[${requestId}] Chapter audio saved to database: ${result.rows[0].id}`);
                await pool.end(); // Pool bağlantısını kapat
            } catch (dbError) {
                logger.error(`[${requestId}] Error saving chapter audio to database: ${dbError.message}`);
                // Don't fail the request if database save fails
            }
        }

        return res.status(200).json({
            success: true,
            message: adaptedText,
            level: level,
            input_language: detectedLang,
            mp3_url: finalMp3Url,
            words: words,
            timepoints: timepoints,
            vtt_url: vttUrl,
            original_turkish: originalTurkishText || undefined,
            // Ek bilgiler
            real_duration: totalRealDuration,
            speaking_rate: speakingRate,
            word_timings_count: allWordTimings.length,
            audio_segments: audioSegments.length,
            is_real_timing: true
        });

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
                logger.warn(`❌ Audio file not found in database: ${audioId}. Serving mock audio.`);
                const mockAudioUrl = "https://file-examples.com/storage/fe68c1b7b1b2e0c2b5b7e8b/2017/11/file_example_MP3_700KB.mp3";
                logger.info(`🔄 Redirecting to mock audio: ${mockAudioUrl}`);
                return res.redirect(mockAudioUrl);
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
            const mockAudioUrl = "https://file-examples.com/storage/fe68c1b7b1b2e0c2b5b7e8b/2017/11/file_example_MP3_700KB.mp3";
            logger.info(`🔄 Redirecting to mock audio: ${mockAudioUrl}`);
            return res.redirect(mockAudioUrl);
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
      // Google TTS voices with pricing categories, accent types, and emotion tones
      const googleVoices = [
        // Standard voices (Basic) - US
        { gender: 'male', name: 'en-US-Standard-A', category: 'Standard', package: 'Basic', description: 'Standard Erkek A', accent: 'american', emotion: 'neutral' },
        { gender: 'male', name: 'en-US-Standard-B', category: 'Standard', package: 'Basic', description: 'Standard Erkek B', accent: 'american', emotion: 'neutral' },
        { gender: 'female', name: 'en-US-Standard-C', category: 'Standard', package: 'Basic', description: 'Standard Kadın C', accent: 'american', emotion: 'neutral' },
        { gender: 'male', name: 'en-US-Standard-D', category: 'Standard', package: 'Basic', description: 'Standard Erkek D', accent: 'american', emotion: 'neutral' },
        { gender: 'female', name: 'en-US-Standard-E', category: 'Standard', package: 'Basic', description: 'Standard Kadın E', accent: 'american', emotion: 'neutral' },
        { gender: 'female', name: 'en-US-Standard-F', category: 'Standard', package: 'Basic', description: 'Standard Kadın F', accent: 'american', emotion: 'neutral' },
        { gender: 'female', name: 'en-US-Standard-G', category: 'Standard', package: 'Basic', description: 'Standard Kadın G', accent: 'american', emotion: 'neutral' },
        { gender: 'female', name: 'en-US-Standard-H', category: 'Standard', package: 'Basic', description: 'Standard Kadın H', accent: 'american', emotion: 'neutral' },
        { gender: 'male', name: 'en-US-Standard-I', category: 'Standard', package: 'Basic', description: 'Standard Erkek I', accent: 'american', emotion: 'neutral' },
        { gender: 'male', name: 'en-US-Standard-J', category: 'Standard', package: 'Basic', description: 'Standard Erkek J', accent: 'american', emotion: 'neutral' },
        
        // Standard voices (Basic) - British
        { gender: 'female', name: 'en-GB-Standard-A', category: 'Standard', package: 'Basic', description: 'İngiliz Standard Kadın A', accent: 'british', emotion: 'neutral' },
        { gender: 'male', name: 'en-GB-Standard-B', category: 'Standard', package: 'Basic', description: 'İngiliz Standard Erkek B', accent: 'british', emotion: 'neutral' },
        { gender: 'female', name: 'en-GB-Standard-C', category: 'Standard', package: 'Basic', description: 'İngiliz Standard Kadın C', accent: 'british', emotion: 'neutral' },
        { gender: 'male', name: 'en-GB-Standard-D', category: 'Standard', package: 'Basic', description: 'İngiliz Standard Erkek D', accent: 'british', emotion: 'neutral' },
        
        // Standard voices (Basic) - Australian
        { gender: 'female', name: 'en-AU-Standard-A', category: 'Standard', package: 'Basic', description: 'Avustralya Standard Kadın A', accent: 'australian', emotion: 'neutral' },
        { gender: 'male', name: 'en-AU-Standard-B', category: 'Standard', package: 'Basic', description: 'Avustralya Standard Erkek B', accent: 'australian', emotion: 'neutral' },
        { gender: 'female', name: 'en-AU-Standard-C', category: 'Standard', package: 'Basic', description: 'Avustralya Standard Kadın C', accent: 'australian', emotion: 'neutral' },
        { gender: 'male', name: 'en-AU-Standard-D', category: 'Standard', package: 'Basic', description: 'Avustralya Standard Erkek D', accent: 'australian', emotion: 'neutral' },
        
        // WaveNet voices (Premium) - CORRECTED GENDERS with varied accents and emotions
        { gender: 'male', name: 'en-US-Wavenet-A', category: 'WaveNet', package: 'Premium', description: 'WaveNet Erkek', accent: 'american', emotion: 'professional' },
        { gender: 'male', name: 'en-US-Wavenet-B', category: 'WaveNet', package: 'Premium', description: 'WaveNet Erkek 2', accent: 'american', emotion: 'neutral' },
        { gender: 'female', name: 'en-US-Wavenet-C', category: 'WaveNet', package: 'Premium', description: 'WaveNet Kadın', accent: 'american', emotion: 'friendly' },
        { gender: 'male', name: 'en-US-Wavenet-D', category: 'WaveNet', package: 'Premium', description: 'WaveNet Erkek 3', accent: 'american', emotion: 'serious' },
        { gender: 'female', name: 'en-US-Wavenet-E', category: 'WaveNet', package: 'Premium', description: 'WaveNet Kadın 2', accent: 'american', emotion: 'calm' },
        { gender: 'female', name: 'en-US-Wavenet-F', category: 'WaveNet', package: 'Premium', description: 'WaveNet Kadın 3', accent: 'american', emotion: 'cheerful' },
        { gender: 'female', name: 'en-US-Wavenet-G', category: 'WaveNet', package: 'Premium', description: 'WaveNet Kadın 4', accent: 'american', emotion: 'neutral' },
        { gender: 'female', name: 'en-US-Wavenet-H', category: 'WaveNet', package: 'Premium', description: 'WaveNet Kadın 5', accent: 'american', emotion: 'excited' },
        { gender: 'male', name: 'en-US-Wavenet-I', category: 'WaveNet', package: 'Premium', description: 'WaveNet Erkek 4', accent: 'american', emotion: 'calm' },
        { gender: 'male', name: 'en-US-Wavenet-J', category: 'WaveNet', package: 'Premium', description: 'WaveNet Erkek 5', accent: 'american', emotion: 'professional' },
        
        // Neural2 voices (Premium) - US
        { gender: 'male', name: 'en-US-Neural2-A', category: 'Neural2', package: 'Premium', description: 'Neural2 Erkek', accent: 'american', emotion: 'neutral' },
        { gender: 'female', name: 'en-US-Neural2-C', category: 'Neural2', package: 'Premium', description: 'Neural2 Kadın', accent: 'american', emotion: 'friendly' },
        { gender: 'male', name: 'en-US-Neural2-D', category: 'Neural2', package: 'Premium', description: 'Neural2 Erkek 2', accent: 'american', emotion: 'professional' },
        { gender: 'female', name: 'en-US-Neural2-E', category: 'Neural2', package: 'Premium', description: 'Neural2 Kadın 2', accent: 'american', emotion: 'cheerful' },
        { gender: 'female', name: 'en-US-Neural2-F', category: 'Neural2', package: 'Premium', description: 'Neural2 Kadın 3', accent: 'american', emotion: 'calm' },
        { gender: 'female', name: 'en-US-Neural2-G', category: 'Neural2', package: 'Premium', description: 'Neural2 Kadın 4', accent: 'american', emotion: 'excited' },
        { gender: 'female', name: 'en-US-Neural2-H', category: 'Neural2', package: 'Premium', description: 'Neural2 Kadın 5', accent: 'american', emotion: 'serious' },
        { gender: 'male', name: 'en-US-Neural2-I', category: 'Neural2', package: 'Premium', description: 'Neural2 Erkek 3', accent: 'american', emotion: 'calm' },
        { gender: 'male', name: 'en-US-Neural2-J', category: 'Neural2', package: 'Premium', description: 'Neural2 Erkek 4', accent: 'american', emotion: 'friendly' },
        
        // Neural2 voices (Premium) - British
        { gender: 'male', name: 'en-GB-Neural2-B', category: 'Neural2', package: 'Premium', description: 'İngiliz Neural2 Erkek', accent: 'british', emotion: 'professional' },
        { gender: 'female', name: 'en-GB-Neural2-C', category: 'Neural2', package: 'Premium', description: 'İngiliz Neural2 Kadın', accent: 'british', emotion: 'friendly' },
        
        // Neural2 voices (Premium) - Australian  
        { gender: 'female', name: 'en-AU-Neural2-A', category: 'Neural2', package: 'Premium', description: 'Avustralya Neural2 Kadın', accent: 'australian', emotion: 'friendly' },
        { gender: 'female', name: 'en-AU-Neural2-C', category: 'Neural2', package: 'Premium', description: 'Avustralya Neural2 Kadın 2', accent: 'australian', emotion: 'cheerful' },
        { gender: 'male', name: 'en-AU-Neural2-D', category: 'Neural2', package: 'Premium', description: 'Avustralya Neural2 Erkek', accent: 'australian', emotion: 'calm' },
        
        // Chirp HD voices (Gold) - Old generation with premium characteristics
        { gender: 'male', name: 'en-US-Chirp-HD-D', category: 'Chirp HD', package: 'Gold', description: 'Chirp HD Erkek', accent: 'american', emotion: 'professional' },
        { gender: 'female', name: 'en-US-Chirp-HD-F', category: 'Chirp HD', package: 'Gold', description: 'Chirp HD Kadın', accent: 'american', emotion: 'friendly' },
        { gender: 'female', name: 'en-US-Chirp-HD-O', category: 'Chirp HD', package: 'Gold', description: 'Chirp HD Kadın 2', accent: 'american', emotion: 'cheerful' },
        
        // Chirp 3 HD voices (Gold) - New generation with star names and premium characteristics
        { gender: 'female', name: 'en-US-Chirp3-HD-Achernar', category: 'Chirp 3 HD', package: 'Gold', description: 'Chirp 3 HD Kadın (Achernar)', accent: 'american', emotion: 'professional' },
        { gender: 'male', name: 'en-US-Chirp3-HD-Achird', category: 'Chirp 3 HD', package: 'Gold', description: 'Chirp 3 HD Erkek (Achird)', accent: 'american', emotion: 'serious' },
        { gender: 'female', name: 'en-US-Chirp3-HD-Aoede', category: 'Chirp 3 HD', package: 'Gold', description: 'Chirp 3 HD Kadın (Aoede)', accent: 'american', emotion: 'cheerful' },
        { gender: 'female', name: 'en-US-Chirp3-HD-Despina', category: 'Chirp 3 HD', package: 'Gold', description: 'Chirp 3 HD Kadın (Despina)', accent: 'american', emotion: 'calm' },
        { gender: 'male', name: 'en-US-Chirp3-HD-Charon', category: 'Chirp 3 HD', package: 'Gold', description: 'Chirp 3 HD Erkek (Charon)', accent: 'american', emotion: 'friendly' },
        
        // Studio voices (Platin) - Premium studio quality
        { gender: 'male', name: 'en-US-Studio-M', category: 'Studio', package: 'Platin', description: 'Studio Erkek M', accent: 'american', emotion: 'professional' },
        { gender: 'female', name: 'en-US-Studio-O', category: 'Studio', package: 'Platin', description: 'Studio Kadın O', accent: 'american', emotion: 'professional' },
        { gender: 'male', name: 'en-US-Studio-Q', category: 'Studio', package: 'Platin', description: 'Studio Erkek Q', accent: 'american', emotion: 'professional' },
        { gender: 'male', name: 'en-GB-Studio-B', category: 'Studio', package: 'Platin', description: 'İngiliz Studio Erkek', accent: 'british', emotion: 'professional' },
        { gender: 'female', name: 'en-GB-Studio-C', category: 'Studio', package: 'Platin', description: 'İngiliz Studio Kadın', accent: 'british', emotion: 'professional' },
        
        // Journey voices (Chirp 3D - Gold) - Advanced 3D audio technology
        { gender: 'female', name: 'en-US-Journey-D', category: 'Chirp 3D', package: 'Gold', description: 'Journey Kadın D', accent: 'american', emotion: 'natural' },
        { gender: 'male', name: 'en-US-Journey-O', category: 'Chirp 3D', package: 'Gold', description: 'Journey Erkek O', accent: 'american', emotion: 'natural' },
        { gender: 'female', name: 'en-GB-Journey-F', category: 'Chirp 3D', package: 'Gold', description: 'İngiliz Journey Kadın', accent: 'british', emotion: 'natural' },
        { gender: 'male', name: 'en-GB-Journey-M', category: 'Chirp 3D', package: 'Gold', description: 'İngiliz Journey Erkek', accent: 'british', emotion: 'natural' },
        
        // News voices (Premium) with news-specific characteristics
        { gender: 'female', name: 'en-US-News-K', category: 'News', package: 'Premium', description: 'Haber Kadın Sesi', accent: 'american', emotion: 'professional' },
        { gender: 'female', name: 'en-US-News-L', category: 'News', package: 'Premium', description: 'Haber Kadın Sesi 2', accent: 'american', emotion: 'serious' },
        { gender: 'male', name: 'en-US-News-N', category: 'News', package: 'Premium', description: 'Haber Erkek Sesi', accent: 'american', emotion: 'professional' },
        
        // Polyglot voices (Premium) with international characteristics
        { gender: 'male', name: 'en-US-Polyglot-1', category: 'Polyglot', package: 'Premium', description: 'Çok Dilli Erkek', accent: 'international', emotion: 'neutral' },
        
        // British accent voices (REAL Google TTS voices)
        { gender: 'female', name: 'en-GB-Wavenet-A', category: 'WaveNet', package: 'Premium', description: 'İngiliz Aksanlı Kadın', accent: 'british', emotion: 'professional' },
        { gender: 'male', name: 'en-GB-Wavenet-B', category: 'WaveNet', package: 'Premium', description: 'İngiliz Aksanlı Erkek', accent: 'british', emotion: 'professional' },
        { gender: 'female', name: 'en-GB-Wavenet-C', category: 'WaveNet', package: 'Premium', description: 'İngiliz Aksanlı Kadın 2', accent: 'british', emotion: 'friendly' },
        { gender: 'male', name: 'en-GB-Wavenet-D', category: 'WaveNet', package: 'Premium', description: 'İngiliz Aksanlı Erkek 2', accent: 'british', emotion: 'calm' },
        
        // Australian accent voices (REAL Google TTS voices)
        { gender: 'female', name: 'en-AU-Wavenet-A', category: 'WaveNet', package: 'Premium', description: 'Avustralya Aksanlı Kadın', accent: 'australian', emotion: 'cheerful' },
        { gender: 'male', name: 'en-AU-Wavenet-B', category: 'WaveNet', package: 'Premium', description: 'Avustralya Aksanlı Erkek', accent: 'australian', emotion: 'friendly' },
        { gender: 'female', name: 'en-AU-Wavenet-C', category: 'WaveNet', package: 'Premium', description: 'Avustralya Aksanlı Kadın 2', accent: 'australian', emotion: 'neutral' },
        { gender: 'male', name: 'en-AU-Wavenet-D', category: 'WaveNet', package: 'Premium', description: 'Avustralya Aksanlı Erkek 2', accent: 'australian', emotion: 'calm' },
        
        // Canadian accent voices (REAL Google TTS voices)
        { gender: 'female', name: 'en-CA-Wavenet-A', category: 'WaveNet', package: 'Premium', description: 'Kanada Aksanlı Kadın', accent: 'canadian', emotion: 'friendly' },
        { gender: 'male', name: 'en-CA-Wavenet-B', category: 'WaveNet', package: 'Premium', description: 'Kanada Aksanlı Erkek', accent: 'canadian', emotion: 'calm' },
        { gender: 'female', name: 'en-CA-Wavenet-C', category: 'WaveNet', package: 'Premium', description: 'Kanada Aksanlı Kadın 2', accent: 'canadian', emotion: 'professional' },
        { gender: 'male', name: 'en-CA-Wavenet-D', category: 'WaveNet', package: 'Premium', description: 'Kanada Aksanlı Erkek 2', accent: 'canadian', emotion: 'neutral' },
        
        // Indian accent voices (REAL Google TTS voices)
        { gender: 'female', name: 'en-IN-Wavenet-A', category: 'WaveNet', package: 'Premium', description: 'Hint Aksanlı Kadın', accent: 'indian', emotion: 'professional' },
        { gender: 'male', name: 'en-IN-Wavenet-B', category: 'WaveNet', package: 'Premium', description: 'Hint Aksanlı Erkek', accent: 'indian', emotion: 'professional' },
        { gender: 'female', name: 'en-IN-Wavenet-C', category: 'WaveNet', package: 'Premium', description: 'Hint Aksanlı Kadın 2', accent: 'indian', emotion: 'friendly' },
        { gender: 'male', name: 'en-IN-Wavenet-D', category: 'WaveNet', package: 'Premium', description: 'Hint Aksanlı Erkek 2', accent: 'indian', emotion: 'calm' },
      ];
      
      // Sort voices by package priority then by name
      const packagePriority = { 'Basic': 1, 'Premium': 2, 'Gold': 3, 'Platin': 4 };
      googleVoices.sort((a, b) => {
        if (packagePriority[a.package] !== packagePriority[b.package]) {
          return packagePriority[a.package] - packagePriority[b.package];
        }
        return a.name.localeCompare(b.name);
      });
      
      return res.json({ provider: 'google', voices: googleVoices });
    } else {
      logger.error(`Unsupported TTS provider: ${ttsProvider}`);
      return res.status(500).json({ success: false, message: `Unsupported TTS provider: ${ttsProvider}` });
    }
  };
  
  // Filtrelenmiş ses listesi endpointi
  const getFilteredVoices = async (req, res) => {
    try {
      const { accent, emotion, gender } = req.query;
      
      // Önce tüm sesleri al
      const mockReq = {};
      const mockRes = {
        json: (data) => data
      };
      
      const allVoicesResponse = await listVoices(mockReq, mockRes);
      const allVoices = allVoicesResponse.voices;
      
      // Filtreleme uygula
      let filteredVoices = allVoices;
      
      if (accent && accent !== 'all') {
        filteredVoices = filteredVoices.filter(voice => voice.accent === accent);
      }
      
      if (emotion && emotion !== 'all') {
        filteredVoices = filteredVoices.filter(voice => voice.emotion === emotion);
      }
      
      if (gender && gender !== 'all') {
        filteredVoices = filteredVoices.filter(voice => voice.gender === gender);
      }
      
      logger.info(`🎯 [VOICE FILTER] Applied filters - accent: ${accent}, emotion: ${emotion}, gender: ${gender}`);
      logger.info(`🎯 [VOICE FILTER] Filtered voices count: ${filteredVoices.length} / ${allVoices.length}`);
      
      return res.json({ 
        provider: 'google', 
        voices: filteredVoices,
        filters: { accent, emotion, gender },
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