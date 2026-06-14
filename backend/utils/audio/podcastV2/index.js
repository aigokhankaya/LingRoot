/**
 * Podcast V2 - Separated Speaker Processing System
 *
 * Main orchestrator for the new podcast generation pipeline that processes
 * Host and Guest audio separately for accurate speaker attribution.
 *
 * Environment: PODCAST_TYPE=new to enable this system
 */

const logger = require('../../common/logger.js');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../../storage/supabaseClient.js');
const { insertWithSchemaFallback } = require('../../storage/schemaCacheFallback.js');

// Import V2 modules
const { groupTurnsBySpeaker } = require('./turnGrouper.js');
const { synthesizeSpeakerTurns, calculateSegmentDurations } = require('./perSpeakerSynthesizer.js');
const { alignSpeakerSegments } = require('./perSpeakerAligner.js');
const { interleaveByTurnOrder, validateInterleavedSegments } = require('./turnInterleaver.js');
const { calculateOffsets, validateOffsetMonotonicity, fixMinorOverlaps } = require('./offsetCalculator.js');
const { mergeTimingData, createWordLevelVTT, createDialogueText, createTranscript, validateMergedData } = require('./timingMerger.js');

// Import shared utilities from existing system
const { mergeAudioSegmentsToBuffer } = require('../audioMerger.js');
const { generatePodcastScript } = require('../googleTTSMultiSpeaker.js');

// Default speaker IDs
const DEFAULT_HOST_SPEAKER = 'Kore';
const DEFAULT_GUEST_SPEAKER = 'Charon';
const TIMING_ACCURACY_BY_PROVIDER = {
  mfa: 'forced_alignment_word_timestamp',
  groq: 'asr_word_timestamp',
  tts: 'estimated_word_timing',
};

// Legacy voice name mapping (for backwards compatibility with old saved preferences)
const LEGACY_VOICE_MAPPING = {
  'Achilles': 'Achird', // Achilles was never a valid Gemini voice, Achird is the correct name
};

// Normalize speaker ID (handle legacy/invalid names)
const normalizeSpeakerId = (speakerId) => {
  if (!speakerId || typeof speakerId !== 'string') return speakerId;
  return LEGACY_VOICE_MAPPING[speakerId] || speakerId;
};

// Style prompts
const STYLE_PROMPTS = {
  'friendly_chat': 'Speak naturally like real friends having a genuine conversation. Use varied intonation, occasional pauses, and express emotions through your voice.',
  'professional': 'Speak clearly and professionally but still conversationally. Use natural pacing with thoughtful pauses.',
  'educational': 'Speak with enthusiasm when explaining concepts. Sound patient and encouraging with genuine curiosity.',
  'casual': 'Speak very naturally and relaxed, like chatting with a close friend. Use casual intonation and show genuine reactions.',
};

function logPodcastHighlightType(highlightType, details = {}) {
  logger.info(`[PODCAST-V2] HIGHLIGHT_TYPE=${highlightType}`, details);
}

/**
 * Main entry point for Podcast V2
 * @param {Object} options - Podcast creation options
 * @returns {Object} Podcast creation result
 */
async function createPodcastV2(options) {
  const startTime = Date.now();
  const limiterJobId = uuidv4();
  const {
    topic,
    level = 'B1',
    duration = 5,
    hostSpeakerId = DEFAULT_HOST_SPEAKER,
    guestSpeakerId = DEFAULT_GUEST_SPEAKER,
    styleType = 'friendly_chat',
    personalityA = 'curious_enthusiast',
    personalityB = 'knowledgeable_friend',
    includeHumor = true,
    includeFiller = true,
    userId = null,
    model = 'gemini-2.5-flash-tts',
  } = options;

  // Normalize legacy voice names (e.g., "Achilles" -> "Achird")
  const normalizedHostId = normalizeSpeakerId(hostSpeakerId);
  const normalizedGuestId = normalizeSpeakerId(guestSpeakerId);

  logger.info(`[PODCAST-V2] Starting podcast creation for topic: "${topic}"`);
  logger.info(`[PODCAST-V2] Config: level=${level}, duration=${duration}min, host=${normalizedHostId}, guest=${normalizedGuestId}`);

  try {
    // ========== Step 1: Generate Script ==========
    logger.info('[PODCAST-V2] Step 1: Generating script...');
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

    if (!scriptResult.turns || scriptResult.turns.length === 0) {
      throw new Error('Script generation returned no turns');
    }

    logger.info(`[PODCAST-V2] Script generated: ${scriptResult.turns.length} turns, title: "${scriptResult.title}"`);

    // Note: We skip validateAndCorrectSpeakerAssignments - trusting GPT output
    const turns = scriptResult.turns;
    const turnsOriginal = scriptResult.turns_original || [];

    // ========== Step 2: Group Turns by Speaker ==========
    logger.info('[PODCAST-V2] Step 2: Grouping turns by speaker...');
    const grouped = groupTurnsBySpeaker(turns);

    logger.info(`[PODCAST-V2] Grouped: ${grouped.hostTurns.length} Host turns, ${grouped.guestTurns.length} Guest turns`);

    // ========== Step 3: Parallel TTS Synthesis ==========
    logger.info('[PODCAST-V2] Step 3: Synthesizing audio (parallel)...');
    const stylePrompt = STYLE_PROMPTS[styleType] || STYLE_PROMPTS['friendly_chat'];

    const [hostSynthResult, guestSynthResult] = await Promise.all([
      synthesizeSpeakerTurns(grouped.hostTurns, normalizedHostId, 'Host', {
        model,
        stylePrompt,
        userId,
        jobId: limiterJobId,
      }),
      synthesizeSpeakerTurns(grouped.guestTurns, normalizedGuestId, 'Guest', {
        model,
        stylePrompt,
        userId,
        jobId: limiterJobId,
      }),
    ]);

    logger.info(`[PODCAST-V2] Host synthesis: ${hostSynthResult.segments.length} segments, ${hostSynthResult.totalCharacters} chars`);
    logger.info(`[PODCAST-V2] Guest synthesis: ${guestSynthResult.segments.length} segments, ${guestSynthResult.totalCharacters} chars`);

    // Calculate durations for all segments
    logger.info('[PODCAST-V2] Calculating segment durations...');
    const [hostSegmentsWithDuration, guestSegmentsWithDuration] = await Promise.all([
      calculateSegmentDurations(hostSynthResult.segments),
      calculateSegmentDurations(guestSynthResult.segments),
    ]);

    // Update synth results with durations
    hostSynthResult.segments = hostSegmentsWithDuration;
    guestSynthResult.segments = guestSegmentsWithDuration;

    // ========== Step 4: Parallel MFA Alignment ==========
    logger.info('[PODCAST-V2] Step 4: Running MFA alignment (parallel)...');

    const [hostAligned, guestAligned] = await Promise.all([
      alignSpeakerSegments(hostSynthResult, 'en-US'),
      alignSpeakerSegments(guestSynthResult, 'en-US'),
    ]);

    logger.info(`[PODCAST-V2] Host MFA: success=${hostAligned.mfaSuccess}, segments=${hostAligned.alignedSegments?.length || 0}`);
    logger.info(`[PODCAST-V2] Guest MFA: success=${guestAligned.mfaSuccess}, segments=${guestAligned.alignedSegments?.length || 0}`);

    // ========== Step 5: Interleave by Turn Order ==========
    logger.info('[PODCAST-V2] Step 5: Interleaving segments...');
    const interleaved = interleaveByTurnOrder(
      hostAligned,
      guestAligned,
      grouped.turnOrder,
      grouped.turnSpeakerMap
    );

    const validation = validateInterleavedSegments(interleaved.orderedSegments);
    if (!validation.valid) {
      logger.warn(`[PODCAST-V2] Interleaving validation issues: ${JSON.stringify(validation.issues)}`);
    }

    // ========== Step 6: Calculate Offsets ==========
    logger.info('[PODCAST-V2] Step 6: Calculating timing offsets...');
    let offsetData = calculateOffsets(interleaved.orderedSegments);

    const offsetValidation = validateOffsetMonotonicity(offsetData.segmentsWithOffsets);
    if (!offsetValidation.valid) {
      logger.warn('[PODCAST-V2] Fixing minor timing overlaps...');
      offsetData.segmentsWithOffsets = fixMinorOverlaps(offsetData.segmentsWithOffsets);
    }

    // ========== Step 7: Merge Audio ==========
    logger.info('[PODCAST-V2] Step 7: Merging audio buffers...');
    const audioBuffers = offsetData.segmentsWithOffsets.map(s => s.audioBuffer);
    const mergedAudioResult = await mergeAudioSegmentsToBuffer(audioBuffers, { includeDuration: true });
    const mergedAudioBuffer = mergedAudioResult?.buffer || mergedAudioResult;
    const mergedDuration = mergedAudioResult?.duration || offsetData.totalDuration;

    logger.info(`[PODCAST-V2] Merged audio: ${mergedAudioBuffer.length} bytes, ${mergedDuration?.toFixed(2) || 'unknown'}s`);

    // ========== Step 8: Merge Timing Data ==========
    logger.info('[PODCAST-V2] Step 8: Merging timing data...');
    const timingData = mergeTimingData(offsetData);
    const dominantTimingSource = Object.entries(timingData.sourceCounts || {}).sort((left, right) => right[1] - left[1])[0]?.[0] || 'tts';
    const timingSource = dominantTimingSource === 'groq_whisper' ? 'GROQ_WHISPER' : dominantTimingSource.toUpperCase();
    const timingAccuracy = TIMING_ACCURACY_BY_PROVIDER[dominantTimingSource === 'groq_whisper' ? 'groq' : dominantTimingSource] || 'estimated_word_timing';
    const highlightType = timingSource === 'GROQ_WHISPER'
      ? 'groq'
      : (timingSource === 'MFA' ? 'MFA' : 'fallback');

    logPodcastHighlightType(highlightType, {
      timingSource,
      timingAccuracy,
      dominantTimingSource,
      hostAlignmentProvider: hostAligned.alignmentProvider,
      guestAlignmentProvider: guestAligned.alignmentProvider,
      podcastFlow: 'v2',
    });

    const timingValidation = validateMergedData(timingData);
    if (!timingValidation.valid) {
      logger.warn(`[PODCAST-V2] Timing validation issues: ${JSON.stringify(timingValidation.issues.slice(0, 5))}`);
    }

    // ========== Step 9: Generate VTT ==========
    logger.info('[PODCAST-V2] Step 9: Generating VTT subtitles...');
    const vttContent = createWordLevelVTT(timingData.timepoints);

    // ========== Step 10: Upload Audio and VTT ==========
    logger.info('[PODCAST-V2] Step 10: Uploading to storage...');
    const { uploadToSupabase } = require('../../storage/storageUploader.js');

    const fileName = `podcast_v2_${uuidv4()}.mp3`;
    const vttFileName = `podcast_v2_${uuidv4()}.vtt`;

    const audioUrl = await uploadToSupabase(mergedAudioBuffer, fileName, 'audio/mpeg');
    const vttUrl = await uploadToSupabase(Buffer.from(vttContent, 'utf-8'), vttFileName, 'text/vtt');

    logger.info(`[PODCAST-V2] Uploaded: ${audioUrl}`);

    // Prepare dialogue text and transcript (needed for return value)
    const dialogueText = createDialogueText(timingData.dialogueSegments);
    const transcript = createTranscript(timingData.words);

    // ========== Step 11: Save to Database ==========
    let contentHistoryId = null;
    if (userId && supabase) {
      logger.info('[PODCAST-V2] Step 11: Saving to database...');

      try {
        const { calculateOpenAiCost, calculateTtsCost, logApiCost } = require('../../infra/costTracker.js');

        const openaiCost = calculateOpenAiCost(scriptResult.usage || {}, 'gpt-4o-mini');
        const ttsCharacters = hostSynthResult.totalCharacters + guestSynthResult.totalCharacters;
        const ttsCostUsd = calculateTtsCost(ttsCharacters, 'Premium');
        const totalCostUsd = Number(((openaiCost.totalCostUsd || 0) + (ttsCostUsd || 0)).toFixed(6));

        // Prepare turns_original dialogue text
        const turnsOriginalDialogueText = turnsOriginal.length > 0
          ? turnsOriginal.map((turn, i) => {
            const speaker = grouped.turnSpeakerMap[i] === 'A' ? 'Host' : 'Guest';
            return `${speaker}: ${turn?.text || ''}`;
          }).join('\n')
          : '';

        const insertData = {
          user_id: userId,
          level: level,
          mp3_url: audioUrl,
          vtt_url: vttUrl,
          input: turnsOriginalDialogueText || topic,
          translated_text: dialogueText,
          adapted_text: transcript,
          input_type: 'podcast',
          created_at: new Date().toISOString(),
          words: JSON.stringify(timingData.words),
          timepoints: JSON.stringify(timingData.timepoints),
          dialogue_segments: JSON.stringify(timingData.dialogueSegments),
          timing_source: timingSource,
          timing_accuracy: timingAccuracy,
          tts_provider: 'google-gemini',
          tts_voice_name: model,
          audio_duration_seconds: Math.round(mergedDuration || timingData.totalDuration),
          entry_source: 'google-podcast-v2',  // Mark as V2
          openai_prompt_tokens: openaiCost.promptTokens || 0,
          openai_completion_tokens: openaiCost.completionTokens || 0,
          openai_total_tokens: openaiCost.totalTokens || 0,
          openai_cost_usd: openaiCost.totalCostUsd || 0,
          tts_characters: ttsCharacters,
          tts_category: 'Premium',
          tts_cost_usd: ttsCostUsd,
          total_cost_usd: totalCostUsd,
        };

        const { data, error, removedColumns } = await insertWithSchemaFallback(
          supabase,
          'contenthistory',
          insertData
        );

        if (error) {
          logger.error(`[PODCAST-V2] Database error: ${error.message}`);
        } else if (data && data.length > 0) {
          contentHistoryId = data[0].id;
          logger.info(`[PODCAST-V2] Saved to contenthistory: ${contentHistoryId}`);
          if (removedColumns.length > 0) {
            logger.warn(`[PODCAST-V2] contenthistory insert succeeded after removing schema-missing columns: ${removedColumns.join(', ')}`);
          }
        }

        // Log costs
        await logApiCost({
          userId,
          feature: 'podcast_script_v2',
          provider: 'openai',
          model: 'gpt-4o-mini',
          inputQuantity: openaiCost.promptTokens,
          outputQuantity: openaiCost.completionTokens,
          costUsd: openaiCost.totalCostUsd,
          metadata: { topic, level, version: 'v2' },
        });

        await logApiCost({
          userId,
          feature: 'podcast_tts_v2',
          provider: 'google_tts',
          model: model,
          inputQuantity: ttsCharacters,
          outputQuantity: 0,
          costUsd: ttsCostUsd,
          metadata: { duration_seconds: Math.round(mergedDuration || 0), version: 'v2' },
        });
      } catch (dbErr) {
        logger.error(`[PODCAST-V2] Database save failed: ${dbErr.message}`);
      }
    }

    // ========== Complete ==========
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`[PODCAST-V2] Podcast creation completed in ${elapsed}s`);

    return {
      success: true,
      status: 'success',
      message: `Podcast created: ${scriptResult.title}`,
      podcast_url: audioUrl,
      audio_url: audioUrl,
      mp3_url: audioUrl,
      vtt_url: vttUrl,
      vtt_subtitles: vttUrl,
      transcript: transcript,
      dialogue: dialogueText,
      dialogue_segments: timingData.dialogueSegments,
      words: timingData.words,
      timepoints: timingData.timepoints,
      turns: turns,
      turns_original: turnsOriginal,
      title: scriptResult.title,
      topic: topic,
      level: level,
      duration_seconds: Math.round(mergedDuration || timingData.totalDuration),
      file_name: fileName,
      content_id: contentHistoryId,
      timing_source: timingSource,
      timing_accuracy: timingAccuracy,
      version: 'v2',
      processing_time_seconds: parseFloat(elapsed),
      stats: {
        host_segments: hostSynthResult.segments.length,
        guest_segments: guestSynthResult.segments.length,
        total_words: timingData.words.length,
        mfa_host_success: hostAligned.mfaSuccess,
        mfa_guest_success: guestAligned.mfaSuccess,
        host_alignment_provider: hostAligned.alignmentProvider,
        guest_alignment_provider: guestAligned.alignmentProvider,
      },
    };
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error(`[PODCAST-V2] Podcast creation failed after ${elapsed}s: ${error.message}`);
    logger.error(`[PODCAST-V2] Stack: ${error.stack}`);

    throw error;
  }
}

module.exports = {
  createPodcastV2,
};
