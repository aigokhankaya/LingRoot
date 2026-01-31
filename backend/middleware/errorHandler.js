// Error handling middleware
const { formatError } = require('../utils/common/responseFormatter.js');
const logger = require('../utils/common/logger.js');
const { trace, SpanStatusCode } = require('@opentelemetry/api');

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

  // Record exception in active OTel span for SigNoz Exceptions tracking
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
  }

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
