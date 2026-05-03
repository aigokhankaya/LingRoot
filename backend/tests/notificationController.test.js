/**
 * @jest-environment node
 */

jest.mock('../utils/storage/supabaseClient.js', () => ({
    supabase: {
        from: jest.fn(),
    },
}));

jest.mock('../utils/common/logger.js', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));

jest.mock('../utils/notifications/pushNotification.js', () => ({
    sendRealtimePushNotification: jest.fn().mockResolvedValue(undefined),
}));

const { supabase } = require('../utils/storage/supabaseClient.js');
const { sendRealtimePushNotification } = require('../utils/notifications/pushNotification.js');
const {
    sendNotification,
    getNotifications,
    getNotificationHistory,
    markAsOpened,
} = require('../controllers/notificationController.js');

const createRes = () => {
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    return res;
};

describe('notificationController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('sendNotification stores link inside data payload for a specific user', async () => {
        const single = jest.fn().mockResolvedValue({
            data: {
                id: 'notif-1',
                data: { link: '/dashboard' },
            },
            error: null,
        });
        const select = jest.fn(() => ({ single }));
        const insert = jest.fn(() => ({ select }));
        supabase.from.mockReturnValue({
            insert,
        });

        const req = {
            body: {
                userId: 'user-1',
                title: 'Test',
                message: 'Hello',
                type: 'info',
                link: '/dashboard',
            },
        };
        const res = createRes();

        await sendNotification(req, res);

        expect(insert).toHaveBeenCalledWith([
            expect.objectContaining({
                user_id: 'user-1',
                title: 'Test',
                body: 'Hello',
                type: 'info',
                is_read: false,
                data: { link: '/dashboard' },
            }),
        ]);
        expect(insert.mock.calls[0][0][0]).not.toHaveProperty('link');
        expect(sendRealtimePushNotification).toHaveBeenCalledWith(
            'user-1',
            expect.objectContaining({
                data: { link: '/dashboard', notificationId: 'notif-1' },
            })
        );
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Bildirim gönderildi',
        });
    });

    test('getNotifications maps data.link back to link in API response', async () => {
        const range = jest.fn().mockResolvedValue({
            data: [{
                id: 'notif-1',
                user_id: 'user-1',
                title: 'Test',
                body: 'Hello',
                type: 'info',
                is_read: false,
                data: { link: '/dashboard' },
                created_at: '2026-04-20T10:00:00.000Z',
                read_at: null,
            }],
            error: null,
            count: 1,
        });
        const order = jest.fn(() => ({ range }));
        const eqUser = jest.fn(() => ({ order }));
        const selectNotifications = jest.fn(() => ({ eq: eqUser }));

        const eqUnread = jest.fn().mockResolvedValue({
            data: [{ data: { link: '/dashboard' } }],
            error: null,
        });
        const eqCountUser = jest.fn(() => ({ eq: eqUnread }));
        const selectUnread = jest.fn(() => ({ eq: eqCountUser }));

        supabase.from
            .mockReturnValueOnce({ select: selectNotifications })
            .mockReturnValueOnce({ select: selectUnread });

        const req = {
            user: { id: 'user-1' },
            query: {},
        };
        const res = createRes();

        await getNotifications(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: [
                expect.objectContaining({
                    id: 'notif-1',
                    link: '/dashboard',
                    metadata: { link: '/dashboard' },
                }),
            ],
            unreadCount: 1,
        }));
    });

    test('getNotificationHistory exposes link from data payload', async () => {
        const range = jest.fn().mockResolvedValue({
            data: [{
                id: 'notif-1',
                user_id: 'user-1',
                title: 'Admin Test',
                body: 'Hello',
                type: 'info',
                is_read: false,
                data: { link: '/dashboard' },
                created_at: '2026-04-20T10:00:00.000Z',
                users: {
                    id: 'user-1',
                    firstname: 'Enes',
                    lastname: 'Yuzak',
                    email: 'enesyuzak@gmail.com',
                },
            }],
            error: null,
            count: 1,
        });
        const order = jest.fn(() => ({ range }));
        const select = jest.fn(() => ({ order }));
        supabase.from.mockReturnValue({
            select,
        });

        const req = {
            query: {},
        };
        const res = createRes();

        await getNotificationHistory(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: [
                expect.objectContaining({
                    id: 'notif-1',
                    link: '/dashboard',
                    user: expect.objectContaining({
                        email: 'enesyuzak@gmail.com',
                    }),
                }),
            ],
        }));
    });

    test('markAsOpened tracks open metadata and marks notification as read', async () => {
        const singleFetch = jest.fn().mockResolvedValue({
            data: {
                id: 'notif-1',
                is_read: false,
                read_at: null,
                data: { link: '/dashboard', open_count: 1 },
            },
            error: null,
        });
        const eqFetchUser = jest.fn(() => ({ single: singleFetch }));
        const eqFetchId = jest.fn(() => ({ eq: eqFetchUser }));

        const singleUpdate = jest.fn().mockResolvedValue({
            data: {
                id: 'notif-1',
                is_read: true,
                read_at: '2026-05-03T10:00:00.000Z',
                data: {
                    link: '/dashboard',
                    was_opened: true,
                    open_count: 2,
                    last_opened_source: 'list',
                },
            },
            error: null,
        });
        const selectUpdate = jest.fn(() => ({ single: singleUpdate }));
        const eqUpdateUser = jest.fn(() => ({ select: selectUpdate }));
        const eqUpdateId = jest.fn(() => ({ eq: eqUpdateUser }));
        const update = jest.fn(() => ({ eq: eqUpdateId }));

        supabase.from
            .mockReturnValueOnce({ select: jest.fn(() => ({ eq: eqFetchId })) })
            .mockReturnValueOnce({ update });

        const req = {
            user: { id: 'user-1' },
            params: { id: 'notif-1' },
            body: { source: 'list' },
        };
        const res = createRes();

        await markAsOpened(req, res);

        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            is_read: true,
            data: expect.objectContaining({
                was_opened: true,
                open_count: 2,
                last_opened_source: 'list',
            }),
        }));
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                id: 'notif-1',
                isRead: true,
                metadata: expect.objectContaining({
                    was_opened: true,
                    open_count: 2,
                }),
            }),
        }));
    });
});
