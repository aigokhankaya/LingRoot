/**
 * Push Notification Mock for Load Testing
 *
 * No-op mock that immediately returns success.
 */

/**
 * Mock push notification - does nothing
 * @returns {{ success: true }}
 */
function getMockNotificationResult() {
  return { success: true, data: { id: 'mock-notification' } };
}

module.exports = {
  getMockNotificationResult,
};
