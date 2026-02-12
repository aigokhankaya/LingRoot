/**
 * Async Poller
 *
 * Polls BullMQ async job completion for endpoints like
 * create-podcast-async and process-async.
 */

const axios = require('axios');
const { config } = require('../config/testConfig');

/**
 * Poll for job completion.
 *
 * @param {string} jobId - BullMQ job ID
 * @param {string} token - JWT token
 * @param {object} [options]
 * @param {number} [options.interval] - Polling interval in ms (default: 5000)
 * @param {number} [options.maxAttempts] - Max polling attempts (default: 60)
 * @returns {Promise<{ success: boolean, data: object|null, status: string, attempts: number, error: string|null }>}
 */
async function pollJobCompletion(jobId, token, options = {}) {
  const interval = options.interval || config.POLL_INTERVAL;
  const maxAttempts = options.maxAttempts || config.POLL_MAX_ATTEMPTS;
  const url = `${config.API_BASE_URL}/tts/job/${encodeURIComponent(jobId)}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 15_000,
        validateStatus: () => true,
      });

      const body = response.data;
      const job = body?.job || body?.data;

      if (!job) {
        // Job not found yet, keep polling
        await sleep(interval);
        continue;
      }

      const status = (job.status || '').toLowerCase();

      if (status === 'completed' || status === 'finished') {
        return {
          success: true,
          data: job.result || job.data || job,
          status: 'completed',
          attempts: attempt,
          error: null,
        };
      }

      if (status === 'failed' || status === 'error') {
        return {
          success: false,
          data: null,
          status: 'failed',
          attempts: attempt,
          error: job.error || job.failedReason || 'Job failed without error message',
        };
      }

      // Still processing
      await sleep(interval);
    } catch (err) {
      // Network error during polling, retry
      if (attempt === maxAttempts) {
        return {
          success: false,
          data: null,
          status: 'poll_error',
          attempts: attempt,
          error: `Polling error: ${err.message}`,
        };
      }
      await sleep(interval);
    }
  }

  return {
    success: false,
    data: null,
    status: 'timeout',
    attempts: maxAttempts,
    error: `Job did not complete within ${maxAttempts} polling attempts (${(maxAttempts * interval / 1000).toFixed(0)}s)`,
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { pollJobCompletion };
