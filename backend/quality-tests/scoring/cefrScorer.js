/**
 * CEFR Scorer — Main Module
 *
 * Scores text for CEFR compliance against a target level.
 * Combines structural, vocabulary, grammar, and readability metrics.
 *
 * Input:  (text, targetLevel)
 * Output: { score: 0-100, metrics, violations }
 */

const { getThresholds } = require('../config/cefrThresholds');
const { tokenizeSentences, tokenizeWords, fleschKincaidGradeLevel, colemanLiauIndex } = require('./readabilityCalculator');
const { detectStructures, findForbiddenStructures } = require('./grammarDetector');
const { getTypeTokenRatio, getComplexWordRatio, getAvgWordLength, getAvgSyllablesPerWord, checkForbiddenVocabulary } = require('./vocabularyAnalyzer');

/**
 * Calculate how well a value falls within a range.
 * Returns 100 if within range, penalty for being outside.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @param {number} [penaltyPerUnit=10] - Score reduction per unit outside range
 * @returns {number} 0-100
 */
function rangeScore(value, min, max, penaltyPerUnit = 10) {
  if (value >= min && value <= max) return 100;
  const distance = value < min ? min - value : value - max;
  return Math.max(0, 100 - distance * penaltyPerUnit);
}

/**
 * Score sentence length compliance.
 * @param {string[]} sentences
 * @param {object} thresholds
 * @returns {{ score: number, avgLength: number, details: string }}
 */
function scoreSentenceLength(sentences, thresholds) {
  if (sentences.length === 0) return { score: 0, avgLength: 0, details: 'No sentences found' };

  const lengths = sentences.map(s => tokenizeWords(s).length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const { min, max } = thresholds.sentenceLength;

  // Score the average
  const avgScore = rangeScore(avgLength, min, max, 8);

  // Also penalize individual sentences that are way off
  let outlierPenalty = 0;
  for (const len of lengths) {
    if (len > max * 1.5) outlierPenalty += 3;
    if (len < min * 0.5 && len > 0) outlierPenalty += 2;
  }
  outlierPenalty = Math.min(outlierPenalty, 30);

  const finalScore = Math.max(0, avgScore - outlierPenalty);

  return {
    score: parseFloat(finalScore.toFixed(1)),
    avgLength: parseFloat(avgLength.toFixed(1)),
    details: `Avg ${avgLength.toFixed(1)} words/sentence (target: ${min}-${max})`,
  };
}

/**
 * Score vocabulary complexity compliance.
 * @param {string[]} words
 * @param {string} level
 * @param {object} thresholds
 * @returns {{ score: number, metrics: object, details: string }}
 */
function scoreVocabulary(words, level, thresholds) {
  if (words.length === 0) return { score: 0, metrics: {}, details: 'No words found' };

  const ttr = getTypeTokenRatio(words);
  const complexRatio = getComplexWordRatio(words);
  const avgWordLen = getAvgWordLength(words);
  const avgSyllables = getAvgSyllablesPerWord(words);
  const forbidden = checkForbiddenVocabulary(words, level);

  // Score components
  const complexScore = complexRatio <= thresholds.complexWordRatio.max
    ? 100
    : Math.max(0, 100 - (complexRatio - thresholds.complexWordRatio.max) * 500);

  const wordLenScore = rangeScore(avgWordLen, thresholds.avgWordLength.min, thresholds.avgWordLength.max, 15);
  const syllableScore = avgSyllables <= thresholds.syllablesPerWord.max
    ? 100
    : Math.max(0, 100 - (avgSyllables - thresholds.syllablesPerWord.max) * 80);

  // Forbidden vocabulary penalty
  const forbiddenPenalty = Math.min(forbidden.length * 8, 40);

  const rawScore = (complexScore * 0.35 + wordLenScore * 0.30 + syllableScore * 0.35) - forbiddenPenalty;

  return {
    score: parseFloat(Math.max(0, Math.min(100, rawScore)).toFixed(1)),
    metrics: {
      typeTokenRatio: parseFloat(ttr.toFixed(4)),
      complexWordRatio: parseFloat(complexRatio.toFixed(4)),
      avgWordLength: parseFloat(avgWordLen.toFixed(2)),
      avgSyllablesPerWord: parseFloat(avgSyllables.toFixed(2)),
      forbiddenWordsFound: forbidden.length,
    },
    details: `Complex ratio: ${(complexRatio * 100).toFixed(1)}% (max: ${(thresholds.complexWordRatio.max * 100).toFixed(0)}%), ` +
             `Forbidden: ${forbidden.length} words`,
  };
}

/**
 * Score grammar structure compliance.
 * @param {string} text
 * @param {object} thresholds
 * @returns {{ score: number, structures: object, violations: object[], details: string }}
 */
function scoreGrammar(text, thresholds) {
  const structures = detectStructures(text);
  const violations = findForbiddenStructures(text, thresholds.forbiddenGrammar || []);

  // Start at 100, deduct for violations
  let score = 100;

  for (const v of violations) {
    // More occurrences = bigger penalty
    score -= Math.min(v.count * 8, 25);
  }

  // Check required grammar (for higher levels, could require certain structures)
  const required = thresholds.requiredGrammar || [];
  for (const req of required) {
    if (!structures[req] || structures[req] === 0) {
      score -= 10; // Missing expected structure
    }
  }

  return {
    score: parseFloat(Math.max(0, Math.min(100, score)).toFixed(1)),
    structures,
    violations,
    details: violations.length > 0
      ? `${violations.length} forbidden structure(s): ${violations.map(v => `${v.label}(${v.count})`).join(', ')}`
      : 'No grammar violations',
  };
}

/**
 * Score readability compliance.
 * @param {string} text
 * @param {object} thresholds
 * @returns {{ score: number, metrics: object, details: string }}
 */
function scoreReadability(text, thresholds) {
  const fk = fleschKincaidGradeLevel(text);
  const cl = colemanLiauIndex(text);

  const fkScore = rangeScore(fk.gradeLevel, thresholds.fleschKincaid.min, thresholds.fleschKincaid.max, 8);
  const clScore = rangeScore(cl.index, thresholds.colemanLiau.min, thresholds.colemanLiau.max, 8);

  const avgScore = (fkScore + clScore) / 2;

  return {
    score: parseFloat(avgScore.toFixed(1)),
    metrics: {
      fleschKincaidGrade: fk.gradeLevel,
      colemanLiauIndex: cl.index,
    },
    details: `FK Grade: ${fk.gradeLevel} (target: ${thresholds.fleschKincaid.min}-${thresholds.fleschKincaid.max}), ` +
             `CLI: ${cl.index} (target: ${thresholds.colemanLiau.min}-${thresholds.colemanLiau.max})`,
  };
}

/**
 * Calculate CEFR compliance score for a given text and target level.
 *
 * Weights:
 *   - Sentence length:      20%
 *   - Vocabulary complexity: 30%
 *   - Grammar compliance:    30%
 *   - Readability:           20%
 *
 * @param {string} text
 * @param {string} targetLevel - CEFR level (A1-C2)
 * @returns {{ score: number, grade: string, metrics: object, violations: object[], breakdown: object }}
 */
function scoreCefrCompliance(text, targetLevel) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      score: 0,
      grade: 'FAILING',
      metrics: {},
      violations: [],
      breakdown: {},
    };
  }

  const thresholds = getThresholds(targetLevel);
  const sentences = tokenizeSentences(text);
  const words = tokenizeWords(text);

  const sentenceResult = scoreSentenceLength(sentences, thresholds);
  const vocabResult = scoreVocabulary(words, targetLevel, thresholds);
  const grammarResult = scoreGrammar(text, thresholds);
  const readabilityResult = scoreReadability(text, thresholds);

  // Weighted composite score
  const score =
    sentenceResult.score * 0.20 +
    vocabResult.score * 0.30 +
    grammarResult.score * 0.30 +
    readabilityResult.score * 0.20;

  const roundedScore = parseFloat(score.toFixed(1));

  let grade;
  if (roundedScore >= 90) grade = 'EXCELLENT';
  else if (roundedScore >= 75) grade = 'GOOD';
  else if (roundedScore >= 60) grade = 'ACCEPTABLE';
  else if (roundedScore >= 40) grade = 'NEEDS_IMPROVEMENT';
  else grade = 'FAILING';

  return {
    score: roundedScore,
    grade,
    metrics: {
      sentenceLength: sentenceResult.metrics || { avgLength: sentenceResult.avgLength },
      vocabulary: vocabResult.metrics,
      grammar: grammarResult.structures,
      readability: readabilityResult.metrics,
    },
    violations: grammarResult.violations,
    breakdown: {
      sentenceLength: { score: sentenceResult.score, weight: 0.20, details: sentenceResult.details },
      vocabulary: { score: vocabResult.score, weight: 0.30, details: vocabResult.details },
      grammar: { score: grammarResult.score, weight: 0.30, details: grammarResult.details },
      readability: { score: readabilityResult.score, weight: 0.20, details: readabilityResult.details },
    },
  };
}

module.exports = { scoreCefrCompliance };
