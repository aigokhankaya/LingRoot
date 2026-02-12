// Simple in-memory job queue for async TTS processing
const logger = require('../common/logger.js');

class JobQueue {
  constructor() {
    this.jobs = new Map(); // jobId -> job data
    this.activeJobsByUser = new Map(); // userId -> jobId (O(1) active job lookup)
  }

  /**
   * Get count of pending/queued jobs (for queue position calculation)
   */
  getPendingCount() {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'pending' || job.status === 'queued') {
        count++;
      }
    }
    return count;
  }

  createJob(userId, jobData) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate queue position before adding this job
    const queuePosition = this.getPendingCount() + 1;

    const job = {
      id: jobId,
      userId,
      status: 'pending', // pending, queued, processing, completed, failed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: jobData,
      result: null,
      error: null,
      progress: 0,
      queuePosition // User-facing queue position info
    };

    this.jobs.set(jobId, job);
    this.activeJobsByUser.set(userId, jobId);
    logger.info(`[JobQueue] Created job ${jobId} for user ${userId}, queuePosition: ${queuePosition}`);

    return job;
  }

  updateJob(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.warn(`[JobQueue] Job ${jobId} not found`);
      return null;
    }

    Object.assign(job, updates, { updatedAt: new Date().toISOString() });
    this.jobs.set(jobId, job);

    // Remove from active index when job is terminal
    if (updates.status === 'completed' || updates.status === 'failed') {
      this.activeJobsByUser.delete(job.userId);
    }

    return job;
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  getActiveJobForUser(userId) {
    const jobId = this.activeJobsByUser.get(userId);
    if (!jobId) return null;

    const job = this.jobs.get(jobId);
    // Include 'queued' status as active (waiting for slot in background)
    if (job && (job.status === 'pending' || job.status === 'queued' || job.status === 'processing')) {
      return job;
    }

    // Stale entry — job finished but index wasn't cleaned up
    this.activeJobsByUser.delete(userId);
    return null;
  }

  deleteJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job) {
      this.activeJobsByUser.delete(job.userId);
    }
    this.jobs.delete(jobId);
    logger.info(`[JobQueue] Deleted job ${jobId}`);
  }

  // Clean up old jobs (older than 24 hours)
  cleanup() {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const [jobId, job] of this.jobs.entries()) {
      const createdAt = new Date(job.createdAt).getTime();
      if (createdAt < oneDayAgo) {
        this.activeJobsByUser.delete(job.userId);
        this.jobs.delete(jobId);
        logger.info(`[JobQueue] Cleaned up old job ${jobId}`);
      }
    }
  }
}

// Singleton instance
const jobQueue = new JobQueue();

// Run cleanup every hour
setInterval(() => {
  jobQueue.cleanup();
}, 60 * 60 * 1000);

module.exports = jobQueue;
