const express = require("express");
const multer = require("multer");
const { authenticate } = require("../middleware/auth");
const documentController = require("../controllers/documentController");
const logger = require("../utils/logger");

const router = express.Router();

// Multer configuration: in-memory storage, PDF only
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      logger.info(`Multer: Allowing PDF upload - ${file.originalname} (${file.mimetype})`);
      cb(null, true);
    } else {
      logger.warn(`Multer: Rejecting file upload - ${file.originalname} (${file.mimetype})`);
      cb(new Error(`Invalid file type. Only PDF files are allowed. Received: ${file.mimetype}`), false);
    }
  },
});

// POST /api/documents/upload - upload PDF, ask for title, extract text and create document + sections
router.post(
  "/upload",
  authenticate,
  upload.single("file"),
  (req, res, next) => {
    if (req.fileValidationError) {
      logger.error(`File validation error: ${req.fileValidationError.message}`);
      return res.status(400).json({ success: false, message: req.fileValidationError.message });
    }
    documentController.uploadDocument(req, res, next);
  },
  (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      logger.error(`Multer error in /api/documents/upload: ${error.message}`, { code: error.code });
      return res.status(400).json({ success: false, message: `File upload error: ${error.message}` });
    } else if (error) {
      logger.error(`File filter error in /api/documents/upload: ${error.message}`);
      return res.status(400).json({ success: false, message: error.message });
    }
    next();
  }
);

// GET /api/documents - list documents for authenticated user
router.get("/", authenticate, documentController.listDocuments);

// GET /api/documents/:documentId - get single document
router.get("/:documentId", authenticate, documentController.getDocumentById);

// GET /api/documents/:documentId/sections - get all sections for a document
router.get("/:documentId/sections", authenticate, documentController.getDocumentSections);

// GET /api/documents/:documentId/sections/:sectionId - get single section
router.get(
  "/:documentId/sections/:sectionId",
  authenticate,
  documentController.getDocumentSectionById
);

module.exports = router;
