import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, Trash2, X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    NotificationItem
} from '@/lib/api';

interface NotificationBellProps {
    className?: string;
}

const typeIcons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle
};

const typeColors = {
    info: 'text-blue-500',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    error: 'text-red-500'
};

const typeBgColors = {
    info: 'bg-blue-50',
    success: 'bg-emerald-50',
    warning: 'bg-amber-50',
    error: 'bg-red-50'
};

export default function NotificationBell({ className = '' }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Check authentication
    useEffect(() => {
        const token = localStorage.getItem('lingroot_token');
        setIsAuthenticated(!!token);
    }, []);

    // Fetch unread count periodically
    const fetchUnreadCount = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const response = await getUnreadNotificationCount();
            if (response.success) {
                setUnreadCount(response.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    }, [isAuthenticated]);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const response = await getNotifications(20, 0, false);
            if (response.success) {
                setNotifications(response.data);
                setUnreadCount(response.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    // Initial fetch and polling with visibility check
    useEffect(() => {
        if (!isAuthenticated) return;

        fetchUnreadCount();
        let interval = setInterval(fetchUnreadCount, 60000);

        const handleVisibilityChange = () => {
            if (document.hidden) {
                clearInterval(interval);
            } else {
                fetchUnreadCount();
                interval = setInterval(fetchUnreadCount, 60000);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isAuthenticated, fetchUnreadCount]);

    // Fetch full list when dropdown opens
    useEffect(() => {
        if (isOpen && isAuthenticated) {
            fetchNotifications();
        }
    }, [isOpen, isAuthenticated, fetchNotifications]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id: string) => {
        try {
            await markNotificationAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteNotification(id);
            const deleted = notifications.find(n => n.id === id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (deleted && !deleted.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Şimdi';
        if (diffMins < 60) return `${diffMins} dk önce`;
        if (diffHours < 24) return `${diffHours} saat önce`;
        if (diffDays < 7) return `${diffDays} gün önce`;
        return date.toLocaleDateString('tr-TR');
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Bildirimler"
            >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-800">Bildirimler</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-primary hover:text-primary/80 font-medium"
                                >
                                    Tümünü Okundu İşaretle
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-gray-200 rounded"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <Bell className="w-10 h-10 mb-2 opacity-30" />
                                <p className="text-sm">Henüz bildiriminiz yok</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {notifications.map((notification) => {
                                    const Icon = typeIcons[notification.type as keyof typeof typeIcons] || Info;
                                    const iconColor = typeColors[notification.type as keyof typeof typeColors] || typeColors.info;
                                    const bgColor = typeBgColors[notification.type as keyof typeof typeBgColors] || typeBgColors.info;

                                    return (
                                        <li
                                            key={notification.id}
                                            className={`relative px-4 py-3 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50/50' : ''
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                {/* Icon */}
                                                <div className={`flex-shrink-0 w-9 h-9 rounded-full ${bgColor} flex items-center justify-center`}>
                                                    <Icon className={`w-4 h-4 ${iconColor}`} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={`text-sm font-medium text-gray-800 ${!notification.isRead ? 'font-semibold' : ''}`}>
                                                            {notification.title}
                                                        </p>
                                                        {!notification.isRead && (
                                                            <span className="flex-shrink-0 w-2 h-2 mt-1.5 bg-primary rounded-full"></span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {formatTimeAgo(notification.createdAt)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100">
                                                {!notification.isRead && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMarkAsRead(notification.id);
                                                        }}
                                                        className="p-1 hover:bg-gray-200 rounded"
                                                        title="Okundu işaretle"
                                                    >
                                                        <Check className="w-4 h-4 text-gray-500" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(notification.id);
                                                    }}
                                                    className="p-1 hover:bg-red-100 rounded"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
                                                </button>
                                            </div>

                                            {/* Optional link */}
                                            {notification.link && (
                                                <a
                                                    href={notification.link}
                                                    className="absolute inset-0"
                                                    onClick={() => {
                                                        if (!notification.isRead) {
                                                            handleMarkAsRead(notification.id);
                                                        }
                                                        setIsOpen(false);
                                                    }}
                                                >
                                                    <span className="sr-only">Bildirime git</span>
                                                </a>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-center">
                            <button
                                onClick={() => {
                                    // TODO: Navigate to full notifications page if needed
                                    setIsOpen(false);
                                }}
                                className="text-sm text-primary hover:text-primary/80 font-medium"
                            >
                                Tüm Bildirimleri Gör
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
