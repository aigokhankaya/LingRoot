/**
 * Notification API Module Tests
 * 
 * Unit tests for the Notification API endpoints
 */

import { createNotificationApi, NotificationApi } from '../endpoints/notification';
import { AxiosInstance } from 'axios';

// Mock axios instance
const createMockAxios = (): jest.Mocked<AxiosInstance> => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    request: jest.fn(),
    getUri: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
    postForm: jest.fn(),
    putForm: jest.fn(),
    patchForm: jest.fn(),
    defaults: {} as any,
    interceptors: {
        request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
    },
} as unknown as jest.Mocked<AxiosInstance>);

describe('NotificationApi', () => {
    let mockAxios: jest.Mocked<AxiosInstance>;
    let notificationApi: NotificationApi;

    beforeEach(() => {
        mockAxios = createMockAxios();
        notificationApi = createNotificationApi(mockAxios);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAll', () => {
        it('should fetch all notifications with default params', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    notifications: [
                        { id: '1', title: 'Test', message: 'Message 1', isRead: false },
                        { id: '2', title: 'Test 2', message: 'Message 2', isRead: true },
                    ],
                    total: 2,
                    unreadCount: 1,
                },
            };
            mockAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await notificationApi.getAll();

            expect(mockAxios.get).toHaveBeenCalledWith('/api/notifications');
            expect(result.success).toBe(true);
            expect(result.notifications).toHaveLength(2);
            expect(result.unreadCount).toBe(1);
        });

        it('should fetch notifications with custom params', async () => {
            mockAxios.get.mockResolvedValueOnce({
                data: { success: true, notifications: [], total: 0, unreadCount: 0 },
            });

            await notificationApi.getAll({ limit: 10, offset: 5, unreadOnly: true });

            expect(mockAxios.get).toHaveBeenCalledWith(
                '/api/notifications?limit=10&offset=5&unreadOnly=true'
            );
        });
    });

    describe('getUnreadCount', () => {
        it('should fetch unread notification count', async () => {
            const mockResponse = {
                data: { success: true, count: 5 },
            };
            mockAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await notificationApi.getUnreadCount();

            expect(mockAxios.get).toHaveBeenCalledWith('/api/notifications/unread-count');
            expect(result.success).toBe(true);
            expect(result.count).toBe(5);
        });
    });

    describe('markAsRead', () => {
        it('should mark a notification as read', async () => {
            const notificationId = 'notif-123';
            mockAxios.put.mockResolvedValueOnce({
                data: { success: true },
            });

            const result = await notificationApi.markAsRead(notificationId);

            expect(mockAxios.put).toHaveBeenCalledWith(
                `/api/notifications/${notificationId}/read`
            );
            expect(result.success).toBe(true);
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all notifications as read', async () => {
            mockAxios.put.mockResolvedValueOnce({
                data: { success: true },
            });

            const result = await notificationApi.markAllAsRead();

            expect(mockAxios.put).toHaveBeenCalledWith('/api/notifications/read-all');
            expect(result.success).toBe(true);
        });
    });

    describe('delete', () => {
        it('should delete a notification', async () => {
            const notificationId = 'notif-456';
            mockAxios.delete.mockResolvedValueOnce({
                data: { success: true },
            });

            const result = await notificationApi.delete(notificationId);

            expect(mockAxios.delete).toHaveBeenCalledWith(
                `/api/notifications/${notificationId}`
            );
            expect(result.success).toBe(true);
        });
    });

    describe('clearAll', () => {
        it('should clear all notifications', async () => {
            mockAxios.delete.mockResolvedValueOnce({
                data: { success: true },
            });

            const result = await notificationApi.clearAll();

            expect(mockAxios.delete).toHaveBeenCalledWith('/api/notifications/clear-all');
            expect(result.success).toBe(true);
        });
    });

    describe('getUnread', () => {
        it('should fetch unread notifications for polling', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    notifications: [
                        { id: '1', title: 'New', message: 'Unread message', isRead: false },
                    ],
                },
            };
            mockAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await notificationApi.getUnread();

            expect(mockAxios.get).toHaveBeenCalledWith('/api/tts/notifications/unread');
            expect(result.success).toBe(true);
            expect(result.notifications).toHaveLength(1);
        });
    });
});
