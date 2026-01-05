const express = require('express');
const router = express.Router();
const { getCircuitBreakerStatus } = require('../utils/retryUtils');

/**
 * GET /api/health
 * Sistem sağlık durumu
 */
router.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

/**
 * GET /api/health/circuits
 * Circuit breaker durumları
 */
router.get('/circuits', (req, res) => {
    res.json({
        success: true,
        circuits: getCircuitBreakerStatus()
    });
});

module.exports = router;
