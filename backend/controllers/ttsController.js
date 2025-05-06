// backend/controllers/ttsController.js
const path = require("path");
const os = require("os");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger"); // Import Winston logger
const { extractTextFromInput, generateTopicText, generateEnglishNarrationForTopic, translateToEnglishWithOpenAI } = require("../utils/inputExtractor");
const { cleanText, chunkText } = require("../utils/textProcessor");
const { adaptToCEFR } = require("../utils/cefrAdapter");
const { synthesizeSpeechChunks, synthesizeChunkWithTimepoints } = require("../utils/googleTts");
const { mergeAudioSegments } = require("../utils/audioMerger");
const { uploadToSupabase } = require("../utils/storageUploader");
const tmp = require("tmp");

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

/**
 * Handles the text-to-speech processing request.
 * Orchestrates the workflow: extract -> clean -> translate? -> adapt -> chunk -> synthesize -> merge -> upload.
 * Includes improved logging and file cleanup.
 * @param {import("express").Request} req Express request object.
 * @param {import("express").Response} res Express response object.
 */
const processTtsRequest = async (req, res) => {
    const requestId = uuidv4(); // Unique ID for this request for logging
    logger.info(`[${requestId}] Received TTS request.`);
    let tempFilePath = null; // To track temporary file for cleanup
    let detectedLang = 'en'; // Default language

    try {
        // --- Input Parsing ---
        logger.info(`[${requestId}] Parsing input...`);
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
            logger.error(`[${requestId}] Missing required input parameters.`);
            return res.status(400).json({ success: false, message: "Missing required input parameters (type, input/file, level)" });
        }

        // --- Step 1: Extract Text ---
        logger.info(`[${requestId}] Step 1: Extracting text...`);
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
            if (["youtube", "spotify"].includes(inputType)) { // Removed 'file' as it's handled
                 logger.warn(`[${requestId}] Input type '${inputType}' processing is not implemented yet.`);
                 return res.status(501).json({ success: false, message: `Processing for input type '${inputType}' is not implemented yet.` });
            }
            return res.status(400).json({ success: false, message: "Could not extract text from the provided input." });
        }
        if (!rawText.trim()) {
            logger.warn(`[${requestId}] Extracted text is empty or whitespace only.`);
            return res.status(400).json({ success: false, message: "Extracted text is empty." });
        }
        logger.info(`[${requestId}] Text extracted successfully.`);

        // --- Step 2: Clean Text ---
        logger.info(`[${requestId}] Step 2: Cleaning text...`);
        const cleanedText = cleanText(rawText);
        logger.info(`[${requestId}] Text cleaned successfully.`);

        // --- Step 2.5: Detect Language and Translate if Necessary ---
        logger.info(`[${requestId}] Step 2.5: Detecting language and translating if needed...`);
        let textToAdapt = cleanedText;
        try {
            const translationResult = await translateToEnglishWithOpenAI(cleanedText);
            textToAdapt = translationResult.text;
            logger.info(`[${requestId}] Translation successful.`);
        } catch (translateError) {
            logger.error(`[${requestId}] Error during language detection/translation: ${translateError.message}. Proceeding with original cleaned text.`);
            textToAdapt = cleanedText;
            detectedLang = 'en';
        }

        // --- Step 3: Adapt to CEFR Level (OpenAI) ---
        logger.info(`[${requestId}] Step 3: Adapting text to CEFR level ${level}...`);
        const adaptedText = await adaptToCEFR(textToAdapt, level);
        if (adaptedText === null) {
            logger.error(`[${requestId}] Failed to adapt text using OpenAI.`);
            return res.status(500).json({ success: false, message: "Failed to adapt text to the specified CEFR level." });
        }
        logger.info(`[${requestId}] Text adapted successfully.`);

        // --- Step 4: Chunk Text for TTS ---
        logger.info(`[${requestId}] Step 4: Chunking text for TTS...`);
        const textChunks = chunkText(adaptedText);
        if (!textChunks || textChunks.length === 0) {
            logger.warn(`[${requestId}] Text resulted in zero chunks after processing.`);
            return res.status(400).json({ success: false, message: "Processed text resulted in no content for audio generation." });
        }
        logger.info(`[${requestId}] Text chunked into ${textChunks.length} parts.`);

        // --- Step 5: Synthesize Speech (Google TTS) ---
        logger.info(`[${requestId}] Step 5: Synthesizing speech using Google TTS...`);
        const ttsResult = await synthesizeChunkWithTimepoints(adaptedText, "en-US", "en-US-Wavenet-D", speakingRate);
        if (!ttsResult || !ttsResult.audioContent) {
            logger.error(`[${requestId}] Failed to synthesize speech with timepoints.`);
            return res.status(500).json({ success: false, message: "Failed to generate audio with timepoints." });
        }
        logger.info(`[${requestId}] Speech synthesized successfully with timepoints.`);

        // --- Step 5.5: Generate VTT from timepoints ---
        let vttUrl = "";
        if (ttsResult.timepoints && ttsResult.timepoints.length > 0) {
            // WebVTT dosyası oluştur
            let vttContent = "WEBVTT\n\n";
            for (let i = 0; i < ttsResult.timepoints.length; i++) {
                const tp = ttsResult.timepoints[i];
                const nextTp = ttsResult.timepoints[i + 1];
                // Başlangıç ve bitiş zamanlarını hesapla
                const start = tp.timeSeconds;
                const end = nextTp ? nextTp.timeSeconds : (start + 1.0); // Son kelime için 1 sn ekle
                // Zaman formatı: HH:MM:SS.mmm
                const format = (s) => {
                    const h = String(Math.floor(s / 3600)).padStart(2, '0');
                    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
                    const sec = String(Math.floor(s % 60)).padStart(2, '0');
                    const ms = String(Math.floor((s % 1) * 1000)).padStart(3, '0');
                    return `${h}:${m}:${sec}.${ms}`;
                };
                vttContent += `${i + 1}\n${format(start)} --> ${format(end)}\n${ttsResult.words[i]}\n\n`;
            }
            // Geçici dosyaya yaz
            const vttFile = tmp.fileSync({ postfix: '.vtt' });
            fs.writeFileSync(vttFile.name, vttContent);
            // Supabase'e yükle
            const vttFilename = `lingroot_${level}_${uuidv4()}.vtt`;
            vttUrl = await uploadToSupabase(vttFile.name, vttFilename);
            vttFile.removeCallback();
        }

        // --- Step 6: Save Audio to Temp File ---
        logger.info(`[${requestId}] Step 6: Saving audio to temp file...`);
        const uniqueId = uuidv4();
        const outputFilename = `lingroot_${level}_${uniqueId}.mp3`;
        tempFilePath = path.join(os.tmpdir(), outputFilename); // Assign path for cleanup
        fs.writeFileSync(tempFilePath, ttsResult.audioContent);
        logger.info(`[${requestId}] Audio saved to temp file: ${tempFilePath}`);

        // --- Step 7: Upload to Storage (Supabase) ---
        logger.info(`[${requestId}] Step 7: Uploading merged audio to Supabase...`);
        const supabaseUrl = await uploadToSupabase(tempFilePath, outputFilename);
        // Cleanup handled in finally block

        if (!supabaseUrl) {
            logger.error(`[${requestId}] Failed to upload audio to Supabase.`);
            return res.status(500).json({ success: false, message: "Failed to save generated audio to storage." });
        }
        logger.info(`[${requestId}] Audio uploaded successfully to: ${supabaseUrl}`);

        // --- Step 8: Return Success Response (Updated Format) ---
        logger.info(`[${requestId}] Processing complete. Returning success response.`);
        return res.status(200).json({
            success: true,
            message: adaptedText,
            level: level,
            input_language: detectedLang,
            mp3_url: supabaseUrl,
            words: ttsResult.words || [],
            timepoints: ttsResult.timepoints || [],
            vtt_url: vttUrl,
            original_turkish: originalTurkishText || undefined,
        });

    } catch (error) {
        logger.error(`[${requestId}] An unexpected error occurred in TTS controller: ${error.message}`, { stack: error.stack });
        // Cleanup handled in finally block
        return res.status(500).json({ success: false, message: "An internal server error occurred." });
    } finally {
        // --- Final Step: Ensure Temporary File Cleanup ---
        logger.info(`[${requestId}] Performing final cleanup.`);
        cleanupTempFile(tempFilePath);
    }
};

module.exports = {
    processTtsRequest,
};

