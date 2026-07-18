const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const planController = require('../controllers/planController');
const auditLogController = require('../controllers/auditLogController');
const { getTtsProviderSetting, setTtsProviderSetting } = require('../controllers/adminController');
const adminBookController = require('../controllers/adminBookController');
const notificationController = require('../controllers/notificationController');
const adminMediaController = require('../controllers/adminMediaController');
const multer = require('multer');

// Sub-routers
const vocabularyAdminRoutes = require('./admin/vocabularyAdminRoutes');
const sectorAdminRoutes = require('./admin/sectorAdminRoutes');

// Configure multer for PDF uploads (in-memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// TTS provider ayarını getir (both dash and underscore for compatibility)
// These routes are defined BEFORE middleware to ensure they work
router.get('/settings/tts-provider', authenticate, authorizeAdmin, getTtsProviderSetting);
router.get('/settings/tts_provider', authenticate, authorizeAdmin, getTtsProviderSetting);
// TTS provider ayarını güncelle
router.post('/settings/tts-provider', authenticate, authorizeAdmin, setTtsProviderSetting);
router.put('/settings/tts_provider', authenticate, authorizeAdmin, setTtsProviderSetting);

// Environment setting (admin only)
router.put('/environment', authenticate, authorizeAdmin, adminController.updateEnvironment);

// Payment environment setting (admin only)
router.get('/payment-environment', authenticate, authorizeAdmin, adminController.getPaymentEnvironment);
router.put('/payment-environment', authenticate, authorizeAdmin, adminController.updatePaymentEnvironment);

// All other routes require authentication and admin authorization
router.use(authenticate);
router.use(authorizeAdmin);

// Mount sub-routers (these have their own auth middleware)
router.use('/vocabulary', vocabularyAdminRoutes);
router.use('/sectors', sectorAdminRoutes);

// Admin dashboard stats
router.get('/stats', adminController.getDashboardStats);

// Cost analytics dashboard
router.get('/cost-dashboard', adminController.getCostDashboard);

// Subscription plan management
router.get('/plans', planController.getAllPlans);
router.get('/plans/:id', planController.getPlanById);
router.post('/plans', planController.createPlan);
router.put('/plans/:id', planController.updatePlan);
router.post('/plans/:id/deactivate', planController.deactivatePlan);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.get('/users/:id/usage', adminController.getUserUsageSummaryAdmin);
router.get('/users/:id/logins', adminController.getUserLoginHistoryAdmin);
router.put('/users/:id', adminController.updateUser);
router.put('/users/:id/test-status', adminController.updateUserTestStatus);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/bulk-delete', adminController.deleteUsersBulk);
router.post('/users/:id/assign-plan', adminController.assignPlanToUser);

// Book Management (Admin)
router.post('/books/upload', upload.single('file'), adminBookController.uploadBook);

// User audio history (admin)
router.get('/users/:id/audio-history', adminController.getUserAudioHistoryAdmin);
router.delete('/users/:id/audio-files', adminController.deleteAudioFiles);

// Optional: single content record fetch (for modal/details)
router.get('/content/:id', adminController.getContentById);

// Content management
router.get('/content', adminController.getAllContent);
router.delete('/content/:id', adminController.deleteContent);

// LingRoot Media campaign and review management
router.get('/media/campaigns', adminMediaController.listCampaigns);
router.post('/media/campaigns', adminMediaController.createCampaign);
router.get('/media/campaigns/:id', adminMediaController.getCampaign);
router.put('/media/campaigns/:id', adminMediaController.updateCampaign);
router.delete('/media/campaigns/:id', adminMediaController.deleteCampaign);
router.post('/media/campaigns/:id/generate', adminMediaController.generateCampaign);
router.post('/media/campaigns/:id/retry', adminMediaController.retryCampaign);
router.post('/media/campaigns/:id/cancel', adminMediaController.cancelCampaign);
router.post('/media/campaigns/:id/approve', adminMediaController.approveCampaign);
router.post('/media/campaigns/:id/publish', adminMediaController.publishCampaign);
router.post('/media/campaigns/:id/request-revision', adminMediaController.requestRevision);
router.post('/media/campaigns/:id/duplicate', adminMediaController.duplicateCampaign);
router.post('/media/campaigns/:id/quality/rerun', adminMediaController.rerunQuality);
router.post('/media/campaigns/:id/quality/:runId/feedback', adminMediaController.submitQualityFeedback);

// Subscription management
router.get('/subscriptions', adminController.getAllSubscriptions);
router.put('/subscriptions/:id', adminController.updateSubscription);

// Notification management (Admin)
router.post('/notifications/send', notificationController.sendNotification);
router.get('/notifications/history', notificationController.getNotificationHistory);
router.delete('/notifications/:id', notificationController.deleteNotificationAdmin);

// Subscription maintenance
router.post('/subscriptions/downgrade-expired', adminController.downgradeExpiredSubscriptions);

// Audit logs
router.post('/audit-logs', auditLogController.createAuditLog);
router.get('/audit-logs', auditLogController.getAuditLogs);
router.get('/audit-logs/actions', auditLogController.getAuditLogActions);

module.exports = router;
