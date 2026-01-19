/**
 * 🎯 Assessment Routes
 * 
 * Vocabulary placement test endpoints.
 */

const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Start a new placement test
router.post('/start', assessmentController.startTest);

// Submit an answer
router.post('/answer', assessmentController.submitAnswer);

// Get test status
router.get('/status', assessmentController.getStatus);

module.exports = router;
