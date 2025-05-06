const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');

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

module.exports = router;
