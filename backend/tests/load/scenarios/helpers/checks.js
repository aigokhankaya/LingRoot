import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics
export const jobCompletionTime = new Trend('job_completion_time', true);
export const jobsCreated = new Counter('jobs_created');
export const jobsCompleted = new Counter('jobs_completed');
export const jobsFailed = new Counter('jobs_failed');
export const jobsTimeout = new Counter('jobs_timeout');
export const jobsRejected = new Counter('jobs_rejected');
export const pollCount = new Counter('poll_requests');

/**
 * Check TTS job creation response
 * @param {object} res - k6 response
 * @returns {{ success: boolean, jobId: string | null }}
 */
export function checkJobCreation(res) {
  const isOk = check(res, {
    'job creation status 200': (r) => r.status === 200,
    'job creation has jobId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!body.jobId;
      } catch {
        return false;
      }
    },
  });

  if (isOk && res.status === 200) {
    jobsCreated.add(1);
    try {
      const body = JSON.parse(res.body);
      return { success: true, jobId: body.jobId };
    } catch {
      return { success: false, jobId: null };
    }
  }

  // Track rejections (503, 429)
  if (res.status === 503 || res.status === 429) {
    jobsRejected.add(1);
  }

  return { success: false, jobId: null };
}

/**
 * Check job polling response
 * @param {object} res - k6 response
 * @returns {{ done: boolean, status: string }}
 */
export function checkJobPoll(res) {
  pollCount.add(1);

  if (res.status !== 200) {
    return { done: false, status: 'error' };
  }

  try {
    const body = JSON.parse(res.body);
    const jobStatus = body.status || body.job?.status;
    return { done: jobStatus === 'completed' || jobStatus === 'failed', status: jobStatus };
  } catch {
    return { done: false, status: 'parse_error' };
  }
}
