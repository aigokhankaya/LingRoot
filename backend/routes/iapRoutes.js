const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { verifyAppleReceipt } = require('../controllers/appleIAPController');

// POST /api/iap/apple/verify
router.post('/apple/verify', authenticate, verifyAppleReceipt);

module.exports = router;
