const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const logger = require('./logger');
const { supabase } = require('./supabaseClient');

let openaiClient = null;
try {
  const apiKeyRaw = process.env.OPENAI_API_KEY || '';
  const apiKey = apiKeyRaw.trim().replace(/^['"]|['"]$/g, '');
  if (!apiKey) {
    logger.warn('[DailyPatternExtractor] OPENAI_API_KEY is not set. Pattern extraction disabled.');
  } else {
    openaiClient = new OpenAI({ apiKey });
    logger.info('[DailyPatternExtractor] OpenAI client initialized.');
  }
} catch (err) {
  logger.error('[DailyPatternExtractor] Failed to initialize OpenAI client:', err);
  openaiClient = null;
}

const PROMPT_PATH = path.join(__dirname, '../prompts/extract_daily_usage_patterns.txt');
let promptTemplateCache = null;

// Minimum pattern count threshold per level before making new OpenAI calls
const MIN_PATTERN_COUNT_THRESHOLD = 50;

function getPromptTemplate() {
  if (!promptTemplateCache) {
    promptTemplateCache = fs.readFileSync(PROMPT_PATH, 'utf8');
  }
  return promptTemplateCache;
}

/**
 * Check if we have enough patterns for a given level in the database
 * @param {string} level - CEFR level (A1, A2, B1, B2, C1, C2)
 * @returns {Promise<{hasEnough: boolean, count: number}>}
 */
async function checkExistingPatternCount(level) {
  if (!supabase) {
    logger.warn('[DailyPatternExtractor] Supabase unavailable, cannot check pattern count');
    return { hasEnough: false, count: 0 };
  }

  try {
    const { data, error } = await supabase
      .from('daily_usage_patterns')
      .select('pattern_count')
      .eq('level', level)
      .order('created_at', { ascending: false })
      .limit(10); // Check last 10 entries

    if (error) {
      logger.error('[DailyPatternExtractor] Error checking pattern count:', error);
      return { hasEnough: false, count: 0 };
    }

    // Sum up total unique patterns from recent entries
    const totalPatterns = data.reduce((sum, entry) => sum + (entry.pattern_count || 0), 0);
    const hasEnough = totalPatterns >= MIN_PATTERN_COUNT_THRESHOLD;

    logger.info(`[DailyPatternExtractor] Pattern count for ${level}: ${totalPatterns} (threshold: ${MIN_PATTERN_COUNT_THRESHOLD})`);

    return { hasEnough, count: totalPatterns };
  } catch (err) {
    logger.error('[DailyPatternExtractor] Failed to check pattern count:', err);
    return { hasEnough: false, count: 0 };
  }
}

function sanitizeJsonText(rawText = '') {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  }
  return cleaned;
}

function parseJsonResponse(rawText, level) {
  const fallback = { level, daily_patterns: [] };
  if (!rawText) return fallback;
  const cleaned = sanitizeJsonText(rawText);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    logger.error('[DailyPatternExtractor] Failed to parse JSON response from OpenAI', {
      error: err.message,
      raw: cleaned.slice(0, 500)
    });
    return fallback;
  }
}

/**
 * Extract reusable daily usage patterns from CEFR-adapted narration.
 * @param {string} adaptedText
 * @param {string} level
 * @param {string} requestId
 * @returns {Promise<{parsed: {level: string, daily_patterns: Array}, rawResponse: string, usage: object|null}>}
 */
async function extractDailyUsagePatterns(adaptedText, level, requestId) {
  if (!openaiClient) {
    logger.warn('[DailyPatternExtractor] OpenAI client unavailable. Skipping pattern extraction.');
    return { parsed: { level, daily_patterns: [] }, rawResponse: '', usage: null, skipped: true, reason: 'no_client' };
  }
  if (!adaptedText || !adaptedText.trim()) {
    logger.warn('[DailyPatternExtractor] Empty adapted text. Skipping pattern extraction.');
    return { parsed: { level, daily_patterns: [] }, rawResponse: '', usage: null, skipped: true, reason: 'empty_text' };
  }

  // Check if we have enough patterns already
  const patternCheck = await checkExistingPatternCount(level);
  if (patternCheck.hasEnough) {
    logger.info(`[DailyPatternExtractor] Skipping OpenAI call - already have ${patternCheck.count} patterns for ${level} (threshold: ${MIN_PATTERN_COUNT_THRESHOLD})`);
    console.log(`[${requestId}] ⏭️  DAILY PATTERNS OpenAI Call SKIPPED - Existing patterns: ${patternCheck.count} >= ${MIN_PATTERN_COUNT_THRESHOLD}`);
    return { 
      parsed: { level, daily_patterns: [] }, 
      rawResponse: '', 
      usage: null, 
      skipped: true, 
      reason: 'sufficient_patterns',
      existingCount: patternCheck.count 
    };
  }

  const promptTemplate = getPromptTemplate();
  const prompt = promptTemplate
    .replace(/\{\{level\}\}/g, level)
    .replace(/\{\{adapted_text\}\}/g, adaptedText);

  // Force gpt-4o-mini for daily patterns (cost optimization)
  const model = 'gpt-4o-mini';

  console.log('[DailyPatternExtractor] 🔍 Model selection debug:', {
    env_var: process.env.OPENAI_PATTERN_MODEL,
    selected_model: model,
    fallback: 'gpt-4o-mini'
  });

  logger.info('[DailyPatternExtractor] Sending request to OpenAI for daily usage patterns', {
    model,
    level,
    requestId
  });

  if (logger.llmCall) {
    logger.llmCall({
      requestId,
      scope: 'dailyPatternExtractor',
      step: 'call',
      model,
      promptName: 'extract_daily_usage_patterns.txt',
      level,
      provider: 'openai',
      note: 'daily usage patterns',
    });
  }

  const completion = await openaiClient.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You are an English language teaching assistant who surfaces reusable phrases.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2
  });

  const rawResponse = completion.choices[0]?.message?.content?.trim() || '';
  const parsed = parseJsonResponse(rawResponse, level);

  const usage = completion.usage ? { ...completion.usage, model } : null;

  if (logger.llmCall && usage) {
    logger.llmCall({
      requestId,
      scope: 'dailyPatternExtractor',
      step: 'summary',
      model,
      promptName: 'extract_daily_usage_patterns.txt',
      level,
      provider: 'openai',
      tokens: usage,
      note: 'daily patterns summary',
    });
  }

  return {
    parsed,
    rawResponse,
    usage,
  };
}

module.exports = {
  extractDailyUsagePatterns,
  checkExistingPatternCount
};
