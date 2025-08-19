// backend/utils/costTracker.js
// Centralized cost calculation for OpenAI and Google TTS
const logger = require('./logger');

// Default pricing (USD) per 1K tokens or chars. Can be overridden via ENV JSON.
const defaultOpenAiPricing = {
  // prices per 1K tokens
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'o4-mini': { input: 0.0025, output: 0.005 },
};

const defaultTtsPricingPer1kChars = {
  // Google TTS pricing approximations per 1K chars
  Basic: 0.004,      // Standard
  Premium: 0.016,    // Wavenet/Neural2
  Gold: 0.020,       // Chirp/Journey (approx)
  Platinum: 0.160,   // Studio
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

module.exports = {
  calculateOpenAiCost,
  calculateTtsCost,
};


