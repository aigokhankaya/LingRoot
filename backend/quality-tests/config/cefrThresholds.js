/**
 * CEFR Level Thresholds
 *
 * Measurable thresholds for each CEFR level.
 * Derived from dynamicLevelAnalyzer.js LEVEL_INDICATORS and legacy CEFR prompt files.
 */

const CEFR_THRESHOLDS = {
  A1: {
    sentenceLength: { min: 3, max: 12 },
    avgWordLength: { min: 2.5, max: 4.5 },
    syllablesPerWord: { max: 1.6 },
    typeTokenRatio: { min: 0.40, max: 0.85 },
    complexWordRatio: { max: 0.02 },
    fleschKincaid: { min: 0, max: 3.0 },
    colemanLiau: { min: 0, max: 4.0 },
    forbiddenGrammar: [
      'passive_voice',
      'conditional',
      'relative_clause',
      'present_perfect',
      'past_perfect',
      'future_continuous',
    ],
    requiredGrammar: [],
  },
  A2: {
    sentenceLength: { min: 5, max: 14 },
    avgWordLength: { min: 3.0, max: 5.0 },
    syllablesPerWord: { max: 1.8 },
    typeTokenRatio: { min: 0.45, max: 0.85 },
    complexWordRatio: { max: 0.05 },
    fleschKincaid: { min: 1.0, max: 5.0 },
    colemanLiau: { min: 1.0, max: 6.0 },
    forbiddenGrammar: [
      'passive_voice',
      'past_perfect',
      'third_conditional',
      'future_continuous',
    ],
    requiredGrammar: [],
  },
  B1: {
    sentenceLength: { min: 6, max: 18 },
    avgWordLength: { min: 3.5, max: 5.5 },
    syllablesPerWord: { max: 2.0 },
    typeTokenRatio: { min: 0.45, max: 0.90 },
    complexWordRatio: { max: 0.10 },
    fleschKincaid: { min: 4.0, max: 9.0 },
    colemanLiau: { min: 5.0, max: 10.0 },
    forbiddenGrammar: ['third_conditional'],
    requiredGrammar: [],
  },
  B2: {
    sentenceLength: { min: 8, max: 22 },
    avgWordLength: { min: 4.0, max: 6.0 },
    syllablesPerWord: { max: 2.3 },
    typeTokenRatio: { min: 0.50, max: 0.92 },
    complexWordRatio: { max: 0.18 },
    fleschKincaid: { min: 7.0, max: 13.0 },
    colemanLiau: { min: 8.0, max: 13.0 },
    forbiddenGrammar: [],
    requiredGrammar: [],
  },
  C1: {
    sentenceLength: { min: 10, max: 28 },
    avgWordLength: { min: 4.5, max: 7.0 },
    syllablesPerWord: { max: 2.6 },
    typeTokenRatio: { min: 0.55, max: 0.95 },
    complexWordRatio: { max: 0.30 },
    fleschKincaid: { min: 10.0, max: 16.0 },
    colemanLiau: { min: 10.0, max: 16.0 },
    forbiddenGrammar: [],
    requiredGrammar: [],
  },
  C2: {
    sentenceLength: { min: 12, max: 35 },
    avgWordLength: { min: 5.0, max: 8.0 },
    syllablesPerWord: { max: 3.0 },
    typeTokenRatio: { min: 0.55, max: 0.98 },
    complexWordRatio: { max: 0.40 },
    fleschKincaid: { min: 12.0, max: 20.0 },
    colemanLiau: { min: 12.0, max: 20.0 },
    forbiddenGrammar: [],
    requiredGrammar: [],
  },
};

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Get thresholds for a specific CEFR level.
 * @param {string} level
 * @returns {object}
 */
function getThresholds(level) {
  const upper = (level || '').toUpperCase();
  if (!CEFR_THRESHOLDS[upper]) {
    throw new Error(`Unknown CEFR level: ${level}`);
  }
  return CEFR_THRESHOLDS[upper];
}

module.exports = { CEFR_THRESHOLDS, CEFR_LEVELS, getThresholds };
