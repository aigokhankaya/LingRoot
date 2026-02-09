/**
 * Topic Scorer
 *
 * Scores how well the generated text matches the expected topic.
 * Uses keyword presence and topic word frequency.
 */

const { tokenizeWords } = require('./readabilityCalculator');

// Topic keyword definitions
const TOPIC_KEYWORDS = {
  technology: [
    'technology', 'computer', 'internet', 'software', 'digital',
    'phone', 'app', 'data', 'online', 'device', 'robot', 'ai',
    'machine', 'code', 'program', 'screen', 'network', 'website',
    'smart', 'tech', 'system', 'electronic', 'innovation', 'cyber',
  ],
  food_culture: [
    'food', 'cook', 'eat', 'meal', 'recipe', 'kitchen', 'taste',
    'dish', 'restaurant', 'culture', 'tradition', 'spice', 'flavor',
    'ingredient', 'bread', 'meat', 'vegetable', 'fruit', 'drink',
    'breakfast', 'lunch', 'dinner', 'delicious', 'cuisine', 'chef',
  ],
  space: [
    'space', 'planet', 'star', 'moon', 'sun', 'earth', 'galaxy',
    'universe', 'astronaut', 'rocket', 'orbit', 'nasa', 'satellite',
    'telescope', 'mars', 'solar', 'cosmic', 'exploration', 'gravity',
    'astronomy', 'meteor', 'comet', 'alien', 'spacecraft',
  ],
  environment: [
    'environment', 'climate', 'nature', 'pollution', 'recycle',
    'energy', 'water', 'ocean', 'forest', 'animal', 'green',
    'earth', 'carbon', 'temperature', 'weather', 'ecosystem',
    'renewable', 'sustainable', 'waste', 'conservation', 'global',
    'warming', 'tree', 'species', 'biodiversity',
  ],
  history: [
    'history', 'ancient', 'century', 'war', 'king', 'empire',
    'civilization', 'revolution', 'discovery', 'invention', 'period',
    'era', 'culture', 'people', 'country', 'world', 'year', 'past',
    'museum', 'monument', 'leader', 'battle', 'colony', 'dynasty',
  ],
};

/**
 * Get keywords for a topic. Falls back to extracting words from the topic string.
 * @param {string} topic
 * @param {string[]} [customKeywords]
 * @returns {string[]}
 */
function getTopicKeywords(topic, customKeywords) {
  if (customKeywords && customKeywords.length > 0) return customKeywords;

  const normalized = (topic || '').toLowerCase().replace(/[_-]/g, ' ');

  // Check predefined topics
  for (const [key, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return keywords;
    }
  }

  // Fallback: extract meaningful words from the topic itself
  const topicWords = normalized.split(/\s+/).filter(w => w.length > 2);
  return topicWords;
}

/**
 * Calculate keyword presence score.
 * @param {string[]} textWords - Words from the text (lowercased)
 * @param {string[]} keywords - Expected keywords
 * @returns {{ score: number, found: string[], missing: string[], foundRatio: number }}
 */
function keywordPresenceScore(textWords, keywords) {
  if (!keywords || keywords.length === 0) return { score: 50, found: [], missing: [], foundRatio: 0 };

  const textSet = new Set(textWords.map(w => w.toLowerCase()));
  const found = [];
  const missing = [];

  for (const kw of keywords) {
    if (textSet.has(kw.toLowerCase())) {
      found.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const foundRatio = found.length / keywords.length;
  // Score: at least 30% of keywords present = 100, scale down from there
  const score = Math.min(100, (foundRatio / 0.30) * 100);

  return {
    score: parseFloat(Math.min(100, score).toFixed(1)),
    found,
    missing,
    foundRatio: parseFloat(foundRatio.toFixed(4)),
  };
}

/**
 * Calculate topic word frequency score.
 * Measures how much of the text is "on topic" based on keyword occurrences.
 * @param {string[]} textWords
 * @param {string[]} keywords
 * @returns {{ score: number, frequency: number, keywordOccurrences: number }}
 */
function topicWordFrequencyScore(textWords, keywords) {
  if (!textWords.length || !keywords.length) return { score: 50, frequency: 0, keywordOccurrences: 0 };

  const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
  let occurrences = 0;

  for (const word of textWords) {
    if (keywordSet.has(word.toLowerCase())) {
      occurrences++;
    }
  }

  const frequency = occurrences / textWords.length;
  // 5% keyword density = ideal; scale linearly
  const score = Math.min(100, (frequency / 0.05) * 100);

  return {
    score: parseFloat(Math.min(100, score).toFixed(1)),
    frequency: parseFloat(frequency.toFixed(4)),
    keywordOccurrences: occurrences,
  };
}

/**
 * Score topic relevance for generated text.
 *
 * Final score = keywordPresence * 0.6 + topicFrequency * 0.4
 *
 * @param {string} text
 * @param {string} topic
 * @param {string[]} [expectedKeywords] - Custom keywords (optional)
 * @returns {{ score: number, presence: object, frequency: object, keywords: string[] }}
 */
function scoreTopicRelevance(text, topic, expectedKeywords) {
  const words = tokenizeWords(text);
  const keywords = getTopicKeywords(topic, expectedKeywords);

  const presence = keywordPresenceScore(words, keywords);
  const frequency = topicWordFrequencyScore(words, keywords);

  const score = presence.score * 0.6 + frequency.score * 0.4;

  return {
    score: parseFloat(Math.min(100, score).toFixed(1)),
    presence,
    frequency,
    keywords,
  };
}

module.exports = { scoreTopicRelevance, getTopicKeywords, TOPIC_KEYWORDS };
