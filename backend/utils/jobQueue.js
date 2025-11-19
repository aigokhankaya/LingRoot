// Simple in-memory job queue for async TTS processing
const logger = require('./logger');

class JobQueue {
  constructor() {
    this.jobs = new Map(); // jobId -> job data
  }

  createJob(userId, jobData) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      id: jobId,
      userId,
      status: 'pending', // pending, processing, completed, failed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: jobData,
      result: null,
      error: null,
      progress: 0
    };

    this.jobs.set(jobId, job);
    logger.info(`[JobQueue] Created job ${jobId} for user ${userId}`);
    
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
    
    return job;
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  deleteJob(jobId) {
    this.jobs.delete(jobId);
    logger.info(`[JobQueue] Deleted job ${jobId}`);
  }

  // Clean up old jobs (older than 24 hours)
  cleanup() {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    for (const [jobId, job] of this.jobs.entries()) {
      const createdAt = new Date(job.createdAt).getTime();
      if (createdAt < oneDayAgo) {
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
