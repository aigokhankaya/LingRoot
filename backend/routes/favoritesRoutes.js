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

module.exports = router;
