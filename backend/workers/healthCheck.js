/**
 * Queue Health Check
 * 
 * Periyodik olarak queue durumunu kontrol eder ve
 * sorunlarda alert gönderir.
 */

const { getAllQueueStats } = require('../utils/infra/bullQueue.js');
const { checkRedisAvailability } = require('../utils/storage/redisClient.js');
const logger = require('../utils/common/logger.js');

// Thresholds
const THRESHOLDS = {
    WAITING_WARN: parseInt(process.env.QUEUE_WAITING_WARN || '50'),
    WAITING_CRITICAL: parseInt(process.env.QUEUE_WAITING_CRITICAL || '100'),
    FAILED_WARN: parseInt(process.env.QUEUE_FAILED_WARN || '20'),
    FAILED_CRITICAL: parseInt(process.env.QUEUE_FAILED_CRITICAL || '50')
};

// Alert cooldown (aynı alert'i 15 dakikada bir gönder)
const alertCooldowns = new Map();
const COOLDOWN_MS = 15 * 60 * 1000;

/**
 * Send alert (Slack/Email)
 */
const sendAlert = async (type, message, data = {}) => {
    const alertKey = `${type}:${data.queue || 'general'}`;
    const lastAlert = alertCooldowns.get(alertKey);

    if (lastAlert && Date.now() - lastAlert < COOLDOWN_MS) {
        return; // Cooldown period
    }

    alertCooldowns.set(alertKey, Date.now());

    logger.warn(`🚨 [Alert:${type}] ${message}`, data);

    // Slack webhook
    if (process.env.SLACK_WEBHOOK_URL) {
        try {
            const fetch = require('node-fetch');
            await fetch(process.env.SLACK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `🚨 *[${type}]* ${message}`,
                    attachments: [{
                        color: type.includes('CRITICAL') ? 'danger' : 'warning',
                        fields: Object.entries(data).map(([k, v]) => ({
                            title: k,
                            value: String(v),
                            short: true
                        }))
                    }]
                })
            });
        } catch (err) {
            logger.error('[Alert] Failed to send Slack notification:', err.message);
        }
    }
};

/**
 * Check queue health
 */
const checkQueueHealth = async () => {
    if (!checkRedisAvailability()) {
        logger.debug('[HealthCheck] Redis not available, skipping');
        return;
    }

    try {
        const stats = await getAllQueueStats();

        for (const [queueName, queueStats] of Object.entries(stats)) {
            if (!queueStats.available) continue;

            // Waiting count check
            if (queueStats.waiting >= THRESHOLDS.WAITING_CRITICAL) {
                await sendAlert('QUEUE_BACKLOG_CRITICAL',
                    `${queueName} has ${queueStats.waiting} waiting jobs`,
                    { queue: queueName, ...queueStats }
                );
            } else if (queueStats.waiting >= THRESHOLDS.WAITING_WARN) {
                await sendAlert('QUEUE_BACKLOG_WARN',
                    `${queueName} has ${queueStats.waiting} waiting jobs`,
                    { queue: queueName, ...queueStats }
                );
            }

            // Failed count check
            if (queueStats.failed >= THRESHOLDS.FAILED_CRITICAL) {
                await sendAlert('HIGH_FAILURE_CRITICAL',
                    `${queueName} has ${queueStats.failed} failed jobs`,
                    { queue: queueName, ...queueStats }
                );
            } else if (queueStats.failed >= THRESHOLDS.FAILED_WARN) {
                await sendAlert('HIGH_FAILURE_WARN',
                    `${queueName} has ${queueStats.failed} failed jobs`,
                    { queue: queueName, ...queueStats }
                );
            }
        }

        logger.debug('[HealthCheck] Queue health check completed');
    } catch (error) {
        logger.error('[HealthCheck] Error:', error.message);
    }
};

// Check interval (every 5 minutes)
let healthCheckInterval = null;

/**
 * Start health check
 */
const startHealthCheck = () => {
    if (healthCheckInterval) return;

    healthCheckInterval = setInterval(checkQueueHealth, 30 * 60 * 1000);

    // Initial check after 30 seconds
    setTimeout(checkQueueHealth, 30 * 1000);

    logger.info('[HealthCheck] Queue health monitoring started');
};

/**
 * Stop health check
 */
const stopHealthCheck = () => {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
        logger.info('[HealthCheck] Queue health monitoring stopped');
    }
};

module.exports = {
    checkQueueHealth,
    startHealthCheck,
    stopHealthCheck,
    sendAlert,
    THRESHOLDS
};
