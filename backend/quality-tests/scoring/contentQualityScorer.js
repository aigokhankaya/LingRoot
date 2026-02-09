/**
 * Content Quality Scorer
 *
 * Wraps existing backend validators:
 *   1. contentQualityValidator.validateContent()
 *   2. semanticAudit.auditSemanticPreservation()
 *   3. dynamicLevelAnalyzer.analyzeMessage()
 */

const path = require('path');

// Resolve paths to existing backend validators
const VALIDATOR_PATH = path.resolve(__dirname, '../../utils/content/contentQualityValidator');
const ANALYZER_PATH = path.resolve(__dirname, '../../utils/content/dynamicLevelAnalyzer');
const AUDIT_PATH = path.resolve(__dirname, '../../utils/ai/semanticAudit');

/**
 * Run content quality validation using existing validator.
 * @param {string} text
 * @returns {{ score: number, valid: boolean, issues: object[], stats: object }}
 */
function runQualityValidation(text) {
  try {
    const { validateContent } = require(VALIDATOR_PATH);
    const result = validateContent(text);
    return {
      score: result.score,
      valid: result.valid,
      issues: result.issues || [],
      stats: result.stats || {},
    };
  } catch (err) {
    return {
      score: -1,
      valid: false,
      issues: [{ type: 'VALIDATOR_ERROR', message: err.message }],
      stats: {},
    };
  }
}

/**
 * Run dynamic level analysis against target level.
 * Returns how well the detected level matches the target.
 * @param {string} text
 * @param {string} targetLevel
 * @returns {{ score: number, detectedLevel: string, adjustment: number, metrics: object }}
 */
function runLevelAnalysis(text, targetLevel) {
  try {
    const { analyzeMessage } = require(ANALYZER_PATH);
    const result = analyzeMessage(text, targetLevel);

    const LEVEL_MAP = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
    const targetIdx = LEVEL_MAP[targetLevel.toUpperCase()] || 3;
    const detectedIdx = LEVEL_MAP[result.detectedLevel] || 3;
    const diff = Math.abs(targetIdx - detectedIdx);

    // Score: exact match = 100, 1 level off = 75, 2 = 50, 3 = 25, 4+ = 0
    const score = Math.max(0, 100 - diff * 25);

    return {
      score,
      detectedLevel: result.detectedLevel,
      adjustment: result.adjustment,
      metrics: result.metrics || {},
    };
  } catch (err) {
    return {
      score: -1,
      detectedLevel: 'UNKNOWN',
      adjustment: 0,
      metrics: { error: err.message },
    };
  }
}

/**
 * Run semantic preservation audit (only when original text is available).
 * @param {string} originalText
 * @param {string} adaptedText
 * @param {string} level
 * @returns {{ score: number, needsRegeneration: boolean, details: object }}
 */
function runSemanticAudit(originalText, adaptedText, level) {
  if (!originalText) {
    return { score: -1, needsRegeneration: false, details: { skipped: true, reason: 'No original text' } };
  }

  try {
    const { auditSemanticPreservation } = require(AUDIT_PATH);
    const result = auditSemanticPreservation(originalText, adaptedText, level);

    return {
      score: result.semanticScore || 0,
      needsRegeneration: result.needsRegeneration || false,
      details: result.details || {},
    };
  } catch (err) {
    return {
      score: -1,
      needsRegeneration: false,
      details: { error: err.message },
    };
  }
}

/**
 * Combined content quality score from all validators.
 * @param {string} text - Generated/adapted text
 * @param {string} targetLevel - CEFR level
 * @param {string} [originalText] - Original text (for semantic audit)
 * @returns {{ score: number, quality: object, levelAnalysis: object, semanticAudit: object }}
 */
function scoreContentQuality(text, targetLevel, originalText) {
  const quality = runQualityValidation(text);
  const levelAnalysis = runLevelAnalysis(text, targetLevel);
  const semanticAudit = runSemanticAudit(originalText, text, targetLevel);

  // Combine quality validator and level analysis scores
  // Quality validator: 50% weight, Level analysis: 50% weight
  const validScores = [];
  if (quality.score >= 0) validScores.push({ score: quality.score, weight: 0.50 });
  if (levelAnalysis.score >= 0) validScores.push({ score: levelAnalysis.score, weight: 0.50 });

  let combinedScore = 50; // default fallback
  if (validScores.length > 0) {
    const totalWeight = validScores.reduce((sum, s) => sum + s.weight, 0);
    combinedScore = validScores.reduce((sum, s) => sum + s.score * (s.weight / totalWeight), 0);
  }

  return {
    score: parseFloat(combinedScore.toFixed(1)),
    quality,
    levelAnalysis,
    semanticAudit,
  };
}

module.exports = { scoreContentQuality, runQualityValidation, runLevelAnalysis, runSemanticAudit };
