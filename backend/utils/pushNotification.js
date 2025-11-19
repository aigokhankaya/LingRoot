// Push notification utility for sending notifications to mobile devices
const logger = require('./logger');
const { supabase } = require('./supabaseClient');

/**
 * Send push notification to user's device
 * @param {string} userId - User ID
 * @param {object} notification - Notification data
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {object} notification.data - Additional data
 */
async function sendPushNotification(userId, notification) {
  try {
    logger.info(`[PushNotification] Sending notification to user ${userId}:`, notification);

    // Store notification in database for the user to retrieve
    // Mobile app will poll for notifications or use real-time subscriptions
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        type: notification.type || 'audio_created',
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error(`[PushNotification] Error storing notification:`, error);
      return { success: false, error };
    }

    logger.info(`[PushNotification] Notification stored successfully:`, data);

    // TODO: In production, integrate with FCM (Firebase Cloud Messaging) or APNs
    // For now, we're using database polling approach
    
    return { success: true, data };
  } catch (error) {
    logger.error(`[PushNotification] Error sending notification:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Get unread notifications for a user
 * @param {string} userId - User ID
 */
async function getUnreadNotifications(userId) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error(`[PushNotification] Error fetching notifications:`, error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    logger.error(`[PushNotification] Error fetching notifications:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 */
async function markNotificationAsRead(notificationId) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      logger.error(`[PushNotification] Error marking notification as read:`, error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    logger.error(`[PushNotification] Error marking notification as read:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
  getUnreadNotifications,
  markNotificationAsRead
};
