const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// All routes require authentication
router.use(authenticate);

// Get all notifications for the authenticated user
router.get('/', notificationController.getNotifications);

// Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark a specific notification as read
router.put('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead);

// Delete all read notifications
router.delete('/read/all', notificationController.deleteReadNotifications);

// Create vocabulary reminder notification (called from mobile)
router.post('/vocabulary-reminder', notificationController.createVocabularyReminder);

// Delete all scheduled (unread) vocabulary reminders (called before rescheduling)
// IMPORTANT: This must come BEFORE /:id route to avoid being caught by the parameter
router.delete('/vocabulary-reminders/scheduled', notificationController.deleteScheduledVocabularyReminders);

// Delete a notification (must be last - catches all /:id patterns)
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
