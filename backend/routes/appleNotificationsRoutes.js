const express = require('express');
const router = express.Router();
const appleNotificationsController = require('../controllers/appleNotificationsController');

/**
 * Apple App Store Server Notifications Routes
 * 
 * These endpoints receive notifications from Apple about subscription events
 * No authentication required - Apple sends these directly
 */

// Production notifications
router.post('/notifications', appleNotificationsController.handleAppleNotification);

// Sandbox notifications (for testing)
router.post('/notifications/sandbox', appleNotificationsController.handleAppleSandboxNotification);

module.exports = router;
