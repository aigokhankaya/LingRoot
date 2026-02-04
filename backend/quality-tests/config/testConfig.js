/**
 * Quality Test Configuration
 *
 * Central configuration for the content quality test system.
 * All sensitive values are read from environment variables.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const config = {
  // API base URL (without trailing slash)
  API_BASE_URL: process.env.QT_API_URL || 'http://localhost:5001/api',

  // Test user credentials
  TEST_USER_EMAIL: process.env.QT_TEST_USER_EMAIL || '',
  TEST_USER_PASSWORD: process.env.QT_TEST_USER_PASSWORD || '',

  // Timeout settings (ms)
  SYNC_TIMEOUT: 120_000,
  ASYNC_TIMEOUT: 300_000,
  POLL_INTERVAL: 5_000,
  POLL_MAX_ATTEMPTS: 60,

  // Cost & rate limiting
  COST_LIMIT_USD: parseFloat(process.env.QT_COST_LIMIT_USD || '5.00'),
  PARALLEL_LIMIT: 1, // serial execution to respect rate limits

  // Estimated cost per API call (USD) — rough averages
  COST_ESTIMATES: {
    tts_pipeline: 0.08,
    podcast: 0.15,
    narration: 0.06,
    topic_pipeline: 0.10,
    topic_narration_preview: 0.06,
    ai_chat: 0.04,
    quiz: 0.05,
    mini_activity: 0.04,
  },

  // Test profiles
  PROFILES: {
    smoke: { levelsPerArea: ['B1'], topicsPerLevel: 1 },
    standard: { levelsPerArea: ['A1', 'B1', 'C1'], topicsPerLevel: 2 },
    full: { levelsPerArea: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], topicsPerLevel: 5 },
  },

  // Results output directory
  RESULTS_DIR: require('path').resolve(__dirname, '../results'),
};

/**
 * Validate that required configuration values are present.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateConfig() {
  const errors = [];
  if (!config.TEST_USER_EMAIL) errors.push('QT_TEST_USER_EMAIL is not set in .env');
  if (!config.TEST_USER_PASSWORD) errors.push('QT_TEST_USER_PASSWORD is not set in .env');
  if (!config.API_BASE_URL) errors.push('QT_API_URL is not set');
  return { valid: errors.length === 0, errors };
}

module.exports = { config, validateConfig };
