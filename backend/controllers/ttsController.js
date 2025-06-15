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
const { mergeAudioSegments } = require("../utils/audioMerger");
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
            logger.info(`[${requestId}] Mock TTS mode enabled - returning mock TTS response`);
            
            // Mock English text based on input type
            let mockEnglishText = "This is a sample English text for testing purposes...";
            
            // For mock mode, just return the external mock audio URL directly
            const mockMp3Url = "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3";
            const mockVttUrl = "/api/mock-subtitles.vtt";
            
            return res.status(200).json({
                success: true,
                message: mockEnglishText,
                mp3_url: mockMp3Url,
                vtt_url: mockVttUrl,
                level: level,
                timepoints: timepoints,
                words: words,
                original_turkish: req.body.input || "Bu test modunda örnek bir Türkçe metindir."
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
            // Neural2 voices (Premium)
            'en-US-Neural2-A', 'en-US-Neural2-C', 'en-US-Neural2-D', 'en-US-Neural2-E', 'en-US-Neural2-F',
            'en-US-Neural2-G', 'en-US-Neural2-H', 'en-US-Neural2-I', 'en-US-Neural2-J',
            // Chirp HD voices (Gold)
            'en-US-Chirp-HD-D', 'en-US-Chirp-HD-F', 'en-US-Chirp-HD-O',
            // Chirp 3 HD voices (Gold)  
            'en-US-Chirp3-HD-Achernar', 'en-US-Chirp3-HD-Achird', 'en-US-Chirp3-HD-Aoede', 
            'en-US-Chirp3-HD-Despina', 'en-US-Chirp3-HD-Charon',
            // Studio voices (Platin)
            'en-US-Studio-O', 'en-US-Studio-Q',
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
        const languageCode = 'en-US';
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
                    const buffer = await synthesizeWithGoogle({
                        text: part,
                        voiceName: selectedVoice,
                        languageCode: languageCode,
                        speakingRate: speakingRate
                    });
                    if (buffer) {
                        audioBuffers.push(buffer);
                    }
                }
            }
            audioBase64 = Buffer.concat(audioBuffers).toString('base64');
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

        // --- Step 6: Save Audio to Temp File and Upload to Supabase
        logger.info(`[${requestId}] Step 6: Saving audio to temp file and uploading to Supabase...`);
        const uniqueId = uuidv4();
        const outputFilename = `lingroot_${level}_${uniqueId}.mp3`;
        tempFilePath = path.join(os.tmpdir(), outputFilename);
        fs.writeFileSync(tempFilePath, Buffer.from(audioBase64, 'base64'));
        logger.info(`[${requestId}] Audio saved to temp file: ${tempFilePath}`);

        // Upload to Supabase Storage
        let mp3Url = "";
        try {
            const mp3Filename = `lingroot_${level}_${uniqueId}.mp3`;
            mp3Url = await uploadToSupabase(tempFilePath, mp3Filename);
            logger.info(`[${requestId}] Audio uploaded to Supabase: ${mp3Url}`);
        } catch (uploadError) {
            logger.error(`[${requestId}] Failed to upload audio to Supabase: ${uploadError.message}`);
            // Continue without Supabase upload - will use temp file
        }

        // Store the audio file for access via API (for immediate access)
        logger.info(`[${requestId}] 🔄 Adding audio to tempAudioFiles with ID: ${uniqueId}`);
        logger.info(`[${requestId}] 🔄 audioBase64 length: ${audioBase64 ? audioBase64.length : 'null'}`);
        logger.info(`[${requestId}] 🔄 tempAudioFiles size before: ${tempAudioFiles.size}`);
        
        tempAudioFiles.set(uniqueId, {
            path: tempFilePath,
            buffer: Buffer.from(audioBase64, 'base64'),
            createdAt: new Date(),
            supabaseUrl: mp3Url // Store Supabase URL for reference
        });
        
        logger.info(`[${requestId}] 🔄 tempAudioFiles size after: ${tempAudioFiles.size}`);
        logger.info(`[${requestId}] 🔄 tempAudioFiles keys: ${Array.from(tempAudioFiles.keys()).join(', ')}`);

        // --- Step 7: Return Success Response (Updated Format) ---
        logger.info(`[${requestId}] Processing complete. Returning success response.`);
        
        // Generate VTT URL (placeholder for now)
        const vttUrl = `/api/mock-subtitles.vtt`;

        // Use Supabase URL if available, otherwise use API endpoint URL
        const finalMp3Url = mp3Url || `/api/tts/audio/${uniqueId}`;
        
        logStep({
            requestId,
            stepName: 'tts:success',
            stepSequence: stepSequence++,
            status: 'success',
            outputData: { mp3_url: finalMp3Url, vtt_url: vttUrl, supabase_url: mp3Url }
        });
        return res.status(200).json({
            success: true,
            message: adaptedText,
            level: level,
            input_language: detectedLang,
            mp3_url: finalMp3Url, // Use Supabase URL if available, otherwise API endpoint
            words: [],
            timepoints: [],
            vtt_url: vttUrl,
            original_turkish: originalTurkishText || undefined,
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

// Cleanup old audio files every hour
setInterval(() => {
    const now = new Date();
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
      const result = await synthesizeWithGoogle({
          text: text,
          voiceName: voice || "Joanna",
          languageCode: "en-US",
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
        // Standard voices (Basic) - CORRECTED GENDERS
        { gender: 'male', name: 'en-US-Standard-A', category: 'Standard', package: 'Basic', description: 'Standard Erkek', accent: 'american', emotion: 'neutral' },
        { gender: 'male', name: 'en-US-Standard-B', category: 'Standard', package: 'Basic', description: 'Standard Erkek 2', accent: 'american', emotion: 'neutral' },
        { gender: 'female', name: 'en-US-Standard-C', category: 'Standard', package: 'Basic', description: 'Standard Kadın', accent: 'american', emotion: 'neutral' },
        { gender: 'male', name: 'en-US-Standard-D', category: 'Standard', package: 'Basic', description: 'Standard Erkek 3', accent: 'american', emotion: 'neutral' },
        { gender: 'female', name: 'en-US-Standard-E', category: 'Standard', package: 'Basic', description: 'Standard Kadın 2', accent: 'american', emotion: 'neutral' },
        { gender: 'female', name: 'en-US-Standard-F', category: 'Standard', package: 'Basic', description: 'Standard Kadın 3', accent: 'american', emotion: 'neutral' },
        { gender: 'female', name: 'en-US-Standard-G', category: 'Standard', package: 'Basic', description: 'Standard Kadın 4', accent: 'american', emotion: 'neutral' },
        { gender: 'female', name: 'en-US-Standard-H', category: 'Standard', package: 'Basic', description: 'Standard Kadın 5', accent: 'american', emotion: 'neutral' },
        { gender: 'male', name: 'en-US-Standard-I', category: 'Standard', package: 'Basic', description: 'Standard Erkek 4', accent: 'american', emotion: 'neutral' },
        { gender: 'male', name: 'en-US-Standard-J', category: 'Standard', package: 'Basic', description: 'Standard Erkek 5', accent: 'american', emotion: 'neutral' },
        
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
        
        // Neural2 voices (Premium) with varied characteristics
        { gender: 'male', name: 'en-US-Neural2-A', category: 'Neural2', package: 'Premium', description: 'Neural2 Erkek', accent: 'american', emotion: 'neutral' },
        { gender: 'female', name: 'en-US-Neural2-C', category: 'Neural2', package: 'Premium', description: 'Neural2 Kadın', accent: 'american', emotion: 'friendly' },
        { gender: 'male', name: 'en-US-Neural2-D', category: 'Neural2', package: 'Premium', description: 'Neural2 Erkek 2', accent: 'american', emotion: 'professional' },
        { gender: 'female', name: 'en-US-Neural2-E', category: 'Neural2', package: 'Premium', description: 'Neural2 Kadın 2', accent: 'american', emotion: 'cheerful' },
        { gender: 'female', name: 'en-US-Neural2-F', category: 'Neural2', package: 'Premium', description: 'Neural2 Kadın 3', accent: 'american', emotion: 'calm' },
        { gender: 'female', name: 'en-US-Neural2-G', category: 'Neural2', package: 'Premium', description: 'Neural2 Kadın 4', accent: 'american', emotion: 'excited' },
        { gender: 'female', name: 'en-US-Neural2-H', category: 'Neural2', package: 'Premium', description: 'Neural2 Kadın 5', accent: 'american', emotion: 'serious' },
        { gender: 'male', name: 'en-US-Neural2-I', category: 'Neural2', package: 'Premium', description: 'Neural2 Erkek 3', accent: 'american', emotion: 'calm' },
        { gender: 'male', name: 'en-US-Neural2-J', category: 'Neural2', package: 'Premium', description: 'Neural2 Erkek 4', accent: 'american', emotion: 'friendly' },
        
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
        
        // Studio voices (Platin) - CORRECTED BASED ON REAL GOOGLE TTS with premium characteristics
        { gender: 'female', name: 'en-US-Studio-O', category: 'Studio', package: 'Platin', description: 'Studio Kadın', accent: 'american', emotion: 'professional' },
        { gender: 'male', name: 'en-US-Studio-Q', category: 'Studio', package: 'Platin', description: 'Studio Erkek', accent: 'american', emotion: 'professional' },
        
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
      getFilteredVoices,
  };