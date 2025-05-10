// backend/routes/ttsRoutes.js

const express = require("express");
const multer = require("multer");
const {
  processTtsRequest,
  translateToEnglish,
  adaptToCEFR,
  chunkTextAPI,
  synthesizeChunkAPI,
  mergeAudioAPI
} = require("../controllers/ttsController");
const logger = require("../utils/logger");
const { synthesizeWithPolly, listPollyVoices } = require('../utils/amazonPolly');

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
  upload.single("file"),
  (req, res, next) => {
    if (req.fileValidationError) {
      logger.error(`File validation error: ${req.fileValidationError.message}`);
      return res.status(400).json({ success: false, message: req.fileValidationError.message });
    }
    processTtsRequest(req, res, next);
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

// Other TTS Utility Endpoints
router.post("/translateToEnglish", translateToEnglish);
router.post("/adaptToCEFR", adaptToCEFR);
router.post("/chunkText", chunkTextAPI);
router.post("/synthesizeChunk", synthesizeChunkAPI);
router.post("/mergeAudio", mergeAudioAPI);

// Amazon Polly TTS endpoint
router.post('/polly', async (req, res) => {
    const { text, voiceId, languageCode } = req.body;
    if (!text || !voiceId || !languageCode) {
        return res.status(400).json({ error: 'Missing required parameters: text, voiceId, languageCode' });
    }
    try {
        const audioBase64 = await synthesizeWithPolly({ text, voiceId, languageCode });
        if (!audioBase64) {
            return res.status(500).json({ error: 'Amazon Polly failed to synthesize speech.' });
        }
        res.json({ audioBase64 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Amazon Polly voices list endpoint
router.get('/polly-voices', async (req, res) => {
    try {
        const voices = await listPollyVoices();
        res.json({ voices });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
