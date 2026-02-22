// Push notification utility for sending notifications to mobile devices
const logger = require('../common/logger.js');
const { supabase } = require('../storage/supabaseClient.js');
const { getMessaging } = require('./firebaseAdmin.js');

/**
 * Send push notification to user's device
 * @param {string} userId - User ID
 * @param {object} notification - Notification data
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {object} notification.data - Additional data
 */
async function sendPushNotification(userId, notification) {
  // Load test mock: skip real notification sending
  const { isLoadTestMode } = require('../../tests/load/mocks/mockConfig');
  if (isLoadTestMode()) {
    return { success: true, data: { id: 'mock-notification' } };
  }

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

    // Send real-time push via FCM to all active device tokens for this user
    try {
      const messaging = getMessaging();
      if (!messaging) {
        logger.warn('[PushNotification] Firebase messaging not available; skipping FCM send');
        return { success: true, data };
      }

      const { data: tokens, error: tokensError } = await supabase
        .from('device_tokens')
        .select('id, platform, token, is_active, created_at, updated_at')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (tokensError) {
        logger.error('[PushNotification] Error fetching device tokens for FCM:', tokensError);
        return { success: true, data };
      }

      logger.info(`[PushNotification] 📱 Found ${tokens?.length || 0} device tokens for user ${userId}`);
      if (tokens && tokens.length > 0) {
        tokens.forEach((t, i) => {
          logger.info(`[PushNotification] 📱 Token ${i + 1}: platform=${t.platform}, active=${t.is_active}, token=${t.token?.substring(0, 20)}...`);
        });
      }

      const registrationTokens = (tokens || [])
        .map((t) => t && t.token)
        .filter((t) => typeof t === 'string' && t.trim().length > 0);

      if (!registrationTokens.length) {
        logger.warn(`[PushNotification] ⚠️ No active device tokens found for user ${userId}; skipping FCM send. User may not be logged in or token registration failed.`);
        return { success: true, data, message: 'No tokens found' };
      }

      logger.info(`[PushNotification] 🚀 Sending FCM to ${registrationTokens.length} token(s)`);

      const dataPayload = {
        type: notification.type || 'general',
      };

      if (notification.data) {
        if (notification.type === 'audio_created' || notification.type === 'audio_failed') {
          // FCM data payload 4KB limitine takılmamak için sadece özet alanları gönder
          const {
            jobId,
            audioId,
            mp3_url,
            title,
            level,
            duration,
          } = notification.data || {};

          dataPayload.audioData = JSON.stringify({
            jobId,
            audioId,
            mp3_url,
            title,
            level,
            duration,
          });
        } else {
          // Diğer tipler için de payload'ı küçük tutmaya çalış
          dataPayload.payload = JSON.stringify(notification.data);
        }
      }

      // Get unread notification count for badge
      // Only count notifications that are already active (data.scheduledFor <= now or null)
      // Note: scheduledFor is stored inside data JSON field, not as a separate column
      let badgeCount = 1;
      try {
        const now = new Date().toISOString();
        const { data: allUnread, error: countError } = await supabase
          .from('notifications')
          .select('data')
          .eq('user_id', userId)
          .eq('is_read', false);

        if (!countError && Array.isArray(allUnread)) {
          // Filter out notifications with scheduledFor in the future
          const filteredCount = allUnread.filter(n => {
            if (n.data?.scheduledFor) {
              return new Date(n.data.scheduledFor) <= new Date(now);
            }
            return true; // Include notifications without scheduledFor
          }).length;
          badgeCount = filteredCount;
          logger.info(`[PushNotification] 🔢 Badge count: ${badgeCount} (filtered from ${allUnread.length} unread)`);
        } else {
          logger.info(`[PushNotification] 🔢 Badge count query error: ${countError ? countError.message : 'none'}`);
        }
      } catch (badgeError) {
        logger.warn('[PushNotification] Error fetching badge count:', badgeError);
      }

      logger.info(`[PushNotification] 🔢 Final badge count for APNS: ${badgeCount}`);

      const message = {
        tokens: registrationTokens,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: dataPayload,
        // Add APNS config for iOS background/alert handling priority
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              sound: 'default',
              badge: badgeCount,
              'mutable-content': 1,
              alert: {
                title: notification.title,
                body: notification.body,
              },
            },
          },
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high',
            channelId: 'lingroot_notifications',
          },
        }
      };

      logger.info(`[PushNotification] Sending FCM message payload: ${JSON.stringify(message, null, 2)}`);

      const fcmResult = await messaging.sendEachForMulticast(message);
      logger.info('[PushNotification] FCM send result: ' + JSON.stringify({
        successCount: fcmResult.successCount,
        failureCount: fcmResult.failureCount,
      }));
      try {
        logger.info('[PushNotification] FCM raw result: ' + JSON.stringify(fcmResult));
      } catch (jsonErr) {
        logger.warn('[PushNotification] Failed to stringify FCM result:', jsonErr);
      }

      if (fcmResult.failureCount > 0 && Array.isArray(fcmResult.responses)) {
        const failures = fcmResult.responses
          .map((resp, index) => {
            if (!resp.error) return null;
            return {
              index,
              token: registrationTokens[index],
              tokenId: tokens[index]?.id,
              code: resp.error.code,
              message: resp.error.message,
            };
          })
          .filter(Boolean);

        if (failures.length > 0) {
          try {
            logger.warn('[PushNotification] FCM send failures (detailed): ' + JSON.stringify(failures));
          } catch (jsonErr) {
            logger.warn('[PushNotification] FCM send failures (raw object):', failures);
          }

          // Deactivate invalid tokens automatically
          const invalidTokenIds = failures
            .filter(f => f.code === 'messaging/registration-token-not-registered' ||
              f.code === 'messaging/invalid-registration-token')
            .map(f => f.tokenId)
            .filter(Boolean);

          if (invalidTokenIds.length > 0) {
            logger.info(`[PushNotification] Deactivating ${invalidTokenIds.length} invalid tokens`);
            await supabase
              .from('device_tokens')
              .update({ is_active: false })
              .in('id', invalidTokenIds);
          }
        }
      }
    } catch (fcmError) {
      logger.error('[PushNotification] Error sending FCM notification:', fcmError);
    }

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
