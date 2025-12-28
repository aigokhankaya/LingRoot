// backend/utils/costTracker.js
// Centralized cost calculation and logging for OpenAI, Google TTS, and Amazon Polly
const logger = require('./logger');
const { supabase } = require('./supabaseClient');

// Default pricing (USD) per 1K tokens or chars. Can be overridden via ENV JSON.
const defaultOpenAiPricing = {
  // prices per 1K tokens
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'o4-mini': { input: 0.0025, output: 0.005 },
};

const defaultTtsPricingPer1kChars = {
  // Google TTS pricing approximations per 1K chars
  Basic: 0.004,      // Standard
  Premium: 0.016,    // Wavenet/Neural2
  Gold: 0.020,       // Chirp/Journey (approx)
  Platinum: 0.160,   // Studio
  // OpenAI TTS pricing per 1K chars
  'openai-standard': 0.015,  // tts-1: $15/1M chars = $0.015/1K
  'openai-hd': 0.030,        // tts-1-hd: $30/1M chars = $0.030/1K
};

// Amazon Polly pricing per 1K chars
const defaultPollyPricingPer1kChars = {
  standard: 0.004,   // Standard voices
  neural: 0.016,     // Neural voices
  long_form: 0.016,  // Long-form voices
};

function getPricingFromEnv(envKey, fallback) {
  try {
    const raw = process.env[envKey];
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed || fallback;
  } catch (e) {
    logger.warn(`[COST] Failed to parse ${envKey}: ${e.message}`);
    return fallback;
  }
}

const openAiPricing = getPricingFromEnv('OPENAI_PRICING_JSON', defaultOpenAiPricing);
const ttsPricing = getPricingFromEnv('GOOGLE_TTS_PRICING_JSON', defaultTtsPricingPer1kChars);

/**
 * Calculate OpenAI cost based on usage and model.
 * @param {{prompt_tokens?: number, completion_tokens?: number, total_tokens?: number}} usage
 * @param {string} model
 */
function calculateOpenAiCost(usage, model) {
  const price = openAiPricing[model] || openAiPricing['gpt-4o'];
  const promptTokens = usage?.prompt_tokens || 0;
  const completionTokens = usage?.completion_tokens || 0;
  const inputCost = (promptTokens / 1000) * (price?.input || 0);
  const outputCost = (completionTokens / 1000) * (price?.output || 0);
  const totalCost = inputCost + outputCost;
  return {
    promptTokens,
    completionTokens,
    totalTokens: usage?.total_tokens || promptTokens + completionTokens,
    inputCostUsd: Number(inputCost.toFixed(6)),
    outputCostUsd: Number(outputCost.toFixed(6)),
    totalCostUsd: Number(totalCost.toFixed(6)),
  };
}

/**
 * Calculate Google TTS cost based on character count and category
 * @param {number} characters
 * @param {'Basic'|'Premium'|'Gold'|'Platinum'} category
 */
function calculateTtsCost(characters, category) {
  const per1k = ttsPricing[category] || ttsPricing['Premium'];
  const cost = (characters / 1000) * per1k;
  return Number(cost.toFixed(6));
}

/**
 * Calculate Amazon Polly cost based on character count and engine
 * @param {number} characters
 * @param {'standard'|'neural'|'long_form'} engine
 */
function calculatePollyCost(characters, engine = 'standard') {
  const pollyPricing = getPricingFromEnv('POLLY_PRICING_JSON', defaultPollyPricingPer1kChars);
  const per1k = pollyPricing[engine] || pollyPricing['standard'];
  const cost = (characters / 1000) * per1k;
  return Number(cost.toFixed(6));
}

/**
 * Log API cost to api_costs table
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.feature - Feature name (e.g., 'topic_subtopics', 'podcast_creation')
 * @param {string} params.provider - Provider name (e.g., 'openai', 'google_tts', 'aws_polly')
 * @param {string} [params.model] - Model name (e.g., 'gpt-4o-mini', 'Joanna')
 * @param {number} [params.inputQuantity] - Input tokens/characters
 * @param {number} [params.outputQuantity] - Output tokens (for OpenAI)
 * @param {number} params.costUsd - Cost in USD
 * @param {Object} [params.metadata] - Additional context (e.g., topic_id)
 */
async function logApiCost({ userId, feature, provider, model, inputQuantity, outputQuantity, costUsd, metadata }) {
  try {
    if (!supabase) {
      logger.error('[COST] Supabase client is not initialized!');
      return;
    }

    const insertData = {
      user_id: userId,
      feature,
      provider,
      model: model || null,
      input_quantity: inputQuantity || 0,
      output_quantity: outputQuantity || 0,
      cost_usd: costUsd,
      metadata: metadata || null,
    };

    const { data, error } = await supabase
      .from('api_costs')
      .insert(insertData)
      .select();

    if (error) {
      logger.error('[COST] Failed to log API cost:', error.message || error.code || JSON.stringify(error));
    } else {
      logger.debug(`[COST] Logged: ${feature} | ${provider} | $${costUsd.toFixed(6)}`);
    }
  } catch (err) {
    logger.error('[COST] Exception logging API cost:', err.message);
  }
}

module.exports = {
  calculateOpenAiCost,
  calculateTtsCost,
  calculatePollyCost,
  logApiCost,
};
