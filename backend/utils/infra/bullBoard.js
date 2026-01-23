/**
 * Bull Board Dashboard
 * 
 * Admin dashboard for monitoring BullMQ queues.
 * Access: /api/admin/queues
 */

const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { getQueue } = require('./bullQueue.js');
const { checkRedisAvailability, getConnection } = require('../storage/redisClient.js');
const logger = require('../common/logger.js');

let serverAdapter = null;
let bullBoard = null;

/**
 * Initialize Bull Board
 */
const initBullBoard = () => {
    const connection = getConnection();
    if (!connection) {
        logger.warn('[BullBoard] Redis connection object not available, dashboard disabled');
        return null;
    }

    try {
        serverAdapter = new ExpressAdapter();
        serverAdapter.setBasePath('/api/admin/queues');

        const queues = [];

        // Add queues to dashboard
        const queueNames = ['tts-processing', 'podcast-processing', 'mfa-alignment'];
        for (const name of queueNames) {
            const queue = getQueue(name);
            if (queue) {
                queues.push(new BullMQAdapter(queue));
            }
        }

        bullBoard = createBullBoard({
            queues,
            serverAdapter
        });

        logger.info(`[BullBoard] Dashboard initialized with ${queues.length} queues`);
        return serverAdapter;
    } catch (error) {
        logger.error('[BullBoard] Failed to initialize:', error.message);
        return null;
    }
};

/**
 * Get Bull Board router
 */
const getBullBoardRouter = () => {
    if (!serverAdapter) {
        initBullBoard();
    }
    return serverAdapter?.getRouter();
};

/**
 * Add queue to dashboard dynamically
 */
const addQueueToDashboard = (queueName) => {
    if (!bullBoard) return;

    const queue = getQueue(queueName);
    if (queue) {
        bullBoard.addQueue(new BullMQAdapter(queue));
        logger.info(`[BullBoard] Queue '${queueName}' added to dashboard`);
    }
};

module.exports = {
    initBullBoard,
    getBullBoardRouter,
    addQueueToDashboard
};
