const express = require('express');
const router = express.Router();
const { uploadPodcast } = require('../controllers/podcastController');
const { authenticate } = require('../middleware/authenticate');

/**
 * POST /api/podcast/upload
 * Upload podcast audio and subtitles to Supabase
 * 
 * Body:
 * {
 *   "audio_url": "https://...", // OR audio_buffer (base64)
 *   "audio_buffer": "base64string...", // Alternative to audio_url
 *   "subtitles": {
 *     "srt": "1\n00:00:00,000 --> 00:00:04,085\nSpeaker A: ...",
 *     "vtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:04.085\nSpeaker A: ..."
 *   },
 *   "metadata": {
 *     "topic": "Harput Kalesi",
 *     "level": "A1",
 *     "duration_seconds": "52.42",
 *     "file_name": "harput_kalesi_A1_20251026160530.mp3",
 *     "speaking_rate": 1.0
 *   },
 *   "user_id": "uuid-here" // Optional - to associate with user
 * }
 */
router.post('/upload', uploadPodcast);

// Alternative endpoint with authentication
router.post('/upload-authenticated', authenticate, uploadPodcast);

module.exports = router;
