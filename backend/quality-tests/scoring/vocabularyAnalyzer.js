/**
 * Vocabulary Analyzer
 *
 * Analyzes vocabulary complexity, diversity, and CEFR appropriateness.
 * Uses COMPLEX_WORDS from dynamicLevelAnalyzer as a reference set.
 */

const { countSyllables, tokenizeWords } = require('./readabilityCalculator');

// Advanced vocabulary words (B2+ indicators) — from dynamicLevelAnalyzer.js
const COMPLEX_WORDS = new Set([
  'nevertheless', 'consequently', 'furthermore', 'notwithstanding',
  'quintessential', 'paradigm', 'juxtaposition', 'dichotomy',
  'ephemeral', 'ubiquitous', 'pragmatic', 'meticulous',
  'comprehensive', 'substantial', 'preliminary', 'subsequent',
  'ambiguous', 'arbitrary', 'coherent', 'unprecedented',
  'deteriorate', 'exacerbate', 'proliferate', 'perpetuate',
  'concomitant', 'superfluous', 'idiosyncratic', 'surreptitious',
]);

// Additional level-forbidden vocabulary
const LEVEL_FORBIDDEN_VOCAB = {
  A1: new Set([
    'community', 'festival', 'celebrate', 'event', 'local',
    'approximately', 'various', 'different', 'museum', 'season',
    'hope', 'joy', 'happiness', 'beauty', 'opportunity',
    'significant', 'essential', 'particularly', 'fundamental',
    ...COMPLEX_WORDS,
  ]),
  A2: new Set([
    'approximately', 'significant', 'essential', 'particularly',
    'fundamental', 'comprehensive', 'consequently', 'furthermore',
    ...COMPLEX_WORDS,
  ]),
  B1: new Set([
    'notwithstanding', 'quintessential', 'juxtaposition',
    'dichotomy', 'ephemeral', 'concomitant', 'superfluous',
    'idiosyncratic', 'surreptitious',
  ]),
  B2: new Set([
    'concomitant', 'superfluous', 'idiosyncratic', 'surreptitious',
  ]),
  C1: new Set([]),
  C2: new Set([]),
};

/**
 * Calculate Type-Token Ratio (lexical diversity).
 * @param {string[]} words
 * @returns {number} Ratio between 0 and 1
 */
function getTypeTokenRatio(words) {
  if (!words || words.length === 0) return 0;
  const types = new Set(words.map(w => w.toLowerCase()));
  return types.size / words.length;
}

/**
 * Get complex words (words with syllable count above threshold).
 * @param {string[]} words
 * @param {number} [syllableThreshold=3] - Minimum syllables to be "complex"
 * @returns {{ word: string, syllables: number }[]}
 */
function getComplexWords(words, syllableThreshold = 3) {
  if (!words) return [];
  return words
    .filter(w => countSyllables(w) >= syllableThreshold)
    .map(w => ({ word: w, syllables: countSyllables(w) }));
}

/**
 * Calculate the ratio of complex words (3+ syllables) to total words.
 * @param {string[]} words
 * @returns {number}
 */
function getComplexWordRatio(words) {
  if (!words || words.length === 0) return 0;
  const complex = getComplexWords(words, 3);
  return complex.length / words.length;
}

/**
 * Calculate average syllables per word.
 * @param {string[]} words
 * @returns {number}
 */
function getAvgSyllablesPerWord(words) {
  if (!words || words.length === 0) return 0;
  const total = words.reduce((sum, w) => sum + countSyllables(w), 0);
  return total / words.length;
}

/**
 * Calculate average word length in characters.
 * @param {string[]} words
 * @returns {number}
 */
function getAvgWordLength(words) {
  if (!words || words.length === 0) return 0;
  const total = words.reduce((sum, w) => sum + w.length, 0);
  return total / words.length;
}

/**
 * Check for vocabulary forbidden at a given CEFR level.
 * @param {string[]} words
 * @param {string} level - CEFR level (e.g. "A1", "B2")
 * @returns {{ word: string, index: number }[]} List of forbidden words found
 */
function checkForbiddenVocabulary(words, level) {
  const upperLevel = (level || '').toUpperCase();
  const forbidden = LEVEL_FORBIDDEN_VOCAB[upperLevel];
  if (!forbidden || forbidden.size === 0) return [];

  const violations = [];
  for (let i = 0; i < words.length; i++) {
    const lower = words[i].toLowerCase();
    if (forbidden.has(lower)) {
      violations.push({ word: words[i], index: i });
    }
  }

  return violations;
}

/**
 * Check if a word is in the known complex words set (B2+ indicator).
 * @param {string} word
 * @returns {boolean}
 */
function isKnownComplexWord(word) {
  return COMPLEX_WORDS.has((word || '').toLowerCase());
}

/**
 * Full vocabulary analysis.
 * @param {string} text
 * @param {string} level - Target CEFR level
 * @returns {object}
 */
function analyzeVocabulary(text, level) {
  const words = tokenizeWords(text);

  return {
    totalWords: words.length,
    uniqueWords: new Set(words.map(w => w.toLowerCase())).size,
    typeTokenRatio: parseFloat(getTypeTokenRatio(words).toFixed(4)),
    avgWordLength: parseFloat(getAvgWordLength(words).toFixed(2)),
    avgSyllablesPerWord: parseFloat(getAvgSyllablesPerWord(words).toFixed(2)),
    complexWordRatio: parseFloat(getComplexWordRatio(words).toFixed(4)),
    complexWords: getComplexWords(words, 3),
    forbiddenVocabulary: checkForbiddenVocabulary(words, level),
    knownAdvancedWords: words.filter(w => isKnownComplexWord(w)),
  };
}

module.exports = {
  getTypeTokenRatio,
  getComplexWords,
  getComplexWordRatio,
  getAvgSyllablesPerWord,
  getAvgWordLength,
  checkForbiddenVocabulary,
  isKnownComplexWord,
  analyzeVocabulary,
  COMPLEX_WORDS,
  LEVEL_FORBIDDEN_VOCAB,
};
