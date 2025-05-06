// Middleware for authentication
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const logger = require("../utils/logger"); // Import logger

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || "lingroot-secret-key-for-development";

// Authenticate middleware
exports.authenticate = async (req, res, next) => {
  const path = req.originalUrl;
  logger.debug(`Authentication middleware triggered for path: ${path}`);
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn(`Authentication failed: No token provided or invalid format for path ${path}`);
      return res.status(401).json({
        success: false,
        message: "Authentication failed. No token provided or invalid format.",
      });
    }

    const token = authHeader.split(" ")[1];
    logger.debug(`Token extracted for path: ${path}`);

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    logger.debug(`Token verified for user ID: ${decoded.id}, path: ${path}`);

    // Check if user exists in Supabase
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      logger.warn(`Authentication failed: User ID ${decoded.id} not found in Supabase or DB error for path ${path}:`, error);
      return res.status(401).json({
        success: false,
        message: "Authentication failed. User not found.",
      });
    }

    // Add user info to request
    req.user = user;
    logger.info(`User authenticated successfully: ${user.email} (ID: ${user.id}), path: ${path}`);

    next();
  } catch (error) {
    logger.error(`Authentication error for path ${path}:`, error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please log in again.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please log in again.",
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

