const express = require('express');
const router = express.Router();
const { getCircuitBreakerStatus } = require('../utils/common/retryUtils.js');

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

/**
 * GET /api/health/env
 * Load test mode durumu (debug için)
 */
router.get('/env', (req, res) => {
    res.json({
        loadTestMode: process.env.LOAD_TEST_MODE === 'true',
        loadTestModeRaw: process.env.LOAD_TEST_MODE,
        nodeEnv: process.env.NODE_ENV
    });
});

module.exports = router;
