const logger = require('../common/logger.js');

const DEFAULTS = {
  maxConcurrency: 1,
  minSpacingMs: 800,
  maxWaitMs: 120000,
  maxExecutionMs: 180000,
  cooldownBaseMs: 15000,
};

const modelStates = new Map();

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function buildModelKey(provider, model) {
  return `${provider}:${model}`;
}

function readModelConfig(provider, model) {
  if (provider === 'vertex' && String(model || '').includes('tts')) {
    return {
      maxConcurrency: parsePositiveInt(process.env.VERTEX_TTS_MAX_CONCURRENCY, DEFAULTS.maxConcurrency),
      minSpacingMs: parseNonNegativeInt(process.env.VERTEX_TTS_MIN_SPACING_MS, DEFAULTS.minSpacingMs),
      maxWaitMs: parsePositiveInt(process.env.VERTEX_TTS_MAX_WAIT_MS, DEFAULTS.maxWaitMs),
      maxExecutionMs: parsePositiveInt(process.env.VERTEX_TTS_MAX_EXECUTION_MS, DEFAULTS.maxExecutionMs),
      cooldownBaseMs: parseNonNegativeInt(process.env.VERTEX_TTS_COOLDOWN_BASE_MS, DEFAULTS.cooldownBaseMs),
    };
  }

  return { ...DEFAULTS };
}

function createState(key, provider, model) {
  return {
    key,
    provider,
    model,
    queue: [],
    running: 0,
    lastStartedAt: 0,
    cooldownUntil: 0,
    consecutive429Count: 0,
    timer: null,
    scheduledAt: 0,
    stats: {
      queued: 0,
      started: 0,
      completed: 0,
      failed: 0,
      rateLimited: 0,
      waitTimeouts: 0,
      executionTimeouts: 0,
      maxQueueLength: 0,
    },
  };
}

function getState(provider, model) {
  const key = buildModelKey(provider, model);
  if (!modelStates.has(key)) {
    modelStates.set(key, createState(key, provider, model));
  }
  return modelStates.get(key);
}

function isRateLimitError(error) {
  const status = error?.response?.status || error?.status;
  const message = error?.response?.data?.error?.message || error?.message || '';
  return status === 429 || String(message).includes('429') || String(message).toLowerCase().includes('quota exceeded');
}

function buildSnapshot(state) {
  return {
    key: state.key,
    provider: state.provider,
    model: state.model,
    queueLength: state.queue.length,
    running: state.running,
    lastStartedAt: state.lastStartedAt ? new Date(state.lastStartedAt).toISOString() : null,
    cooldownUntil: state.cooldownUntil ? new Date(state.cooldownUntil).toISOString() : null,
    consecutive429Count: state.consecutive429Count,
    scheduledAt: state.scheduledAt ? new Date(state.scheduledAt).toISOString() : null,
    stats: { ...state.stats },
  };
}

function logEvent(event, state, extra = {}) {
  logger.info(`[MODEL-RATE-LIMITER] ${event} ${JSON.stringify({
    model: state.key,
    queueLength: state.queue.length,
    running: state.running,
    cooldownUntil: state.cooldownUntil || null,
    ...extra,
  })}`);
}

function scheduleProcess(state, delayMs) {
  const normalizedDelay = Math.max(0, delayMs);
  const targetAt = Date.now() + normalizedDelay;

  if (state.timer && state.scheduledAt && state.scheduledAt <= targetAt) {
    return;
  }

  if (state.timer) {
    clearTimeout(state.timer);
  }

  state.scheduledAt = targetAt;
  state.timer = setTimeout(() => {
    state.timer = null;
    state.scheduledAt = 0;
    try {
      processQueue(state);
    } catch (error) {
      logger.error(`[MODEL-RATE-LIMITER] process error for ${state.key}: ${error.message}`);
    }
  }, normalizedDelay);
}

function releaseSlot(state, taskName) {
  if (state.running > 0) {
    state.running -= 1;
  }
  logEvent('completed_slot', state, { taskName });
  setImmediate(() => {
    try {
      processQueue(state);
    } catch (error) {
      logger.error(`[MODEL-RATE-LIMITER] release processing error for ${state.key}: ${error.message}`);
    }
  });
}

function applyCooldown(state) {
  state.consecutive429Count += 1;
  state.stats.rateLimited += 1;
  const config = readModelConfig(state.provider, state.model);
  const multiplier = Math.pow(2, Math.max(0, state.consecutive429Count - 1));
  const cooldownMs = config.cooldownBaseMs * multiplier;
  state.cooldownUntil = Date.now() + cooldownMs;

  logEvent('cooldown', state, {
    cooldownMs,
    consecutive429Count: state.consecutive429Count,
  });

  scheduleProcess(state, cooldownMs);
}

function executeJob(state, job) {
  const startedAt = Date.now();
  state.running += 1;
  state.lastStartedAt = startedAt;
  state.stats.started += 1;

  clearTimeout(job.waitTimer);
  logEvent('started', state, {
    taskName: job.taskName,
    metadata: job.metadata,
    queuedForMs: startedAt - job.enqueuedAt,
  });

  let clientSettled = false;
  const config = readModelConfig(state.provider, state.model);

  const executionTimeout = setTimeout(() => {
    state.stats.executionTimeouts += 1;
    if (!clientSettled) {
      clientSettled = true;
      const error = new Error(`Model rate limited task execution exceeded ${job.maxExecutionMs}ms`);
      error.code = 'MODEL_RATE_LIMIT_EXECUTION_TIMEOUT';
      logEvent('timeout_execution', state, {
        taskName: job.taskName,
        metadata: job.metadata,
        maxExecutionMs: job.maxExecutionMs,
      });
      job.reject(error);
    }
  }, job.maxExecutionMs || config.maxExecutionMs);

  Promise.resolve()
    .then(() => job.fn())
    .then((result) => {
      state.consecutive429Count = 0;
      state.cooldownUntil = 0;
      state.stats.completed += 1;
      if (!clientSettled) {
        clientSettled = true;
        job.resolve(result);
      }
    })
    .catch((error) => {
      state.stats.failed += 1;
      if (isRateLimitError(error)) {
        applyCooldown(state);
      }

      if (!clientSettled) {
        clientSettled = true;
        job.reject(error);
      }
    })
    .finally(() => {
      clearTimeout(executionTimeout);
      releaseSlot(state, job.taskName);
    });
}

function processQueue(state) {
  while (true) {
    const config = readModelConfig(state.provider, state.model);

    if (state.running >= config.maxConcurrency || state.queue.length === 0) {
      return;
    }

    const now = Date.now();
    if (state.cooldownUntil > now) {
      scheduleProcess(state, state.cooldownUntil - now);
      return;
    }

    const spacingRemaining = Math.max(0, (state.lastStartedAt + config.minSpacingMs) - now);
    if (spacingRemaining > 0) {
      scheduleProcess(state, spacingRemaining);
      return;
    }

    const job = state.queue.shift();
    if (!job) {
      return;
    }

    if (job.expired) {
      continue;
    }

    executeJob(state, job);

    if (config.minSpacingMs > 0) {
      if (state.queue.length > 0 && state.running < config.maxConcurrency) {
        scheduleProcess(state, config.minSpacingMs);
      }
      return;
    }
  }
}

function runWithModelRateLimit(options) {
  const {
    provider,
    model,
    taskName = 'unknown-task',
    metadata = {},
    fn,
    maxWaitMs,
    maxExecutionMs,
  } = options || {};

  if (typeof fn !== 'function') {
    throw new Error('runWithModelRateLimit requires an async fn');
  }

  const state = getState(provider, model);
  const config = readModelConfig(provider, model);
  const resolvedMaxWaitMs = maxWaitMs || config.maxWaitMs;
  const resolvedMaxExecutionMs = maxExecutionMs || config.maxExecutionMs;

  return new Promise((resolve, reject) => {
    const job = {
      taskName,
      metadata,
      fn,
      resolve,
      reject,
      enqueuedAt: Date.now(),
      expired: false,
      waitTimer: null,
      maxExecutionMs: resolvedMaxExecutionMs,
    };

    job.waitTimer = setTimeout(() => {
      job.expired = true;
      state.stats.waitTimeouts += 1;
      state.queue = state.queue.filter((item) => item !== job);
      const error = new Error(`Model rate limited task wait exceeded ${resolvedMaxWaitMs}ms`);
      error.code = 'MODEL_RATE_LIMIT_WAIT_TIMEOUT';
      logEvent('timeout_wait', state, {
        taskName,
        metadata,
        maxWaitMs: resolvedMaxWaitMs,
      });
      reject(error);
    }, resolvedMaxWaitMs);

    state.queue.push(job);
    state.stats.queued += 1;
    state.stats.maxQueueLength = Math.max(state.stats.maxQueueLength, state.queue.length);

    logEvent('queued', state, {
      taskName,
      metadata,
    });

    try {
      processQueue(state);
    } catch (error) {
      logger.error(`[MODEL-RATE-LIMITER] enqueue processing error for ${state.key}: ${error.message}`);
    }
  });
}

function getModelRateLimiterSnapshot() {
  return Array.from(modelStates.values()).map(buildSnapshot);
}

function resetModelRateLimiterForTests() {
  for (const state of modelStates.values()) {
    if (state.timer) {
      clearTimeout(state.timer);
    }
  }
  modelStates.clear();
}

module.exports = {
  getModelRateLimiterSnapshot,
  resetModelRateLimiterForTests,
  runWithModelRateLimit,
};
