/**
 * Turn Grouper Module for Podcast V2
 * Groups turns by speaker while preserving original indices for later interleaving
 */

const logger = require('../../common/logger.js');

/**
 * Group turns by speaker (Host/Guest)
 * @param {Array} turns - Array of {speaker: 'A'|'B', text: string} objects
 * @returns {Object} Grouped turns with metadata for interleaving
 */
function groupTurnsBySpeaker(turns) {
  if (!turns || !Array.isArray(turns) || turns.length === 0) {
    logger.warn('[PODCAST-V2] groupTurnsBySpeaker: Empty or invalid turns array');
    return {
      hostTurns: [],
      guestTurns: [],
      turnOrder: [],
      turnSpeakerMap: {},
      totalTurns: 0,
    };
  }

  const hostTurns = [];
  const guestTurns = [];
  const turnOrder = [];
  const turnSpeakerMap = {};

  turns.forEach((turn, index) => {
    const speaker = turn.speaker || 'A';
    const text = (turn.text || '').trim();

    // Skip empty turns
    if (!text) {
      logger.warn(`[PODCAST-V2] Skipping empty turn at index ${index}`);
      return;
    }

    const turnData = {
      originalIndex: index,
      speaker,
      text,
      wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
    };

    turnOrder.push(index);
    turnSpeakerMap[index] = speaker;

    if (speaker === 'A') {
      hostTurns.push(turnData);
    } else {
      guestTurns.push(turnData);
    }
  });

  logger.info(`[PODCAST-V2] Grouped ${turns.length} turns: ${hostTurns.length} Host, ${guestTurns.length} Guest`);

  return {
    hostTurns,
    guestTurns,
    turnOrder,
    turnSpeakerMap,
    totalTurns: turnOrder.length,
  };
}

/**
 * Get concatenated text for a speaker (for potential batch processing)
 * @param {Array} speakerTurns - Array of turns for one speaker
 * @returns {Object} Concatenated text and metadata
 */
function getConcatenatedText(speakerTurns) {
  if (!speakerTurns || speakerTurns.length === 0) {
    return {
      text: '',
      turnBoundaries: [],
      totalWords: 0,
    };
  }

  const turnBoundaries = [];
  let currentWordIndex = 0;

  speakerTurns.forEach((turn) => {
    const words = turn.text.split(/\s+/).filter(w => w.length > 0);
    turnBoundaries.push({
      originalIndex: turn.originalIndex,
      startWordIndex: currentWordIndex,
      endWordIndex: currentWordIndex + words.length - 1,
      wordCount: words.length,
    });
    currentWordIndex += words.length;
  });

  const concatenatedText = speakerTurns.map(t => t.text).join(' ');

  return {
    text: concatenatedText,
    turnBoundaries,
    totalWords: currentWordIndex,
  };
}

module.exports = {
  groupTurnsBySpeaker,
  getConcatenatedText,
};
