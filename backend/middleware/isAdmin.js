// Backend middleware for admin role verification
const jwt = require("jsonwebtoken");
const { User } = require("../models"); // Assuming Sequelize models are used
require("dotenv").config();
const logger = require('../utils/common/logger.js'); // Import logger

/**
 * Middleware to verify if user has admin role
 * This middleware should be used after the authenticate middleware
 */
exports.isAdmin = async (req, res, next) => {
  const userId = req.user?.id || "unknown";
  const path = req.originalUrl;
  logger.debug(`isAdmin middleware triggered for user ID: ${userId}, path: ${path}`);

  try {
    // User should already be authenticated at this point
    if (!req.user || !req.user.id) {
      logger.warn(`isAdmin check failed: Authentication required for path ${path}`);
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get user from database to check current role
    // Note: This might be redundant if authenticate middleware already fetches the user
    // Consider relying solely on req.user.role if authenticate middleware is reliable
    logger.debug(`Fetching user details for isAdmin check for user ID: ${userId}`);
    const user = await User.findByPk(req.user.id);

    if (!user) {
      logger.warn(`isAdmin check failed: User ID ${userId} not found in database for path ${path}`);
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has admin role
    if (user.role !== "admin") {
      logger.warn(`isAdmin check failed: User ID ${userId} (Role: ${user.role}) does not have admin privileges for path ${path}`);
      return res.status(403).json({ message: "Admin access required" });
    }

    // User is admin, proceed to next middleware
    logger.info(`isAdmin check successful for user ID: ${userId}, path: ${path}`);
    next();
  } catch (error) {
    logger.error(`Admin verification error for user ID ${userId}, path ${path}:`, error);
    res.status(500).json({ message: "Server error verifying admin access" });
  }
};

