const logger = require('../common/logger.js');

/**
 * Semantic Audit Utility
 * Checks if A1-A2 CEFR adaptation loses too much information (>20%)
 * Provides metrics to decide if regeneration is needed
 */

/**
 * Extract key entities from text (proper nouns, numbers, dates)
 * These are facts that should be preserved during adaptation
 */
function extractKeyEntities(text) {
  if (!text) return { properNouns: [], numbers: [], dates: [] };
  
  const entities = {
    properNouns: [],
    numbers: [],
    dates: [],
    sentences: []
  };
  
  // Extract capitalized words (proper nouns) - exclude sentence starts
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  entities.sentences = sentences;
  
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    
    // Skip first word of sentence (might be capitalized normally)
    for (let i = 1; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:'"]/g, '');
      
      // Check if word starts with capital (proper noun)
      if (word.length > 2 && word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase()) {
        if (!entities.properNouns.includes(word)) {
          entities.properNouns.push(word);
        }
      }
    }
  }
  
  // Extract numbers (including written forms)
  const numberPatterns = [
    /\b\d+\.?\d*\b/g,  // 1938, 5.5
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion)\b/gi,
    /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/gi
  ];
  
  for (const pattern of numberPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      entities.numbers.push(...matches.filter(m => !entities.numbers.includes(m)));
    }
  }
  
  // Extract dates (year patterns like 1900-2099, or month names)
  const datePattern = /\b(19|20)\d{2}\b|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s+\d{4})?/gi;
  const dateMatches = text.match(datePattern);
  if (dateMatches) {
    entities.dates.push(...dateMatches);
  }
  
  return entities;
}

/**
 * Count main ideas/concepts in text
 * Approximate by counting topic sentences and key phrases
 */
function countMainIdeas(text) {
  if (!text) return 0;
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Heuristic: Paragraphs often start with topic sentences
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  // Count key concepts: nouns and noun phrases
  const keyPhrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  
  // Estimate main ideas
  const estimatedIdeas = Math.max(
    paragraphs.length,  // At least 1 idea per paragraph
    Math.floor(sentences.length / 3),  // Or ~1 idea per 3 sentences
    Math.floor(keyPhrases.length / 5)  // Or 1 idea per 5 key phrases
  );
  
  return estimatedIdeas;
}

/**
 * Calculate semantic preservation score
 * Compares original and adapted text to measure information retention
 * 
 * @param {string} originalText - Text before CEFR adaptation
 * @param {string} adaptedText - Text after CEFR adaptation
 * @param {string} level - CEFR level (A1, A2, etc.)
 * @returns {Object} Audit results with score and details
 */
function auditSemanticPreservation(originalText, adaptedText, level = 'A1') {
  logger.info(`Starting semantic audit for level ${level}`);
  
  const originalEntities = extractKeyEntities(originalText);
  const adaptedEntities = extractKeyEntities(adaptedText);
  
  const originalIdeas = countMainIdeas(originalText);
  const adaptedIdeas = countMainIdeas(adaptedText);
  
  // Calculate preservation rates
  const properNounPreservation = originalEntities.properNouns.length > 0
    ? adaptedEntities.properNouns.filter(n => originalEntities.properNouns.includes(n)).length / originalEntities.properNouns.length
    : 1.0;
  
  const numberPreservation = originalEntities.numbers.length > 0
    ? adaptedEntities.numbers.filter(n => originalEntities.numbers.some(on => on.includes(n) || n.includes(on))).length / originalEntities.numbers.length
    : 1.0;
  
  const datePreservation = originalEntities.dates.length > 0
    ? adaptedEntities.dates.filter(d => originalEntities.dates.includes(d)).length / originalEntities.dates.length
    : 1.0;
  
  const ideaPreservation = originalIdeas > 0
    ? adaptedIdeas / originalIdeas
    : 1.0;
  
  // Word count comparison
  const originalWordCount = originalText.split(/\s+/).length;
  const adaptedWordCount = adaptedText.split(/\s+/).length;
  const compressionRatio = adaptedWordCount / originalWordCount;
  
  // Sentence count comparison
  const originalSentenceCount = originalEntities.sentences.length;
  const adaptedSentenceCount = adaptedEntities.sentences.length;
  
  // Calculate overall semantic preservation score (weighted average)
  const semanticScore = (
    properNounPreservation * 0.3 +  // 30% weight on proper nouns
    numberPreservation * 0.2 +       // 20% weight on numbers/dates
    datePreservation * 0.1 +         // 10% weight on dates
    ideaPreservation * 0.4           // 40% weight on main ideas
  );
  
  // Determine if regeneration is needed
  const ACCEPTABLE_LOSS_THRESHOLD = 0.20;  // 20% information loss is max acceptable
  const minAcceptableScore = 1.0 - ACCEPTABLE_LOSS_THRESHOLD;
  const needsRegeneration = semanticScore < minAcceptableScore;
  
  const auditResult = {
    level,
    semanticScore: Math.round(semanticScore * 100),  // Convert to percentage
    needsRegeneration,
    details: {
      properNouns: {
        original: originalEntities.properNouns.length,
        preserved: adaptedEntities.properNouns.filter(n => originalEntities.properNouns.includes(n)).length,
        preservationRate: Math.round(properNounPreservation * 100)
      },
      numbers: {
        original: originalEntities.numbers.length,
        preserved: adaptedEntities.numbers.filter(n => originalEntities.numbers.some(on => on.includes(n) || n.includes(on))).length,
        preservationRate: Math.round(numberPreservation * 100)
      },
      dates: {
        original: originalEntities.dates.length,
        preserved: adaptedEntities.dates.filter(d => originalEntities.dates.includes(d)).length,
        preservationRate: Math.round(datePreservation * 100)
      },
      ideas: {
        original: originalIdeas,
        preserved: adaptedIdeas,
        preservationRate: Math.round(ideaPreservation * 100)
      },
      compression: {
        originalWords: originalWordCount,
        adaptedWords: adaptedWordCount,
        ratio: Math.round(compressionRatio * 100)
      },
      sentences: {
        original: originalSentenceCount,
        adapted: adaptedSentenceCount
      }
    },
    recommendation: needsRegeneration
      ? `⚠️ Semantic preservation score (${Math.round(semanticScore * 100)}%) is below threshold (${Math.round(minAcceptableScore * 100)}%). Consider regenerating with stricter preservation rules.`
      : `✅ Semantic preservation is acceptable (${Math.round(semanticScore * 100)}%).`
  };
  
  logger.info(`Semantic audit complete: Score ${auditResult.semanticScore}%, Regeneration needed: ${needsRegeneration}`);
  
  return auditResult;
}

/**
 * Quick check if adaptation is acceptable
 * @param {string} originalText
 * @param {string} adaptedText
 * @param {string} level
 * @returns {boolean} True if acceptable, false if regeneration needed
 */
function isAdaptationAcceptable(originalText, adaptedText, level = 'A1') {
  const audit = auditSemanticPreservation(originalText, adaptedText, level);
  return !audit.needsRegeneration;
}

module.exports = {
  auditSemanticPreservation,
  isAdaptationAcceptable,
  extractKeyEntities,
  countMainIdeas
};
