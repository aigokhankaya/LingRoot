// Middleware for authentication
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { supabase } = require("../utils/supabaseClient");
const logger = require("../utils/logger"); // Import logger

// Supabase client comes from shared client; if missing, middleware will respond 500 on protected routes

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || "lingroot-secret-key-for-development";

// Performance measurement helper
const measureTime = async (operation, description) => {
  const start = process.hrtime();
  const result = await operation();
  const [seconds, nanoseconds] = process.hrtime(start);
  const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
  logger.debug(`Performance [${description}]: ${duration.toFixed(2)}ms`);
  return result;
};

// Authenticate middleware
exports.authenticate = async (req, res, next) => {
  const path = req.originalUrl;
  const startTime = process.hrtime();
  // Reduce debug noise for polling endpoints unless it's an error
  const isPolling = path.includes('/notifications/unread');

  if (!isPolling) {
    logger.debug(`Authentication middleware triggered for path: ${path}`);
  }

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

    // Verify token with performance measurement
    const decoded = await measureTime(
      () => jwt.verify(token, JWT_SECRET),
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

    // Check if user exists in Supabase with performance measurement
    const { data: user, error } = await measureTime(
      () => supabase
        .from("users")
        .select("id, email, role")
        .eq("id", decoded.id)
        .single(),
      'Supabase User Lookup'
    );

    if (error || !user) {
      logger.warn(`[AUTH_FAIL] User not found in DB. ID: ${decoded.id}, Path: ${path}`, error);
      return res.status(401).json({
        success: false,
        message: "Authentication failed. User not found.",
        code: "USER_NOT_FOUND"
      });
    }

    // Add user info to request
    req.user = user;

    // Log total authentication time only for non-polling or slow requests
    const [totalSeconds, totalNanoseconds] = process.hrtime(startTime);
    const totalDuration = totalSeconds * 1000 + totalNanoseconds / 1000000;

    if (!isPolling || totalDuration > 500) {
      logger.info(`[AUTH_SUCCESS] User: ${user.email}, Path: ${path}, Time: ${totalDuration.toFixed(2)}ms`);
    }

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

    // Try to verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      logger.debug(`Optional auth token verified for user ID: ${decoded.id}, path: ${path}`);

      // If Supabase is not configured, proceed without user
      if (!supabase) {
        logger.warn("Optional auth: Supabase not configured; proceeding without user.");
        req.user = null;
        return next();
      }

      // Check if user exists in Supabase
      const { data: user, error } = await supabase
        .from("users")
        .select("id, email, role")
        .eq("id", decoded.id)
        .single();

      // Add user info to request if found
      if (error || !user) {
        logger.warn(`Optional auth: User ID ${decoded.id} not found or DB error for path ${path}. Proceeding without user.`, error);
        req.user = null;
      } else {
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

