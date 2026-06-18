const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../common/logger.js');
const { supabase } = require('../../storage/supabaseClient.js');
const { insertWithSchemaFallback } = require('../../storage/schemaCacheFallback.js');
const { calculateOpenAiCost, calculateTtsCost, logApiCost } = require('../../infra/costTracker.js');
const { groqWhisperAligner } = require('../groqWhisperAligner.js');
const {
  createGoogleTTSPodcast,
  generatePodcastScript,
  synthesizeMultiSpeakerPodcast,
  uploadPodcastAudio,
  STYLE_PROMPTS,
} = require('../googleTTSMultiSpeaker.js');
const { resolveVoicePlan } = require('./voicePlanResolver.js');

function logStepElapsed(stepLabel, stepStartedAt) {
  logger.info(`[PODCAST-V3] ${stepLabel} completed in ${Date.now() - stepStartedAt}ms`);
}

function isGeminiQuotaError(error) {
  const message = error?.response?.data?.error?.message || error?.message || '';
  return (
    typeof message === 'string' &&
    (
      message.includes('Quota exceeded')
      || message.includes('RESOURCE_EXHAUSTED')
      || message.includes('global_generate_content_requests_per_minute_per_project_per_base_model')
    )
  );
}

function createWordLevelVttFromTimings(wordTimings) {
  let vttContent = 'WEBVTT\n\n';

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millisecs = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millisecs.toString().padStart(3, '0')}`;
  };

  (wordTimings || []).forEach((timing) => {
    const startTime = timing.startTime ?? timing.timeSeconds ?? 0;
    const endTime = timing.endTime ?? timing.endTimeSeconds ?? (startTime + 0.5);
    vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
    vttContent += `${timing.word || ''}\n\n`;
  });

  return vttContent;
}

function tokenizeForAlignment(text) {
  return (text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, ' ')
    .replace(/\u2026/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((token) => token.toLowerCase().replace(/[^a-z0-9]+/g, '').trim())
    .filter(Boolean);
}

function buildDialogueSegmentsFromWordTimings(turns, alignmentWordTimings) {
  const normalizedAlignmentWords = (alignmentWordTimings || []).map((timing) => (
    (timing?.word || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim()
  ));

  const findBestWindow = (tokens, startFrom, prevEndTime = null) => {
    if (!tokens || tokens.length === 0) return null;
    const first = tokens[0];
    if (!first) return null;

    const maxSearchAhead = Math.min(300, Math.max(100, tokens.length * 5));
    const searchEnd = Math.min(normalizedAlignmentWords.length - 1, startFrom + maxSearchAhead);

    let best = null;
    for (let i = startFrom; i <= searchEnd; i++) {
      if (normalizedAlignmentWords[i] !== first) continue;

      if (prevEndTime != null && alignmentWordTimings[i]?.startTime < prevEndTime) {
        continue;
      }

      let j = i;
      let tokenIndex = 0;
      let matched = 0;
      let lastMatchIndex = i;
      let skips = 0;
      const maxSkips = Math.max(10, Math.ceil(tokens.length * 1.5));

      while (j < normalizedAlignmentWords.length && tokenIndex < tokens.length) {
        if (normalizedAlignmentWords[j] === tokens[tokenIndex]) {
          matched += 1;
          lastMatchIndex = j;
          tokenIndex += 1;
          j += 1;
          continue;
        }

        skips += 1;
        if (skips > maxSkips) break;
        j += 1;
      }

      const score = tokens.length > 0 ? matched / tokens.length : 0;
      const minMatched = Math.min(tokens.length, Math.max(3, Math.floor(tokens.length * 0.7)));
      if (matched >= minMatched) {
        if (!best || score > best.score) {
          best = {
            startIndex: i,
            endIndex: lastMatchIndex,
            score,
            matched,
            tokenCount: tokens.length,
            skipsUsed: skips,
          };
          if (score >= 0.95) break;
        }
      }
    }

    return best;
  };

  const segments = [];
  let cursor = 0;
  let prevEndTime = null;
  let fallbackCount = 0;
  let totalTurns = 0;

  for (let lineIndex = 0; lineIndex < turns.length; lineIndex++) {
    const turn = turns[lineIndex];
    const tokens = tokenizeForAlignment(turn?.text || '');
    if (tokens.length === 0) {
      continue;
    }
    totalTurns += 1;

    const best = findBestWindow(tokens, cursor, prevEndTime);
    let startWordIndex = null;
    let endWordIndex = null;
    let usedFallback = false;

    if (best && best.startIndex != null && best.endIndex != null) {
      startWordIndex = best.startIndex;
      endWordIndex = best.endIndex;
    } else {
      const totalWords = alignmentWordTimings.length;
      const turnProgress = lineIndex / Math.max(1, turns.length - 1);
      const estimatedStart = Math.floor(turnProgress * totalWords * 0.9);
      const approxCount = tokens.length;

      startWordIndex = Math.max(cursor, Math.min(estimatedStart, totalWords - 1));
      endWordIndex = Math.min(startWordIndex + approxCount - 1, totalWords - 1);
      usedFallback = true;
      fallbackCount += 1;
    }

    const startTimeSeconds = alignmentWordTimings[startWordIndex]?.startTime ?? null;
    const endTimeSeconds = alignmentWordTimings[endWordIndex]?.endTime ?? null;

    if (startTimeSeconds != null && endTimeSeconds != null) {
      const isMonotonic = prevEndTime == null || startTimeSeconds >= prevEndTime - 0.1;
      if (isMonotonic) {
        segments.push({
          lineIndex,
          speaker: turn?.speaker === 'A' ? 'Host' : 'Guest',
          text: turn?.text || '',
          startTimeSeconds,
          endTimeSeconds,
          startWordIndex,
          endWordIndex,
          wordCount: endWordIndex - startWordIndex + 1,
        });
        prevEndTime = endTimeSeconds;
      } else {
        logger.warn(
          `[PODCAST-V3] dialogue_segments monotonicity violation at lineIndex=${lineIndex}: `
          + `startTime=${startTimeSeconds.toFixed(2)}s < prevEnd=${prevEndTime?.toFixed(2)}s, skipping`
        );
      }
    }

    cursor = Math.min(
      alignmentWordTimings.length,
      endWordIndex != null ? endWordIndex + 1 : cursor
    );

    if (usedFallback) {
      logger.warn(
        `[PODCAST-V3] dialogue_segments fallback used for lineIndex=${lineIndex} `
        + `tokens=${tokens.length} cursorNow=${cursor}`
      );
    }
  }

  if (fallbackCount > 0 && totalTurns > 0) {
    const fallbackRatio = ((fallbackCount / totalTurns) * 100).toFixed(1);
    logger.warn(
      `[PODCAST-V3] dialogue_segments matching: ${fallbackCount}/${totalTurns} `
      + `turns used fallback (${fallbackRatio}%)`
    );
  }

  return segments;
}

async function uploadPodcastVtt(vttContent, fileName) {
  const { uploadToSupabase } = require('../../storage/storageUploader.js');
  const vttBuffer = Buffer.from(vttContent || '', 'utf-8');
  return uploadToSupabase(vttBuffer, `podcast_${fileName}`, 'text/vtt');
}

async function alignPodcastWithGroq(audioBuffer, transcript, turns, audioDurationSeconds = null) {
  const tempAudioPath = path.join(os.tmpdir(), `podcast_v3_${uuidv4()}.mp3`);

  try {
    await fs.promises.writeFile(tempAudioPath, audioBuffer);

    const groqResult = await groqWhisperAligner.generateWordTimestamps(
      tempAudioPath,
      transcript,
      { audioDurationSeconds }
    );

    const alignmentWordTimings = groqResult.timings || [];
    const timepoints = alignmentWordTimings.map((timing, index) => ({
      word: timing.word,
      timeSeconds: timing.startTime,
      endTimeSeconds: timing.endTime,
      index,
      hasRealTiming: true,
      source: 'groq_whisper',
    }));

    const dialogueSegments = buildDialogueSegmentsFromWordTimings(turns, alignmentWordTimings);

    return {
      words: alignmentWordTimings.map((timing) => timing.word),
      timepoints,
      dialogueSegments,
      timingSource: 'GROQ_WHISPER',
      timingAccuracy: 'asr_word_timestamp',
    };
  } finally {
    await fs.promises.unlink(tempAudioPath).catch(() => {});
  }
}

async function createPodcastV3(options) {
  const startTime = Date.now();
  const {
    topic,
    level = 'B1',
    duration = 5,
    hostSpeakerId,
    guestSpeakerId,
    styleType = 'friendly_chat',
    personalityA = 'curious_enthusiast',
    personalityB = 'knowledgeable_friend',
    includeHumor = true,
    includeFiller = true,
    userId = null,
    model = 'gemini-2.5-flash-tts',
  } = options;

  logger.info(`[PODCAST-V3] Starting podcast creation topic="${topic}" duration=${duration}m`);

  try {
    let stepStartedAt = Date.now();
    const scriptResult = await generatePodcastScript({
      topic,
      level,
      duration,
      styleType,
      personalityA,
      personalityB,
      includeHumor,
      includeFiller,
      userId,
      disableSpeakerValidation: true,
    });
    logStepElapsed('Step 1 script', stepStartedAt);

    if (!scriptResult.turns || scriptResult.turns.length === 0) {
      throw new Error('Podcast V3 script generation returned no turns');
    }

    const turnsForTts = scriptResult.turns;
    const turnsOriginalForSave = Array.isArray(scriptResult.turns_original) ? scriptResult.turns_original : [];
    const voicePlan = resolveVoicePlan({
      requestedHostSpeakerId: hostSpeakerId,
      requestedGuestSpeakerId: guestSpeakerId,
      scriptSpeakerAId: scriptResult.speakerAId,
      scriptSpeakerBId: scriptResult.speakerBId,
    });

    logger.info(`[PODCAST-V3] Voice plan host=${voicePlan.host.geminiSpeakerId}/${voicePlan.host.fallbackVoiceName} guest=${voicePlan.guest.geminiSpeakerId}/${voicePlan.guest.fallbackVoiceName}`);

    let audioResult;
    try {
      stepStartedAt = Date.now();
      audioResult = await synthesizeMultiSpeakerPodcast({
        turns: turnsForTts,
        speakerAId: voicePlan.host.geminiSpeakerId,
        speakerBId: voicePlan.guest.geminiSpeakerId,
        stylePrompt: STYLE_PROMPTS[styleType] || STYLE_PROMPTS.friendly_chat,
        model,
        userId,
      });
      logStepElapsed('Step 2 synthesis', stepStartedAt);
    } catch (error) {
      if (isGeminiQuotaError(error) && process.env.PODCAST_V3_ALLOW_NEURAL2_FALLBACK === 'true') {
        logger.warn('[PODCAST-V3] Gemini quota exceeded, degrading to legacy Neural2 fallback because PODCAST_V3_ALLOW_NEURAL2_FALLBACK=true');
        return createGoogleTTSPodcast({
          topic,
          level,
          duration,
          styleType,
          personalityA,
          personalityB,
          hostSpeakerId: voicePlan.host.geminiSpeakerId,
          guestSpeakerId: voicePlan.guest.geminiSpeakerId,
          includeHumor,
          includeFiller,
          userId,
          disableSpeakerValidation: true,
          forceNeural2Fallback: true,
        });
      }
      throw error;
    }

    stepStartedAt = Date.now();
    const fileName = `podcast_v3_${uuidv4()}.mp3`;
    const audioUrl = await uploadPodcastAudio(audioResult.audioContent, fileName);
    logStepElapsed('Step 3 upload audio', stepStartedAt);

    stepStartedAt = Date.now();
    const aligned = await alignPodcastWithGroq(
      audioResult.audioContent,
      audioResult.transcript,
      turnsForTts,
      audioResult.audioDurationSeconds || null
    );
    logStepElapsed('Step 4 alignment', stepStartedAt);

    const vttContent = createWordLevelVttFromTimings(aligned.timepoints);
    stepStartedAt = Date.now();
    const vttFileName = `${fileName.replace(/\.mp3$/i, '')}.vtt`;
    const vttUrl = await uploadPodcastVtt(vttContent, vttFileName);
    logStepElapsed('Step 5 upload vtt', stepStartedAt);

    const dialogueText = aligned.dialogueSegments.map((segment) => `${segment.speaker}: ${segment.text}`).join('\n');
    const transcript = aligned.words.join(' ');

    let contentHistoryId = null;
    if (userId && supabase) {
      stepStartedAt = Date.now();
      const openaiCost = calculateOpenAiCost(scriptResult.usage || {}, 'gpt-4o-mini');
      const ttsCharacters = audioResult.ttsCharacters || (audioResult.dialogueText || '').length;
      const ttsCostUsd = calculateTtsCost(ttsCharacters, 'Premium');
      const totalCostUsd = Number(((openaiCost.totalCostUsd || 0) + (ttsCostUsd || 0)).toFixed(6));

      const insertData = {
        user_id: userId,
        level,
        mp3_url: audioUrl,
        vtt_url: vttUrl,
        input: turnsOriginalForSave.length > 0
          ? turnsOriginalForSave.map((turn) => `${turn.speaker === 'A' ? 'Host' : 'Guest'}: ${turn.text || ''}`).join('\n')
          : topic,
        translated_text: dialogueText,
        adapted_text: transcript,
        input_type: 'podcast',
        created_at: new Date().toISOString(),
        words: JSON.stringify(aligned.words),
        timepoints: JSON.stringify(aligned.timepoints),
        dialogue_segments: JSON.stringify(aligned.dialogueSegments),
        timing_source: aligned.timingSource,
        timing_accuracy: aligned.timingAccuracy,
        tts_provider: 'google-gemini',
        tts_voice_name: `${voicePlan.host.geminiSpeakerId}/${voicePlan.guest.geminiSpeakerId}`,
        audio_duration_seconds: Math.round(audioResult.audioDurationSeconds || 0),
        entry_source: 'google-podcast-v3',
        openai_prompt_tokens: openaiCost.promptTokens || 0,
        openai_completion_tokens: openaiCost.completionTokens || 0,
        openai_total_tokens: openaiCost.totalTokens || 0,
        openai_cost_usd: openaiCost.totalCostUsd || 0,
        tts_characters: ttsCharacters,
        tts_category: 'Premium',
        tts_cost_usd: ttsCostUsd,
        total_cost_usd: totalCostUsd,
      };

      const { data, error } = await insertWithSchemaFallback(
        supabase,
        'contenthistory',
        insertData
      );

      if (error) {
        logger.error(`[PODCAST-V3] Database error: ${error.message}`);
      } else if (data && data.length > 0) {
        contentHistoryId = data[0].id;
      }

      await logApiCost({
        userId,
        feature: 'podcast_script_v3',
        provider: 'openai',
        model: 'gpt-4o-mini',
        inputQuantity: openaiCost.promptTokens,
        outputQuantity: openaiCost.completionTokens,
        costUsd: openaiCost.totalCostUsd,
        metadata: { topic, level, version: 'v3' },
      });

      await logApiCost({
        userId,
        feature: 'podcast_tts_v3',
        provider: 'google_tts_gemini',
        model,
        inputQuantity: ttsCharacters,
        outputQuantity: 0,
        costUsd: ttsCostUsd,
        metadata: { duration_seconds: Math.round(audioResult.audioDurationSeconds || 0), version: 'v3' },
      });
      logStepElapsed('Step 6 db save', stepStartedAt);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`[PODCAST-V3] Podcast creation completed in ${elapsed}s`);

    return {
      success: true,
      status: 'success',
      message: `Podcast created: ${scriptResult.title}`,
      podcast_url: audioUrl,
      audio_url: audioUrl,
      mp3_url: audioUrl,
      vtt_url: vttUrl,
      vtt_subtitles: vttUrl,
      transcript,
      dialogue: dialogueText,
      dialogue_segments: aligned.dialogueSegments,
      words: aligned.words,
      timepoints: aligned.timepoints,
      turns: turnsForTts,
      turns_original: turnsOriginalForSave,
      title: scriptResult.title,
      topic,
      level,
      duration_seconds: Math.round(audioResult.audioDurationSeconds || 0),
      file_name: fileName,
      content_id: contentHistoryId,
      timing_source: aligned.timingSource,
      timing_accuracy: aligned.timingAccuracy,
      version: 'v3',
      processing_time_seconds: parseFloat(elapsed),
      stats: {
        provider_used: 'gemini_multi_speaker',
        turn_count: turnsForTts.length,
        total_words: aligned.words.length,
      },
    };
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error(`[PODCAST-V3] Podcast creation failed after ${elapsed}s: ${error.message}`);
    logger.error(`[PODCAST-V3] Stack: ${error.stack}`);
    throw error;
  }
}

module.exports = {
  createPodcastV3,
};
