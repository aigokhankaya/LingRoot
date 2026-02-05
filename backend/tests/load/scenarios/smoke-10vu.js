/**
 * Smoke Test - 10 VU
 *
 * Validates that mock infrastructure works correctly
 * and the basic TTS flow completes without errors.
 *
 * Run: k6 run backend/tests/load/scenarios/smoke-10vu.js
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { getAuthHeaders } from './helpers/auth.js';
import { generateTTSPayload } from './helpers/data.js';
import {
  checkJobCreation,
  checkJobPoll,
  jobCompletionTime,
  jobsCompleted,
  jobsFailed,
  jobsTimeout,
} from './helpers/checks.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

export const options = {
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 10 },
        { duration: '2m', target: 10 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.05'],
    job_completion_time: ['p(95)<30000'],
  },
};

export default function () {
  const headers = getAuthHeaders();
  const payload = generateTTSPayload();

  // Step 1: Create TTS job
  const createRes = http.post(
    `${BASE_URL}/api/tts/process-async`,
    JSON.stringify(payload),
    { headers, timeout: '10s' }
  );

  const { success, jobId } = checkJobCreation(createRes);

  if (!success || !jobId) {
    sleep(Math.random() * 3 + 2); // 2-5s backoff
    return;
  }

  // Step 2: Poll for completion
  const startTime = Date.now();
  const MAX_POLLS = 60;
  const POLL_INTERVAL = 5; // seconds

  for (let i = 0; i < MAX_POLLS; i++) {
    sleep(POLL_INTERVAL);

    const pollRes = http.get(
      `${BASE_URL}/api/tts/job/${jobId}`,
      { headers, timeout: '5s' }
    );

    const { done, status } = checkJobPoll(pollRes);

    if (done) {
      const elapsed = Date.now() - startTime;
      jobCompletionTime.add(elapsed);

      if (status === 'completed') {
        jobsCompleted.add(1);
      } else {
        jobsFailed.add(1);
      }
      return;
    }
  }

  // Timeout
  jobsTimeout.add(1);
}

// Periodically poll monitoring endpoint
export function monitorStats() {
  const res = http.get(`${BASE_URL}/api/debug/load-test-stats`, { timeout: '5s' });
  if (res.status === 200) {
    // Stats are logged by k6 automatically in JSON output mode
  }
}
