const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const perfLogsController = require('../controllers/perfLogsController');

// Mobile sends perf logs (authenticated user)
router.post('/', authenticate, perfLogsController.submitLogs);

// Admin endpoints
router.get('/admin', authenticate, authorizeAdmin, perfLogsController.getLogs);
router.get('/admin/list', authenticate, authorizeAdmin, perfLogsController.listUsers);

module.exports = router;
