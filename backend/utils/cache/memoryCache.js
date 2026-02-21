/**
 * L1 Memory Cache
 *
 * In-memory cache layer for reducing Redis calls.
 * Short TTL (30s default) with high hit rate.
 *
 * Architecture: Request → L1 (Memory) → L2 (Redis) → Database
 */

const NodeCache = require('node-cache');
const logger = require('../common/logger');

// L1 Memory Cache configuration
const memoryCache = new NodeCache({
  stdTTL: 30,           // 30 seconds default TTL
  checkperiod: 60,      // Check for expired keys every 60 seconds
  maxKeys: 10000,       // Maximum 10000 keys (prevents memory bloat)
  useClones: false,     // Don't clone objects (better performance)
  deleteOnExpire: true  // Auto-delete expired keys
});

// Metrics for monitoring
const metrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {*} Cached value or undefined
 */
const get = (key) => {
  const value = memoryCache.get(key);
  if (value !== undefined) {
    metrics.hits++;
    return value;
  }
  metrics.misses++;
  return undefined;
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - TTL in seconds (optional, uses default if not provided)
 * @returns {boolean} Success status
 */
const set = (key, value, ttl) => {
  metrics.sets++;
  if (ttl) {
    return memoryCache.set(key, value, ttl);
  }
  return memoryCache.set(key, value);
};

/**
 * Delete key from cache
 * @param {string} key - Cache key
 * @returns {number} Number of deleted keys
 */
const del = (key) => {
  metrics.deletes++;
  return memoryCache.del(key);
};

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Pattern to match (e.g., 'cache:user:*')
 * @returns {number} Number of deleted keys
 */
const delByPattern = (pattern) => {
  const keys = memoryCache.keys();
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  let deleted = 0;

  for (const key of keys) {
    if (regex.test(key)) {
      memoryCache.del(key);
      deleted++;
    }
  }

  metrics.deletes += deleted;
  return deleted;
};

/**
 * Flush all cache
 */
const flush = () => {
  memoryCache.flushAll();
  logger.info('[L1-CACHE] Flushed all entries');
};

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
const stats = () => {
  const cacheStats = memoryCache.getStats();
  const hitRate = metrics.hits + metrics.misses > 0
    ? ((metrics.hits / (metrics.hits + metrics.misses)) * 100).toFixed(2)
    : '0.00';

  return {
    keys: cacheStats.keys,
    hits: metrics.hits,
    misses: metrics.misses,
    hitRate: hitRate + '%',
    sets: metrics.sets,
    deletes: metrics.deletes,
    ksize: cacheStats.ksize,
    vsize: cacheStats.vsize
  };
};

/**
 * Reset metrics (call after logging)
 */
const resetMetrics = () => {
  metrics.hits = 0;
  metrics.misses = 0;
  metrics.sets = 0;
  metrics.deletes = 0;
};

// Log stats every 5 minutes
setInterval(() => {
  const s = stats();
  if (s.hits > 0 || s.misses > 0) {
    logger.info('[L1-CACHE] Stats:', s);
    resetMetrics();
  }
}, 5 * 60 * 1000);

module.exports = {
  get,
  set,
  del,
  delByPattern,
  flush,
  stats,
  resetMetrics
};
