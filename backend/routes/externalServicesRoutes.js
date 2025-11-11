const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const {
  getAllExternalServices,
  getExternalServiceById,
  getExternalServiceByName,
  createExternalService,
  updateExternalService,
  deleteExternalService,
  toggleServiceStatus
} = require('../controllers/externalServicesController');

// Public route for getting active service configuration (by service name)
router.get('/public/:serviceName', getExternalServiceByName);

// Admin-only routes
router.use(authenticate); // All routes below require authentication
router.use(authorizeAdmin); // All routes below require admin role

// Get all external services
router.get('/', getAllExternalServices);

// Get specific external service by ID
router.get('/:id', getExternalServiceById);

// Create new external service
router.post('/', createExternalService);

// Update external service
router.put('/:id', updateExternalService);

// Delete external service
router.delete('/:id', deleteExternalService);

// Toggle service active status
router.patch('/:id/toggle', toggleServiceStatus);

module.exports = router;
