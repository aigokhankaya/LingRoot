const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Toggle favorite (add/remove)
router.post('/toggle', favoritesController.toggleFavorite);

// Get favorites
router.get('/', favoritesController.getFavorites);

// Get favorite content items with full details
router.get('/details', favoritesController.getFavoriteDetails);

module.exports = router;
