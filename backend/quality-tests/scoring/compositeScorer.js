/**
 * Composite Scorer
 *
 * Combines all sub-scores into a final composite score.
 *
 * Standard weights (when semantic preservation applies):
 *   cefrCompliance:       40%
 *   topicRelevance:       20%
 *   contentQuality:       25%
 *   semanticPreservation: 15%
 *
 * When semantic preservation doesn't apply (chat, podcast, quiz):
 *   cefrCompliance:       45%
 *   topicRelevance:       25%
 *   contentQuality:       30%
 */

const { scoreCefrCompliance } = require('./cefrScorer');
const { scoreTopicRelevance } = require('./topicScorer');
const { scoreContentQuality } = require('./contentQualityScorer');

// Areas where semantic preservation does NOT apply
const NO_SEMANTIC_AREAS = new Set([
  'ai_chat', 'podcast', 'quiz', 'mini_activity',
]);

/**
 * Map a numeric score to a grade label.
 * @param {number} score
 * @returns {string}
 */
function getGrade(score) {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 75) return 'GOOD';
  if (score >= 60) return 'ACCEPTABLE';
  if (score >= 40) return 'NEEDS_IMPROVEMENT';
  return 'FAILING';
}

/**
 * Calculate the full composite score for a piece of content.
 *
 * @param {object} params
 * @param {string} params.text - The generated/adapted text
 * @param {string} params.targetLevel - CEFR level (A1-C2)
 * @param {string} params.topic - Topic name
 * @param {string} [params.areaId] - Content area identifier
 * @param {string} [params.originalText] - Original text (for semantic audit)
 * @param {string[]} [params.expectedKeywords] - Custom topic keywords
 * @returns {{
 *   overallScore: number,
 *   grade: string,
 *   cefrCompliance: object,
 *   topicRelevance: object,
 *   contentQuality: object,
 *   semanticPreservation: object|null,
 *   weights: object
 * }}
 */
function calculateCompositeScore({ text, targetLevel, topic, areaId, originalText, expectedKeywords }) {
  // Score each dimension
  const cefrResult = scoreCefrCompliance(text, targetLevel);
  const topicResult = scoreTopicRelevance(text, topic, expectedKeywords);
  const qualityResult = scoreContentQuality(text, targetLevel, originalText);

  const hasSemanticData = originalText && !NO_SEMANTIC_AREAS.has(areaId);
  const semanticScore = hasSemanticData ? qualityResult.semanticAudit.score : -1;

  let overallScore;
  let weights;

  if (hasSemanticData && semanticScore >= 0) {
    // Full weighted formula with semantic preservation
    weights = {
      cefrCompliance: 0.40,
      topicRelevance: 0.20,
      contentQuality: 0.25,
      semanticPreservation: 0.15,
    };
    overallScore =
      cefrResult.score * weights.cefrCompliance +
      topicResult.score * weights.topicRelevance +
      qualityResult.score * weights.contentQuality +
      semanticScore * weights.semanticPreservation;
  } else {
    // Without semantic preservation
    weights = {
      cefrCompliance: 0.45,
      topicRelevance: 0.25,
      contentQuality: 0.30,
      semanticPreservation: 0,
    };
    overallScore =
      cefrResult.score * weights.cefrCompliance +
      topicResult.score * weights.topicRelevance +
      qualityResult.score * weights.contentQuality;
  }

  overallScore = parseFloat(Math.min(100, Math.max(0, overallScore)).toFixed(1));

  return {
    overallScore,
    grade: getGrade(overallScore),
    cefrCompliance: cefrResult,
    topicRelevance: topicResult,
    contentQuality: qualityResult,
    semanticPreservation: hasSemanticData && semanticScore >= 0
      ? { score: semanticScore, details: qualityResult.semanticAudit.details }
      : null,
    weights,
  };
}

module.exports = { calculateCompositeScore, getGrade };
