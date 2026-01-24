/**
 * TTS Worker
 * 
 * BullMQ worker for processing TTS jobs.
 * Runs in a separate process for isolation.
 */

const { Worker } = require('bullmq');
const { getConnection, checkRedisAvailability } = require('../utils/storage/redisClient.js');
const logger = require('../utils/common/logger.js');
const { isRetryableError } = require('../utils/infra/bullQueue.js');

// TTS processing service (will be implemented)
let processTtsJob = null;

/**
 * Initialize TTS worker
 */
const initTtsWorker = (processFunction) => {
    const connection = getConnection();
    if (!connection) {
        logger.warn('[TtsWorker] Redis connection object not available, worker not started');
        return null;
    }

    processTtsJob = processFunction;

    const worker = new Worker(
        'tts-processing',
        async (job) => {
            const { userId, requestId, ...data } = job.data;

            logger.info(`[TtsWorker] Processing job ${job.id} for user ${userId}`);

            try {
                // Update progress
                await job.updateProgress(10);

                // Process TTS
                const result = await processTtsJob(data, {
                    jobId: job.id,
                    userId,
                    requestId,
                    attemptsMade: job.attemptsMade,
                    onProgress: async (progress) => {
                        await job.updateProgress(progress);
                    }
                });

                await job.updateProgress(100);

                logger.info(`[TtsWorker] Job ${job.id} completed successfully`);
                return result;

            } catch (error) {
                logger.error(`[TtsWorker] Job ${job.id} error:`, error.message);

                // Check if error is retryable
                if (isRetryableError(error)) {
                    logger.info(`[TtsWorker] Job ${job.id} will be retried (attempt ${job.attemptsMade + 1})`);
                    throw error; // BullMQ will retry
                }

                // Non-retryable error
                throw error;
            }
        },
        {
            connection: getConnection(),
            concurrency: parseInt(process.env.TTS_WORKER_CONCURRENCY || '10'),
            limiter: {
                max: 50,
                duration: 60000 // 50 jobs per minute max
            }
        }
    );

    // Worker events
    worker.on('completed', (job, result) => {
        logger.info(`[TtsWorker] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`[TtsWorker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);
    });

    worker.on('error', (err) => {
        logger.error('[TtsWorker] Worker error:', err);
    });

    worker.on('stalled', (jobId) => {
        logger.warn(`[TtsWorker] Job ${jobId} stalled`);
    });

    logger.info(`[TtsWorker] Worker initialized with concurrency ${process.env.TTS_WORKER_CONCURRENCY || '10'}`);

    return worker;
};

module.exports = { initTtsWorker };
