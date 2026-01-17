/**
 * Podcast Worker
 * 
 * BullMQ worker for processing Podcast jobs.
 */

const { Worker } = require('bullmq');
const { getConnection, checkRedisAvailability } = require('../utils/storage/redisClient.js');
const logger = require('../utils/common/logger.js');
const { isRetryableError } = require('../utils/infra/bullQueue.js');
const { sendPushNotification } = require('../utils/notifications/pushNotification.js');

// Podcast processing function (injected)
let processPodcastJob = null;

/**
 * Initialize Podcast worker
 */
const initPodcastWorker = (processFunction) => {
    const connection = getConnection();
    if (!connection) {
        logger.warn('[PodcastWorker] Redis connection object not available, worker not started');
        return null;
    }

    processPodcastJob = processFunction;

    const worker = new Worker(
        'podcast-processing',
        async (job) => {
            const { userId, ...data } = job.data;

            logger.info(`[PodcastWorker] Processing job ${job.id} for user ${userId}`);

            try {
                await job.updateProgress(10);

                // Process Podcast
                const result = await processPodcastJob(data, {
                    jobId: job.id,
                    userId,
                    attemptsMade: job.attemptsMade,
                    onProgress: async (progress) => {
                        await job.updateProgress(progress);
                    }
                });

                await job.updateProgress(100);

                // Send success notification
                if (result && result.mp3_url) {
                    await sendPushNotification(userId, {
                        title: '🎙️ Podcast Hazır!',
                        body: 'Podcast\'iniz hazır. Dinlemek için tıklayın.',
                        type: 'audio_created',
                        data: {
                            jobId: job.id,
                            audioId: result.contenthistory_id,
                            mp3_url: result.mp3_url,
                            title: result.title,
                            input_type: 'podcast'
                        }
                    });
                }

                logger.info(`[PodcastWorker] Job ${job.id} completed successfully`);
                return result;

            } catch (error) {
                logger.error(`[PodcastWorker] Job ${job.id} error:`, error.message);

                // Check if error is retryable and we have attempts left
                if (isRetryableError(error) && job.attemptsMade < 2) {
                    logger.info(`[PodcastWorker] Job ${job.id} will be retried`);
                    throw error;
                }

                // Final failure - notify user
                await sendPushNotification(userId, {
                    title: '❌ Podcast Oluşturulamadı',
                    body: 'Bir hata oluştu. Lütfen tekrar deneyin.',
                    type: 'podcast_failed',
                    data: {
                        jobId: job.id,
                        error: error.message
                    }
                });

                throw error;
            }
        },
        {
            connection: getConnection(),
            concurrency: parseInt(process.env.PODCAST_WORKER_CONCURRENCY || '5'),
            limiter: {
                max: 20,
                duration: 60000 // 20 jobs per minute max
            }
        }
    );

    // Worker events
    worker.on('completed', (job) => {
        logger.info(`[PodcastWorker] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`[PodcastWorker] Job ${job?.id} failed:`, err.message);
    });

    worker.on('error', (err) => {
        logger.error('[PodcastWorker] Worker error:', err);
    });

    logger.info(`[PodcastWorker] Worker initialized with concurrency ${process.env.PODCAST_WORKER_CONCURRENCY || '5'}`);

    return worker;
};

module.exports = { initPodcastWorker };
