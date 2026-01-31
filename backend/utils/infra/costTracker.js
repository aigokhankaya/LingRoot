// backend/utils/costTracker.js
// Centralized cost calculation and logging for OpenAI, Google TTS, and Amazon Polly
const logger = require('../common/logger.js');
const { supabase } = require('../storage/supabaseClient.js');
const { metrics } = require('@opentelemetry/api');

// OTel cost metrics — exported to SigNoz for dashboards & alerts
const meter = metrics.getMeter('lingroot-cost');
const costCounter = meter.createCounter('llm_cost_usd', {
  description: 'Cumulative API cost in USD',
  unit: 'usd',
});
const tokenCounter = meter.createCounter('llm_tokens_total', {
  description: 'Cumulative token usage',
  unit: 'tokens',
});

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

// Claude pricing (USD per 1K tokens)
const defaultClaudePricing = {
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
};

// Embedding pricing (USD per 1K tokens)
const defaultEmbeddingPricing = {
  'text-embedding-ada-002': 0.0001,
  'text-embedding-3-small': 0.00002,
  'text-embedding-3-large': 0.00013,
};

// Google Custom Search: $5 / 1000 queries
const GOOGLE_SEARCH_COST_PER_QUERY = 0.005;

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

    // Record in OTel metrics for SigNoz dashboards
    const metricAttrs = { provider, model: model || 'unknown', feature };
    costCounter.add(costUsd, metricAttrs);
    if (inputQuantity) {
      tokenCounter.add(inputQuantity, { ...metricAttrs, direction: 'input' });
    }
    if (outputQuantity) {
      tokenCounter.add(outputQuantity, { ...metricAttrs, direction: 'output' });
    }
  } catch (err) {
    logger.error('[COST] Exception logging API cost:', err.message);
  }
}

/**
 * Return TTS tier pricing for a given provider.
 * @param {'google'|'polly'|string} provider
 * @returns {Object} tier key → { label, costPer1k }
 */
function getTtsTiers(provider) {
  if (provider === 'google') {
    return {
      basic:    { label: 'Basic',    costPer1k: defaultTtsPricingPer1kChars.Basic },
      silver:   { label: 'Silver',   costPer1k: defaultTtsPricingPer1kChars.Premium },
      gold:     { label: 'Gold',     costPer1k: defaultTtsPricingPer1kChars.Gold },
      platinum: { label: 'Platinum', costPer1k: defaultTtsPricingPer1kChars.Platinum },
    };
  }
  // Amazon Polly fallback
  return {
    standard:   { label: 'Standard',   costPer1k: defaultPollyPricingPer1kChars.standard },
    neural:     { label: 'Neural',     costPer1k: defaultPollyPricingPer1kChars.neural },
    generative: { label: 'Generative', costPer1k: 0.030 },
  };
}

/**
 * Calculate Claude API cost based on usage and model.
 * @param {{input_tokens?: number, output_tokens?: number}} usage - Claude usage object
 * @param {string} model - Claude model name
 * @returns {{inputTokens: number, outputTokens: number, totalCostUsd: number}}
 */
function calculateClaudeCost(usage, model) {
  const claudePricing = getPricingFromEnv('CLAUDE_PRICING_JSON', defaultClaudePricing);
  const price = claudePricing[model] || claudePricing['claude-3-5-sonnet-20241022'];
  const inputTokens = usage?.input_tokens || 0;
  const outputTokens = usage?.output_tokens || 0;
  const inputCost = (inputTokens / 1000) * (price?.input || 0);
  const outputCost = (outputTokens / 1000) * (price?.output || 0);
  const totalCost = inputCost + outputCost;
  return {
    inputTokens,
    outputTokens,
    totalCostUsd: Number(totalCost.toFixed(6)),
  };
}

/**
 * Calculate embedding cost based on token count and model.
 * @param {number} tokenCount - Estimated token count
 * @param {string} model - Embedding model name
 * @returns {number} Cost in USD
 */
function calculateEmbeddingCost(tokenCount, model) {
  const embeddingPricing = getPricingFromEnv('EMBEDDING_PRICING_JSON', defaultEmbeddingPricing);
  const costPer1k = embeddingPricing[model] || embeddingPricing['text-embedding-ada-002'];
  const cost = (tokenCount / 1000) * costPer1k;
  return Number(cost.toFixed(6));
}

/**
 * Calculate Google Custom Search cost.
 * @param {number} queryCount - Number of search queries
 * @returns {number} Cost in USD
 */
function calculateGoogleSearchCost(queryCount) {
  return Number((queryCount * GOOGLE_SEARCH_COST_PER_QUERY).toFixed(6));
}

/**
 * Calculate OpenAI TTS cost based on character count and model.
 * @param {number} characters - Number of characters
 * @param {string} model - TTS model ('tts-1' or 'tts-1-hd')
 * @returns {number} Cost in USD
 */
function calculateOpenAiTtsCost(characters, model = 'tts-1') {
  const tier = model === 'tts-1-hd' ? 'openai-hd' : 'openai-standard';
  const per1k = ttsPricing[tier] || ttsPricing['openai-standard'];
  const cost = (characters / 1000) * per1k;
  return Number(cost.toFixed(6));
}

module.exports = {
  calculateOpenAiCost,
  calculateTtsCost,
  calculatePollyCost,
  logApiCost,
  getTtsTiers,
  calculateClaudeCost,
  calculateEmbeddingCost,
  calculateGoogleSearchCost,
  calculateOpenAiTtsCost,
};
