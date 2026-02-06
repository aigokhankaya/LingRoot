/**
 * Stress Test - 5000 VU
 *
 * Extreme stress test for 5× the 1000-VU baseline.
 * 1000 VU tests showed event loop saturation at ~800 VU.
 * This scenario pushes to 5000 VU to verify:
 *   - Backpressure (503) works at scale
 *   - No OOM / crash under sustained peak
 *   - Queue drain & recovery after ramp-down
 *
 * Thresholds are intentionally very lenient — the goal is survival, not SLA.
 *
 * --- First run results (2025-06-04) ---
 * http_req_failed: 94.51% — FAILED threshold (<60%)
 * Root cause: k6 http_req_failed counts TCP-level failures (status=0) alongside
 * HTTP errors. At 5000 VU, Node.js TCP backlog (OS default: 511) overflows,
 * causing ~95K+ requests to be rejected at TCP level (no HTTP response at all).
 * Actual HTTP error rate (real 5xx, excluding 503 backpressure) was near zero.
 *
 * Positive findings:
 *   - Backend: no crash, no OOM ✓
 *   - job_completion_time p95: 5.3s (threshold 180s) ✓
 *   - jobs_completed: 30 (queue functioning) ✓
 *   - Backpressure (503) working correctly ✓
 *
 * Fix: separate TCP errors from HTTP errors via custom metrics,
 * and adjust http_req_failed threshold to account for TCP rejections.
 *
 * --- Second run results (2025-06-04) ---
 * 4/5 thresholds passed. tcp_errors threshold failed due to Counter metric
 * using `rate` (events/sec) instead of percentage — removed.
 * Also discovered: 429 (per-user rate limit) was not in expectedStatuses,
 * so ~758K 429 responses were counted as "failures" alongside ~110K TCP errors.
 * Actual failure = only TCP errors (~12% of total).
 * Fix: added 429 to expectedStatuses, adjusted http_req_failed to <30%.
 *
 * Run: k6 run backend/tests/load/scenarios/stress-5000vu.js
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { getAuthHeaders } from './helpers/auth.js';
import { generateTTSPayload, generatePodcastPayload } from './helpers/data.js';
import {
  checkJobCreation,
  checkJobPoll,
  trackRequestErrors,
  jobCompletionTime,
  jobsCompleted,
  jobsFailed,
  jobsTimeout,
  jobsRejected,
} from './helpers/checks.js';

// 409 = active job exists, 429 = per-user rate limit, 503 = global queue full.
// All are intentional slot-gated responses, not server errors.
http.setResponseCallback(http.expectedStatuses(200, 409, 429, 503));

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
        { duration: '2m', target: 200 },
        { duration: '3m', target: 1000 },
        { duration: '5m', target: 3000 },
        { duration: '5m', target: 5000 },
        { duration: '5m', target: 5000 },   // sustain peak
        { duration: '5m', target: 0 },       // ramp-down
      ],
      exec: 'ttsFlow',
    },
    podcast_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 20 },
        { duration: '5m', target: 100 },
        { duration: '7m', target: 200 },
        { duration: '5m', target: 200 },     // sustain
        { duration: '5m', target: 0 },
      ],
      exec: 'podcastFlow',
    },
    active_job_check: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '15m', target: 500 },
        { duration: '8m', target: 0 },
      ],
      exec: 'activeJobCheck',
    },
    monitor: {
      executor: 'constant-arrival-rate',
      rate: 6,
      timeUnit: '1m',
      duration: '25m',
      preAllocatedVUs: 2,
      exec: 'monitorStats',
    },
  },
  thresholds: {
    // 5000 VU stress: lenient thresholds for single Node.js process.
    // 429 + 503 are expected (backpressure). Only TCP failures count as http_req_failed.
    http_req_duration: ['p(95)<120000'],      // 120s — extreme queuing expected
    http_req_failed: ['rate<0.30'],           // ~12% TCP failures expected at 5000 VU
    http_server_errors: ['count<100'],         // real 5xx (excluding 503 backpressure) should be near zero
    job_completion_time: ['p(95)<180000'],     // jobs that DO complete: within 3min
    // tcp_errors: no threshold — informational only (Counter rate = events/sec, not %).
    // Visible in CUSTOM output section.
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
  trackRequestErrors(createRes);

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
  trackRequestErrors(createRes);

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
  trackRequestErrors(res);

  // This endpoint should return quickly regardless of load
  sleep(Math.random() * 2 + 1);
}

export function monitorStats() {
  const res = http.get(`${BASE_URL}/api/debug/load-test-stats`, { timeout: '5s' });
  trackRequestErrors(res);
}
