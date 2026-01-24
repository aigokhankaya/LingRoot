const logger = require('../common/logger.js');

/**
 * Lexical Simplifier for A1-A2 Level Text
 * Replaces complex words with simpler alternatives suitable for beginner learners
 * 
 * This is applied AFTER CEFR adaptation as a post-processing step
 */

// Simplification dictionary: complex word → simple alternative
const SIMPLIFICATION_MAP = {
  // Common verbs
  'purchase': 'buy',
  'obtain': 'get',
  'receive': 'get',
  'acquire': 'get',
  'commence': 'start',
  'initiate': 'start',
  'terminate': 'end',
  'conclude': 'end',
  'utilize': 'use',
  'assist': 'help',
  'demonstrate': 'show',
  'indicate': 'show',
  'observe': 'see',
  'examine': 'look at',
  'construct': 'build',
  'create': 'make',
  'fabricate': 'make',
  'manufacture': 'make',
  
  // Common nouns
  'residence': 'home',
  'dwelling': 'home',
  'automobile': 'car',
  'vehicle': 'car',
  'beverage': 'drink',
  'refreshment': 'drink',
  'nourishment': 'food',
  'cuisine': 'food',
  'employment': 'job',
  'occupation': 'job',
  'profession': 'job',
  'location': 'place',
  'destination': 'place',
  'individual': 'person',
  'individual': 'person',
  'citizen': 'person',
  'populace': 'people',
  'youngster': 'child',
  'offspring': 'child',
  
  // Abstract nouns
  'opportunity': 'chance',
  'possibility': 'chance',
  'difficulty': 'problem',
  'challenge': 'problem',
  'issue': 'problem',
  'concept': 'idea',
  'notion': 'idea',
  'thought': 'idea',
  'method': 'way',
  'technique': 'way',
  'approach': 'way',
  'reason': 'why',
  'purpose': 'why',
  'objective': 'goal',
  'aim': 'goal',
  'target': 'goal',
  
  // Common adjectives
  'enormous': 'big',
  'immense': 'big',
  'massive': 'big',
  'gigantic': 'big',
  'tiny': 'small',
  'minuscule': 'small',
  'miniature': 'small',
  'difficult': 'hard',
  'challenging': 'hard',
  'complex': 'hard',
  'complicated': 'hard',
  'simple': 'easy',
  'straightforward': 'easy',
  'beautiful': 'nice',
  'attractive': 'nice',
  'lovely': 'nice',
  'pleasant': 'nice',
  'horrible': 'bad',
  'terrible': 'bad',
  'awful': 'bad',
  'dreadful': 'bad',
  'excellent': 'good',
  'wonderful': 'good',
  'fantastic': 'good',
  'marvelous': 'good',
  'rapid': 'fast',
  'swift': 'fast',
  'quick': 'fast',
  'intelligent': 'smart',
  'clever': 'smart',
  'bright': 'smart',
  
  // Time expressions
  'currently': 'now',
  'presently': 'now',
  'immediately': 'now',
  'subsequently': 'later',
  'eventually': 'later',
  'previously': 'before',
  'formerly': 'before',
  
  // Government/Politics
  'government': 'leaders',
  'administration': 'leaders',
  'authorities': 'leaders',
  'legislation': 'law',
  'regulation': 'rule',
  'policy': 'plan',
  
  // Technology/Modern
  'modern': 'new',
  'contemporary': 'new',
  'advanced': 'new',
  'traditional': 'old',
  'conventional': 'old',
  'ancient': 'very old',
  
  // Quantity
  'numerous': 'many',
  'several': 'some',
  'various': 'different',
  'diverse': 'different',
  'abundant': 'a lot',
  'plentiful': 'a lot',
  'scarce': 'few',
  
  // Other common words
  'approximately': 'about',
  'nearly': 'almost',
  'frequently': 'often',
  'rarely': 'not often',
  'seldom': 'not often',
  'perhaps': 'maybe',
  'possibly': 'maybe',
  'probably': 'maybe',
  'certainly': 'yes',
  'definitely': 'yes',
  'absolutely': 'yes',
};

/**
 * Apply lexical simplification to text
 * @param {string} text - Input text to simplify
 * @param {string} level - CEFR level (only applies to A1, A2)
 * @returns {string} Simplified text
 */
function simplifyLexically(text, level = 'A1') {
  if (!text) return text;
  
  // Only apply to A1 and A2 levels
  if (!['A1', 'A2'].includes(level.toUpperCase())) {
    logger.debug(`Lexical simplification skipped for level ${level}`);
    return text;
  }
  
  logger.info(`Applying lexical simplification for level ${level}`);
  
  let simplifiedText = text;
  let replacementCount = 0;
  
  // Sort by length (longest first) to avoid partial replacements
  const sortedEntries = Object.entries(SIMPLIFICATION_MAP)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [complex, simple] of sortedEntries) {
    // Case-insensitive word boundary matching
    const regex = new RegExp(`\\b${complex}\\b`, 'gi');
    
    if (regex.test(simplifiedText)) {
      // Preserve original case
      simplifiedText = simplifiedText.replace(regex, (match) => {
        replacementCount++;
        
        // Match case of original word
        if (match[0] === match[0].toUpperCase()) {
          // First letter was uppercase
          return simple.charAt(0).toUpperCase() + simple.slice(1);
        } else {
          return simple;
        }
      });
    }
  }
  
  logger.info(`Lexical simplification complete: ${replacementCount} replacements made`);
  
  return simplifiedText;
}

/**
 * Get statistics about complex words in text
 * @param {string} text - Input text
 * @returns {Object} Statistics
 */
function getComplexWordStats(text) {
  if (!text) return { complexWords: [], count: 0 };
  
  const foundComplexWords = [];
  
  for (const [complex, simple] of Object.entries(SIMPLIFICATION_MAP)) {
    const regex = new RegExp(`\\b${complex}\\b`, 'gi');
    const matches = text.match(regex);
    
    if (matches) {
      foundComplexWords.push({
        word: complex,
        simpler: simple,
        occurrences: matches.length
      });
    }
  }
  
  return {
    complexWords: foundComplexWords,
    count: foundComplexWords.reduce((sum, item) => sum + item.occurrences, 0),
    totalWords: text.split(/\s+/).length
  };
}

/**
 * Add new simplification rule
 * @param {string} complex - Complex word
 * @param {string} simple - Simple alternative
 */
function addSimplificationRule(complex, simple) {
  SIMPLIFICATION_MAP[complex.toLowerCase()] = simple.toLowerCase();
  logger.info(`Added simplification rule: ${complex} → ${simple}`);
}

module.exports = {
  simplifyLexically,
  getComplexWordStats,
  addSimplificationRule,
  SIMPLIFICATION_MAP
};
