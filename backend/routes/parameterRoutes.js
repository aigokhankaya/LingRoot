const express = require('express');
const router = express.Router();
const {
  getAllParameters,
  getParameter,
  updateParameter,
  deleteParameter
} = require('../controllers/parameterController');

// Get all parameters
router.get('/', getAllParameters);

// Get specific parameter
router.get('/:key', getParameter);

// Update or create parameter
router.put('/:key', updateParameter);

// Delete parameter
router.delete('/:key', deleteParameter);

// Note: Mock modes removed - all operations use real data

module.exports = router; 