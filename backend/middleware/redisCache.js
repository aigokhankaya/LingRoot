/**
 * Redis Response Caching Middleware
 *
 * Caches JSON responses in Redis with configurable TTL.
 * Falls back gracefully when Redis is unavailable.
 */

const { getConnection, checkRedisAvailability } = require('../utils/storage/redisClient');
const logger = require('../utils/common/logger');

/**
 * Cache middleware factory
 * @param {string} keyPrefix - Cache key prefix (e.g. 'sub:plans')
 * @param {number} ttlSeconds - Time-to-live in seconds
 * @returns {Function} Express middleware
 */
const redisCache = (keyPrefix, ttlSeconds) => async (req, res, next) => {
  if (!checkRedisAvailability()) return next();

  // Cache key: prefix + user-specific or global
  const userId = req.user?.id || 'global';
  const cacheKey = `cache:${keyPrefix}:${userId}`;

  try {
    const cached = await getConnection().get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(JSON.parse(cached));
    }
  } catch (err) {
    logger.debug(`[CACHE] Redis read error: ${err.message}`);
  }

  // Intercept res.json to cache successful responses
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200 && checkRedisAvailability()) {
      getConnection()
        .setex(cacheKey, ttlSeconds, JSON.stringify(body))
        .catch(err => logger.debug(`[CACHE] Redis write error: ${err.message}`));
    }
    res.set('X-Cache', 'MISS');
    return originalJson(body);
  };

  next();
};

/**
 * Invalidate cache entries matching a key pattern
 * @param {string} keyPattern - Pattern to match (e.g. 'sub:plans' or 'stats:user:uuid')
 */
const invalidateCache = async (keyPattern) => {
  if (!checkRedisAvailability()) return;
  try {
    const keys = await getConnection().keys(`cache:${keyPattern}*`);
    if (keys.length > 0) {
      await getConnection().del(...keys);
      logger.debug(`[CACHE] Invalidated ${keys.length} keys for pattern: ${keyPattern}`);
    }
  } catch (err) {
    logger.debug(`[CACHE] Invalidation error: ${err.message}`);
  }
};

module.exports = { redisCache, invalidateCache };
