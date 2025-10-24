const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const iapController = require('../controllers/iapController');

// Apple IAP verification endpoint
router.post('/apple/verify', authenticate, iapController.verifyAppleReceipt);

// Google Play IAP verification endpoint
router.post('/google/verify', authenticate, iapController.verifyGooglePlayPurchase);

module.exports = router;
