/**
 * @jest-environment node
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getLimiterModule() {
  return require('../utils/infra/modelRateLimiter.js');
}

describe('model rate limiter', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env.VERTEX_TTS_MAX_CONCURRENCY = '1';
    process.env.VERTEX_TTS_MIN_SPACING_MS = '0';
    process.env.VERTEX_TTS_MAX_WAIT_MS = '200';
    process.env.VERTEX_TTS_MAX_EXECUTION_MS = '200';
    process.env.VERTEX_TTS_COOLDOWN_BASE_MS = '30';
  });

  afterEach(() => {
    try {
      const { resetModelRateLimiterForTests } = getLimiterModule();
      resetModelRateLimiterForTests();
    } catch (error) {
      // Ignore if the limiter module was never loaded in a test.
    }
    process.env = { ...originalEnv };
  });

  test('does not exceed configured concurrency for the same model', async () => {
    const { runWithModelRateLimit } = getLimiterModule();
    let activeCount = 0;
    let maxActiveCount = 0;

    const jobs = Array.from({ length: 3 }, (_, index) =>
      runWithModelRateLimit({
        provider: 'vertex',
        model: 'gemini-2.5-flash-tts',
        taskName: `job-${index}`,
        fn: async () => {
          activeCount += 1;
          maxActiveCount = Math.max(maxActiveCount, activeCount);
          await sleep(20);
          activeCount -= 1;
          return index;
        },
      })
    );

    const results = await Promise.all(jobs);

    expect(results).toEqual([0, 1, 2]);
    expect(maxActiveCount).toBe(1);
  });

  test('applies spacing between request starts', async () => {
    process.env.VERTEX_TTS_MAX_CONCURRENCY = '2';
    process.env.VERTEX_TTS_MIN_SPACING_MS = '25';
    const { runWithModelRateLimit } = getLimiterModule();
    const startedAt = [];

    await Promise.all([
      runWithModelRateLimit({
        provider: 'vertex',
        model: 'gemini-2.5-flash-tts',
        taskName: 'spacing-a',
        fn: async () => {
          startedAt.push(Date.now());
          await sleep(5);
        },
      }),
      runWithModelRateLimit({
        provider: 'vertex',
        model: 'gemini-2.5-flash-tts',
        taskName: 'spacing-b',
        fn: async () => {
          startedAt.push(Date.now());
          await sleep(5);
        },
      }),
    ]);

    expect(startedAt).toHaveLength(2);
    expect(startedAt[1] - startedAt[0]).toBeGreaterThanOrEqual(20);
  });

  test('applies cooldown after a 429 error before starting the next job', async () => {
    process.env.VERTEX_TTS_COOLDOWN_BASE_MS = '40';
    const { runWithModelRateLimit } = getLimiterModule();
    const startedAt = [];

    const rateLimitError = new Error('Quota exceeded');
    rateLimitError.response = {
      status: 429,
      data: {
        error: {
          message: 'Quota exceeded',
        },
      },
    };

    const first = runWithModelRateLimit({
      provider: 'vertex',
      model: 'gemini-2.5-flash-tts',
      taskName: 'first-429',
      fn: async () => {
        startedAt.push(Date.now());
        throw rateLimitError;
      },
    });

    const second = runWithModelRateLimit({
      provider: 'vertex',
      model: 'gemini-2.5-flash-tts',
      taskName: 'after-cooldown',
      fn: async () => {
        startedAt.push(Date.now());
        return 'ok';
      },
    });

    await expect(first).rejects.toThrow('Quota exceeded');
    await expect(second).resolves.toBe('ok');

    expect(startedAt).toHaveLength(2);
    expect(startedAt[1] - startedAt[0]).toBeGreaterThanOrEqual(35);
  });

  test('returns wait timeout when a queued job waits too long', async () => {
    process.env.VERTEX_TTS_MAX_WAIT_MS = '20';
    const { runWithModelRateLimit } = getLimiterModule();

    const first = runWithModelRateLimit({
      provider: 'vertex',
      model: 'gemini-2.5-flash-tts',
      taskName: 'long-job',
      fn: async () => {
        await sleep(60);
        return 'done';
      },
    });

    const second = runWithModelRateLimit({
      provider: 'vertex',
      model: 'gemini-2.5-flash-tts',
      taskName: 'timed-out-job',
      fn: async () => 'never-runs',
    });

    await expect(second).rejects.toMatchObject({
      code: 'MODEL_RATE_LIMIT_WAIT_TIMEOUT',
    });

    await expect(first).resolves.toBe('done');
  });
});
