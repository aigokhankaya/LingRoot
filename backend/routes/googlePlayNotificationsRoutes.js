const express = require('express');
const router = express.Router();
const googlePlayNotificationsController = require('../controllers/googlePlayNotificationsController');

/**
 * Google Play Real-Time Developer Notifications (RTDN) Routes
 * 
 * These endpoints receive notifications from Google Play via Cloud Pub/Sub
 * No authentication required - Google sends these directly via Pub/Sub push
 * 
 * Setup Instructions:
 * 1. Create a Google Cloud Pub/Sub topic
 * 2. Create a push subscription pointing to this endpoint
 * 3. Configure the topic in Google Play Console under Monetization > Monetization setup
 */

// Main RTDN endpoint - receives Pub/Sub push notifications
router.post('/notifications', googlePlayNotificationsController.handleGooglePlayNotification);

// Test endpoint to verify webhook is working
router.get('/notifications/test', googlePlayNotificationsController.testGooglePlayNotification);

module.exports = router;
