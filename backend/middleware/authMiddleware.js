const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

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

module.exports = { authenticate }; 