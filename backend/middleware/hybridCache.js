/**
 * Hybrid Cache Middleware
 *
 * Two-tier caching: L1 (Memory) → L2 (Redis)
 * Dramatically reduces Redis calls by serving from memory first.
 *
 * Usage:
 *   router.get('/data', hybridCache('my:prefix', 300, 30), controller.getData);
 *   // Redis TTL: 300s, Memory TTL: 30s
 */

const memoryCache = require('../utils/cache/memoryCache');
const { getConnection, checkRedisAvailability } = require('../utils/storage/redisClient');
const logger = require('../utils/common/logger');

/**
 * Hybrid cache middleware factory
 * @param {string} keyPrefix - Cache key prefix (e.g., 'sub:plans')
 * @param {number} redisTtl - Redis cache TTL in seconds
 * @param {number} memoryTtl - Memory cache TTL in seconds (default: 30)
 * @returns {Function} Express middleware
 */
const hybridCache = (keyPrefix, redisTtl, memoryTtl = 30) => async (req, res, next) => {
  // Build cache key
  const userId = req.user?.id || 'global';
  const cacheKey = `cache:${keyPrefix}:${userId}`;

  // L1: Check memory cache first (fastest)
  const memoryCached = memoryCache.get(cacheKey);
  if (memoryCached !== undefined) {
    res.set('X-Cache', 'HIT-L1');
    res.set('X-Cache-Key', cacheKey);
    return res.json(memoryCached);
  }

  // L2: Check Redis cache
  if (checkRedisAvailability()) {
    try {
      const redisCached = await getConnection().get(cacheKey);
      if (redisCached) {
        const data = JSON.parse(redisCached);
        // Populate L1 for subsequent requests
        memoryCache.set(cacheKey, data, memoryTtl);
        res.set('X-Cache', 'HIT-L2');
        res.set('X-Cache-Key', cacheKey);
        return res.json(data);
      }
    } catch (err) {
      logger.debug(`[HYBRID-CACHE] Redis read error: ${err.message}`);
    }
  }

  // Cache miss - intercept response to cache it
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only cache successful responses
    if (res.statusCode === 200) {
      // L1: Write to memory cache
      memoryCache.set(cacheKey, body, memoryTtl);

      // L2: Write to Redis cache (async, don't block response)
      if (checkRedisAvailability()) {
        getConnection()
          .setex(cacheKey, redisTtl, JSON.stringify(body))
          .catch(err => logger.debug(`[HYBRID-CACHE] Redis write error: ${err.message}`));
      }
    }

    res.set('X-Cache', 'MISS');
    res.set('X-Cache-Key', cacheKey);
    return originalJson(body);
  };

  next();
};

/**
 * Invalidate cache for a pattern (both L1 and L2)
 * @param {string} keyPattern - Pattern to match
 */
const invalidateHybridCache = async (keyPattern) => {
  const fullPattern = `cache:${keyPattern}*`;

  // L1: Clear from memory
  const memoryDeleted = memoryCache.delByPattern(fullPattern);

  // L2: Clear from Redis
  let redisDeleted = 0;
  if (checkRedisAvailability()) {
    const redis = getConnection();
    let cursor = '0';

    try {
      do {
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
        cursor = newCursor;

        if (keys.length > 0) {
          await redis.del(...keys);
          redisDeleted += keys.length;
        }
      } while (cursor !== '0');
    } catch (err) {
      logger.debug(`[HYBRID-CACHE] Redis invalidation error: ${err.message}`);
    }
  }

  if (memoryDeleted > 0 || redisDeleted > 0) {
    logger.debug(`[HYBRID-CACHE] Invalidated: L1=${memoryDeleted}, L2=${redisDeleted} for pattern: ${keyPattern}`);
  }
};

module.exports = {
  hybridCache,
  invalidateHybridCache
};
