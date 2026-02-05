/**
 * Load Test - 100 VU
 *
 * Tests concurrency limiter behavior, DB pool exhaustion,
 * and queue pressure under moderate load.
 *
 * Run: k6 run backend/tests/load/scenarios/load-100vu.js
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
} from './helpers/checks.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

export const options = {
  scenarios: {
    tts_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 25 },
        { duration: '2m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      exec: 'ttsFlow',
    },
    podcast_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 5 },
        { duration: '3m', target: 10 },
        { duration: '5m', target: 10 },
        { duration: '3m', target: 0 },
      ],
      exec: 'podcastFlow',
    },
    monitor: {
      executor: 'constant-arrival-rate',
      rate: 6, // 6 requests per minute = every 10s
      timeUnit: '1m',
      duration: '13m',
      preAllocatedVUs: 1,
      exec: 'monitorStats',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<10000'],
    http_req_failed: ['rate<0.10'],
    job_completion_time: ['p(95)<60000'],
  },
};

export function ttsFlow() {
  const headers = getAuthHeaders();
  const payload = generateTTSPayload();

  // Create TTS job
  const createRes = http.post(
    `${BASE_URL}/api/tts/process-async`,
    JSON.stringify(payload),
    { headers, timeout: '15s' }
  );

  const { success, jobId } = checkJobCreation(createRes);

  if (!success || !jobId) {
    sleep(Math.random() * 3 + 2);
    return;
  }

  // Poll for completion
  const startTime = Date.now();
  const MAX_POLLS = 60;

  for (let i = 0; i < MAX_POLLS; i++) {
    sleep(5);

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

  jobsTimeout.add(1);
}

export function podcastFlow() {
  const headers = getAuthHeaders();
  const payload = generatePodcastPayload();

  // Create podcast job
  const createRes = http.post(
    `${BASE_URL}/api/tts/create-podcast-async`,
    JSON.stringify(payload),
    { headers, timeout: '15s' }
  );

  const { success, jobId } = checkJobCreation(createRes);

  if (!success || !jobId) {
    sleep(Math.random() * 5 + 3);
    return;
  }

  // Poll for completion (podcasts take longer)
  const startTime = Date.now();
  const MAX_POLLS = 60;

  for (let i = 0; i < MAX_POLLS; i++) {
    sleep(5);

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

  jobsTimeout.add(1);
}

export function monitorStats() {
  http.get(`${BASE_URL}/api/debug/load-test-stats`, { timeout: '5s' });
}
