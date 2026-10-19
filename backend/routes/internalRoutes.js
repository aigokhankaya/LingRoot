// backend/routes/internalRoutes.js
// Internal service-to-service endpoints (Bearer API-key protected).
// Mounted at /internal in server.js.

const express = require('express');
const { internalApiAuth } = require('../middleware/internalApiAuth');
const { handleVideoLevelPackage } = require('../controllers/videoLevelPackageController');
const { handleVideoTopicBrief } = require('../controllers/videoTopicBriefController');
const internalMediaJobController = require('../controllers/internalMediaJobController');
const internalMediaQualityController = require('../controllers/internalMediaQualityController');

const router = express.Router();
const videoFactoryAuth = internalApiAuth([
  'LINGROOT_INTERNAL_API_KEY',
  'VIDEO_FACTORY_API_KEY',
]);

// POST /internal/video-topic-brief - shared topic and visual outline
router.post('/video-topic-brief', videoFactoryAuth, handleVideoTopicBrief);
router.post('/media-jobs/claim', videoFactoryAuth, internalMediaJobController.claimJob);
router.post('/media-jobs/:id/heartbeat', videoFactoryAuth, internalMediaJobController.heartbeatJob);
router.post('/media-jobs/:id/progress', videoFactoryAuth, internalMediaJobController.progressJob);
router.post('/media-jobs/:id/complete', videoFactoryAuth, internalMediaJobController.completeJob);
router.post('/media-jobs/:id/fail', videoFactoryAuth, internalMediaJobController.failJob);
router.post('/media-quality/claim', videoFactoryAuth, internalMediaQualityController.claimQualityRun);
router.post('/media-quality/:id/heartbeat', videoFactoryAuth, internalMediaQualityController.heartbeatQualityRun);
router.post('/media-quality/:id/progress', videoFactoryAuth, internalMediaQualityController.progressQualityRun);
router.post('/media-quality/:id/complete', videoFactoryAuth, internalMediaQualityController.completeQualityRun);
router.post('/media-quality/:id/fail', videoFactoryAuth, internalMediaQualityController.failQualityRun);

// POST /internal/video-level-package — Video Factory level package (script + audio + subtitles)
router.post(
  '/video-level-package',
  videoFactoryAuth,
  handleVideoLevelPackage,
);

module.exports = router;
