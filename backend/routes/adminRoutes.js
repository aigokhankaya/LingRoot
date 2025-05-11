const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// All routes require authentication and admin authorization
router.use(authenticate);
router.use(authorizeAdmin);

// Admin dashboard stats
router.get('/stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Content management
router.get('/content', adminController.getAllContent);
router.delete('/content/:id', adminController.deleteContent);

// Subscription management
router.get('/subscriptions', adminController.getAllSubscriptions);
router.put('/subscriptions/:id', adminController.updateSubscription);

module.exports = router;
