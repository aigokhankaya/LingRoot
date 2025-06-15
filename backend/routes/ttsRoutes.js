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
  getFilteredVoices
} = require("../controllers/ttsController");
const logger = require("../utils/logger");

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

// Mock audio file for development and fallback
router.get("/mock-audio.mp3", (req, res) => {
  // Serve a simple audio file or redirect to a public audio URL
  // Using a text-to-speech sample that sounds more realistic
  const mockAudioUrl = "https://file-examples.com/storage/fe68c1b7b1b2e0c2b5b7e8b/2017/11/file_example_MP3_700KB.mp3";
  res.redirect(mockAudioUrl);
});

// Mock VTT file for development
router.get("/mock-subtitles.vtt", (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: "Not found" });
  }
  
  res.setHeader('Content-Type', 'text/vtt');
  res.send(`WEBVTT

00:00.000 --> 00:02.000
This is a sample subtitle

00:02.000 --> 00:04.000
for development purposes

00:04.000 --> 00:06.000
showing synchronized text`);
});

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

module.exports = router;
