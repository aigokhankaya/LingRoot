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
        logger.info(`[${requestId}] Parameter validation: inputType=${inputType}, inputData=${inputData}, level=${level}, file=${file?.originalname}`);
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
        const selectedVoice = req.body.voice || 'en-US-Wavenet-D';
        const languageCode = 'en-US';
        const adaptedText = finalChunks.join('\n\n');
        logRequestStep(requestId, 'tts:start', { chunkCount: finalChunks.length, voice: selectedVoice, speakingRate });
        // --- TTS provider seçimi ---
        const ttsProvider = await getTtsProvider();
        let audioBase64;
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
                    } else {
                        logger.error(`🔴 Failed to synthesize chunk [${i + 1}.${j + 1}]`);
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

        // --- Step 5.5: Generate VTT from timepoints ---
        let vttUrl = "";
        if (audioBase64) {
            // Supabase'e yükle
            const vttFilename = `lingroot_${level}_${uuidv4()}.vtt`;
            vttUrl = await uploadToSupabase(audioBase64, vttFilename);
        }

        // --- Step 6: Save Audio to Temp File
        logger.info(`[${requestId}] Step 6: Saving audio to temp file...`);
        const uniqueId = uuidv4();
        const outputFilename = `lingroot_${level}_${uniqueId}.mp3`;
        tempFilePath = path.join(os.tmpdir(), outputFilename);
        fs.writeFileSync(tempFilePath, Buffer.from(audioBase64, 'base64'));
        logger.info(`[${requestId}] Audio saved to temp file: ${tempFilePath}`);

        // Store the audio file for access via API
        tempAudioFiles.set(uniqueId, {
            path: tempFilePath,
            buffer: Buffer.from(audioBase64, 'base64'),
            createdAt: new Date()
        });

        // Only clean up temp file after successful upload to Supabase
        // Do NOT clean up here - we keep it for the API endpoint
        // cleanupTempFile(tempFilePath);

        // --- Step 8: Return Success Response (Updated Format) ---
        logger.info(`[${requestId}] Processing complete. Returning success response.`);
        
        // Supabase'e yükle
        let mp3Url = "";
        if (audioBase64) {
            const mp3Filename = `lingroot_${level}_${uniqueId}.mp3`;
            mp3Url = await uploadToSupabase(audioBase64, mp3Filename);
            logger.info(`[${requestId}] Audio uploaded to Supabase: ${mp3Url}`);
        }

        // Create API endpoint URL for accessing the audio
        const apiAudioUrl = `/api/tts/audio/${uniqueId}`;
        
        logStep({
            requestId,
            stepName: 'tts:success',
            stepSequence: stepSequence++,
            status: 'success',
            outputData: { mp3_url: apiAudioUrl, vtt_url: vttUrl }
        });
        return res.status(200).json({
            success: true,
            message: adaptedText,
            level: level,
            input_language: detectedLang,
            mp3_url: apiAudioUrl, // Use API endpoint URL instead of temp file path
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
const getAudioFile = (req, res) => {
    const audioId = req.params.id;
    const audioData = tempAudioFiles.get(audioId);
    
    if (!audioData) {
        return res.status(404).json({ success: false, message: "Audio file not found" });
    }
    
    // Set proper CORS and cache headers
    res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `inline; filename="audio_${audioId}.mp3"`,
        'Content-Length': audioData.buffer.length,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges'
    });
    
    // Handle range requests for better audio streaming
    const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : audioData.buffer.length - 1;
        const chunksize = (end - start) + 1;
        
        const headers = {
            'Content-Range': `bytes ${start}-${end}/${audioData.buffer.length}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'audio/mpeg',
            'Access-Control-Allow-Origin': '*'
        };
        
        res.writeHead(206, headers);
        const bufferSlice = audioData.buffer.slice(start, end + 1);
        return res.end(bufferSlice);
    }
    
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
  
  // Ses listesi endpointi (dinamik)
  const listVoices = async (req, res) => {
    const ttsProvider = await getTtsProvider();
    if (ttsProvider === 'google') {
      // Return all available Google voices
      const googleVoices = [
        { gender: 'female', name: 'en-US-Wavenet-F' },
        { gender: 'male', name: 'en-US-Wavenet-D' },
        { gender: 'female', name: 'en-US-Studio-M' },
        { gender: 'male', name: 'en-US-Studio-B' },
        { gender: 'female', name: 'en-US-Studio-O' },
        { gender: 'male', name: 'en-US-Studio-J' },
      ];
      return res.json({ provider: 'google', voices: googleVoices });
    } else {
      logger.error(`Unsupported TTS provider: ${ttsProvider}`);
      return res.status(500).json({ success: false, message: `Unsupported TTS provider: ${ttsProvider}` });
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
  };