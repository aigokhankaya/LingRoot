// backend/controllers/ttsController.js
const path = require("path");
const os = require("os");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger"); // Import Winston logger
const { extractTextFromInput, generateTopicText, generateEnglishNarrationForTopic, translateToEnglishWithOpenAI } = require("../utils/inputExtractor");
const { cleanText, chunkText, chunkTextByCharLimit } = require("../utils/textProcessor");
const { adaptToCEFR: adaptToCEFRFunc } = require("../utils/cefrAdapter");
const { synthesizeWithGoogle, synthesizeLongTextWithGoogle } = require('../utils/googleTTS');
const { uploadBase64ToSupabase } = require('../utils/supabaseUpload');
const { mergeAudioSegments } = require("../utils/audioMerger");
const { uploadToSupabase } = require("../utils/storageUploader");
const tmp = require("tmp");
const { logStep } = require('../utils/stepLogger');
const { logRequestStep } = require("../utils/requestLogger");
const { createClient } = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

// Yardımcı: tts_provider'ı settings tablosundan oku (default: amazon)
async function getTtsProvider() {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'tts_provider')
    .single();
  if (error || !data) return 'amazon';
  return data.value;
}

/**
 * TTS ana kontrolcü
 * POST /api/tts/process
 */
async function handleTTSRequest(req, res) {
    try {
        const { input, type = 'text', level = 'B1', rate = 1, voice = null, file, chapter } = req.body;

        // input ve type zorunlu
        if (!input || typeof input !== 'string' || !type) {
            return res.status(400).json({ error: 'Input and type are required.' });
        }

        // Gerekli metni çıkar (metin, dosya, link, vs.)
        const text = await extractTextFromInput(input, type, file, chapter, level);

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text extraction failed.' });
        }

        const provider = process.env.TTS_PROVIDER?.toLowerCase?.() || 'google';
        const voiceName = voice || (provider === 'google' ? 'en-US-Wavenet-D' : 'Joanna');
        const languageCode = 'en-US';

        logger.info(`🔊 TTS Request: provider=${provider}, voice=${voiceName}, length=${text.length} chars`);

        let base64Audio;

        if (provider === 'google') {
            const maxBytes = 4500;
            base64Audio = await synthesizeLongTextWithGoogle({
                text,
                voiceName,
                languageCode,
                maxBytes,
            });
        } else {
            return res.status(400).json({ error: 'Unsupported TTS provider.' });
        }

        if (!base64Audio) {
            return res.status(500).json({ error: 'TTS synthesis failed.' });
        }

        const fileUrl = await uploadBase64ToSupabase({
            base64Audio,
            extension: 'mp3',
            level,
        });

        return res.json({
            success: true,
            url: fileUrl,
            provider,
        });
    } catch (error) {
        logger.error('TTS request handler failed:', { message: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

// --- TTS Step Endpoints ---
const translateToEnglish = async (req, res) => {
  const { text } = req.body;
  const requestId = uuidv4();
  try {
    logStep({ requestId, stepName: 'tts:translateToEnglish', inputData: { text } });
    const result = await translateToEnglishWithOpenAI(text);
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
    const result = await synthesizeWithGoogle({ text: text, voiceId: voice || "en-US-Wavenet-D", languageCode: "en-US" });
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
    // Sadece belirli Google seslerini döndür
    const googleVoices = [
      { level: 'A1-B1', gender: 'female', name: 'en-US-Wavenet-F' },
      { level: 'A1-B1', gender: 'male', name: 'en-US-Wavenet-D' },
      { level: 'B2-C1', gender: 'female', name: 'en-US-Studio-M' },
      { level: 'B2-C1', gender: 'male', name: 'en-US-Studio-B' },
      { level: 'C2', gender: 'female', name: 'en-US-Studio-O' },
      { level: 'C2', gender: 'male', name: 'en-US-Studio-J' },
    ];
    return res.json({ provider: 'google', voices: googleVoices });
  } else {
    const voices = await listGoogleVoices();
    return res.json({ provider: 'google', voices });
  }
};

module.exports = {
    handleTTSRequest,
    translateToEnglish,
    adaptToCEFR,
    chunkTextAPI,
    synthesizeChunkAPI,
    mergeAudioAPI,
    listVoices,
};

