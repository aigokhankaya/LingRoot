/**
 * Readability Calculator
 *
 * Computes Flesch-Kincaid Grade Level and Coleman-Liau Index.
 * Pure JavaScript, no external dependencies.
 */

/**
 * Count syllables in a word using a heuristic approach.
 * @param {string} word
 * @returns {number}
 */
function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 2) return 1;

  // Vowel groups
  const vowelGroups = w.match(/[aeiouy]+/g);
  if (!vowelGroups) return 1;

  let count = vowelGroups.length;

  // Silent e at the end
  if (w.endsWith('e') && !w.endsWith('le') && count > 1) {
    count--;
  }

  // Common suffixes that don't add syllables
  if (w.endsWith('es') && !w.endsWith('les') && !w.endsWith('tes') && !w.endsWith('ses') && !w.endsWith('zes')) {
    // "es" often silent at end
  }

  // "ed" suffix usually silent except after t/d
  if (w.endsWith('ed') && w.length > 3) {
    const preEd = w.charAt(w.length - 3);
    if (preEd !== 't' && preEd !== 'd') {
      count = Math.max(1, count - 1);
    }
  }

  return Math.max(1, count);
}

/**
 * Tokenize text into sentences.
 * @param {string} text
 * @returns {string[]}
 */
function tokenizeSentences(text) {
  if (!text || typeof text !== 'string') return [];
  // Split on sentence-ending punctuation followed by whitespace or end
  const sentences = text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  return sentences;
}

/**
 * Tokenize text into words.
 * @param {string} text
 * @returns {string[]}
 */
function tokenizeWords(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && /[a-zA-Z]/.test(w));
}

/**
 * Calculate Flesch-Kincaid Grade Level.
 * Formula: 0.39 * (totalWords/totalSentences) + 11.8 * (totalSyllables/totalWords) - 15.59
 *
 * @param {string} text
 * @returns {{ gradeLevel: number, totalWords: number, totalSentences: number, totalSyllables: number }}
 */
function fleschKincaidGradeLevel(text) {
  const sentences = tokenizeSentences(text);
  const words = tokenizeWords(text);

  const totalSentences = Math.max(sentences.length, 1);
  const totalWords = Math.max(words.length, 1);
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const gradeLevel = 0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59;

  return {
    gradeLevel: Math.max(0, parseFloat(gradeLevel.toFixed(2))),
    totalWords,
    totalSentences,
    totalSyllables,
  };
}

/**
 * Calculate Coleman-Liau Index.
 * Formula: 0.0588 * L - 0.296 * S - 15.8
 * where L = avg letters per 100 words, S = avg sentences per 100 words
 *
 * @param {string} text
 * @returns {{ index: number, avgLettersPer100: number, avgSentencesPer100: number }}
 */
function colemanLiauIndex(text) {
  const sentences = tokenizeSentences(text);
  const words = tokenizeWords(text);

  const totalSentences = Math.max(sentences.length, 1);
  const totalWords = Math.max(words.length, 1);
  const totalLetters = words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, '').length, 0);

  const L = (totalLetters / totalWords) * 100;
  const S = (totalSentences / totalWords) * 100;

  const index = 0.0588 * L - 0.296 * S - 15.8;

  return {
    index: parseFloat(index.toFixed(2)),
    avgLettersPer100: parseFloat(L.toFixed(2)),
    avgSentencesPer100: parseFloat(S.toFixed(2)),
  };
}

module.exports = {
  countSyllables,
  tokenizeSentences,
  tokenizeWords,
  fleschKincaidGradeLevel,
  colemanLiauIndex,
};
