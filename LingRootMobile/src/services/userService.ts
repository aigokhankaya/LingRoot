/**
 * User Service (New API Client Wrapper)
 * 
 * This service wraps user-related API calls
 * using the new @lingroot/api-client.
 * 
 * Created: 2026-01-16
 */

import { getApiClientAsync } from '../services/apiClient';

export interface ReminderSettings {
    wordsPerDay: number;
    startTime: string;
    endTime: string;
    isEnabled: boolean;
}

/**
 * Get current user profile
 */
export async function getMe(): Promise<any> {
    const client = await getApiClientAsync();
    const response = await client.auth.getCurrentUser();
    return response.data;
}

/**
 * Update user profile
 */
export async function updateProfile(data: {
    full_name?: string;
    phoneNumber?: string;
}): Promise<any> {
    const client = await getApiClientAsync();
    const response = await client.http.put('/api/users/profile', data);
    return response.data;
}

/**
 * Get account deletion info
 */
export async function getAccountDeletionInfo(): Promise<{ success: boolean; data: any }> {
    const client = await getApiClientAsync();
    const response = await client.http.get('/api/account/deletion-info');
    return response.data;
}

/**
 * Delete user account
 */
export async function deleteAccount(): Promise<void> {
    const client = await getApiClientAsync();
    await client.http.delete('/api/account/delete');
}

/**
 * Get user notification settings
 */
export async function getNotificationSettings(): Promise<any> {
    const client = await getApiClientAsync();
    const response = await client.http.get('/api/users/notification-settings');
    return response.data;
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(settings: any): Promise<void> {
    const client = await getApiClientAsync();
    await client.http.put('/api/users/notification-settings', settings);
}

/**
 * Check API connectivity/health
 */
export async function checkConnectivity(): Promise<boolean> {
    const client = await getApiClientAsync();
    try {
        await client.http.get('/api/health');
        return true;
    } catch {
        return false;
    }
}

/**
 * Register device push token
 */
export async function registerDeviceToken(payload: { platform: 'android' | 'ios'; token: string; deviceId?: string | null; appVersion?: string }): Promise<boolean> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.post('/api/device-tokens', payload);
        return !!response.data?.success;
    } catch {
        return false;
    }
}

/**
 * Get reminder settings
 */
export async function getReminderSettings(): Promise<ReminderSettings> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.get('/api/reminder-settings');
        // Check if response.data.data exists (like in api.ts), otherwise try response.data
        return response.data?.data || response.data || {
            wordsPerDay: 5,
            startTime: '09:00',
            endTime: '18:00',
            isEnabled: true
        };
    } catch (error) {
        return {
            wordsPerDay: 5,
            startTime: '09:00',
            endTime: '18:00',
            isEnabled: true
        };
    }
}

/**
 * Save reminder settings
 */
export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
    const client = await getApiClientAsync();
    await client.http.post('/api/reminder-settings', settings);
}

/**
 * Get reminders (list)
 */
export async function getReminders(): Promise<any[]> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.get('/api/reminders');
        return response.data?.reminders || [];
    } catch (e) {
        return [];
    }
}

/**
 * Create reminder
 */
export async function createReminder(reminder: any): Promise<any> {
    const client = await getApiClientAsync();
    const response = await client.http.post('/api/reminders', reminder);
    return response.data;
}

/**
 * Update reminder
 */
export async function updateReminder(id: string, reminder: any): Promise<any> {
    const client = await getApiClientAsync();
    const response = await client.http.put(`/api/reminders/${id}`, reminder);
    return response.data;
}

/**
 * Delete reminder
 */
export async function deleteReminder(id: string): Promise<void> {
    const client = await getApiClientAsync();
    await client.http.delete(`/api/reminders/${id}`);
}

/**
 * Get unread notifications
 */
export async function getUnreadNotifications(): Promise<any[]> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.get('/api/notifications'); // Endpoint tahmini düzeltildi /api/notifications olabilir
        // api.ts'te '/api/tts/notifications/unread' idi.
        // Ama user service daha genel notification endpointlerini kullanabilir.
        // Eskisiyle aynı tutalım:
        const responseOld = await client.http.get('/api/tts/notifications/unread');
        return responseOld.data?.notifications || [];
    } catch {
        // Fallback to simpler endpoint if exists
        try {
            const response2 = await client.http.get('/api/notifications/unread');
            return response2.data?.notifications || [];
        } catch {
            return [];
        }
    }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const client = await getApiClientAsync();
    try {
        await client.http.put(`/api/notifications/${notificationId}/read`);
    } catch {
        try {
            await client.http.post(`/api/tts/notifications/${notificationId}/read`);
        } catch { }
    }
}

/**
 * Get all notifications (paginated)
 */
export async function getAllNotifications(limit: number = 50, offset: number = 0): Promise<{ notifications: any[]; total: number }> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.get(`/api/notifications?limit=${limit}&offset=${offset}`);
        return {
            notifications: response.data?.notifications || response.data?.data || [],
            total: response.data?.total || 0
        };
    } catch {
        return { notifications: [], total: 0 };
    }
}

/**
 * Get notification unread count
 */
export async function getNotificationUnreadCount(): Promise<number> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.get('/api/notifications/unread-count');
        return response.data?.count || response.data?.unreadCount || 0;
    } catch {
        return 0;
    }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<void> {
    const client = await getApiClientAsync();
    await client.http.put('/api/notifications/read-all');
}

/**
 * Create a vocabulary reminder notification in backend
 * Called when a vocabulary reminder is scheduled/shown locally
 */
export async function createVocabularyNotification(wordId: string, word: string, definition?: string): Promise<void> {
    const client = await getApiClientAsync();
    await client.http.post('/api/notifications/vocabulary-reminder', {
        wordId,
        word,
        definition
    });
}
