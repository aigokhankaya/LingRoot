const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/common/logger.js');

const requestIdMiddleware = (req, res, next) => {
  // Generate unique request ID
  const requestId = uuidv4();
  
  // Attach to request object
  req.requestId = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-ID', requestId);

  next();
};

module.exports = requestIdMiddleware; 