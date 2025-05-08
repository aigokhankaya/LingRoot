const winston = require('winston');
const path = require('path');

// Create a separate logger instance for step tracing
const stepLogger = winston.createLogger({
  level: process.env.STEP_LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/step_trace.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Sensitive fields to mask
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'key', 'authorization'];

// Sanitize data for logging
const sanitizeData = (data) => {
  if (!data) return data;
  
  const sanitized = { ...data };
  
  // Handle arrays
  if (Array.isArray(sanitized)) {
    return sanitized.map(item => sanitizeData(item));
  }
  
  // Handle objects
  if (typeof sanitized === 'object') {
    Object.keys(sanitized).forEach(key => {
      if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeData(sanitized[key]);
      } else if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = `[TEXT_LENGTH:${sanitized[key].length}]`;
      }
    });
  }
  
  return sanitized;
};

// Calculate duration in milliseconds
const calculateDuration = (startTime) => {
  const [seconds, nanoseconds] = process.hrtime(startTime);
  return seconds * 1000 + nanoseconds / 1000000;
};

// Main step logging function
const logStep = ({
  requestId,
  stepName,
  stepSequence,
  status = 'success',
  inputData = null,
  outputData = null,
  error = null,
  userId = null,
  startTime = null
}) => {
  const logData = {
    requestId,
    stepName,
    stepSequence,
    status,
    timestamp: new Date().toISOString(),
    userId
  };

  // Add duration if startTime is provided
  if (startTime) {
    logData.durationMs = calculateDuration(startTime);
  }

  // Add sanitized input/output data
  if (inputData) {
    logData.inputData = sanitizeData(inputData);
  }
  if (outputData) {
    logData.outputData = sanitizeData(outputData);
  }

  // Add error information if present
  if (error) {
    logData.error = {
      message: error.message,
      stack: error.stack,
      code: error.code
    };
  }

  // Log based on status
  if (status === 'failure') {
    stepLogger.error('Step failed', logData);
  } else {
    stepLogger.info('Step completed', logData);
  }

  return logData;
};

module.exports = {
  logStep,
  stepLogger
}; 