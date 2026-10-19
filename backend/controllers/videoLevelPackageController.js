// backend/controllers/videoLevelPackageController.js
// Thin controller for POST /internal/video-level-package.
// Validates the request contract, delegates to the service, maps errors to status codes.

const logger = require('../utils/common/logger.js');
const { generateVideoLevelPackage, VideoPackageError } = require('../services/videoLevelPackageService.js');
const { CEFR_LEVELS } = require('../constants/cefrLevelRules.js');

const SCHEMA_VERSION = 1;

/**
 * Validate the incoming request against the frozen v1 contract.
 * @returns {string|null} error message, or null if valid.
 */
function validateRequest(body) {
  if (!body || typeof body !== 'object') return 'Request body is required.';
  if (body.schema_version !== SCHEMA_VERSION) return 'Unsupported schema_version (expected 1).';
  if (typeof body.topic_id !== 'string' || !body.topic_id.trim()) return 'topic_id is required.';
  if (typeof body.topic !== 'string' || !body.topic.trim()) return 'topic is required.';
  if (typeof body.core_message !== 'string' || !body.core_message.trim()) return 'core_message is required.';
  if (!CEFR_LEVELS.includes(body.target_level)) return 'target_level must be one of A1|A2|B1|B2|C1|C2.';
  const dur = Number(body.target_duration_seconds);
  if (!Number.isFinite(dur) || dur < 10 || dur > 600) return 'target_duration_seconds must be between 10 and 600.';
  if (typeof body.language !== 'string' || body.language.trim().length < 2) return 'language is required.';
  if (typeof body.voice_profile !== 'string' || !body.voice_profile.trim()) return 'voice_profile is required.';
  if (!['standard', 'high'].includes(body.audio_quality)) return 'audio_quality must be standard or high.';
  if (body.subtitle_format !== 'srt') return "subtitle_format must be 'srt'.";
  if (!['short_listening_video', 'long_form_listening_video'].includes(body.content_style)) {
    return 'content_style must be short_listening_video or long_form_listening_video.';
  }
  if (body.content_objective !== undefined
    && !['education', 'discovery', 'engagement', 'announcement'].includes(body.content_objective)) {
    return 'content_objective must be education, discovery, engagement or announcement.';
  }
  if (body.tone !== undefined
    && !['educational', 'warm', 'professional', 'energetic'].includes(body.tone)) {
    return 'tone must be educational, warm, professional or energetic.';
  }
  if (body.brand !== 'LingRoot') return "brand must be 'LingRoot'.";
  if (!Array.isArray(body.scene_ids) || body.scene_ids.length < 1) return 'scene_ids must be a non-empty array.';
  if (body.scene_ids.some((id) => typeof id !== 'string' || !id.trim())) return 'scene_ids must contain non-empty strings.';
  if (new Set(body.scene_ids).size !== body.scene_ids.length) return 'scene_ids must be unique.';
  if (!Array.isArray(body.scene_briefs) || body.scene_briefs.length !== body.scene_ids.length) {
    return 'scene_briefs must match scene_ids.';
  }
  if (body.scene_briefs.some((brief, index) => !brief || brief.scene_id !== body.scene_ids[index]
    || typeof brief.narrative_beat !== 'string' || !brief.narrative_beat.trim())) {
    return 'scene_briefs must contain matching scene_id and narrative_beat values.';
  }
  return null;
}

async function handleVideoLevelPackage(req, res) {
  const validationError = validateRequest(req.body);
  if (validationError) {
    logger.warn(`[VideoPackage] Bad request: ${validationError}`);
    return res.status(400).json({ error: validationError });
  }

  const body = req.body;
  try {
    const packageResult = await generateVideoLevelPackage({
      topicId: body.topic_id,
      topic: body.topic,
      coreMessage: body.core_message,
      targetLevel: body.target_level,
      targetDurationSeconds: Number(body.target_duration_seconds),
      language: body.language,
      voiceProfile: body.voice_profile,
      audioQuality: body.audio_quality,
      sceneIds: body.scene_ids,
      sceneBriefs: body.scene_briefs,
      contentStyle: body.content_style,
      contentObjective: body.content_objective || 'education',
      tone: body.tone || 'educational',
    });

    // Return the bare contract object (additionalProperties:false on the VF side).
    return res.status(200).json(packageResult);
  } catch (err) {
    if (err instanceof VideoPackageError) {
      logger.error(`[VideoPackage] ${err.statusCode} ${err.message}`);
      return res.status(err.statusCode).json({ error: err.message });
    }
    logger.error(`[VideoPackage] Unexpected error: ${err.message}`, { stack: err.stack });
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { handleVideoLevelPackage, validateRequest };
