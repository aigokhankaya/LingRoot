/**
 * Per-Speaker Aligner Module for Podcast V2
 * Runs MFA alignment on each speaker's audio separately
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../common/logger.js');
const { mfaAligner } = require('../mfaAligner.js');
const { mergeAudioSegmentsToBuffer } = require('../audioMerger.js');

/**
 * Align a single speaker's segments
 * Merges all segments for the speaker, runs MFA, then splits timings back
 * @param {Object} speakerData - Output from perSpeakerSynthesizer
 * @param {string} locale - Language locale (e.g., 'en-US')
 * @returns {Object} Aligned segments with word timings
 */
async function alignSpeakerSegments(speakerData, locale = 'en-US') {
  const { segments, speakerAlias } = speakerData;

  if (!segments || segments.length === 0) {
    logger.info(`[PODCAST-V2] No segments to align for ${speakerAlias}`);
    return {
      alignedSegments: [],
      speakerAlias,
      mfaSuccess: false,
    };
  }

  logger.info(`[PODCAST-V2] Aligning ${segments.length} segments for ${speakerAlias}`);

  // Strategy: Merge all speaker segments into one audio, run MFA once, then split timings
  const audioBuffers = segments.map(s => s.audioBuffer);

  // Track cumulative duration for splitting timings later
  const segmentBoundaries = [];
  let cumulativeDuration = 0;
  let cumulativeWordCount = 0;

  for (const segment of segments) {
    segmentBoundaries.push({
      originalIndex: segment.originalIndex,
      startTime: cumulativeDuration,
      endTime: cumulativeDuration + (segment.duration || 0),
      startWordIndex: cumulativeWordCount,
      endWordIndex: cumulativeWordCount + segment.wordCount - 1,
      wordCount: segment.wordCount,
      text: segment.text,
    });
    cumulativeDuration += segment.duration || 0;
    cumulativeWordCount += segment.wordCount;
  }

  // Merge audio for this speaker
  let mergedAudioBuffer;
  try {
    const mergeResult = await mergeAudioSegmentsToBuffer(audioBuffers, { includeDuration: true });
    mergedAudioBuffer = mergeResult?.buffer || mergeResult;
  } catch (mergeErr) {
    logger.error(`[PODCAST-V2] Failed to merge ${speakerAlias} audio: ${mergeErr.message}`);
    throw mergeErr;
  }

  // Write merged audio to temp file for MFA
  const tempAudioPath = path.join(os.tmpdir(), `podcast_v2_${speakerAlias.toLowerCase()}_${uuidv4()}.mp3`);

  try {
    fs.writeFileSync(tempAudioPath, mergedAudioBuffer);

    // Build concatenated transcript for MFA
    const fullTranscript = segments.map(s => s.text).join(' ');

    // Run MFA alignment
    let mfaWordTimings;
    try {
      mfaWordTimings = await mfaAligner.generateWordTimestamps(
        tempAudioPath,
        fullTranscript,
        locale,
        { debug: false }
      );
    } catch (mfaErr) {
      logger.warn(`[PODCAST-V2] MFA alignment failed for ${speakerAlias}: ${mfaErr.message}`);
      // Return segments without MFA timings - will use duration-based estimation
      return createFallbackAlignment(segments, segmentBoundaries, speakerAlias);
    }

    if (!mfaWordTimings || mfaWordTimings.length === 0) {
      logger.warn(`[PODCAST-V2] MFA returned empty timings for ${speakerAlias}`);
      return createFallbackAlignment(segments, segmentBoundaries, speakerAlias);
    }

    logger.info(`[PODCAST-V2] MFA returned ${mfaWordTimings.length} word timings for ${speakerAlias}`);

    // Split MFA timings back to individual segments
    const alignedSegments = splitTimingsToSegments(
      segments,
      segmentBoundaries,
      mfaWordTimings
    );

    return {
      alignedSegments,
      speakerAlias,
      mfaSuccess: true,
      mfaWordCount: mfaWordTimings.length,
    };
  } finally {
    // Cleanup temp file
    try {
      fs.unlinkSync(tempAudioPath);
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Split MFA timings back to individual segments based on word boundaries
 * @param {Array} segments - Original segments
 * @param {Array} segmentBoundaries - Pre-calculated boundaries
 * @param {Array} mfaWordTimings - MFA output
 * @returns {Array} Segments with word timings attached
 */
function splitTimingsToSegments(segments, segmentBoundaries, mfaWordTimings) {
  const alignedSegments = [];

  // Normalize MFA words for matching
  const normalizeWord = (w) => {
    return (w || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  let mfaIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const boundary = segmentBoundaries[i];
    const segmentWords = segment.text.split(/\s+/).filter(w => w.length > 0);

    const segmentTimings = [];
    let matchedWords = 0;

    // Try to match words from this segment
    for (const word of segmentWords) {
      const normalizedWord = normalizeWord(word);

      // Look ahead in MFA timings to find a match
      let found = false;
      for (let lookAhead = 0; lookAhead < 5 && mfaIndex + lookAhead < mfaWordTimings.length; lookAhead++) {
        const mfaTiming = mfaWordTimings[mfaIndex + lookAhead];
        const normalizedMfa = normalizeWord(mfaTiming.word);

        if (normalizedMfa === normalizedWord || normalizedWord.includes(normalizedMfa) || normalizedMfa.includes(normalizedWord)) {
          // Convert global speaker audio timing to segment-local timing
          // by subtracting the segment's start time in the merged speaker audio
          segmentTimings.push({
            word: word,
            startTime: mfaTiming.startTime - boundary.startTime,
            endTime: mfaTiming.endTime - boundary.startTime,
            mfaWord: mfaTiming.word,
          });
          mfaIndex += lookAhead + 1;
          matchedWords++;
          found = true;
          break;
        }
      }

      if (!found) {
        // Word not found in MFA, will need interpolation later
        segmentTimings.push({
          word: word,
          startTime: null,
          endTime: null,
          interpolated: true,
        });
      }
    }

    // Interpolate missing timings using segment-local timing (0 to segment duration)
    const segmentDuration = boundary.endTime - boundary.startTime;
    interpolateMissingTimings(segmentTimings, 0, segmentDuration);

    alignedSegments.push({
      ...segment,
      wordTimings: segmentTimings,
      matchedWords,
      totalWords: segmentWords.length,
      matchRatio: segmentWords.length > 0 ? matchedWords / segmentWords.length : 0,
    });
  }

  return alignedSegments;
}

/**
 * Interpolate missing timings based on known timings and boundaries
 * @param {Array} timings - Array of word timings (some may be null)
 * @param {number} segmentStart - Segment start time
 * @param {number} segmentEnd - Segment end time
 */
function interpolateMissingTimings(timings, segmentStart, segmentEnd) {
  if (timings.length === 0) return;

  // Find first and last known timings
  let firstKnownIdx = -1;
  let lastKnownIdx = -1;

  for (let i = 0; i < timings.length; i++) {
    if (timings[i].startTime !== null) {
      if (firstKnownIdx === -1) firstKnownIdx = i;
      lastKnownIdx = i;
    }
  }

  // If no known timings, distribute evenly
  if (firstKnownIdx === -1) {
    const duration = segmentEnd - segmentStart;
    const wordDuration = duration / timings.length;

    timings.forEach((timing, i) => {
      timing.startTime = segmentStart + (i * wordDuration);
      timing.endTime = segmentStart + ((i + 1) * wordDuration);
      timing.interpolated = true;
    });
    return;
  }

  // Interpolate before first known
  if (firstKnownIdx > 0) {
    const firstStart = timings[firstKnownIdx].startTime;
    const availableTime = firstStart - segmentStart;
    const wordDuration = availableTime / firstKnownIdx;

    for (let i = 0; i < firstKnownIdx; i++) {
      timings[i].startTime = segmentStart + (i * wordDuration);
      timings[i].endTime = segmentStart + ((i + 1) * wordDuration);
    }
  }

  // Interpolate after last known
  if (lastKnownIdx < timings.length - 1) {
    const lastEnd = timings[lastKnownIdx].endTime;
    const remainingWords = timings.length - lastKnownIdx - 1;
    const availableTime = segmentEnd - lastEnd;
    const wordDuration = availableTime / remainingWords;

    for (let i = lastKnownIdx + 1; i < timings.length; i++) {
      const offset = i - lastKnownIdx - 1;
      timings[i].startTime = lastEnd + (offset * wordDuration);
      timings[i].endTime = lastEnd + ((offset + 1) * wordDuration);
    }
  }

  // Interpolate gaps between known timings
  let prevKnownIdx = firstKnownIdx;
  for (let i = firstKnownIdx + 1; i <= lastKnownIdx; i++) {
    if (timings[i].startTime !== null) {
      // Fill gap between prevKnownIdx and i
      const gapSize = i - prevKnownIdx - 1;
      if (gapSize > 0) {
        const gapStart = timings[prevKnownIdx].endTime;
        const gapEnd = timings[i].startTime;
        const wordDuration = (gapEnd - gapStart) / gapSize;

        for (let j = prevKnownIdx + 1; j < i; j++) {
          const offset = j - prevKnownIdx - 1;
          timings[j].startTime = gapStart + (offset * wordDuration);
          timings[j].endTime = gapStart + ((offset + 1) * wordDuration);
        }
      }
      prevKnownIdx = i;
    }
  }
}

/**
 * Create fallback alignment when MFA fails
 * Uses duration-based word timing estimation
 * @param {Array} segments - Original segments
 * @param {Array} segmentBoundaries - Pre-calculated boundaries
 * @param {string} speakerAlias - Speaker identifier
 * @returns {Object} Fallback aligned data
 */
function createFallbackAlignment(segments, segmentBoundaries, speakerAlias) {
  logger.info(`[PODCAST-V2] Creating fallback alignment for ${speakerAlias}`);

  const alignedSegments = segments.map((segment, i) => {
    const boundary = segmentBoundaries[i];
    const words = segment.text.split(/\s+/).filter(w => w.length > 0);
    const duration = boundary.endTime - boundary.startTime;
    const wordDuration = words.length > 0 ? duration / words.length : 0;

    // Use segment-local timing (0 to segment duration)
    const wordTimings = words.map((word, j) => ({
      word,
      startTime: j * wordDuration,
      endTime: (j + 1) * wordDuration,
      interpolated: true,
      fallback: true,
    }));

    return {
      ...segment,
      wordTimings,
      matchedWords: 0,
      totalWords: words.length,
      matchRatio: 0,
      fallbackUsed: true,
    };
  });

  return {
    alignedSegments,
    speakerAlias,
    mfaSuccess: false,
    fallbackUsed: true,
  };
}

module.exports = {
  alignSpeakerSegments,
  splitTimingsToSegments,
  interpolateMissingTimings,
  createFallbackAlignment,
};
