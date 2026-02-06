/**
 * Stress Test - 1000 VU
 *
 * Tests graceful degradation under extreme load.
 * Measures memory growth, 503 rates, and event loop lag.
 *
 * Run: k6 run backend/tests/load/scenarios/stress-1000vu.js
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { getAuthHeaders } from './helpers/auth.js';
import { generateTTSPayload, generatePodcastPayload } from './helpers/data.js';
import {
  checkJobCreation,
  checkJobPoll,
  jobCompletionTime,
  jobsCompleted,
  jobsFailed,
  jobsTimeout,
  jobsRejected,
} from './helpers/checks.js';

// 409 = active job exists (business response), 503 = queue full / server busy (backpressure).
// Both are intentional slot-gated responses, not server errors.
http.setResponseCallback(http.expectedStatuses(200, 409, 503));

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

/**
 * Poll an existing job until it completes or fails.
 * Used when a 409 is returned with an existing jobId.
 */
function pollUntilDone(jobId, headers) {
  const MAX_POLLS = 60;
  const startTime = Date.now();

  for (let i = 0; i < MAX_POLLS; i++) {
    sleep(5);

    const pollRes = http.get(
      `${BASE_URL}/api/tts/job/${jobId}`,
      { headers, timeout: '10s' }
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

  jobsTimeout.add(1);
}

export const options = {
  scenarios: {
    tts_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '5m', target: 1000 },
        { duration: '3m', target: 0 },
      ],
      exec: 'ttsFlow',
    },
    podcast_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 10 },
        { duration: '5m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '5m', target: 0 },
      ],
      exec: 'podcastFlow',
    },
    active_job_check: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '10m', target: 200 },
        { duration: '6m', target: 0 },
      ],
      exec: 'activeJobCheck',
    },
    monitor: {
      executor: 'constant-arrival-rate',
      rate: 6,
      timeUnit: '1m',
      duration: '18m',
      preAllocatedVUs: 2,
      exec: 'monitorStats',
    },
  },
  thresholds: {
    // Stress test: these thresholds are intentionally lenient.
    // 1000 VUs on a single Node.js instance will saturate TCP connections.
    // The goal is to verify graceful degradation, not zero-failure operation.
    http_req_duration: ['p(95)<60000'],       // 60s — accounts for queued + retried requests
    http_req_failed: ['rate<0.40'],           // 409+503 excluded; remaining are TCP dial timeouts at peak
    job_completion_time: ['p(95)<120000'],     // jobs that DO complete should finish within 2min
  },
};

export function ttsFlow() {
  const headers = getAuthHeaders('tts');
  const payload = generateTTSPayload();

  const createRes = http.post(
    `${BASE_URL}/api/tts/process-async`,
    JSON.stringify(payload),
    { headers, timeout: '30s' }
  );

  // Handle 409 — poll existing job instead of sleeping
  if (createRes.status === 409) {
    try {
      const body = JSON.parse(createRes.body);
      if (body.jobId) {
        pollUntilDone(body.jobId, headers);
        return;
      }
    } catch { /* ignore parse error */ }
    sleep(Math.random() * 3 + 2);
    return;
  }

  const { success, jobId } = checkJobCreation(createRes);

  if (!success || !jobId) {
    sleep(Math.random() * 3 + 2);
    return;
  }

  pollUntilDone(jobId, headers);
}

export function podcastFlow() {
  const headers = getAuthHeaders('podcast');
  const payload = generatePodcastPayload();

  const createRes = http.post(
    `${BASE_URL}/api/tts/create-podcast-async`,
    JSON.stringify(payload),
    { headers, timeout: '30s' }
  );

  // Handle 409 — poll existing job instead of sleeping
  if (createRes.status === 409) {
    try {
      const body = JSON.parse(createRes.body);
      if (body.jobId) {
        pollUntilDone(body.jobId, headers);
        return;
      }
    } catch { /* ignore parse error */ }
    sleep(Math.random() * 5 + 3);
    return;
  }

  const { success, jobId } = checkJobCreation(createRes);

  if (!success || !jobId) {
    sleep(Math.random() * 5 + 3);
    return;
  }

  pollUntilDone(jobId, headers);
}

export function activeJobCheck() {
  const headers = getAuthHeaders(); // Read-only, no collision concern

  const res = http.get(
    `${BASE_URL}/api/tts/job/active`,
    { headers, timeout: '10s' }
  );

  // This endpoint should return quickly regardless of load
  sleep(Math.random() * 2 + 1);
}

export function monitorStats() {
  http.get(`${BASE_URL}/api/debug/load-test-stats`, { timeout: '5s' });
}
