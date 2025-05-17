const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const requestIdMiddleware = (req, res, next) => {
  // Generate unique request ID
  const requestId = uuidv4();
  
  // Attach to request object
  req.requestId = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Log request start
  logger.info(`Request started: ${req.method} ${req.url}`, {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  next();
};

module.exports = requestIdMiddleware; 