const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');
const planController = require('../controllers/planController');

// Public routes
router.get('/plans', subscriptionController.getSubscriptionPlans);

// Webhook for payment provider callbacks
router.post('/webhook', express.raw({ type: 'application/json' }), subscriptionController.handleWebhook);

// Protected routes
router.post('/create-checkout', authenticate, subscriptionController.createCheckoutSession);
router.get('/my-subscription', authenticate, subscriptionController.getUserSubscription);
router.post('/cancel', authenticate, subscriptionController.cancelSubscription);
router.post('/resume', authenticate, subscriptionController.resumeSubscription);
router.post('/update', authenticate, subscriptionController.updateSubscription);
// Mock Iyzico payment
router.post('/mock-iyzico', authenticate, subscriptionController.mockIyzicoPayment);
// Usage summary
router.get('/usage-summary', authenticate, subscriptionController.getUsageSummary);
// Get user's plan features
router.get('/my-features', authenticate, planController.getMyPlanFeatures);

module.exports = router;
