/**
 * Redis Client
 * 
 * BullMQ queue'ları için Redis bağlantı yönetimi.
 * Fallback: Bağlantı yoksa in-memory mode.
 */

const Redis = require('ioredis');

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
                    isRedisAvailable = false;
                    return null; // Stop retrying
                }
                return Math.min(times * 500, 2000); // Retry delay
            }
        });

        connection.on('connect', () => {
            isRedisAvailable = true;
        });

        connection.on('error', () => {
            isRedisAvailable = false;
        });

        connection.on('close', () => {
            isRedisAvailable = false;
        });

        connection.on('reconnecting', () => {
            // Silent reconnect
        });

        return connection;
    } catch (error) {
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
