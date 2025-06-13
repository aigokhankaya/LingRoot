const express = require('express');
const router = express.Router();
const {
  getAllParameters,
  getParameter,
  updateParameter,
  deleteParameter,
  toggleMockTts,
  toggleMockContentSave,
  toggleMockAuth
} = require('../controllers/parameterController');

// Get all parameters
router.get('/', getAllParameters);

// Get specific parameter
router.get('/:key', getParameter);

// Update or create parameter
router.put('/:key', updateParameter);

// Delete parameter
router.delete('/:key', deleteParameter);

// Toggle mock modes
router.post('/toggle-mock-tts', toggleMockTts);
router.post('/toggle-mock-content-save', toggleMockContentSave);
router.post('/toggle-mock-auth', toggleMockAuth);

module.exports = router; 