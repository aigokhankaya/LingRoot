const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const { authenticate } = require('../middleware/auth'); // Assuming auth middleware exists
const { setCacheHeaders } = require('../middleware/cacheHeaders');

// Get unified library
router.get('/', authenticate, setCacheHeaders(300), libraryController.getLibrary);

// Get item details (Book or Doc)
router.get('/:id', authenticate, libraryController.getItemDetails);

// Update progress
router.post('/progress', authenticate, libraryController.updateProgress);

module.exports = router;
