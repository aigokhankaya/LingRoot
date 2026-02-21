/**
 * Turn Interleaver Module for Podcast V2
 * Reconstructs original turn order from separately aligned Host and Guest segments
 */

const logger = require('../../common/logger.js');

/**
 * Interleave Host and Guest segments back to original turn order
 * @param {Object} hostAligned - Aligned Host segments from perSpeakerAligner
 * @param {Object} guestAligned - Aligned Guest segments from perSpeakerAligner
 * @param {Array} turnOrder - Original turn order indices
 * @param {Object} turnSpeakerMap - Map of turn index to speaker ('A' or 'B')
 * @returns {Object} Interleaved segments in original order
 */
function interleaveByTurnOrder(hostAligned, guestAligned, turnOrder, turnSpeakerMap) {
  if (!turnOrder || turnOrder.length === 0) {
    logger.warn('[PODCAST-V2] Empty turn order, returning empty interleaved result');
    return {
      orderedSegments: [],
      totalTurns: 0,
    };
  }

  // Create lookup maps for quick access
  const hostSegmentMap = new Map();
  const guestSegmentMap = new Map();

  if (hostAligned?.alignedSegments) {
    for (const segment of hostAligned.alignedSegments) {
      hostSegmentMap.set(segment.originalIndex, segment);
    }
  }

  if (guestAligned?.alignedSegments) {
    for (const segment of guestAligned.alignedSegments) {
      guestSegmentMap.set(segment.originalIndex, segment);
    }
  }

  logger.info(`[PODCAST-V2] Interleaving ${hostSegmentMap.size} Host + ${guestSegmentMap.size} Guest segments`);

  // Reconstruct original order
  const orderedSegments = [];
  let missingCount = 0;

  for (const turnIndex of turnOrder) {
    const speaker = turnSpeakerMap[turnIndex];
    let segment;

    if (speaker === 'A') {
      segment = hostSegmentMap.get(turnIndex);
    } else {
      segment = guestSegmentMap.get(turnIndex);
    }

    if (segment) {
      orderedSegments.push({
        ...segment,
        speaker,
        speakerLabel: speaker === 'A' ? 'Host' : 'Guest',
      });
    } else {
      logger.warn(`[PODCAST-V2] Missing segment for turn ${turnIndex} (${speaker})`);
      missingCount++;
    }
  }

  if (missingCount > 0) {
    logger.warn(`[PODCAST-V2] ${missingCount} segments missing during interleaving`);
  }

  logger.info(`[PODCAST-V2] Interleaved ${orderedSegments.length} segments in original order`);

  return {
    orderedSegments,
    totalTurns: orderedSegments.length,
    missingTurns: missingCount,
  };
}

/**
 * Validate interleaved segments have all required data
 * @param {Array} orderedSegments - Interleaved segments
 * @returns {Object} Validation result
 */
function validateInterleavedSegments(orderedSegments) {
  const issues = [];

  for (let i = 0; i < orderedSegments.length; i++) {
    const segment = orderedSegments[i];

    if (!segment.audioBuffer) {
      issues.push({ index: i, issue: 'missing_audio' });
    }

    if (!segment.wordTimings || segment.wordTimings.length === 0) {
      issues.push({ index: i, issue: 'missing_word_timings' });
    }

    if (segment.duration === null || segment.duration === undefined) {
      issues.push({ index: i, issue: 'missing_duration' });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    totalSegments: orderedSegments.length,
  };
}

module.exports = {
  interleaveByTurnOrder,
  validateInterleavedSegments,
};
