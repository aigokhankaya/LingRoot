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
const { synthesizeWithOpenAI } = require('../utils/audio/openaiTTS.js');
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
  openai = new OpenAI({ apiKey, timeout: 180000, maxRetries: 2 });
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

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function sentenceWordCounts(text) {
  return text
    .split(/[.!?]+/)
    .map((sentence) => countWords(sentence.trim()))
    .filter((count) => count > 0);
}

function normalizeSentenceCount(sentences, targetCount, maximumWordsPerSentence) {
  const normalized = [...sentences];
  while (normalized.length > targetCount) {
    let mergeAt = -1;
    let smallestCombinedCount = Number.POSITIVE_INFINITY;
    for (let index = 0; index < normalized.length - 1; index += 1) {
      const combinedCount = countWords(normalized[index]) + countWords(normalized[index + 1]);
      if (combinedCount <= maximumWordsPerSentence && combinedCount < smallestCombinedCount) {
        mergeAt = index;
        smallestCombinedCount = combinedCount;
      }
    }
    if (mergeAt < 0) break;
    const first = normalized[mergeAt].replace(/[.!?]+$/, '');
    normalized.splice(mergeAt, 2, `${first}, ${normalized[mergeAt + 1]}`);
  }
  return normalized;
}

async function generateLongFormSceneScript({
  client, topic, coreMessage, level, sceneCount, sceneBriefs, rules, wordBudget,
  targetDurationSeconds, model, contentObjective, tone,
}) {
  const targets = Array.from({ length: sceneCount }, (_, index) =>
    Math.floor(wordBudget / sceneCount) + (index < wordBudget % sceneCount ? 1 : 0),
  );
  const result = [];
  const batchSize = 4;
  for (let batchStart = 0; batchStart < sceneCount; batchStart += batchSize) {
    const batchTargets = targets.slice(batchStart, batchStart + batchSize);
    const batchBriefs = sceneBriefs.slice(batchStart, batchStart + batchSize);
    const phase = batchStart === 0
      ? 'Open with a strong question, define the topic, and establish why it matters.'
      : batchStart + batchSize >= sceneCount
        ? 'Move into practical reflection and finish with a concise, memorable recap.'
        : 'Deepen the explanation with mechanisms, evidence-aware detail, and concrete examples.';
    let feedback = '';
    let accepted = null;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const expectedAverageSentenceWords = {
        A1: 5,
        A2: 6,
        B1: 9,
        B2: 9,
        C1: 11,
        C2: 13,
      }[level];
      const budgets = batchTargets.map((target, index) => ({
        scene: batchStart + index + 1,
        minimumWords: Math.floor(target * 0.72),
        maximumWords: Math.ceil(target * 1.30),
        targetSentences: Math.max(
          rules.minimumSceneSentences,
          Math.ceil(target / expectedAverageSentenceWords),
        ),
        maximumWordsPerSentence: rules.maxSentenceWords,
      }));
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a professional CEFR-calibrated English scriptwriter. Return valid JSON only.',
            },
            {
              role: 'user',
              content: [
                `Write scenes ${batchStart + 1}-${batchStart + batchTargets.length} of a ${sceneCount}-scene, ${Math.round(targetDurationSeconds / 60)}-minute educational video.`,
                `Topic: ${topic}`,
                `Core message: ${coreMessage}`,
                `Content objective: ${contentObjective}. Presentation tone: ${tone}.`,
                `CEFR: ${level} (${rules.label}).`,
                `Vocabulary: ${rules.vocabulary}. Grammar: ${rules.grammar}.`,
                `No sentence may exceed ${rules.maxSentenceWords} words.`,
                phase,
                `Scene-specific narrative goals: ${JSON.stringify(batchBriefs)}.`,
                'Each scene must advance the explanation. Do not repeat an introduction, definition, example, or conclusion from another scene.',
                'Each returned scene must focus on its matching narrative goal. Do not move a later goal into an earlier scene.',
                'Use natural spoken English, smooth transitions, and no labels, numbering, markdown, or quotations inside the narration.',
                'Return each sentence as its own JSON string. End every sentence with a period, question mark, or exclamation mark.',
                'Write exactly the targetSentences count for each scene.',
                `Per-scene budgets: ${JSON.stringify(budgets)}.`,
                `Return exactly this shape: {"scenes":[${batchTargets.map(() => '["sentence one.","sentence two."]').join(',')}]}`,
                feedback,
              ].filter(Boolean).join('\n'),
            },
          ],
          temperature: attempt === 1 ? 0.55 : 0.25,
          max_tokens: 3000,
          response_format: { type: 'json_object' },
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content?.trim());
        const sceneSentences = Array.isArray(parsed?.scenes)
          ? parsed.scenes.map((scene) => Array.isArray(scene)
            ? scene
              .map((sentence) => typeof sentence === 'string' ? sentence.trim() : '')
              .filter(Boolean)
              .map((sentence) => /[.!?]$/.test(sentence) ? sentence : `${sentence}.`)
            : [])
            .map((sentences, index) => normalizeSentenceCount(
              sentences,
              budgets[index]?.targetSentences ?? sentences.length,
              rules.maxSentenceWords,
            ))
          : [];
        const scenes = sceneSentences.map((sentences) => sentences.join(' '));
        const valid = scenes.length === batchTargets.length && scenes.every((line, index) => {
          const budget = budgets[index];
          const words = countWords(line);
          const sentences = sceneSentences[index];
          const sentenceCounts = sentences.map(countWords);
          return Boolean(line)
            && words >= budget.minimumWords
            && words <= budget.maximumWords
            && sentences.length === budget.targetSentences
            && sentences.every((sentence) => /[.!?]$/.test(sentence))
            && Math.max(...sentenceCounts, 0) <= rules.maxSentenceWords;
        });
        if (valid) {
          accepted = scenes;
          break;
        }
        const maximums = sceneSentences.map((sentences) => Math.max(...sentences.map(countWords), 0));
        const sentenceTotals = sceneSentences.map((sentences) => sentences.length);
        feedback = `Correction required. Previous scene word counts were ${scenes.map(countWords).join(', ') || 'missing'}, sentence counts were ${sentenceTotals.join(', ') || 'missing'}, and maximum sentence lengths were ${maximums.join(', ') || 'missing'}. Follow every budget exactly.`;
      } catch (error) {
        feedback = `Correction required after an invalid response: ${error instanceof SyntaxError ? 'return valid JSON' : 'follow the requested schema and budgets'}.`;
      }
      logger.warn(`[VideoPackage] Long-form batch ${batchStart / batchSize + 1} mismatch on attempt ${attempt}: ${feedback}`);
    }
    if (!accepted) {
      throw new VideoPackageError(`Long-form script batch ${batchStart / batchSize + 1} could not satisfy its CEFR budget.`, 502, true);
    }
    result.push(...accepted);
  }
  const totalWords = countWords(result.join(' '));
  if (totalWords < Math.floor(wordBudget * 0.72) || totalWords > Math.ceil(wordBudget * 1.12)) {
    throw new VideoPackageError(`Long-form script total of ${totalWords} words missed its ${wordBudget}-word budget.`, 502, true);
  }
  return result;
}

/**
 * Generate exactly N scene narration lines at the requested CEFR level.
 * @returns {Promise<string[]>} one line per scene, in scene order.
 */
async function generateSceneScript({
  topic, coreMessage, level, sceneCount, sceneBriefs, targetDurationSeconds,
  contentStyle, contentObjective = 'education', tone = 'educational',
}) {
  const client = getOpenAI();
  if (!client) {
    throw new VideoPackageError('OpenAI client not configured (OPENAI_API_KEY missing).', 503, true);
  }

  const rules = CEFR_LEVEL_RULES[level];
  const normalizedSceneBriefs = Array.isArray(sceneBriefs) && sceneBriefs.length === sceneCount
    ? sceneBriefs
    : Array.from({ length: sceneCount }, (_, index) => ({
      scene_id: `scene-${index + 1}`,
      narrative_beat: `Advance the explanation in scene ${index + 1}.`,
    }));
  const isLongForm = contentStyle === 'long_form_listening_video';
  const targetWpm = isLongForm
    ? Math.round(155 * rules.speakingRate)
    : rules.speechRateWpm;
  const wordBudget = Math.max(sceneCount, Math.round((targetDurationSeconds * targetWpm) / 60));
  const minSentencesPerScene = Math.max(
    rules.minimumSceneSentences,
    Math.ceil(wordBudget / rules.maxSentenceWords / sceneCount),
  );
  const model = process.env.OPENAI_VIDEO_FACTORY_MODEL || 'gpt-4o';

  if (isLongForm) {
    return generateLongFormSceneScript({
      client,
      topic,
      coreMessage,
      level,
      sceneCount,
      sceneBriefs: normalizedSceneBriefs,
      rules,
      wordBudget,
      targetDurationSeconds,
      model,
      contentObjective,
      tone,
    });
  }

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
    .replace(/\{\{wpm\}\}/g, String(targetWpm))
    .replace(/\{\{word_budget\}\}/g, String(wordBudget))
    .replace(/\{\{min_sentences_per_scene\}\}/g, String(minSentencesPerScene));
  const formattedPrompt = `${prompt
    .replace(/\{\{content_style\}\}/g, isLongForm ? `${Math.round(targetDurationSeconds / 60)}-minute long-form YouTube lesson` : 'short listening video')
    .replace(/\{\{structure_guidance\}\}/g, isLongForm
      ? 'Open with a strong question or surprising fact, build the explanation through evidence and concrete examples, include a practical reflection, and end with a concise recap. Maintain forward momentum without filler.'
      : 'Open quickly, explain one focused idea, and end with a concise takeaway.')}\nContent objective: ${contentObjective}. Presentation tone: ${tone}.`;

  let feedback = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are a professional CEFR-calibrated English scriptwriter. Always respond with valid JSON.' },
          { role: 'user', content: `${formattedPrompt}${feedback}` },
        ],
        temperature: attempt === 1 ? 0.6 : 0.3,
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content?.trim());
      const scenes = Array.isArray(parsed?.scenes) ? parsed.scenes : [];
      const cleaned = scenes.map((line) => (typeof line === 'string' ? line.trim() : ''));
      const wordCount = cleaned
        .join(' ')
        .split(/\s+/)
        .filter(Boolean).length;
      const sentenceCounts = cleaned.flatMap((line) =>
        line
          .split(/[.!?]+/)
          .map((sentence) => sentence.trim().split(/\s+/).filter(Boolean).length)
          .filter((count) => count > 0),
      );
      const sceneSentenceCounts = cleaned.map((line) =>
        line.split(/[.!?]+/).filter((sentence) => sentence.trim()).length,
      );
      const longestSentence = Math.max(...sentenceCounts, 0);
      const minimumWords = Math.floor(wordBudget * 0.9);
      const maximumWords = Math.ceil(wordBudget * 1.15);
      const valid =
        cleaned.length === sceneCount &&
        cleaned.every(Boolean) &&
        wordCount >= minimumWords &&
        wordCount <= maximumWords &&
        longestSentence <= rules.maxSentenceWords &&
        sceneSentenceCounts.every((count) => count >= minSentencesPerScene);
      if (valid) return cleaned;

      feedback = `\n\nCORRECTION REQUIRED: Your previous response had ${cleaned.length} scenes, ${wordCount} total words, and a longest sentence of ${longestSentence} words. Return exactly ${sceneCount} scenes, ${minimumWords}-${maximumWords} total words, at least ${minSentencesPerScene} sentences in every scene, and no sentence longer than ${rules.maxSentenceWords} words.`;
      logger.warn(`[VideoPackage] Script budget mismatch on attempt ${attempt}: scenes=${cleaned.length}, words=${wordCount}, longestSentence=${longestSentence}`);
    } catch (err) {
      feedback = '\n\nCORRECTION REQUIRED: The previous response was invalid JSON. Return only the required JSON object.';
      logger.warn(`[VideoPackage] Invalid script response on attempt ${attempt}: ${err.message}`);
    }
  }
  throw new VideoPackageError('Script generation could not satisfy the CEFR length budget.', 502, true);
}

/**
 * Synthesize each scene line separately so subtitle timings align exactly to scenes.
 * @returns {Promise<Array<{buffer: Buffer, duration: number}>>}
 */
async function synthesizeScenes(sceneLines, voice, speakingRate, level, audioQuality, tone = 'educational') {
  const segments = [];
  for (let i = 0; i < sceneLines.length; i += 1) {
    let result;
    try {
      if (voice.provider === 'openai') {
        result = await synthesizeWithOpenAI({
          text: sceneLines[i],
          voice: voice.voiceName,
          model: process.env.VIDEO_FACTORY_OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
          speed: speakingRate,
          instructions: [
            'Speak as a warm, confident human educational presenter.',
            'Use natural phrasing, varied but restrained intonation, and brief pauses at punctuation.',
            'Avoid a robotic cadence, exaggerated enthusiasm, or a commercial voice-over style.',
            `Keep articulation appropriate for a ${level} English learner without sounding unnaturally slow.`,
            `Use a ${tone} delivery while keeping the narration factual and natural.`,
            audioQuality === 'high' ? 'Deliver clean, broadcast-ready narration with consistent presence and no audible character changes between scenes.' : '',
            'Read exactly the supplied text and do not add words.',
          ].filter(Boolean).join(' '),
        });
      } else {
        result = await synthesizeWithGoogle({
          text: sceneLines[i],
          voiceName: voice.voiceName,
          languageCode: voice.languageCode,
          ssmlGender: voice.ssmlGender,
          speakingRate,
          audioQuality,
        });
      }
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
    sceneBriefs,
    contentStyle = 'short_listening_video',
    audioQuality = 'standard',
    contentObjective = 'education',
    tone = 'educational',
  } = params;

  const rules = CEFR_LEVEL_RULES[targetLevel];
  const voice = VOICE_PROFILE_MAP[voiceProfile] || VOICE_PROFILE_MAP[DEFAULT_VOICE_PROFILE];
  const speakingRate = rules.speakingRate;
  const sceneCount = sceneIds.length;

  logger.info(`[VideoPackage] Generating package: topic=${topicId} level=${targetLevel} scenes=${sceneCount} duration=${targetDurationSeconds}s audioQuality=${audioQuality}`);

  // 1. Scene-aware CEFR script
  const sceneLines = await generateSceneScript({
    topic,
    coreMessage,
    level: targetLevel,
    sceneCount,
    sceneBriefs,
    targetDurationSeconds,
    contentStyle,
    contentObjective,
    tone,
  });

  // 2. Per-scene TTS using the provider selected by the voice profile.
  const segments = await synthesizeScenes(
    sceneLines,
    voice,
    speakingRate,
    targetLevel,
    audioQuality,
    tone,
  );

  // 3. Merge into a single MP3 and measure real duration
  let merged;
  try {
    merged = await mergeAudioSegmentsToBuffer(
      segments.map((s) => s.buffer),
      {
        includeDuration: true,
        normalize: audioQuality === 'high',
        bitrateKbps: audioQuality === 'high' ? 192 : 128,
        sampleRateHertz: audioQuality === 'high' ? 48000 : 24000,
      },
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
  generateSceneScript,
};
