
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticate, authorizeAdmin } = require('../middleware/auth.js');

// Protect all routes - Admin only
router.use(authenticate);
router.use(authorizeAdmin);

router.get('/', jobController.getJobStats);

module.exports = router;
