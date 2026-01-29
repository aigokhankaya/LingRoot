/**
 * BullMQ Queue Definitions
 * 
 * Production-grade job queues with:
 * - Persistence (Redis)
 * - Retry mechanism
 * - Priority support
 * - Backpressure handling
 */

const { Queue } = require('bullmq');
const { getConnection, checkRedisAvailability } = require('../storage/redisClient.js');
const logger = require('../common/logger.js');

// Default job options
const defaultJobOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 5000 // 5s, 10s, 20s
    },
    removeOnComplete: {
        count: 100, // Son 100 completed job'u tut
        age: 24 * 60 * 60 // 24 saat
    },
    removeOnFail: {
        count: 500, // Son 500 failed job'u tut
        age: 7 * 24 * 60 * 60 // 7 gün
    }
};

// Priority levels
const PRIORITY = {
    CRITICAL: 1,
    PREMIUM_YEARLY: 2,
    PREMIUM_MONTHLY: 3,
    BASIC: 5,
    FREE_TRIAL: 8,
    FREE: 10
};

/**
 * Get priority by user plan
 */
const getPriorityByPlan = (userPlan) => {
    const planPriorities = {
        'premium_yearly': PRIORITY.PREMIUM_YEARLY,
        'premium_monthly': PRIORITY.PREMIUM_MONTHLY,
        'basic': PRIORITY.BASIC,
        'free_trial': PRIORITY.FREE_TRIAL,
        'free': PRIORITY.FREE
    };
    return planPriorities[userPlan] || PRIORITY.FREE;
};

// Queue instances (lazy initialization)
let queues = {};

/**
 * Get or create a queue
 */
const getQueue = (name) => {
    const connection = getConnection();
    if (!connection) {
        logger.warn(`[BullQueue] Redis connection object not available, queue ${name} will use fallback`);
        return null;
    }

    if (!queues[name]) {
        const connection = getConnection();
        queues[name] = new Queue(name, {
            connection,
            defaultJobOptions
        });

        logger.info(`[BullQueue] Queue '${name}' initialized`);
    }

    return queues[name];
};

/**
 * Add a job to queue
 */
const addJob = async (queueName, jobName, data, options = {}) => {
    const queue = getQueue(queueName);

    if (!queue) {
        // Fallback: Return mock job for in-memory processing
        logger.warn(`[BullQueue] Fallback mode for ${queueName}:${jobName}`);
        return {
            id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: jobName,
            data,
            isFallback: true
        };
    }

    const jobOptions = {
        ...defaultJobOptions,
        ...options,
        priority: options.priority || PRIORITY.FREE
    };

    const job = await queue.add(jobName, data, jobOptions);
    logger.info(`[BullQueue] Job added to ${queueName}: ${job.id}`);

    return job;
};

/**
 * Get queue stats
 */
const getQueueStats = async (queueName) => {
    const queue = getQueue(queueName);

    if (!queue) {
        return {
            name: queueName,
            available: false,
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0
        };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount()
    ]);

    return {
        name: queueName,
        available: true,
        waiting,
        active,
        completed,
        failed,
        delayed
    };
};

/**
 * Get all queue stats
 */
const getAllQueueStats = async () => {
    const queueNames = ['tts-processing', 'podcast-processing', 'mfa-alignment'];
    const stats = {};

    for (const name of queueNames) {
        stats[name] = await getQueueStats(name);
    }

    return stats;
};

/**
 * Close all queues
 */
const closeAllQueues = async () => {
    for (const name of Object.keys(queues)) {
        await queues[name].close();
        logger.info(`[BullQueue] Queue '${name}' closed`);
    }
    queues = {};
};

// Retryable error types
const RETRYABLE_ERRORS = [
    'ETIMEDOUT',
    'ECONNRESET',
    'ENOTFOUND',
    'RATE_LIMIT_EXCEEDED',
    'SERVICE_UNAVAILABLE',
    'ECONNREFUSED',
    'EAI_AGAIN'
];

/**
 * Check if error is retryable
 */
const isRetryableError = (error) => {
    if (RETRYABLE_ERRORS.some(e => error.message?.includes(e))) return true;
    if (error.response?.status >= 500) return true;
    if (error.response?.status === 429) return true;
    if (error.code === 'ETIMEDOUT') return true;
    return false;
};

module.exports = {
    getQueue,
    addJob,
    getQueueStats,
    getAllQueueStats,
    closeAllQueues,
    getPriorityByPlan,
    isRetryableError,
    PRIORITY,
    defaultJobOptions
};
