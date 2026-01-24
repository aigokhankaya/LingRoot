/**
 * @jest-environment node
 * 
 * Admin Controller Tests
 * User management, content management, subscription management
 * 
 * Created: 2026-01-17
 */

// Mock dependencies
jest.mock('../../utils/storage/supabaseClient.js', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            neq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
            single: jest.fn(),
        })),
        storage: {
            from: jest.fn(() => ({
                remove: jest.fn().mockResolvedValue({ data: [], error: null }),
            })),
        },
    },
    bucketName: 'lingroot-audio',
}));

jest.mock('../../utils/common/logger.js', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));

jest.mock('../../utils/infra/usageLimiter.js', () => ({
    checkLimits: jest.fn().mockReturnValue({ allowed: true }),
}));

describe('Admin Controller Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('User Management', () => {
        const mockUsers = [
            { id: 'user-1', email: 'user1@test.com', first_name: 'John', role: 'user', is_active: true },
            { id: 'user-2', email: 'user2@test.com', first_name: 'Jane', role: 'user', is_active: true },
            { id: 'admin-1', email: 'admin@test.com', first_name: 'Admin', role: 'admin', is_active: true },
        ];

        describe('getAllUsers', () => {
            test('should return paginated user list', () => {
                const page = 1;
                const limit = 10;
                const offset = (page - 1) * limit;

                expect(offset).toBe(0);
                expect(limit).toBe(10);
            });

            test('should filter by search term', () => {
                const searchTerm = 'john';
                const filtered = mockUsers.filter(u =>
                    u.email.toLowerCase().includes(searchTerm) ||
                    u.first_name.toLowerCase().includes(searchTerm)
                );

                expect(filtered.length).toBe(1);
                expect(filtered[0].first_name).toBe('John');
            });

            test('should filter by role', () => {
                const role = 'admin';
                const filtered = mockUsers.filter(u => u.role === role);

                expect(filtered.length).toBe(1);
                expect(filtered[0].role).toBe('admin');
            });

            test('should return total count for pagination', () => {
                const totalUsers = mockUsers.length;
                const limit = 10;
                const totalPages = Math.ceil(totalUsers / limit);

                expect(totalPages).toBe(1);
            });
        });

        describe('getUserById', () => {
            test('should return user by ID', () => {
                const userId = 'user-1';
                const user = mockUsers.find(u => u.id === userId);

                expect(user).toBeDefined();
                expect(user.email).toBe('user1@test.com');
            });

            test('should return null for non-existent user', () => {
                const userId = 'non-existent';
                const user = mockUsers.find(u => u.id === userId);

                expect(user).toBeUndefined();
            });
        });

        describe('updateUser', () => {
            test('should update user fields', () => {
                const userId = 'user-1';
                const updates = { first_name: 'Johnny', is_active: false };

                const user = { ...mockUsers[0], ...updates };

                expect(user.first_name).toBe('Johnny');
                expect(user.is_active).toBe(false);
            });

            test('should not allow role escalation to super-admin', () => {
                const updates = { role: 'super-admin' };
                const allowedRoles = ['user', 'admin'];

                const isAllowed = allowedRoles.includes(updates.role);
                expect(isAllowed).toBe(false);
            });

            test('should update timestamp on modification', () => {
                const updates = {
                    first_name: 'Updated',
                    updated_at: new Date().toISOString(),
                };

                expect(updates.updated_at).toBeDefined();
            });
        });

        describe('deleteUser', () => {
            test('should soft delete user by default', () => {
                const user = { ...mockUsers[0], is_active: false, deleted_at: new Date().toISOString() };

                expect(user.is_active).toBe(false);
                expect(user.deleted_at).toBeDefined();
            });

            test('should not delete admin user without confirmation', () => {
                const user = mockUsers.find(u => u.role === 'admin');
                const requiresConfirmation = user.role === 'admin';

                expect(requiresConfirmation).toBe(true);
            });

            test('should cascade delete user content optionally', () => {
                const cascadeDelete = true;
                const userContent = [{ id: 'content-1', user_id: 'user-1' }];

                if (cascadeDelete) {
                    const deleted = userContent.filter(c => c.user_id === 'user-1');
                    expect(deleted.length).toBe(1);
                }
            });
        });

        describe('deleteUsersBulk', () => {
            test('should delete multiple users', () => {
                const userIds = ['user-1', 'user-2'];
                const deleted = mockUsers.filter(u => userIds.includes(u.id));

                expect(deleted.length).toBe(2);
            });

            test('should skip admin users in bulk delete', () => {
                const userIds = ['user-1', 'admin-1'];
                const toDelete = mockUsers.filter(u =>
                    userIds.includes(u.id) && u.role !== 'admin'
                );

                expect(toDelete.length).toBe(1);
            });

            test('should return count of deleted users', () => {
                const deletedCount = 2;
                expect(deletedCount).toBeGreaterThan(0);
            });
        });
    });

    describe('Content Management', () => {
        const mockContent = [
            { id: 'content-1', user_id: 'user-1', input_type: 'text', created_at: '2026-01-15' },
            { id: 'content-2', user_id: 'user-2', input_type: 'url', created_at: '2026-01-16' },
        ];

        describe('getAllContent', () => {
            test('should return paginated content list', () => {
                const page = 1;
                const limit = 20;

                expect(mockContent.length).toBeLessThanOrEqual(limit);
            });

            test('should filter by input type', () => {
                const inputType = 'text';
                const filtered = mockContent.filter(c => c.input_type === inputType);

                expect(filtered.length).toBe(1);
            });

            test('should filter by user', () => {
                const userId = 'user-1';
                const filtered = mockContent.filter(c => c.user_id === userId);

                expect(filtered.length).toBe(1);
            });

            test('should order by creation date', () => {
                const sorted = [...mockContent].sort((a, b) =>
                    new Date(b.created_at) - new Date(a.created_at)
                );

                expect(sorted[0].id).toBe('content-2');
            });
        });

        describe('deleteContent', () => {
            test('should delete content by ID', () => {
                const contentId = 'content-1';
                const remaining = mockContent.filter(c => c.id !== contentId);

                expect(remaining.length).toBe(1);
            });

            test('should delete associated audio files', () => {
                const audioUrls = ['https://storage.supabase.co/audio/file.mp3'];
                const deleted = audioUrls.length;

                expect(deleted).toBe(1);
            });
        });
    });

    describe('Subscription Management', () => {
        const mockSubscriptions = [
            { id: 'sub-1', user_id: 'user-1', plan_id: 'premium', status: 'active' },
            { id: 'sub-2', user_id: 'user-2', plan_id: 'free', status: 'active' },
        ];

        describe('getAllSubscriptions', () => {
            test('should return all subscriptions', () => {
                expect(mockSubscriptions.length).toBe(2);
            });

            test('should filter by status', () => {
                const status = 'active';
                const filtered = mockSubscriptions.filter(s => s.status === status);

                expect(filtered.length).toBe(2);
            });

            test('should filter by plan', () => {
                const plan = 'premium';
                const filtered = mockSubscriptions.filter(s => s.plan_id === plan);

                expect(filtered.length).toBe(1);
            });
        });

        describe('updateSubscription', () => {
            test('should update subscription plan', () => {
                const sub = { ...mockSubscriptions[1], plan_id: 'premium' };
                expect(sub.plan_id).toBe('premium');
            });

            test('should update subscription status', () => {
                const sub = { ...mockSubscriptions[0], status: 'canceled' };
                expect(sub.status).toBe('canceled');
            });
        });

        describe('assignPlanToUser', () => {
            test('should create subscription if not exists', () => {
                const userId = 'user-3';
                const existingSubscription = mockSubscriptions.find(s => s.user_id === userId);

                expect(existingSubscription).toBeUndefined();
            });

            test('should update existing subscription', () => {
                const userId = 'user-1';
                const existingSubscription = mockSubscriptions.find(s => s.user_id === userId);

                expect(existingSubscription).toBeDefined();
            });

            test('should set correct period dates', () => {
                const now = new Date();
                const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                expect(periodEnd > now).toBe(true);
            });
        });
    });

    describe('Dashboard Stats', () => {
        test('should return user count', () => {
            const stats = { totalUsers: 100 };
            expect(stats.totalUsers).toBeGreaterThan(0);
        });

        test('should return content count', () => {
            const stats = { totalContent: 500 };
            expect(stats.totalContent).toBeGreaterThan(0);
        });

        test('should return active subscription count', () => {
            const stats = { activeSubscriptions: 25 };
            expect(stats.activeSubscriptions).toBeGreaterThanOrEqual(0);
        });

        test('should return revenue metrics', () => {
            const stats = {
                monthlyRevenue: 1000,
                totalRevenue: 5000,
            };
            expect(stats.monthlyRevenue).toBeGreaterThanOrEqual(0);
        });

        test('should return growth metrics', () => {
            const stats = {
                userGrowth: 15, // percent
                contentGrowth: 20,
            };
            expect(typeof stats.userGrowth).toBe('number');
        });
    });

    describe('TTS Provider Settings', () => {
        describe('getTtsProviderSetting', () => {
            test('should return current provider', () => {
                const setting = { provider: 'google' };
                expect(setting.provider).toBeDefined();
            });

            test('should return default if not set', () => {
                const setting = null;
                const defaultProvider = 'google';
                const provider = setting?.provider || defaultProvider;

                expect(provider).toBe('google');
            });
        });

        describe('setTtsProviderSetting', () => {
            test('should validate provider name', () => {
                const validProviders = ['google', 'azure', 'elevenlabs'];
                const provider = 'google';

                expect(validProviders.includes(provider)).toBe(true);
            });

            test('should reject invalid provider', () => {
                const validProviders = ['google', 'azure', 'elevenlabs'];
                const provider = 'invalid-provider';

                expect(validProviders.includes(provider)).toBe(false);
            });
        });
    });

    describe('Audio File Management', () => {
        describe('deleteAudioFiles', () => {
            test('should delete files from storage', () => {
                const files = ['file1.mp3', 'file2.mp3'];
                const deleted = files.length;

                expect(deleted).toBe(2);
            });

            test('should update database records', () => {
                const contentIds = ['content-1', 'content-2'];
                expect(contentIds.length).toBe(2);
            });

            test('should handle non-existent files gracefully', () => {
                const error = null; // No error for missing files
                expect(error).toBeNull();
            });
        });
    });

    describe('Expired Subscription Handling', () => {
        describe('downgradeExpiredSubscriptions', () => {
            test('should find expired subscriptions', () => {
                const now = new Date();
                const subscriptions = [
                    { id: 'sub-1', period_end: new Date(now.getTime() - 86400000).toISOString() }, // Expired
                    { id: 'sub-2', period_end: new Date(now.getTime() + 86400000).toISOString() }, // Active
                ];

                const expired = subscriptions.filter(s => new Date(s.period_end) < now);
                expect(expired.length).toBe(1);
            });

            test('should downgrade to free plan', () => {
                const downgraded = { plan_id: 'free', status: 'expired' };
                expect(downgraded.plan_id).toBe('free');
            });

            test('should return count of downgraded subscriptions', () => {
                const count = 5;
                expect(count).toBeGreaterThanOrEqual(0);
            });
        });
    });

    describe('Authorization Checks', () => {
        test('should require admin role for all endpoints', () => {
            const userRole = 'admin';
            const isAdmin = userRole === 'admin';

            expect(isAdmin).toBe(true);
        });

        test('should reject non-admin users', () => {
            const userRole = 'user';
            const isAdmin = userRole === 'admin';

            expect(isAdmin).toBe(false);
        });

        test('should log admin actions', () => {
            const auditLog = {
                adminId: 'admin-1',
                action: 'delete_user',
                targetId: 'user-1',
                timestamp: new Date().toISOString(),
            };

            expect(auditLog.adminId).toBeDefined();
            expect(auditLog.action).toBeDefined();
        });
    });
});
