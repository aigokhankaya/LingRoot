const { supabase } = require('../storage/supabaseClient.js');
const logger = require('../common/logger.js');

/**
 * Extract reusable daily usage patterns from CEFR-adapted narration
 * using LOCAL DATABASE lookup (Zero Cost).
 * 
 * @param {string} adaptedText
 * @param {string} level - CEFR level (A1-C2)
 * @param {string} requestId
 * @returns {Promise<{parsed: {level: string, daily_patterns: Array}, skipped: boolean, reason: string}>}
 */
async function extractDailyUsagePatterns(adaptedText, level, requestId) {
  // Load test mock: skip DB lookup
  const { isLoadTestMode, getLoadTestDelay } = require('../../tests/load/mocks/mockConfig');
  if (isLoadTestMode()) {
    await new Promise(r => setTimeout(r, getLoadTestDelay('pattern')));
    return { parsed: { level, daily_patterns: [] }, skipped: false, reason: 'load_test_mock' };
  }

  if (!adaptedText) {
    return { parsed: { level, daily_patterns: [] }, skipped: true, reason: 'empty_text' };
  }

  try {
    // 1. Fetch all phrases/patterns from local DB
    // Optimization: In a real large-scale app, we might fetch only relevant categories or cache this
    // For now, we fetch distinct text entries to regex match against
    const { data: proverbs, error } = await supabase
      .from('pattern_library')
      .select('text, translation, explanation, type, level')
      .limit(1000); // Limit to avoid memory explosion, ideally we use Full Text Search on DB side

    if (error) {
      logger.error('[DailyPatternExtractor] DB fetch failed:', error);
      return { parsed: { level, daily_patterns: [] }, skipped: true, reason: 'db_error' };
    }

    const matchedPatterns = [];
    const normalizedText = adaptedText.toLowerCase();

    // 2. Iterate and Match (Simple Regex)
    proverbs.forEach(item => {
      const phrase = item.text.toLowerCase();
      // \b ensures we match "run" but not "running" if exact match needed, 
      // but for phrases like "break a leg", simple includes check is often faster and sufficient for now
      // Logic: escape regex chars
      const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedPhrase}\\b`, 'i');

      if (regex.test(normalizedText)) {
        matchedPatterns.push({
          pattern: item.text,
          turkish_equivalent: item.translation,
          explanation: item.explanation || `${item.type} (${item.level || 'General'})`,
          example_sentence: `Found in text: "...${phrase}..." (Context extraction pending)`
        });
      }
    });

    // Deduplicate
    const uniquePatterns = matchedPatterns.filter((v, i, a) => a.findIndex(t => (t.pattern === v.pattern)) === i);

    logger.info(`[DailyPatternExtractor] Found ${uniquePatterns.length} local patterns.`);

    return {
      parsed: {
        level,
        daily_patterns: uniquePatterns
      },
      skipped: false,
      reason: 'local_lookup_success'
    };

  } catch (err) {
    logger.error('[DailyPatternExtractor] Error:', err);
    return { parsed: { level, daily_patterns: [] }, skipped: true, reason: 'exception' };
  }
}

module.exports = {
  extractDailyUsagePatterns
};
