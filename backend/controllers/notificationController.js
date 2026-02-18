const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');

/**
 * Get all notifications for a user
 */
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0, unreadOnly = false } = req.query;

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

        // Get unread count separately
        const { count: unreadCount, error: countError } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (countError) {
            logger.error('[NOTIFICATION] Supabase error fetching unread count:', countError);
        }

        // Map snake_case database fields to camelCase for frontend compatibility (if needed)
        // Or keep snake_case if frontend expects it (based on sequelize model, front expects camelCase)
        const mappedNotifications = notifications.map(n => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.body,  // DB'de body, API'de message olarak dön
            type: n.type,
            isRead: n.is_read,
            link: n.link,
            metadata: n.data || n.metadata,
            createdAt: n.created_at,
            readAt: n.read_at
        }));

        res.json({
            success: true,
            data: mappedNotifications,
            total: count,
            unreadCount: unreadCount || 0,
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
 */
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const { count: unreadCount, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            logger.error('[NOTIFICATION] Supabase error fetching unread count:', error);
            throw error;
        }

        res.json({
            success: true,
            unreadCount: unreadCount || 0
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

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Başlık ve mesaj zorunludur'
            });
        }

        let resultCount = 0;

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
                    link,
                    is_read: false,
                    created_at: new Date().toISOString()
                }));

                // Chunk inserts to avoid request limits (e.g. 100 at a time)
                const chunkSize = 100;
                for (let i = 0; i < notificationsToCreate.length; i += chunkSize) {
                    const chunk = notificationsToCreate.slice(i, i + chunkSize);
                    await supabase.from('notifications').insert(chunk);
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
                    link,
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

            res.json({
                success: true,
                message: 'Bildirim gönderildi'
            });
        }
    } catch (error) {
        logger.error('[NOTIFICATION] Error sending notification:', error);
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
        // Supabase select with relation: *, users:user_id(id, firstName, lastName, email)
        const { data: notifications, error, count } = await supabase
            .from('notifications')
            .select('*, users:user_id(id, firstName, lastName, email)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (error) {
            logger.error('[NOTIFICATION] Supabase error fetching history:', error);
            throw error;
        }

        const mappedNotifications = notifications.map(n => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.body,  // DB'de body, API'de message olarak dön
            type: n.type,
            isRead: n.is_read,
            link: n.link,
            metadata: n.data || n.metadata,
            createdAt: n.created_at,
            user: n.users // Supabase returns the relation as 'users' object/array
        }));

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
 */
const createVocabularyReminder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { wordId, word, definition } = req.body;

        if (!word) {
            return res.status(400).json({
                success: false,
                message: 'Kelime zorunludur'
            });
        }

        // Check for duplicate: same user + word + vocabulary_reminder in last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const bodyToCheck = definition ? `${word} — ${definition}` : word;

        const { data: existingNotif, error: checkError } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('type', 'vocabulary_reminder')
            .eq('body', bodyToCheck)
            .gte('created_at', twentyFourHoursAgo)
            .limit(1)
            .maybeSingle();

        if (checkError) {
            logger.warn('[NOTIFICATION] Error checking for duplicate:', checkError);
            // Continue with creation anyway
        }

        // If duplicate exists, skip creation
        if (existingNotif) {
            return res.json({
                success: true,
                message: 'Bildirim zaten mevcut (duplicate skipped)',
                skipped: true
            });
        }

        const { error } = await supabase
            .from('notifications')
            .insert([{
                user_id: userId,
                title: 'Kelime Hatırlatıcısı',
                body: bodyToCheck,
                type: 'vocabulary_reminder',
                is_read: false,
                data: wordId ? { wordId } : null,
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

module.exports = {
    // User functions
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    createVocabularyReminder,
    // Admin functions
    sendNotification,
    getNotificationHistory,
    deleteNotificationAdmin
};
