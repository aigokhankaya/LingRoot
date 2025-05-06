// Utility functions for response formatting
/**
 * Format a successful response
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Formatted success response
 */
exports.formatSuccess = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data
  };
};

/**
 * Format an error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted error response
 */
exports.formatError = (message, statusCode = 500) => {
  return {
    success: false,
    message,
    statusCode
  };
};
