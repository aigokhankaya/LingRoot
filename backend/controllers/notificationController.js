const { Notification, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all notifications for a user
 */
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0, unreadOnly = false } = req.query;

        const where = { userId };
        if (unreadOnly === 'true' || unreadOnly === true) {
            where.isRead = false;
        }

        const notifications = await Notification.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // Get unread count
        const unreadCount = await Notification.count({
            where: { userId, isRead: false }
        });

        res.json({
            success: true,
            data: notifications.rows,
            total: notifications.count,
            unreadCount,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirimler alınırken hata oluştu'
        });
    }
};

/**
 * Get unread notification count
 */
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const unreadCount = await Notification.count({
            where: { userId, isRead: false }
        });

        res.json({
            success: true,
            unreadCount
        });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Okunmamış bildirim sayısı alınırken hata oluştu'
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

        const notification = await Notification.findOne({
            where: { id, userId }
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Bildirim bulunamadı'
            });
        }

        notification.isRead = true;
        await notification.save();

        res.json({
            success: true,
            message: 'Bildirim okundu olarak işaretlendi'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim güncellenirken hata oluştu'
        });
    }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        await Notification.update(
            { isRead: true },
            { where: { userId, isRead: false } }
        );

        res.json({
            success: true,
            message: 'Tüm bildirimler okundu olarak işaretlendi'
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirimler güncellenirken hata oluştu'
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

        const notification = await Notification.findOne({
            where: { id, userId }
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Bildirim bulunamadı'
            });
        }

        await notification.destroy();

        res.json({
            success: true,
            message: 'Bildirim silindi'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim silinirken hata oluştu'
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

        let createdNotifications = [];

        if (userId === 'all') {
            // Broadcast to all users
            const users = await User.findAll({
                attributes: ['id'],
                where: { isVerified: true }
            });

            const notificationsToCreate = users.map(user => ({
                userId: user.id,
                title,
                message,
                type,
                link,
                isRead: false
            }));

            createdNotifications = await Notification.bulkCreate(notificationsToCreate);

            res.json({
                success: true,
                message: `${createdNotifications.length} kullanıcıya bildirim gönderildi`,
                count: createdNotifications.length
            });
        } else {
            // Send to specific user
            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Kullanıcı bulunamadı'
                });
            }

            const notification = await Notification.create({
                userId,
                title,
                message,
                type,
                link,
                isRead: false
            });

            res.json({
                success: true,
                message: 'Bildirim gönderildi',
                data: notification
            });
        }
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim gönderilirken hata oluştu'
        });
    }
};

/**
 * Get notification history (Admin only)
 */
const getNotificationHistory = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const notifications = await Notification.findAndCountAll({
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName', 'email']
            }]
        });

        res.json({
            success: true,
            data: notifications.rows,
            total: notifications.count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching notification history:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim geçmişi alınırken hata oluştu'
        });
    }
};

/**
 * Delete notifications by admin
 */
const deleteNotificationAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findByPk(id);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Bildirim bulunamadı'
            });
        }

        await notification.destroy();

        res.json({
            success: true,
            message: 'Bildirim silindi'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim silinirken hata oluştu'
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
    // Admin functions
    sendNotification,
    getNotificationHistory,
    deleteNotificationAdmin
};
