// backend/services/videoLevelPackageService.js
// Business logic for POST /internal/video-level-package (Video Factory integration).
// Produces a scene-aware CEFR script, synthesizes per-scene audio (Google TTS),
// merges it, builds scene-level SRT subtitles and uploads both to public storage.

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
const logger = require('../utils/common/logger.js');
const { synthesizeWithGoogle } = require('../utils/audio/googleTTS.js');
const { mergeAudioSegmentsToBuffer, getBufferDuration } = require('../utils/audio/audioMerger.js');
const { uploadToSupabase } = require('../utils/storage/storageUploader.js');
const {
  CEFR_LEVEL_RULES,
  VOICE_PROFILE_MAP,
  DEFAULT_VOICE_PROFILE,
} = require('../constants/cefrLevelRules.js');

const SCHEMA_VERSION = 1;

// Lazy OpenAI client (mirrors cefrAdapter init pattern)
let openai = null;
function getOpenAI() {
  if (openai) return openai;
  const apiKey = (process.env.OPENAI_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  if (!apiKey) return null;
  openai = new OpenAI({ apiKey });
  return openai;
}

/**
 * Custom error carrying an HTTP status + retryable hint for the controller.
 */
class VideoPackageError extends Error {
  constructor(message, statusCode = 500, retryable = false) {
    super(message);
    this.name = 'VideoPackageError';
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

/**
 * Generate exactly N scene narration lines at the requested CEFR level.
 * @returns {Promise<string[]>} one line per scene, in scene order.
 */
async function generateSceneScript({ topic, coreMessage, level, sceneCount, targetDurationSeconds }) {
  const client = getOpenAI();
  if (!client) {
    throw new VideoPackageError('OpenAI client not configured (OPENAI_API_KEY missing).', 503, true);
  }

  const rules = CEFR_LEVEL_RULES[level];
  const wordBudget = Math.max(sceneCount, Math.round((targetDurationSeconds * rules.speechRateWpm) / 60));

  const promptPath = path.join(__dirname, '../prompts/video-scene-script.txt');
  const template = fs.readFileSync(promptPath, 'utf-8');
  const prompt = template
    .replace(/\{\{topic\}\}/g, topic)
    .replace(/\{\{core_message\}\}/g, coreMessage)
    .replace(/\{\{level\}\}/g, level)
    .replace(/\{\{level_label\}\}/g, rules.label)
    .replace(/\{\{scene_count\}\}/g, String(sceneCount))
    .replace(/\{\{max_sentence_words\}\}/g, String(rules.maxSentenceWords))
    .replace(/\{\{vocabulary\}\}/g, rules.vocabulary)
    .replace(/\{\{grammar\}\}/g, rules.grammar)
    .replace(/\{\{rubric\}\}/g, rules.rubric)
    .replace(/\{\{target_duration_seconds\}\}/g, String(targetDurationSeconds))
    .replace(/\{\{wpm\}\}/g, String(rules.speechRateWpm))
    .replace(/\{\{word_budget\}\}/g, String(wordBudget));

  const model = process.env.OPENAI_VIDEO_FACTORY_MODEL || 'gpt-4o';

  let completion;
  try {
    completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a professional CEFR-calibrated English scriptwriter. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' },
    });
  } catch (err) {
    logger.error(`[VideoPackage] OpenAI script generation failed: ${err.message}`);
    throw new VideoPackageError('Script generation failed.', 502, true);
  }

  const raw = completion.choices[0]?.message?.content?.trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new VideoPackageError('Script generation returned invalid JSON.', 502, true);
  }

  const scenes = Array.isArray(parsed?.scenes) ? parsed.scenes : null;
  if (!scenes) {
    throw new VideoPackageError('Script generation returned no scenes.', 502, true);
  }

  const cleaned = scenes
    .map((line) => (typeof line === 'string' ? line.trim() : ''))
    .filter((line) => line.length > 0);

  if (cleaned.length !== sceneCount) {
    logger.warn(`[VideoPackage] Scene count mismatch: expected ${sceneCount}, got ${cleaned.length}`);
    throw new VideoPackageError(
      `Generated ${cleaned.length} scene lines but ${sceneCount} were required.`,
      502,
      true,
    );
  }

  return cleaned;
}

/**
 * Synthesize each scene line separately so subtitle timings align exactly to scenes.
 * @returns {Promise<Array<{buffer: Buffer, duration: number}>>}
 */
async function synthesizeScenes(sceneLines, voice, speakingRate) {
  const segments = [];
  for (let i = 0; i < sceneLines.length; i += 1) {
    let result;
    try {
      result = await synthesizeWithGoogle({
        text: sceneLines[i],
        voiceName: voice.voiceName,
        languageCode: voice.languageCode,
        ssmlGender: voice.ssmlGender,
        speakingRate,
      });
    } catch (err) {
      logger.error(`[VideoPackage] TTS failed for scene ${i + 1}: ${err.message}`);
      throw new VideoPackageError('Text-to-speech synthesis failed.', 502, true);
    }

    if (!result || !result.audioContent) {
      throw new VideoPackageError('Text-to-speech returned empty audio.', 502, true);
    }

    const buffer = Buffer.isBuffer(result.audioContent)
      ? result.audioContent
      : Buffer.from(result.audioContent, 'base64');

    let duration = null;
    try {
      duration = await getBufferDuration(buffer);
    } catch (err) {
      logger.warn(`[VideoPackage] Could not probe scene ${i + 1} duration, falling back to TTS estimate: ${err.message}`);
    }
    if (!duration || !Number.isFinite(duration) || duration <= 0) {
      duration = result.totalDuration || 1;
    }

    segments.push({ buffer, duration });
  }
  return segments;
}

/**
 * Build scene-level subtitle cues, scaled so the last cue ends exactly at totalDuration.
 */
function buildSubtitleCues(sceneIds, sceneLines, segments, totalDuration) {
  const sumDurations = segments.reduce((acc, s) => acc + s.duration, 0) || totalDuration;
  const scale = totalDuration > 0 ? totalDuration / sumDurations : 1;

  const cues = [];
  let cursor = 0;
  for (let i = 0; i < sceneIds.length; i += 1) {
    const start = cursor * scale;
    cursor += segments[i].duration;
    let end = cursor * scale;
    // Guarantee end > start and end <= totalDuration
    if (end <= start) end = start + 0.05;
    if (i === sceneIds.length - 1 || end > totalDuration) end = totalDuration;
    cues.push({
      scene_id: sceneIds[i],
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      text: sceneLines[i],
    });
  }
  return cues;
}

function secondsToSrtTimestamp(seconds) {
  const ms = Math.round(seconds * 1000);
  const hh = Math.floor(ms / 3600000);
  const mm = Math.floor((ms % 3600000) / 60000);
  const ss = Math.floor((ms % 60000) / 1000);
  const mmm = ms % 1000;
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)},${pad(mmm, 3)}`;
}

function buildSrt(cues) {
  return cues
    .map((cue, idx) => {
      const range = `${secondsToSrtTimestamp(cue.start)} --> ${secondsToSrtTimestamp(cue.end)}`;
      return `${idx + 1}\n${range}\n${cue.text}\n`;
    })
    .join('\n');
}

/**
 * Orchestrates the full level package generation.
 * @returns {Promise<object>} the exact response contract (no extra fields).
 */
async function generateVideoLevelPackage(params) {
  const {
    topicId,
    topic,
    coreMessage,
    targetLevel,
    targetDurationSeconds,
    voiceProfile,
    sceneIds,
  } = params;

  const rules = CEFR_LEVEL_RULES[targetLevel];
  const voice = VOICE_PROFILE_MAP[voiceProfile] || VOICE_PROFILE_MAP[DEFAULT_VOICE_PROFILE];
  const speakingRate = rules.speakingRate;
  const sceneCount = sceneIds.length;

  logger.info(`[VideoPackage] Generating package: topic=${topicId} level=${targetLevel} scenes=${sceneCount} duration=${targetDurationSeconds}s`);

  // 1. Scene-aware CEFR script
  const sceneLines = await generateSceneScript({
    topic,
    coreMessage,
    level: targetLevel,
    sceneCount,
    targetDurationSeconds,
  });

  // 2. Per-scene TTS (Google)
  const segments = await synthesizeScenes(sceneLines, voice, speakingRate);

  // 3. Merge into a single MP3 and measure real duration
  let merged;
  try {
    merged = await mergeAudioSegmentsToBuffer(
      segments.map((s) => s.buffer),
      { includeDuration: true },
    );
  } catch (err) {
    logger.error(`[VideoPackage] Audio merge failed: ${err.message}`);
    throw new VideoPackageError('Audio merge failed.', 500, true);
  }
  if (!merged || !merged.buffer) {
    throw new VideoPackageError('Audio merge produced no output.', 500, true);
  }

  const sumDurations = segments.reduce((acc, s) => acc + s.duration, 0);
  const totalDuration = merged.duration && merged.duration > 0 ? merged.duration : sumDurations;

  // 4. Subtitle cues (scene-aligned, scaled to real duration)
  const subtitleCues = buildSubtitleCues(sceneIds, sceneLines, segments, totalDuration);

  // 5. Upload audio + subtitles to public storage
  const uniqueId = `${topicId}_${targetLevel}_${uuidv4().slice(0, 8)}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  const audioUrl = await uploadToSupabase(merged.buffer, `vf_${uniqueId}.mp3`, 'audio/mpeg');
  if (!audioUrl) {
    throw new VideoPackageError('Audio upload failed.', 502, true);
  }

  const srtContent = buildSrt(subtitleCues);
  const subtitleUrl = await uploadToSupabase(Buffer.from(srtContent, 'utf-8'), `vf_${uniqueId}.srt`, 'text/plain; charset=utf-8');
  if (!subtitleUrl) {
    throw new VideoPackageError('Subtitle upload failed.', 502, true);
  }

  // 6. Build the exact response contract (additionalProperties:false — no extras)
  return {
    schema_version: SCHEMA_VERSION,
    topic_id: topicId,
    level: targetLevel,
    voiceover_script: sceneLines.join(' '),
    script_lines: sceneIds.map((sceneId, i) => ({ scene_id: sceneId, text: sceneLines[i] })),
    audio_url: audioUrl,
    subtitle_url: subtitleUrl,
    subtitle_lines: subtitleCues,
    duration_seconds: Number(totalDuration.toFixed(3)),
    voice_profile: voiceProfile,
    speaking_rate: speakingRate,
  };
}

module.exports = {
  generateVideoLevelPackage,
  VideoPackageError,
  // exported for unit testing
  buildSubtitleCues,
  buildSrt,
  secondsToSrtTimestamp,
};
