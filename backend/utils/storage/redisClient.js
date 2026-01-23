/**
 * Redis Client
 * 
 * BullMQ queue'ları için Redis bağlantı yönetimi.
 * Fallback: Bağlantı yoksa in-memory mode.
 */

const Redis = require('ioredis');
const logger = require('../common/logger.js');

// Redis URL from environment
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let connection = null;
let isRedisAvailable = false;

/**
 * Redis bağlantısını oluştur
 */
const createConnection = () => {
    try {
        connection = new Redis(REDIS_URL, {
            maxRetriesPerRequest: null, // BullMQ requirement
            enableReadyCheck: false,
            retryStrategy: (times) => {
                if (times > 3) {
                    logger.warn(`[Redis] Connection failed after ${times} attempts, falling back to in-memory mode`);
                    isRedisAvailable = false;
                    return null; // Stop retrying
                }
                return Math.min(times * 500, 2000); // Retry delay
            }
        });

        connection.on('connect', () => {
            logger.info('🔗 [Redis] Connected successfully');
            isRedisAvailable = true;
        });

        connection.on('error', (err) => {
            logger.error('[Redis] Connection error:', err.message);
            isRedisAvailable = false;
        });

        connection.on('close', () => {
            logger.warn('[Redis] Connection closed');
            isRedisAvailable = false;
        });

        connection.on('reconnecting', () => {
            logger.info('[Redis] Attempting to reconnect...');
        });

        return connection;
    } catch (error) {
        logger.error('[Redis] Failed to create connection:', error.message);
        isRedisAvailable = false;
        return null;
    }
};

/**
 * Redis bağlantısını getir veya oluştur
 */
const getConnection = () => {
    if (!connection) {
        connection = createConnection();
    }
    return connection;
};

/**
 * Redis'in kullanılabilir olup olmadığını kontrol et
 */
const checkRedisAvailability = () => isRedisAvailable;

/**
 * Bağlantıyı kapat
 */
const closeConnection = async () => {
    if (connection) {
        await connection.quit();
        connection = null;
        isRedisAvailable = false;
        logger.info('[Redis] Connection closed gracefully');
    }
};

// İlk bağlantıyı başlat
getConnection();

module.exports = {
    getConnection,
    checkRedisAvailability,
    closeConnection,
    REDIS_URL
};
