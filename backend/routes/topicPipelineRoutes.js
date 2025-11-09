const express = require('express');
const router = express.Router();
const { processTopicToEnglishText, getTopicSuggestions } = require('../controllers/topicPipelineController');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * Complete pipeline: Topic → Leveled English Text
 * POST /api/topic-pipeline/generate
 * Body: { topic: string, level: string (A1-C2), selected_subtopic?: string }
 * Returns: { topic, level, suggestions, narration_tr, translation_en, adapted_text, usage }
 */
router.post('/generate', authenticate, processTopicToEnglishText);

/**
 * Step 1 only: Get topic suggestions
 * POST /api/topic-pipeline/suggestions
 * Body: { topic: string, level?: string }
 * Returns: { topic, level, suggestions }
 */
router.post('/suggestions', authenticate, getTopicSuggestions);

module.exports = router;
