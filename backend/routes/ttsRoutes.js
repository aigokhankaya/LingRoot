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
const logger = require("../utils/logger");
const { authenticate } = require('../middleware/auth');

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

// POST /api/tts/process – Handles both JSON and multipart/form-data
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

// Amazon Polly TTS endpoint
router.post("/polly", (req, res) => {
  // Implement your Amazon Polly TTS functionality here
  res.status(500).json({ error: "Not implemented yet" });
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

module.exports = router;
