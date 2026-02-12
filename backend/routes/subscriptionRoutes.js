const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');
const planController = require('../controllers/planController');
const { setCacheHeaders } = require('../middleware/cacheHeaders');
const { redisCache } = require('../middleware/redisCache');

// Public routes
router.get('/plans', setCacheHeaders(300), redisCache('sub:plans', 1800), subscriptionController.getSubscriptionPlans);

// Webhook for payment provider callbacks
router.post('/webhook', express.raw({ type: 'application/json' }), subscriptionController.handleWebhook);

// Protected routes
router.post('/create-checkout', authenticate, subscriptionController.createCheckoutSession);
router.get('/my-subscription', authenticate, subscriptionController.getUserSubscription);
router.post('/cancel', authenticate, subscriptionController.cancelSubscription);
router.post('/resume', authenticate, subscriptionController.resumeSubscription);
router.post('/update', authenticate, subscriptionController.updateSubscription);
// Mock Iyzico payment (ONLY for development/testing - blocked in production)
router.post('/mock-iyzico', authenticate, (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            success: false,
            message: 'Mock payments are disabled in production environment',
            code: 'MOCK_PAYMENT_BLOCKED'
        });
    }
    next();
}, subscriptionController.mockIyzicoPayment);
// Usage summary
router.get('/usage-summary', authenticate, subscriptionController.getUsageSummary);
// Get user's plan features
router.get('/my-features', authenticate, planController.getMyPlanFeatures);

module.exports = router;
