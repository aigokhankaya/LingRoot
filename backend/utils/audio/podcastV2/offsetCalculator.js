/**
 * Offset Calculator Module for Podcast V2
 * Calculates timing offsets for each segment when merging in turn order
 */

const logger = require('../../common/logger.js');

/**
 * Calculate offsets for all segments based on cumulative duration
 * @param {Array} orderedSegments - Interleaved segments in turn order
 * @returns {Object} Segments with offset-adjusted timings
 */
function calculateOffsets(orderedSegments) {
  if (!orderedSegments || orderedSegments.length === 0) {
    return {
      segmentsWithOffsets: [],
      totalDuration: 0,
    };
  }

  let runningOffset = 0;
  const segmentsWithOffsets = [];

  for (const segment of orderedSegments) {
    const segmentDuration = segment.duration || 0;

    // Adjust all word timings by adding the current offset
    const adjustedWordTimings = (segment.wordTimings || []).map(wt => ({
      ...wt,
      // Store original timing for debugging
      originalStartTime: wt.startTime,
      originalEndTime: wt.endTime,
      // Apply offset
      startTime: wt.startTime + runningOffset,
      endTime: wt.endTime + runningOffset,
    }));

    segmentsWithOffsets.push({
      ...segment,
      offset: runningOffset,
      adjustedWordTimings,
      // Keep original wordTimings for reference
      originalWordTimings: segment.wordTimings,
      // Calculate segment boundaries in final timeline
      finalStartTime: runningOffset,
      finalEndTime: runningOffset + segmentDuration,
    });

    runningOffset += segmentDuration;
  }

  logger.info(`[PODCAST-V2] Calculated offsets for ${segmentsWithOffsets.length} segments, total duration: ${runningOffset.toFixed(2)}s`);

  return {
    segmentsWithOffsets,
    totalDuration: runningOffset,
  };
}

/**
 * Validate that offsets are monotonically increasing
 * @param {Array} segmentsWithOffsets - Segments with calculated offsets
 * @returns {Object} Validation result
 */
function validateOffsetMonotonicity(segmentsWithOffsets) {
  const issues = [];
  let prevEndTime = 0;

  for (let i = 0; i < segmentsWithOffsets.length; i++) {
    const segment = segmentsWithOffsets[i];

    // Check segment boundary
    if (segment.finalStartTime < prevEndTime - 0.01) {
      issues.push({
        index: i,
        issue: 'segment_overlap',
        expected: prevEndTime,
        actual: segment.finalStartTime,
      });
    }

    // Check word timings within segment are monotonic
    const wordTimings = segment.adjustedWordTimings || [];
    for (let j = 1; j < wordTimings.length; j++) {
      if (wordTimings[j].startTime < wordTimings[j - 1].endTime - 0.01) {
        issues.push({
          index: i,
          wordIndex: j,
          issue: 'word_overlap',
          prevEnd: wordTimings[j - 1].endTime,
          currStart: wordTimings[j].startTime,
        });
      }
    }

    prevEndTime = segment.finalEndTime;
  }

  if (issues.length > 0) {
    logger.warn(`[PODCAST-V2] Offset validation found ${issues.length} issues`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Fix minor timing overlaps by adjusting boundaries
 * @param {Array} segmentsWithOffsets - Segments with calculated offsets
 * @returns {Array} Fixed segments
 */
function fixMinorOverlaps(segmentsWithOffsets) {
  const fixed = [];
  let prevEndTime = 0;

  for (const segment of segmentsWithOffsets) {
    const segmentCopy = { ...segment };

    // Fix segment start if it overlaps with previous
    if (segmentCopy.finalStartTime < prevEndTime) {
      const adjustment = prevEndTime - segmentCopy.finalStartTime;
      segmentCopy.finalStartTime = prevEndTime;
      segmentCopy.offset += adjustment;

      // Adjust all word timings
      segmentCopy.adjustedWordTimings = segmentCopy.adjustedWordTimings.map(wt => ({
        ...wt,
        startTime: wt.startTime + adjustment,
        endTime: wt.endTime + adjustment,
      }));

      segmentCopy.finalEndTime += adjustment;
    }

    // Fix word overlaps within segment
    const wordTimings = segmentCopy.adjustedWordTimings || [];
    for (let j = 1; j < wordTimings.length; j++) {
      if (wordTimings[j].startTime < wordTimings[j - 1].endTime) {
        wordTimings[j].startTime = wordTimings[j - 1].endTime;
        // Ensure end time is after start time
        if (wordTimings[j].endTime <= wordTimings[j].startTime) {
          wordTimings[j].endTime = wordTimings[j].startTime + 0.1;
        }
      }
    }

    fixed.push(segmentCopy);
    prevEndTime = segmentCopy.finalEndTime;
  }

  return fixed;
}

module.exports = {
  calculateOffsets,
  validateOffsetMonotonicity,
  fixMinorOverlaps,
};
