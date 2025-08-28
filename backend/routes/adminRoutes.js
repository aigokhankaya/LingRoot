const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const planController = require('../controllers/planController');
const { getTtsProviderSetting, setTtsProviderSetting } = require('../controllers/adminController');

// All routes require authentication and admin authorization
router.use(authenticate);
router.use(authorizeAdmin);

// Admin dashboard stats
router.get('/stats', adminController.getDashboardStats);

// Subscription plan management
router.get('/plans', planController.getAllPlans);
router.post('/plans', planController.createPlan);
router.put('/plans/:id', planController.updatePlan);
router.post('/plans/:id/deactivate', planController.deactivatePlan);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.get('/users/:id/usage', adminController.getUserUsageSummaryAdmin);
router.get('/users/:id/logins', adminController.getUserLoginHistoryAdmin);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/bulk-delete', adminController.deleteUsersBulk);

// User audio history (admin)
router.get('/users/:id/audio-history', adminController.getUserAudioHistoryAdmin);

// Optional: single content record fetch (for modal/details)
router.get('/content/:id', adminController.getContentById);

// Content management
router.get('/content', adminController.getAllContent);
router.delete('/content/:id', adminController.deleteContent);

// Subscription management
router.get('/subscriptions', adminController.getAllSubscriptions);
router.put('/subscriptions/:id', adminController.updateSubscription);

// TTS provider ayarını getir
router.get('/settings/tts-provider', getTtsProviderSetting);
// TTS provider ayarını güncelle
router.post('/settings/tts-provider', setTtsProviderSetting);

// Removed test-google-voices endpoint per request

module.exports = router;
