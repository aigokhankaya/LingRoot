/**
 * Load Test Stats Endpoint
 *
 * GET /api/debug/load-test-stats
 * Only active when LOAD_TEST_MODE=true
 *
 * Returns real-time metrics for k6 to poll:
 * - Process memory usage
 * - Concurrency limiter stats
 * - Job queue stats
 * - Event loop lag
 */

const express = require('express');
const router = express.Router();

// Track event loop lag
let lastLoopTime = Date.now();
let eventLoopLag = 0;

function startEventLoopMonitor() {
  setInterval(() => {
    const now = Date.now();
    const expected = 1000;
    const actual = now - lastLoopTime;
    eventLoopLag = Math.max(0, actual - expected);
    lastLoopTime = now;
  }, 1000);
}

startEventLoopMonitor();

router.get('/load-test-stats', (req, res) => {
  if (process.env.LOAD_TEST_MODE !== 'true') {
    return res.status(404).json({ error: 'Not available outside LOAD_TEST_MODE' });
  }

  const memUsage = process.memoryUsage();

  // Concurrency limiter stats
  let limiterStats = {};
  try {
    const { limiters } = require('../../../utils/infra/concurrencyLimiter.js');
    limiterStats = {
      tts: limiters.tts.getStats(),
      podcast: limiters.podcast.getStats(),
      openai: limiters.openai.getStats(),
    };
  } catch {
    limiterStats = { error: 'concurrencyLimiter not available' };
  }

  // Job queue stats
  let jobQueueStats = {};
  try {
    const jobQueue = require('../../../utils/infra/jobQueue.js');
    const queue = jobQueue.jobQueue || jobQueue;
    if (queue && queue.jobs) {
      let pending = 0;
      let processing = 0;
      let completed = 0;
      let failed = 0;
      for (const job of queue.jobs.values()) {
        switch (job.status) {
          case 'pending': pending++; break;
          case 'processing': processing++; break;
          case 'completed': completed++; break;
          case 'failed': failed++; break;
        }
      }
      jobQueueStats = {
        totalJobs: queue.jobs.size,
        pending,
        processing,
        completed,
        failed,
      };
    }
  } catch {
    jobQueueStats = { error: 'jobQueue not available' };
  }

  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: memUsage.rss,
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: memUsage.heapUsed,
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: memUsage.heapTotal,
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: memUsage.external,
      externalMB: Math.round(memUsage.external / 1024 / 1024),
    },
    eventLoopLagMs: eventLoopLag,
    limiters: limiterStats,
    jobQueue: jobQueueStats,
  });
});

module.exports = router;
