const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');
const { sendRealtimePushNotification } = require('../utils/notifications/pushNotification.js');

const getNotificationLink = (notification) => notification.link ?? notification.data?.link ?? null;

/**
 * Get all notifications for a user
 * Filters out scheduled notifications that haven't fired yet (scheduledFor > now)
 */
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0, unreadOnly = false } = req.query;
        const now = new Date().toISOString();

        // Build query
        let query = supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (unreadOnly === 'true' || unreadOnly === true) {
            query = query.eq('is_read', false);
        }

        const { data: notifications, error, count } = await query;

        if (error) {
            logger.error('[NOTIFICATION] Supabase error fetching notifications:', error);
            throw error;
        }

        // Filter out notifications with scheduledFor in the future
        // These are vocabulary reminders that haven't fired yet
        const filteredNotifications = notifications ? notifications.filter(n => {
            if (n.data?.scheduledFor) {
                return new Date(n.data.scheduledFor) <= new Date(now);
            }
            return true; // Show notifications without scheduledFor
        }) : [];

        // DEBUG: Log filtering info
        const futureCount = (notifications || []).filter(n => n.data?.scheduledFor && new Date(n.data.scheduledFor) > new Date(now)).length;
        if (futureCount > 0 || notifications?.length !== filteredNotifications.length) {
            logger.info(`[NOTIFICATION] User ${userId}: ${notifications?.length || 0} total, ${filteredNotifications.length} shown, ${futureCount} scheduled for future`);
        }

        // Get unread count - also need to filter by scheduledFor
        // First get all unread, then filter in memory
        const { data: allUnread, error: countError } = await supabase
            .from('notifications')
            .select('data')
            .eq('user_id', userId)
            .eq('is_read', false);

        if (countError) {
            logger.error('[NOTIFICATION] Supabase error fetching unread count:', countError);
        }

        // Filter unread count by scheduledFor as well
        const filteredUnreadCount = allUnread ? allUnread.filter(n => {
            if (n.data?.scheduledFor) {
                return new Date(n.data.scheduledFor) <= new Date(now);
            }
            return true;
        }).length : 0;

        // Map snake_case database fields to camelCase for frontend compatibility
        const mappedNotifications = filteredNotifications.map(n => {
            // For vocabulary reminders, use scheduledFor as createdAt (when notification was actually shown)
            // This ensures each notification displays its own scheduled time, not the batch creation time
            let displayTime = n.created_at;
            if (n.type === 'vocabulary_reminder' && n.data?.scheduledFor) {
                displayTime = n.data.scheduledFor;
            }

            return {
                id: n.id,
                userId: n.user_id,
                title: n.title,
                message: n.body,  // DB'de body, API'de message olarak dön
                type: n.type,
                isRead: n.is_read,
                link: getNotificationLink(n),
                metadata: n.data || n.metadata,
                createdAt: displayTime,
                readAt: n.read_at
            };
        });

        res.json({
            success: true,
            data: mappedNotifications,
            total: filteredNotifications.length,
            unreadCount: filteredUnreadCount,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        logger.error('[NOTIFICATION] Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirimler alınırken hata oluştu',
            error: error.message
        });
    }
};

/**
 * Get unread notification count
 * Excludes scheduled notifications that haven't fired yet
 */
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date().toISOString();

        // Get all unread notifications with data field
        const { data: allUnread, error } = await supabase
            .from('notifications')
            .select('data')
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            logger.error('[NOTIFICATION] Supabase error fetching unread count:', error);
            throw error;
        }

        // Filter out notifications with scheduledFor in the future
        const filteredUnreadCount = allUnread ? allUnread.filter(n => {
            if (n.data?.scheduledFor) {
                return new Date(n.data.scheduledFor) <= new Date(now);
            }
            return true;
        }).length : 0;

        res.json({
            success: true,
            unreadCount: filteredUnreadCount
        });
    } catch (error) {
        logger.error('[NOTIFICATION] Error fetching unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Okunmamış bildirim sayısı alınırken hata oluştu',
            error: error.message
        });
    }
};

/**
 * Mark a notification as read
 */
const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // First verify ownership
        const { data: notification, error: fetchError } = await supabase
            .from('notifications')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !notification) {
            return res.status(404).json({
                success: false,
                message: 'Bildirim bulunamadı'
            });
        }

        const { error: updateError } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (updateError) {
            logger.error('[NOTIFICATION] Supabase error marking read:', updateError);
            throw updateError;
        }

        res.json({
            success: true,
            message: 'Bildirim okundu olarak işaretlendi'
        });
    } catch (error) {
        logger.error('[NOTIFICATION] Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim güncellenirken hata oluştu',
            error: error.message
        });
    }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            logger.error('[NOTIFICATION] Supabase error marking all read:', error);
            throw error;
        }

        res.json({
            success: true,
            message: 'Tüm bildirimler okundu olarak işaretlendi'
        });
    } catch (error) {
        logger.error('[NOTIFICATION] Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirimler güncellenirken hata oluştu',
            error: error.message
        });
    }
};

/**
 * Delete a notification
 */
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            logger.error('[NOTIFICATION] Supabase error deleting notification:', error);
            throw error;
        }

        res.json({
            success: true,
            message: 'Bildirim silindi'
        });
    } catch (error) {
        logger.error('[NOTIFICATION] Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim silinirken hata oluştu',
            error: error.message
        });
    }
};

/**
 * Delete all read notifications for a user
 */
const deleteReadNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        // Count how many will be deleted
        const { count: deleteCount, error: countError } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', true);

        if (countError) {
            logger.warn('[NOTIFICATION] Error counting read notifications:', countError);
        }

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', userId)
            .eq('is_read', true);

        if (error) {
            logger.error('[NOTIFICATION] Supabase error deleting read notifications:', error);
            throw error;
        }

        res.json({
            success: true,
            message: `${deleteCount || 0} okunmuş bildirim silindi`,
            deletedCount: deleteCount || 0
        });
    } catch (error) {
        logger.error('[NOTIFICATION] Error deleting read notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Okunmuş bildirimler silinirken hata oluştu',
            error: error.message
        });
    }
};

// ===================== ADMIN FUNCTIONS =====================

/**
 * Send notification to a specific user or all users (Admin only)
 */
const sendNotification = async (req, res) => {
    try {
        const { userId, title, message, type = 'info', link } = req.body;
        logger.info(`[NOTIFICATION][ADMIN] Send request received: target=${userId}, type=${type}, hasLink=${Boolean(link)}`);

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Başlık ve mesaj zorunludur'
            });
        }

        let resultCount = 0;
        const notificationData = link ? { link } : null;
        const notificationPayload = {
            title,
            body: message,
            type,
            data: link ? { link } : {}
        };

        if (userId === 'all') {
            // Get all verified users
            // WARNING: This might be heavy for large user base, better to use batching
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id')
                .eq('is_verified', true);

            if (usersError) throw usersError;

            if (users && users.length > 0) {
                const notificationsToCreate = users.map(user => ({
                    user_id: user.id,
                    title,
                    body: message,  // API'den message gelir, DB'ye body olarak yaz
                    type,
                    data: notificationData,
                    is_read: false,
                    created_at: new Date().toISOString()
                }));

                // Chunk inserts to avoid request limits (e.g. 100 at a time)
                const chunkSize = 100;
                for (let i = 0; i < notificationsToCreate.length; i += chunkSize) {
                    const chunk = notificationsToCreate.slice(i, i + chunkSize);
                    await supabase.from('notifications').insert(chunk);

                    await Promise.allSettled(
                        chunk.map((notification) =>
                            sendRealtimePushNotification(notification.user_id, notificationPayload)
                        )
                    );
                }

                resultCount = users.length;
            }

            res.json({
                success: true,
                message: `${resultCount} kullanıcıya bildirim gönderildi`,
                count: resultCount
            });
        } else {
            // Send to specific user
            const { error } = await supabase
                .from('notifications')
                .insert([{
                    user_id: userId,
                    title,
                    body: message,  // API'den message gelir, DB'ye body olarak yaz
                    type,
                    data: notificationData,
                    is_read: false,
                    created_at: new Date().toISOString()
                }]);

            if (error) {
                // Check if user exists error
                if (error.code === '23503') { // foreign key violation
                    return res.status(404).json({
                        success: false,
                        message: 'Kullanıcı bulunamadı'
                    });
                }
                throw error;
            }

            await sendRealtimePushNotification(userId, notificationPayload);

            res.json({
                success: true,
                message: 'Bildirim gönderildi'
            });
        }
    } catch (error) {
        logger.error(`[NOTIFICATION][ADMIN] Error sending notification: ${error.message}`);
        if (error.stack) {
            logger.error(error.stack);
        }
        res.status(500).json({
            success: false,
            message: 'Bildirim gönderilirken hata oluştu',
            error: error.message
        });
    }
};

/**
 * Get notification history (Admin only)
 */
const getNotificationHistory = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        // Fetch notifications with user data
        // users table stores firstname/lastname in snake-less lowercase columns
        const { data: notifications, error, count } = await supabase
            .from('notifications')
            .select('*, users:user_id(id, firstname, lastname, email)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (error) {
            logger.error('[NOTIFICATION] Supabase error fetching history:', error);
            throw error;
        }

        const mappedNotifications = notifications.map(n => {
            // For vocabulary reminders, use scheduledFor as createdAt (when notification was actually shown)
            let displayTime = n.created_at;
            if (n.type === 'vocabulary_reminder' && n.data?.scheduledFor) {
                displayTime = n.data.scheduledFor;
            }

            return {
                id: n.id,
                userId: n.user_id,
                title: n.title,
                message: n.body,  // DB'de body, API'de message olarak dön
                type: n.type,
                isRead: n.is_read,
                link: getNotificationLink(n),
                metadata: n.data || n.metadata,
                createdAt: displayTime,
                user: n.users ? {
                    id: n.users.id,
                    firstName: n.users.firstName || n.users.firstname || '',
                    lastName: n.users.lastName || n.users.lastname || '',
                    email: n.users.email
                } : undefined
            };
        });

        res.json({
            success: true,
            data: mappedNotifications,
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        logger.error('[NOTIFICATION] Error fetching notification history:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim geçmişi alınırken hata oluştu',
            error: error.message
        });
    }
};

/**
 * Delete notifications by admin
 */
const deleteNotificationAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) {
            logger.error('[NOTIFICATION] Supabase error deleting notification (admin):', error);
            throw error;
        }

        res.json({
            success: true,
            message: 'Bildirim silindi'
        });
    } catch (error) {
        logger.error('[NOTIFICATION] Error deleting notification (admin):', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim silinirken hata oluştu',
            error: error.message
        });
    }
};

/**
 * Create a vocabulary reminder notification
 * Called from mobile when a vocabulary reminder is scheduled/shown
 *
 * DUPLICATE PREVENTION: Skips creation if same user+word notification
 * was already created in the last 24 hours
 *
 * SCHEDULED VISIBILITY: If scheduledFor is provided, the notification
 * will only appear in getNotifications after that time has passed
 */
const createVocabularyReminder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { wordId, word, definition, scheduledFor } = req.body;

        if (!word) {
            return res.status(400).json({
                success: false,
                message: 'Kelime zorunludur'
            });
        }

        // Check for duplicate: same user + word + same scheduledFor time
        // This allows the same word to be scheduled at different times
        const bodyToCheck = definition ? `${word} — ${definition}` : word;

        if (scheduledFor) {
            // If scheduledFor provided, check if exact same notification exists
            const { data: existingNotif, error: checkError } = await supabase
                .from('notifications')
                .select('id, data')
                .eq('user_id', userId)
                .eq('type', 'vocabulary_reminder')
                .eq('body', bodyToCheck);

            if (checkError) {
                logger.warn('[NOTIFICATION] Error checking for duplicate:', checkError);
                // Continue with creation anyway
            }

            // Check if any existing notification has the same scheduledFor
            const hasSameScheduledFor = existingNotif?.some(n =>
                n.data?.scheduledFor === scheduledFor
            );

            if (hasSameScheduledFor) {
                return res.json({
                    success: true,
                    message: 'Bildirim zaten mevcut (duplicate skipped)',
                    skipped: true
                });
            }
        }

        // Build data object with wordId and scheduledFor
        const dataObj = {};
        if (wordId) dataObj.wordId = wordId;
        if (scheduledFor) dataObj.scheduledFor = scheduledFor;

        const { error } = await supabase
            .from('notifications')
            .insert([{
                user_id: userId,
                title: 'Kelime Hatırlatıcısı',
                body: bodyToCheck,
                type: 'vocabulary_reminder',
                is_read: false,
                data: Object.keys(dataObj).length > 0 ? dataObj : null,
                created_at: new Date().toISOString()
            }]);

        if (error) {
            logger.error('[NOTIFICATION] Supabase error creating vocabulary reminder:', error);
            throw error;
        }

        res.json({
            success: true,
            message: 'Kelime hatırlatıcı bildirimi oluşturuldu'
        });
    } catch (error) {
        logger.error('[NOTIFICATION] Error creating vocabulary reminder:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim oluşturulurken hata oluştu',
            error: error.message
        });
    }
};

/**
 * Delete only FUTURE scheduled vocabulary reminder notifications for current user
 * Called before rescheduling to avoid duplicates
 * Preserves notifications whose scheduledFor time has passed (user should see these)
 */
const deleteScheduledVocabularyReminders = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date().toISOString();

        // First, get all unread vocabulary reminders
        const { data: allReminders, error: fetchError } = await supabase
            .from('notifications')
            .select('id, data')
            .eq('user_id', userId)
            .eq('type', 'vocabulary_reminder')
            .eq('is_read', false);

        if (fetchError) {
            logger.error('[NOTIFICATION] Error fetching vocabulary reminders:', fetchError);
            throw fetchError;
        }

        // Filter to only those scheduled for the future
        const futureReminders = (allReminders || []).filter(n => {
            if (n.data?.scheduledFor) {
                return new Date(n.data.scheduledFor) > new Date(now);
            }
            // If no scheduledFor, don't delete (preserve legacy notifications)
            return false;
        });

        if (futureReminders.length === 0) {
            return res.json({
                success: true,
                message: 'Silinecek gelecek zamanlanmış bildirim yok',
                deletedCount: 0
            });
        }

        const idsToDelete = futureReminders.map(n => n.id);

        const { data, error } = await supabase
            .from('notifications')
            .delete()
            .in('id', idsToDelete)
            .select('id');

        if (error) {
            logger.error('[NOTIFICATION] Error deleting scheduled vocabulary reminders:', error);
            throw error;
        }

        const deletedCount = data?.length || 0;
        const preservedCount = (allReminders?.length || 0) - futureReminders.length;
        logger.info(`[NOTIFICATION] Deleted ${deletedCount} FUTURE vocabulary reminders, preserved ${preservedCount} past/current for user ${userId}`);

        res.json({
            success: true,
            message: `${deletedCount} zamanlanmış kelime bildirimi silindi`,
            deletedCount
        });
    } catch (error) {
        logger.error('[NOTIFICATION] Error in deleteScheduledVocabularyReminders:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirimler silinirken hata oluştu',
            error: error.message
        });
    }
};

/**
 * Get today's vocabulary reminder count (already sent/shown)
 * Used by mobile to check if daily limit has been reached before rescheduling
 */
const getTodayVocabularyCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const now = new Date();

        // Get all vocabulary reminders for this user
        const { data: reminders, error } = await supabase
            .from('notifications')
            .select('data')
            .eq('user_id', userId)
            .eq('type', 'vocabulary_reminder');

        if (error) {
            logger.error('[NOTIFICATION] Error fetching vocabulary reminders for count:', error);
            throw error;
        }

        // Filter: scheduledFor is today AND scheduledFor <= now (already fired)
        const todayCount = (reminders || []).filter(n => {
            if (!n.data?.scheduledFor) return false;
            const scheduledDate = new Date(n.data.scheduledFor);
            return scheduledDate >= today && scheduledDate < tomorrow && scheduledDate <= now;
        }).length;

        res.json({ success: true, count: todayCount });
    } catch (error) {
        logger.error('[NOTIFICATION] Error getting today vocabulary count:', error);
        res.status(500).json({ success: false, count: 0 });
    }
};

module.exports = {
    // User functions
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    createVocabularyReminder,
    deleteScheduledVocabularyReminders,
    getTodayVocabularyCount,
    // Admin functions
    sendNotification,
    getNotificationHistory,
    deleteNotificationAdmin
};
