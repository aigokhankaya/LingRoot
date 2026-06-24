// backend/routes/internalRoutes.js
// Internal service-to-service endpoints (Bearer API-key protected).
// Mounted at /internal in server.js.

const express = require('express');
const { internalApiAuth } = require('../middleware/internalApiAuth');
const { handleVideoLevelPackage } = require('../controllers/videoLevelPackageController');

const router = express.Router();

// POST /internal/video-level-package — Video Factory level package (script + audio + subtitles)
router.post(
  '/video-level-package',
  internalApiAuth('VIDEO_FACTORY_API_KEY'),
  handleVideoLevelPackage,
);

module.exports = router;
