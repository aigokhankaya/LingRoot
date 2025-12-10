/**
 * Stripe Payment Routes
 * 
 * Kredi kartı ödemeleri için Stripe API endpoint'leri.
 */

const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// ============================================
// PUBLIC ENDPOINTS (Authentication required)
// ============================================

/**
 * Payment Intent oluştur (Embedded checkout için)
 * POST /api/stripe/payment-intent
 */
router.post('/payment-intent', authenticate, stripeController.createPaymentIntent);

/**
 * Checkout Session oluştur (Hosted checkout için)
 * POST /api/stripe/checkout
 */
router.post('/checkout', authenticate, stripeController.createCheckoutSession);

/**
 * Ödeme durumunu kontrol et
 * GET /api/stripe/payment-status/:paymentIntentId
 */
router.get('/payment-status/:paymentIntentId', authenticate, stripeController.getPaymentStatus);

// ============================================
// WEBHOOK ENDPOINT (No authentication - Stripe signature verification)
// ============================================

/**
 * Stripe Webhook handler
 * POST /api/stripe/webhook
 * 
 * NOT: Bu endpoint raw body gerektirir, express.json() middleware'i
 * server.js'de bu route için atlanmalı.
 */
router.post('/webhook', express.raw({ type: 'application/json' }), stripeController.handleWebhook);

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * İade işlemi
 * POST /api/stripe/admin/refund
 */
router.post('/admin/refund', authenticate, authorizeAdmin, stripeController.adminRefund);

/**
 * Stripe bağlantı testi
 * POST /api/stripe/admin/test-connection
 */
router.post('/admin/test-connection', authenticate, authorizeAdmin, stripeController.testConnection);

/**
 * Müşteri kayıtlı kartlarını getir
 * GET /api/stripe/admin/customer/:userId/cards
 */
router.get('/admin/customer/:userId/cards', authenticate, authorizeAdmin, stripeController.getCustomerCards);

module.exports = router;
