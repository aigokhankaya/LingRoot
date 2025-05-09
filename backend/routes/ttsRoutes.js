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

const router = express.Router();

// Define allowed MIME types for file uploads
const allowedMimeTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // DOCX
    // Add "application/msword" for .doc if needed, but parsing might be harder
];

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Use memory storage for easier access in controller
const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // Increased limit to 15MB for larger docs
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            logger.info(`Multer: Allowing file upload - ${file.originalname} (${file.mimetype})`);
            cb(null, true); // Accept file
        } else {
            logger.warn(`Multer: Rejecting file upload due to invalid MIME type - ${file.originalname} (${file.mimetype})`);
            // Reject file with a specific error message
            cb(new Error(`Invalid file type. Only PDF and DOCX files are allowed. Received: ${file.mimetype}`), false);
        }
    }
});

// Define the POST route for TTS processing
// It can handle both JSON and multipart/form-data
// upload.single("file") middleware handles potential file uploads and applies the filter
router.post("/process", upload.single("file"), (req, res, next) => {
    // This middleware catches multer errors specifically
    if (req.fileValidationError) {
        logger.error(`File validation error during upload: ${req.fileValidationError.message}`);
        return res.status(400).json({ success: false, message: req.fileValidationError.message });
    }
    // Proceed to the controller if no multer error
    processTtsRequest(req, res, next);
}, (error, req, res, next) => {
    // Generic error handler for other potential multer issues (e.g., file size limit)
    if (error instanceof multer.MulterError) {
        logger.error(`Multer error during upload: ${error.message}`, { code: error.code });
        return res.status(400).json({ success: false, message: `File upload error: ${error.message}` });
    } else if (error) {
        // Handle non-multer errors passed from fileFilter
        logger.error(`File filter error during upload: ${error.message}`);
        return res.status(400).json({ success: false, message: error.message });
    }
    // If no error, proceed
    next();
});

router.post("/translateToEnglish", translateToEnglish);
router.post("/adaptToCEFR", adaptToCEFR);
router.post("/chunkText", chunkTextAPI);
router.post("/synthesizeChunk", synthesizeChunkAPI);
router.post("/mergeAudio", mergeAudioAPI);

module.exports = router;

