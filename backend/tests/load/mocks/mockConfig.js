/**
 * Load Test Mock Configuration
 *
 * Central configuration for LOAD_TEST_MODE mocks.
 * When LOAD_TEST_MODE=true, external service calls are replaced
 * with deterministic mock responses to eliminate cost and isolate
 * backend performance characteristics.
 */

function isLoadTestMode() {
  return process.env.LOAD_TEST_MODE === 'true';
}

const DEFAULT_DELAYS = {
  openai: 100,
  tts: 200,
  ttsMulti: 300,
  mfa: 500,
  storage: 50,
  notification: 0,
  pattern: 50,
  director: 50,
};

function getLoadTestDelay(service) {
  const envKey = `LOAD_TEST_${service.toUpperCase()}_DELAY`;
  const envVal = process.env[envKey];
  if (envVal !== undefined && envVal !== '') {
    return parseInt(envVal, 10) || 0;
  }
  return DEFAULT_DELAYS[service] || 0;
}

function shouldSkipFFmpeg() {
  return process.env.LOAD_TEST_SKIP_FFMPEG === 'true';
}

function shouldSkipDBWrites() {
  return process.env.LOAD_TEST_SKIP_DB_WRITES === 'true';
}

module.exports = {
  isLoadTestMode,
  getLoadTestDelay,
  shouldSkipFFmpeg,
  shouldSkipDBWrites,
  DEFAULT_DELAYS,
};
