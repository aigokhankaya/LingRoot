/**
 * Timing Merger Module for Podcast V2
 * Merges all timing data and creates final timepoints, dialogue_segments, and words arrays
 */

const logger = require('../../common/logger.js');

/**
 * Merge all timing data from offset-adjusted segments
 * @param {Object} offsetData - Output from offsetCalculator
 * @returns {Object} Merged timing data for database storage
 */
function mergeTimingData(offsetData) {
  const { segmentsWithOffsets, totalDuration } = offsetData;

  if (!segmentsWithOffsets || segmentsWithOffsets.length === 0) {
    return {
      timepoints: [],
      dialogueSegments: [],
      words: [],
      totalDuration: 0,
    };
  }

  const timepoints = [];
  const dialogueSegments = [];
  const words = [];
  let globalWordIndex = 0;

  for (let lineIndex = 0; lineIndex < segmentsWithOffsets.length; lineIndex++) {
    const segment = segmentsWithOffsets[lineIndex];
    const wordTimings = segment.adjustedWordTimings || [];

    const startWordIndex = globalWordIndex;
    const segmentWords = [];

    // Process each word timing
    for (const wt of wordTimings) {
      timepoints.push({
        word: wt.word,
        timeSeconds: wt.startTime,
        endTimeSeconds: wt.endTime,
        index: globalWordIndex,
        hasRealTiming: !wt.interpolated && !wt.fallback,
        source: wt.fallback ? 'fallback' : (wt.interpolated ? 'interpolated' : 'mfa'),
      });

      words.push(wt.word);
      segmentWords.push(wt.word);
      globalWordIndex++;
    }

    const endWordIndex = globalWordIndex - 1;

    // Create dialogue segment
    dialogueSegments.push({
      lineIndex,
      speaker: segment.speakerLabel || (segment.speaker === 'A' ? 'Host' : 'Guest'),
      startTimeSeconds: segment.finalStartTime,
      endTimeSeconds: segment.finalEndTime,
      startWordIndex,
      endWordIndex: endWordIndex >= startWordIndex ? endWordIndex : startWordIndex,
      text: segment.text,
      wordCount: segmentWords.length,
    });
  }

  logger.info(`[PODCAST-V2] Merged timing data: ${timepoints.length} words, ${dialogueSegments.length} segments, ${totalDuration.toFixed(2)}s total`);

  return {
    timepoints,
    dialogueSegments,
    words,
    totalDuration,
  };
}

/**
 * Create word-level VTT from timepoints
 * @param {Array} timepoints - Array of word timing objects
 * @returns {string} VTT content
 */
function createWordLevelVTT(timepoints) {
  let vttContent = 'WEBVTT\n\n';

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millisecs = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millisecs.toString().padStart(3, '0')}`;
  };

  (timepoints || []).forEach((timing) => {
    const startTime = timing.timeSeconds ?? 0;
    const endTime = timing.endTimeSeconds ?? (startTime + 0.5);
    const word = timing.word || '';
    vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
    vttContent += `${word}\n\n`;
  });

  return vttContent;
}

/**
 * Create dialogue text for database storage
 * @param {Array} dialogueSegments - Array of dialogue segments
 * @returns {string} Formatted dialogue text
 */
function createDialogueText(dialogueSegments) {
  return dialogueSegments
    .map(segment => `${segment.speaker}: ${segment.text}`)
    .join('\n');
}

/**
 * Create transcript (no speaker labels)
 * @param {Array} words - Array of words
 * @returns {string} Plain transcript
 */
function createTranscript(words) {
  return words.join(' ');
}

/**
 * Validate merged timing data
 * @param {Object} mergedData - Output from mergeTimingData
 * @returns {Object} Validation result
 */
function validateMergedData(mergedData) {
  const issues = [];

  // Check timepoints are monotonic
  for (let i = 1; i < mergedData.timepoints.length; i++) {
    const prev = mergedData.timepoints[i - 1];
    const curr = mergedData.timepoints[i];

    if (curr.timeSeconds < prev.endTimeSeconds - 0.05) {
      issues.push({
        type: 'timepoint_overlap',
        index: i,
        prevEnd: prev.endTimeSeconds,
        currStart: curr.timeSeconds,
      });
    }
  }

  // Check dialogue segments are monotonic
  for (let i = 1; i < mergedData.dialogueSegments.length; i++) {
    const prev = mergedData.dialogueSegments[i - 1];
    const curr = mergedData.dialogueSegments[i];

    if (curr.startTimeSeconds < prev.endTimeSeconds - 0.05) {
      issues.push({
        type: 'segment_overlap',
        lineIndex: i,
        prevEnd: prev.endTimeSeconds,
        currStart: curr.startTimeSeconds,
      });
    }
  }

  // Check word indices are continuous
  for (let i = 0; i < mergedData.dialogueSegments.length; i++) {
    const segment = mergedData.dialogueSegments[i];
    const prevSegment = mergedData.dialogueSegments[i - 1];

    if (i > 0 && segment.startWordIndex !== prevSegment.endWordIndex + 1) {
      issues.push({
        type: 'word_index_gap',
        lineIndex: i,
        expected: prevSegment.endWordIndex + 1,
        actual: segment.startWordIndex,
      });
    }
  }

  if (issues.length > 0) {
    logger.warn(`[PODCAST-V2] Merged data validation found ${issues.length} issues`);
  }

  return {
    valid: issues.length === 0,
    issues,
    stats: {
      totalWords: mergedData.timepoints.length,
      totalSegments: mergedData.dialogueSegments.length,
      totalDuration: mergedData.totalDuration,
    },
  };
}

module.exports = {
  mergeTimingData,
  createWordLevelVTT,
  createDialogueText,
  createTranscript,
  validateMergedData,
};
