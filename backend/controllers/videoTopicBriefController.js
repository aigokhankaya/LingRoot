const logger = require('../utils/common/logger.js');
const {
  generateVideoTopicBrief,
  VideoTopicBriefError,
} = require('../services/videoTopicBriefService.js');

function validateRequest(body) {
  if (!body || typeof body !== 'object') return 'Request body is required.';
  if (body.schema_version !== 1) return 'Unsupported schema_version (expected 1).';
  if (typeof body.topic !== 'string' || !body.topic.trim()) return 'topic is required.';
  if (body.topic_id != null && (typeof body.topic_id !== 'string' || !body.topic_id.trim())) {
    return 'topic_id must be a non-empty string.';
  }
  if (!Number.isInteger(body.scene_count) || body.scene_count < 1 || body.scene_count > 12) {
    return 'scene_count must be an integer between 1 and 12.';
  }
  if (typeof body.language !== 'string' || body.language.trim().length < 2) {
    return 'language is required.';
  }
  return null;
}

async function handleVideoTopicBrief(req, res) {
  const validationError = validateRequest(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const brief = await generateVideoTopicBrief({
      topic: req.body.topic.trim(),
      topicId: req.body.topic_id?.trim(),
      language: req.body.language.trim(),
      sceneCount: req.body.scene_count,
    });
    return res.status(200).json(brief);
  } catch (error) {
    if (error instanceof VideoTopicBriefError) {
      logger.error(`[VideoTopicBrief] ${error.statusCode} ${error.message}`);
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error(`[VideoTopicBrief] Unexpected error: ${error.message}`);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { handleVideoTopicBrief, validateRequest };
