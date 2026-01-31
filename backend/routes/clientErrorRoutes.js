/**
 * Client Error Routes
 * Receives error reports from web/mobile clients.
 * Rate limited to prevent abuse.
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { reportError } = require('../controllers/clientErrorController.js');

// Rate limit: 30 requests per minute per IP
const clientErrorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many error reports, try again later' },
});

// POST /api/client-errors — no auth required (clients may be in broken state)
router.post('/', clientErrorLimiter, reportError);

module.exports = router;
