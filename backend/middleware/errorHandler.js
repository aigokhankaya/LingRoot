// Error handling middleware
const { formatError } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
exports.errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error(`${err.name}: ${err.message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // Determine status code
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Send error response
  res.status(statusCode).json(
    formatError(
      err.message || 'Internal Server Error',
      statusCode
    )
  );
};

/**
 * Not found middleware
 */
exports.notFound = (req, res, next) => {
  // Allow Socket.IO to handle its own handshake/upgrade requests
  if (req.originalUrl && req.originalUrl.startsWith('/socket.io')) {
    return next();
  }

  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
