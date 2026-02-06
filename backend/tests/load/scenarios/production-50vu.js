/**
 * Production Load Test v2 - 15 VU (C2 Level + Long Content)
 *
 * MFA concurrency fix sonrası production performans testi.
 * Her VU önce login yapıp token alır, sonra job oluşturur.
 *
 * NOT: 512MB Render memory limiti nedeniyle 50 → 15 VU'ya düşürüldü.
 *
 * Ön koşul:
 *   seed-production-test-users.sql production DB'de çalıştırılmış olmalı
 *
 * Çalıştırma:
 *   k6 run backend/tests/load/scenarios/production-50vu.js 2>&1 | tee backend/tests/load/reports/test-$(date +%Y%m%d-%H%M).log
 *
 * Test Parametreleri (v2 - reduced):
 *   - 10 TTS job: C2 level, ~500+ kelime (2 sayfa) metin
 *   - 5 Podcast job: C2 level, 7 dakika
 *   - Polling timeout: 15 dakika
 *   - Detaylı job loglama: [JOB_DETAIL] JSON formatında
 *
 * Hedef Metrikler:
 *   - TTS tamamlanma: ≥90% (≥9/10)
 *   - Podcast tamamlanma: ≥90% (≥4/5)
 *   - TTS ortalama süre: <3 dakika
 *   - Podcast ortalama süre: <10 dakika
 */

import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'https://lingloops-backend.onrender.com';
const TEST_PASSWORD = 'LoadTest123!';

// Custom metrics
const jobCompletionTime = new Trend('job_completion_time');
const ttsCompletionTime = new Trend('tts_completion_time');
const podcastCompletionTime = new Trend('podcast_completion_time');
const jobsCompleted = new Counter('jobs_completed');
const jobsFailed = new Counter('jobs_failed');
const jobsTimeout = new Counter('jobs_timeout');
const loginsFailed = new Counter('logins_failed');
const ttsCompleted = new Counter('tts_completed');
const podcastCompleted = new Counter('podcast_completed');

// Job details for final report
const jobDetails = {
  tts: [],
  podcast: [],
};

// Load mock texts for payloads
const mockTexts = new SharedArray('mock-texts', function () {
  return [JSON.parse(open('../fixtures/mock-texts.json'))];
});

// Test user emails (VU 1-30: TTS, VU 31-50: Podcast)
function getTestUserEmail(vuId, scenario) {
  // TTS users: 1-30, Podcast users: 31-50
  if (scenario === 'podcast') {
    const podcastIndex = ((vuId - 1) % 20) + 31;
    return `loadtest-${String(podcastIndex).padStart(4, '0')}@loadtest.lingroot.com`;
  }
  const ttsIndex = ((vuId - 1) % 30) + 1;
  return `loadtest-${String(ttsIndex).padStart(4, '0')}@loadtest.lingroot.com`;
}

// Login and get token
function login(email) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password: TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '30s' }
  );

  const success = check(res, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        // Token is in data.token (not body.token)
        return body.data?.token || body.token;
      } catch { return false; }
    },
  });

  if (!success) {
    console.log(`[VU ${__VU}] Login failed for ${email}: ${res.status} ${res.body}`);
    loginsFailed.add(1);
    return null;
  }

  try {
    const body = JSON.parse(res.body);
    // Token is in data.token (not body.token)
    return body.data?.token || body.token;
  } catch {
    return null;
  }
}

// Generate TTS payload - C2 level, very long text (2+ pages)
function generateTTSPayload() {
  return {
    type: 'text',
    input: mockTexts[0].very_long,  // ~500+ words (2+ pages)
    level: 'C2',                     // Fixed C2 level
    voice: 'en-US-Neural2-C',
    speakingRate: 1.05,
  };
}

// Generate Podcast payload - C2 level, 7 minutes
function generatePodcastPayload() {
  const topics = mockTexts[0].topic_suggestions;
  return {
    topic: topics[Math.floor(Math.random() * topics.length)],
    level: 'C2',          // Fixed C2 level
    duration: 7,          // 7 minutes (up from 5)
    styleType: 'friendly_chat',
  };
}

// Check job creation response
function checkJobCreation(res) {
  if (res.status !== 200) {
    return { success: false, jobId: null };
  }
  try {
    const body = JSON.parse(res.body);
    return { success: body.success, jobId: body.jobId };
  } catch {
    return { success: false, jobId: null };
  }
}

// Poll job until done - with job type tracking
function pollUntilDone(jobId, headers, jobType = 'tts') {
  const MAX_POLLS = 180;  // 180 × 5s = 15 dakika max
  const startTime = Date.now();

  for (let i = 0; i < MAX_POLLS; i++) {
    sleep(5);

    const res = http.get(`${BASE_URL}/api/tts/job/${jobId}`, { headers, timeout: '10s' });

    if (res.status !== 200) continue;

    try {
      const body = JSON.parse(res.body);
      const status = body.job?.status;

      if (status === 'completed' || status === 'failed') {
        const elapsed = Date.now() - startTime;
        const elapsedSec = Math.round(elapsed / 1000);
        jobCompletionTime.add(elapsed);

        // Track job-type specific metrics
        if (jobType === 'tts') {
          ttsCompletionTime.add(elapsed);
        } else {
          podcastCompletionTime.add(elapsed);
        }

        if (status === 'completed') {
          jobsCompleted.add(1);
          if (jobType === 'tts') {
            ttsCompleted.add(1);
          } else {
            podcastCompleted.add(1);
          }
          console.log(`[VU ${__VU}] ${jobType.toUpperCase()} Job ${jobId} completed in ${elapsedSec}s`);
        } else {
          jobsFailed.add(1);
          console.log(`[VU ${__VU}] ${jobType.toUpperCase()} Job ${jobId} failed: ${body.job?.error || 'unknown'}`);
        }

        // Log job detail for final report
        console.log(`[JOB_DETAIL] {"type":"${jobType}","jobId":"${jobId}","status":"${status}","duration_sec":${elapsedSec},"vu":${__VU}}`);
        return;
      }
    } catch { /* continue polling */ }
  }

  jobsTimeout.add(1);
  console.log(`[VU ${__VU}] ${jobType.toUpperCase()} Job ${jobId} timed out after 15 minutes`);
  console.log(`[JOB_DETAIL] {"type":"${jobType}","jobId":"${jobId}","status":"timeout","duration_sec":900,"vu":${__VU}}`);
}

export const options = {
  scenarios: {
    tts_production: {
      executor: 'shared-iterations',
      vus: 10,           // Reduced: 30 → 10 (512MB memory limit)
      iterations: 10,
      maxDuration: '20m',
      exec: 'ttsFlow',
    },
    podcast_production: {
      executor: 'shared-iterations',
      vus: 5,            // Reduced: 20 → 5 (512MB memory limit)
      iterations: 5,
      maxDuration: '20m',
      exec: 'podcastFlow',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.20'],              // <%20 hata (login + job)
    job_completion_time: ['p(95)<600000'],       // %95 job <10dk
    tts_completion_time: ['p(95)<180000'],       // %95 TTS <3dk
    podcast_completion_time: ['p(95)<600000'],   // %95 podcast <10dk
  },
};

export function ttsFlow() {
  const email = getTestUserEmail(__VU, 'tts');
  console.log(`[VU ${__VU}] TTS: Logging in as ${email}`);

  // 1. Login
  const token = login(email);
  if (!token) {
    console.log(`[VU ${__VU}] TTS: Login failed, skipping`);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 2. Create job
  const payload = generateTTSPayload();
  console.log(`[VU ${__VU}] TTS: Creating job...`);

  const createRes = http.post(
    `${BASE_URL}/api/tts/process-async`,
    JSON.stringify(payload),
    { headers, timeout: '30s' }
  );

  // Handle 409 - existing job
  if (createRes.status === 409) {
    try {
      const body = JSON.parse(createRes.body);
      if (body.jobId) {
        console.log(`[VU ${__VU}] TTS: Found existing job ${body.jobId}, polling...`);
        pollUntilDone(body.jobId, headers, 'tts');
        return;
      }
    } catch { /* ignore */ }
    return;
  }

  const { success, jobId } = checkJobCreation(createRes);

  if (success && jobId) {
    console.log(`[VU ${__VU}] TTS: Job ${jobId} created, polling...`);
    pollUntilDone(jobId, headers, 'tts');
  } else {
    console.log(`[VU ${__VU}] TTS: Job creation failed - ${createRes.status} ${createRes.body}`);
    jobsFailed.add(1);
  }
}

export function podcastFlow() {
  const email = getTestUserEmail(__VU, 'podcast');
  console.log(`[VU ${__VU}] Podcast: Logging in as ${email}`);

  // 1. Login
  const token = login(email);
  if (!token) {
    console.log(`[VU ${__VU}] Podcast: Login failed, skipping`);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 2. Create job
  const payload = generatePodcastPayload();
  console.log(`[VU ${__VU}] Podcast: Creating job for topic "${payload.topic}"...`);

  const createRes = http.post(
    `${BASE_URL}/api/tts/create-podcast-async`,
    JSON.stringify(payload),
    { headers, timeout: '30s' }
  );

  // Handle 409 - existing job
  if (createRes.status === 409) {
    try {
      const body = JSON.parse(createRes.body);
      if (body.jobId) {
        console.log(`[VU ${__VU}] Podcast: Found existing job ${body.jobId}, polling...`);
        pollUntilDone(body.jobId, headers, 'podcast');
        return;
      }
    } catch { /* ignore */ }
    return;
  }

  const { success, jobId } = checkJobCreation(createRes);

  if (success && jobId) {
    console.log(`[VU ${__VU}] Podcast: Job ${jobId} created, polling...`);
    pollUntilDone(jobId, headers, 'podcast');
  } else {
    console.log(`[VU ${__VU}] Podcast: Job creation failed - ${createRes.status} ${createRes.body}`);
    jobsFailed.add(1);
  }
}
