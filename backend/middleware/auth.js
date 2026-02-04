// Middleware for authentication
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js'); // Import logger

// Supabase client comes from shared client; if missing, middleware will respond 500 on protected routes

// JWT secret key — production requires env variable
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'lingroot-secret-key-for-development')) {
  logger.error('[SECURITY_CRITICAL] JWT_SECRET is not set or using default insecure key in PRODUCTION! Exiting...');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET || "lingroot-secret-key-for-development";

// Redis token blacklist check helper
const { getConnection, checkRedisAvailability } = require('../utils/storage/redisClient');
async function isTokenBlacklisted(token) {
  try {
    if (!checkRedisAvailability()) return false;
    const result = await getConnection().get(`bl:${token}`);
    return result === '1';
  } catch {
    // V-04: Intentional fail-open design. JWT TTL is 15 minutes, so the risk
    // window when Redis is unavailable is small. Blocking all requests on Redis
    // failure would cause a full outage, which is worse than a brief blacklist gap.
    return false;
  }
}

// Performance measurement helper (silent)
const measureTime = async (operation, description) => {
  const result = await operation();
  return result;
};

// Authenticate middleware
exports.authenticate = async (req, res, next) => {
  const path = req.originalUrl;

  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn(`[AUTH_FAIL] No token or invalid format. Path: ${path}. Header: ${authHeader || 'MISSING'}`);
      return res.status(401).json({
        success: false,
        message: "Authentication failed. No token provided or invalid format.",
        code: "NO_TOKEN"
      });
    }

    const token = authHeader.split(" ")[1];

    // Check token blacklist (logout invalidation)
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ success: false, message: "Token has been revoked.", code: "TOKEN_REVOKED" });
    }

    // Verify token with performance measurement
    const decoded = await measureTime(
      () => jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }),
      'JWT Verification'
    );

    // Ensure Supabase is configured
    if (!supabase) {
      logger.error("[AUTH_FAIL] Supabase config missing");
      return res.status(500).json({
        success: false,
        message: "Server auth not configured.",
      });
    }

    // Check Redis cache for user data
    const cacheKey = `auth:user:${decoded.id}`;
    let user = null;

    if (checkRedisAvailability()) {
      try {
        const cached = await getConnection().get(cacheKey);
        if (cached) {
          user = JSON.parse(cached);
        }
      } catch (err) {
        logger.debug(`[AUTH] Redis cache read error for user ${decoded.id}: ${err.message}`);
      }
    }

    // Cache miss: fetch from Supabase
    if (!user) {
      const { data, error } = await measureTime(
        () => supabase
          .from("users")
          .select("id, email, role")
          .eq("id", decoded.id)
          .single(),
        'Supabase User Lookup'
      );

      if (error || !data) {
        logger.warn(`[AUTH_FAIL] User not found in DB. ID: ${decoded.id}, Path: ${path}`, error);
        return res.status(401).json({
          success: false,
          message: "Authentication failed. User not found.",
          code: "USER_NOT_FOUND"
        });
      }
      user = data;

      // Write to Redis cache (60s TTL)
      if (checkRedisAvailability()) {
        try {
          await getConnection().setex(cacheKey, 60, JSON.stringify(user));
        } catch (err) {
          logger.debug(`[AUTH] Redis cache write error for user ${decoded.id}: ${err.message}`);
        }
      }
    }

    // Add user info to request
    req.user = user;

    next();
  } catch (error) {
    logger.error(`[AUTH_ERROR] Path: ${path}`, error.message);

    if (error.name === "JsonWebTokenError") {
      logger.warn(`[AUTH_FAIL] Invalid Token. Path: ${path}, Error: ${error.message}`);
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please log in again.",
        code: "INVALID_TOKEN"
      });
    }

    if (error.name === "TokenExpiredError") {
      logger.warn(`[AUTH_FAIL] Token Expired. Path: ${path}`);
      return res.status(401).json({
        success: false,
        message: "Token expired. Please log in again.",
        code: "TOKEN_EXPIRED"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication failed. Please try again.",
    });
  }
};

// Optional authentication middleware - doesn"t require auth but adds user info if available
exports.optionalAuth = async (req, res, next) => {
  const path = req.originalUrl;
  logger.debug(`Optional authentication middleware triggered for path: ${path}`);
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    // If no token, continue without user info
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.debug(`No token found for optional auth on path: ${path}. Proceeding without user.`);
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];
    logger.debug(`Token extracted for optional auth on path: ${path}`);

    // Check blacklist
    if (await isTokenBlacklisted(token)) {
      req.user = null;
      return next();
    }

    // Try to verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      logger.debug(`Optional auth token verified for user ID: ${decoded.id}, path: ${path}`);

      // If Supabase is not configured, proceed without user
      if (!supabase) {
        logger.warn("Optional auth: Supabase not configured; proceeding without user.");
        req.user = null;
        return next();
      }

      // Check Redis cache for user data
      const cacheKey = `auth:user:${decoded.id}`;
      let user = null;

      if (checkRedisAvailability()) {
        try {
          const cached = await getConnection().get(cacheKey);
          if (cached) {
            user = JSON.parse(cached);
          }
        } catch (err) {
          logger.debug(`[AUTH] Redis cache read error for optional auth user ${decoded.id}: ${err.message}`);
        }
      }

      if (!user) {
        const { data, error } = await supabase
          .from("users")
          .select("id, email, role")
          .eq("id", decoded.id)
          .single();

        if (error || !data) {
          logger.warn(`Optional auth: User ID ${decoded.id} not found or DB error for path ${path}. Proceeding without user.`, error);
          req.user = null;
        } else {
          user = data;
          // Write to Redis cache (60s TTL)
          if (checkRedisAvailability()) {
            try {
              await getConnection().setex(cacheKey, 60, JSON.stringify(user));
            } catch (err) {
              logger.debug(`[AUTH] Redis cache write error for optional auth user ${decoded.id}: ${err.message}`);
            }
          }
        }
      }

      // Add user info to request if found
      if (user) {
        req.user = user;
        logger.info(`Optional auth: User identified successfully: ${user.email} (ID: ${user.id}), path: ${path}`);
      }
    } catch (tokenError) {
      // If token verification fails, continue without user info
      logger.warn(`Optional auth: Token verification failed for path ${path}. Proceeding without user.`, tokenError);
      req.user = null;
    }

    next();
  } catch (error) {
    // Log unexpected errors in optional auth but proceed
    logger.error(`Unexpected error in optional authentication middleware for path ${path}:`, error);
    req.user = null;
    next();
  }
};

// Admin authorization middleware
exports.authorizeAdmin = (req, res, next) => {
  const userId = req.user?.id || "unknown";
  const path = req.originalUrl;
  logger.debug(`Admin authorization middleware triggered for user ID: ${userId}, path: ${path}`);

  if (!req.user || req.user.role !== "admin") {
    logger.warn(`Authorization failed: Admin privileges required for user ID ${userId} on path ${path}`);
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }

  logger.info(`Admin authorization successful for user ID: ${userId}, path: ${path}`);
  next();
};

