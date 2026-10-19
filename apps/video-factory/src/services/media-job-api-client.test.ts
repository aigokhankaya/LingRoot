import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaJobApiClient, type ClaimedMediaJob } from './media-job-api-client.js';

const job = {
  job_id: 'job-1', lease_token: 'lease-1', lease_seconds: 90, attempt: 1,
  campaign: {
    id: 'campaign-1', name: 'Test', topic: 'Istanbul', levels: ['A1'],
    sceneCount: 4, targetDurationSeconds: 45, voiceProfile: 'english_female', voiceQuality: 'standard',
    visualStyle: 'documentary', tone: 'educational', targets: [],
  },
} as ClaimedMediaJob;

describe('MediaJobApiClient', () => {
  afterEach(() => vi.restoreAllMocks());

  it('claims a job with internal bearer authentication', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(job), { status: 200 }));
    const client = new MediaJobApiClient({ baseUrl: 'https://lingroot.test/', apiKey: 'secret' });
    await expect(client.claim('worker-1')).resolves.toEqual(job);
    expect(fetchMock).toHaveBeenCalledWith('https://lingroot.test/internal/media-jobs/claim', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ authorization: 'Bearer secret' }),
      body: JSON.stringify({ worker_id: 'worker-1' }),
    }));
  });

  it('returns null when the queue is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    const client = new MediaJobApiClient({ baseUrl: 'https://lingroot.test', apiKey: 'secret' });
    await expect(client.claim('worker-1')).resolves.toBeNull();
  });

  it('sends progress with the active lease', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const client = new MediaJobApiClient({ baseUrl: 'https://lingroot.test', apiKey: 'secret' });
    await client.progress(job, 'rendering', 70);
    expect(fetchMock).toHaveBeenCalledWith('https://lingroot.test/internal/media-jobs/job-1/progress', expect.objectContaining({
      body: JSON.stringify({ lease_token: 'lease-1', stage: 'rendering', progress: 70 }),
    }));
  });
});
