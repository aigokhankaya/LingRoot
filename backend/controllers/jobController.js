
const { Queue } = require('bullmq');
const Redis = require('ioredis');
const logger = require('../utils/common/logger');

// Use the same Redis URL precedence as other parts of the app
const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const getRedisConnection = () => {
    if (REDIS_URL) {
        return new Redis(REDIS_URL, {
            tls: { rejectUnauthorized: false } // Assuming Upstash or similar external
        });
    }
    return new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
    });
};

exports.getJobStats = async (req, res) => {
    let connection;
    let queue;
    try {
        const { queueName = 'podcast-processing' } = req.query;

        connection = getRedisConnection();
        queue = new Queue(queueName, { connection });

        const counts = await queue.getJobCounts();

        // Fetch jobs by status
        const active = await queue.getActive();
        const waiting = await queue.getWaiting();
        const completed = await queue.getCompleted(0, 10); // Last 10
        const failed = await queue.getFailed(0, 10); // Last 10
        const delayed = await queue.getDelayed();

        // Serialize jobs (simpler format)
        const formatJob = (job) => ({
            id: job.id,
            name: job.name,
            data: job.data,
            progress: job.progress,
            failedReason: job.failedReason,
            timestamp: job.timestamp,
            finishedOn: job.finishedOn,
            processedOn: job.processedOn,
            attemptsMade: job.attemptsMade,
            status: job.status // Note: job.status might need separate fetch if not populated
        });

        const activeJobs = active.map(j => ({ ...formatJob(j), status: 'active' }));
        const waitingJobs = waiting.map(j => ({ ...formatJob(j), status: 'waiting' }));
        const completedJobs = completed.map(j => ({ ...formatJob(j), status: 'completed' }));
        const failedJobs = failed.map(j => ({ ...formatJob(j), status: 'failed' }));
        const delayedJobs = delayed.map(j => ({ ...formatJob(j), status: 'delayed' }));

        await queue.close();
        await connection.quit();

        return res.status(200).json({
            success: true,
            data: {
                counts,
                jobs: [
                    ...activeJobs,
                    ...waitingJobs,
                    ...failedJobs,
                    ...delayedJobs,
                    ...completedJobs
                ]
            }
        });

    } catch (error) {
        logger.error('Error fetching job stats:', error);
        if (queue) await queue.close();
        if (connection) await connection.quit();

        return res.status(500).json({
            success: false,
            message: 'Error fetching job statistics',
            error: error.message
        });
    }
};
