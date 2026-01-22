const jwt = require('jsonwebtoken');
const logger = require('../utils/common/logger.js');

const authenticate = (req, res, next) => {
  try {
    // Authorization header kontrolü
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn('Authentication failed: No authorization header', { path: req.path });
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    // Bearer token formatı kontrolü
    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Invalid token format', { path: req.path });
      return res.status(401).json({ success: false, message: 'Invalid token format, Bearer required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      logger.warn('Authentication failed: Empty token', { path: req.path });
      return res.status(401).json({ success: false, message: 'Empty token provided' });
    }

    // JWT Secret kontrolü
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('Server configuration error: JWT_SECRET is not defined in environment');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    // Token doğrulama
    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;

      // Debug modunda user bilgisini logla
      logger.debug('User authenticated', {
        userId: decoded.id,
        path: req.path,
        method: req.method
      });

      next();
    } catch (tokenError) {
      // Token geçersiz veya süresi dolmuş
      logger.warn(`Token verification failed: ${tokenError.message}`, {
        path: req.path,
        error: tokenError.message
      });

      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired' });
      } else if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      } else {
        return res.status(401).json({ success: false, message: `Token error: ${tokenError.message}` });
      }
    }
  } catch (err) {
    // Beklenmeyen hatalar
    logger.error('Unexpected error in authentication middleware', { error: err });
    return res.status(500).json({ success: false, message: 'Internal server error during authentication' });
  }
};

/**
 * Optional authentication middleware
 * Populates req.user if valid token is provided, but allows unauthenticated requests
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // No token? That's fine, just continue
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      req.user = null;
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      logger.debug('Optional auth: User identified', { userId: decoded.id });
    } catch (tokenError) {
      // Token invalid, but that's okay for optional auth
      req.user = null;
    }

    next();
  } catch (err) {
    // Any error? Just continue without user
    req.user = null;
    next();
  }
};

module.exports = { authenticate, optionalAuth }; 