/**
 * Notification API Module
 * 
 * Handles user notifications (async job completions, system alerts, etc.).
 * 
 * @module endpoints/notification
 */

import { AxiosInstance } from 'axios';

// Notification Types
export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'job_complete' | 'system';
    metadata?: Record<string, any>;
    link?: string;
    isRead: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface NotificationListResponse {
    success: boolean;
    notifications: Notification[];
    total: number;
    unreadCount: number;
}

export interface UnreadCountResponse {
    success: boolean;
    count: number;
}

export interface NotificationListParams {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
}

// Notification API Interface
export interface NotificationApi {
    /** Get all notifications for the current user */
    getAll(params?: NotificationListParams): Promise<NotificationListResponse>;

    /** Get unread notification count */
    getUnreadCount(): Promise<UnreadCountResponse>;

    /** Get unread notifications (for polling) */
    getUnread(): Promise<{ success: boolean; notifications: Notification[] }>;

    /** Mark a single notification as read */
    markAsRead(notificationId: string): Promise<{ success: boolean }>;

    /** Mark all notifications as read */
    markAllAsRead(): Promise<{ success: boolean }>;

    /** Delete a notification */
    delete(notificationId: string): Promise<{ success: boolean }>;

    /** Clear all notifications */
    clearAll(): Promise<{ success: boolean }>;
}

/**
 * Creates the Notification API module
 */
export function createNotificationApi(api: AxiosInstance): NotificationApi {
    return {
        async getAll(params = {}) {
            const queryParams = new URLSearchParams();
            if (params.limit) queryParams.append('limit', String(params.limit));
            if (params.offset) queryParams.append('offset', String(params.offset));
            if (params.unreadOnly) queryParams.append('unreadOnly', 'true');

            const queryString = queryParams.toString();
            const url = queryString ? `/api/notifications?${queryString}` : '/api/notifications';

            const response = await api.get<NotificationListResponse>(url);
            return response.data;
        },

        async getUnreadCount() {
            const response = await api.get<UnreadCountResponse>(
                '/api/notifications/unread-count'
            );
            return response.data;
        },

        async getUnread() {
            const response = await api.get<{ success: boolean; notifications: Notification[] }>(
                '/api/tts/notifications/unread'
            );
            return response.data;
        },

        async markAsRead(notificationId) {
            const response = await api.put<{ success: boolean }>(
                `/api/notifications/${notificationId}/read`
            );
            return response.data;
        },

        async markAllAsRead() {
            const response = await api.put<{ success: boolean }>(
                '/api/notifications/read-all'
            );
            return response.data;
        },

        async delete(notificationId) {
            const response = await api.delete<{ success: boolean }>(
                `/api/notifications/${notificationId}`
            );
            return response.data;
        },

        async clearAll() {
            const response = await api.delete<{ success: boolean }>(
                '/api/notifications/clear-all'
            );
            return response.data;
        },
    };
}
