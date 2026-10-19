// backend/middleware/internalApiAuth.js
// Bearer API-key auth for internal service-to-service endpoints (e.g. Video Factory).
// The key NEVER appears in logs or error messages.

const crypto = require('crypto');
const logger = require('../utils/common/logger.js');

/**
 * Constant-time string comparison that avoids leaking length via early return.
 */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Compare against itself to keep timing roughly constant, then fail.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Express middleware factory. Validates `Authorization: Bearer <key>` against
 * the configured environment variable.
 * @param {string|string[]} envVarName - env var name(s), in priority order.
 */
function internalApiAuth(envVarName = 'VIDEO_FACTORY_API_KEY') {
  return (req, res, next) => {
    const envVarNames = Array.isArray(envVarName) ? envVarName : [envVarName];
    const configuredName = envVarNames.find((name) => process.env[name]);
    const expected = configuredName ? process.env[configuredName] : undefined;
    if (!expected) {
      logger.error(`[InternalAuth] ${envVarNames.join(' or ')} is not configured; rejecting request to ${req.originalUrl}`);
      return res.status(500).json({ error: 'Internal API key not configured on server.' });
    }

    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      logger.warn(`[InternalAuth] Missing or malformed Authorization header for ${req.originalUrl}`);
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const provided = match[1].trim();
    if (!safeEqual(provided, expected)) {
      logger.warn(`[InternalAuth] Invalid API key for ${req.originalUrl}`);
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    return next();
  };
}

module.exports = { internalApiAuth };
