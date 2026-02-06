const express = require('express');
const router = express.Router();
const {
  getAllParameters,
  getParameter,
  updateParameter,
  deleteParameter
} = require('../controllers/parameterController');
const { setCacheHeaders } = require('../middleware/cacheHeaders');
const { redisCache } = require('../middleware/redisCache');

// Get all parameters
router.get('/', setCacheHeaders(1800), redisCache('params:all', 3600), getAllParameters);

// Get specific parameter
router.get('/:key', setCacheHeaders(1800), getParameter);

// Update or create parameter
router.put('/:key', updateParameter);

// Delete parameter
router.delete('/:key', deleteParameter);

// Note: Mock modes removed - all operations use real data

module.exports = router; 