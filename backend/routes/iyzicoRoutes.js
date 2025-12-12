/**
 * iyzico Payment Routes
 * Kredi kartı ödeme endpoint'leri
 */
const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const iyzicoController = require('../controllers/iyzicoController');

// ============ PUBLIC ENDPOINTS (Auth required) ============

// Ödeme başlat (3D Secure)
router.post('/checkout/init', authenticate, iyzicoController.initCheckout);

// BIN kontrolü (kart tipi belirleme)
router.post('/check-bin', authenticate, iyzicoController.checkBin);

// Taksit seçenekleri
router.post('/installments', authenticate, iyzicoController.getInstallments);

// ============ CALLBACK (No auth - iyzico calls this) ============

// 3D Secure callback
router.post('/callback', iyzicoController.handleCallback);
router.get('/callback', iyzicoController.handleCallback); // GET desteği de ekle

// ============ ADMIN ENDPOINTS ============

// Ödeme sağlayıcıları yönetimi
router.get('/admin/providers', authenticate, authorizeAdmin, iyzicoController.getAllProviders);
router.get('/admin/providers/:id', authenticate, authorizeAdmin, iyzicoController.getProviderById);
router.post('/admin/providers', authenticate, authorizeAdmin, iyzicoController.upsertProvider);
router.put('/admin/providers/:id', authenticate, authorizeAdmin, iyzicoController.upsertProvider);
router.post('/admin/providers/:id/test', authenticate, authorizeAdmin, iyzicoController.testProvider);

// Kredi kartı işlemleri yönetimi
router.get('/admin/transactions', authenticate, authorizeAdmin, iyzicoController.getAllTransactions);
router.get('/admin/transactions/summary', authenticate, authorizeAdmin, iyzicoController.getTransactionSummary);
router.get('/admin/transactions/:id', authenticate, authorizeAdmin, iyzicoController.getTransactionById);

// İade işlemi (Admin)
router.post('/admin/refund', authenticate, authorizeAdmin, iyzicoController.refund);

module.exports = router;
