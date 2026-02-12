/**
 * Grammar Detector
 *
 * Detects grammar structures in text using regex patterns.
 * Used to verify CEFR-appropriate grammar usage.
 */

const GRAMMAR_PATTERNS = {
  passive_voice: {
    pattern: /\b(is|are|was|were|been|being|be)\s+(\w+ed|written|spoken|made|done|seen|given|taken|known|built|held|sent|told|found|brought|thought|kept|felt|left|met|paid|put|run|said|set|shown|shut|sold|spent|stood|taught|won|worn|lost|heard|led|read|understood|chosen|drawn|driven|eaten|fallen|flown|forgotten|frozen|grown|hidden|risen|shaken|stolen|sworn|thrown|woken|broken|hung|caught|fought|bought|sought|struck|torn|begun|drunk|rung|sung|swum|sunk)\b/gi,
    label: 'Passive Voice',
  },
  conditional: {
    pattern: /\bif\s+.{5,60}(will|would|could|might|shall|should)\b/gi,
    label: 'Conditional',
  },
  first_conditional: {
    pattern: /\bif\s+\w+\s+(is|are|have|has|do|does|go|goes|come|comes|want|wants|need|needs|get|gets)\b.{3,40}\bwill\b/gi,
    label: 'First Conditional',
  },
  second_conditional: {
    pattern: /\bif\s+\w+\s+(were|was|had|did|could|knew|went|came|wanted)\b.{3,40}\bwould\b/gi,
    label: 'Second Conditional',
  },
  third_conditional: {
    pattern: /\bif\s+\w+\s+had\s+\w+.{3,50}\bwould\s+have\b/gi,
    label: 'Third Conditional',
  },
  relative_clause: {
    pattern: /\b(who|which|that|whose|whom|where)\s+\w+/gi,
    label: 'Relative Clause',
  },
  present_perfect: {
    pattern: /\b(have|has)\s+(\w+ed|\w+en|been|gone|done|made|seen|given|taken|written|spoken|known|built|held|sent|told|found|brought|thought|kept|felt|left|met|paid|put|run|said|set|shown|sold|spent|stood|taught|won|worn|lost|heard|led|read|understood|chosen|drawn|driven|eaten|fallen|flown|forgotten|frozen|grown|hidden|risen|stolen|thrown|begun|drunk|rung|sung|swum)\b/gi,
    label: 'Present Perfect',
  },
  past_perfect: {
    pattern: /\bhad\s+(\w+ed|\w+en|been|gone|done|made|seen|given|taken|written|spoken|known)\b/gi,
    label: 'Past Perfect',
  },
  simple_present: {
    pattern: /\b(I|you|we|they)\s+(am|are|is|go|come|eat|drink|sleep|work|live|like|want|need|have|do|make|take|see|know|think|say|get|give|find|tell|feel)\b/gi,
    label: 'Simple Present',
  },
  simple_past: {
    pattern: /\b(was|were|went|came|ate|drank|slept|worked|lived|liked|wanted|needed|had|did|made|took|saw|knew|thought|said|got|gave|found|told|felt)\b/gi,
    label: 'Simple Past',
  },
  future_simple: {
    pattern: /\b(will|shall)\s+\w+/gi,
    label: 'Future Simple',
  },
  future_continuous: {
    pattern: /\b(will|shall)\s+be\s+\w+ing\b/gi,
    label: 'Future Continuous',
  },
  modal_verbs: {
    pattern: /\b(can|could|may|might|must|shall|should|would|ought\s+to)\s+\w+/gi,
    label: 'Modal Verbs',
  },
};

/**
 * Detect grammar structures in a text.
 *
 * @param {string} text
 * @returns {Record<string, number>} Map of grammar structure name to occurrence count
 */
function detectStructures(text) {
  if (!text || typeof text !== 'string') return {};

  const results = {};

  for (const [name, { pattern }] of Object.entries(GRAMMAR_PATTERNS)) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    results[name] = matches ? matches.length : 0;
  }

  return results;
}

/**
 * Get list of forbidden grammar structures found in text for a given list.
 *
 * @param {string} text
 * @param {string[]} forbiddenList - Array of grammar structure names
 * @returns {{ name: string, count: number, label: string }[]}
 */
function findForbiddenStructures(text, forbiddenList) {
  const structures = detectStructures(text);
  const violations = [];

  for (const name of forbiddenList) {
    if (structures[name] && structures[name] > 0) {
      violations.push({
        name,
        count: structures[name],
        label: GRAMMAR_PATTERNS[name]?.label || name,
      });
    }
  }

  return violations;
}

module.exports = { detectStructures, findForbiddenStructures, GRAMMAR_PATTERNS };
