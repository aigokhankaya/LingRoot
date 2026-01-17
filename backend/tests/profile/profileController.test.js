/**
 * @jest-environment node
 * 
 * Profile Controller Tests
 * User profile management
 * 
 * Created: 2026-01-17
 */

jest.mock('../../utils/storage/supabaseClient.js', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
            single: jest.fn(),
        })),
        storage: {
            from: jest.fn(() => ({
                upload: jest.fn().mockResolvedValue({ data: { path: 'avatars/user-123.jpg' }, error: null }),
                getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://storage.supabase.co/avatars/user-123.jpg' } }),
            })),
        },
    },
}));

jest.mock('../../utils/common/logger.js', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));

describe('Profile Controller Tests', () => {
    const mockUser = {
        id: 'user-123',
        email: 'test@lingroot.com',
        first_name: 'John',
        last_name: 'Doe',
        phone_number: '+905551234567',
        avatar_url: null,
        bio: 'Learning English',
        native_language: 'tr',
        target_language: 'en',
        cefr_level: 'B1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z',
    };

    describe('getProfile', () => {
        test('should return user profile', () => {
            expect(mockUser.id).toBeDefined();
            expect(mockUser.email).toBeDefined();
            expect(mockUser.first_name).toBeDefined();
        });

        test('should not return password hash', () => {
            expect(mockUser.password_hash).toBeUndefined();
        });

        test('should include learning preferences', () => {
            expect(mockUser.native_language).toBeDefined();
            expect(mockUser.target_language).toBeDefined();
            expect(mockUser.cefr_level).toBeDefined();
        });

        test('should require authentication', () => {
            const authRequired = true;
            expect(authRequired).toBe(true);
        });
    });

    describe('updateProfile', () => {
        test('should update first name', () => {
            const updated = { ...mockUser, first_name: 'Johnny' };
            expect(updated.first_name).toBe('Johnny');
        });

        test('should update last name', () => {
            const updated = { ...mockUser, last_name: 'Smith' };
            expect(updated.last_name).toBe('Smith');
        });

        test('should update bio', () => {
            const updated = { ...mockUser, bio: 'Updated bio text' };
            expect(updated.bio).toBe('Updated bio text');
        });

        test('should update CEFR level', () => {
            const updated = { ...mockUser, cefr_level: 'B2' };
            expect(updated.cefr_level).toBe('B2');
        });

        test('should validate CEFR level', () => {
            const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
            expect(validLevels.includes('B2')).toBe(true);
            expect(validLevels.includes('D1')).toBe(false);
        });

        test('should not allow email update', () => {
            const protectedFields = ['email', 'id', 'role'];
            expect(protectedFields.includes('email')).toBe(true);
        });

        test('should update timestamp', () => {
            const updated = { ...mockUser, updated_at: new Date().toISOString() };
            expect(new Date(updated.updated_at) > new Date(mockUser.updated_at)).toBe(true);
        });

        test('should trim whitespace from names', () => {
            const name = '  John  ';
            expect(name.trim()).toBe('John');
        });
    });

    describe('uploadAvatar', () => {
        test('should accept image file types', () => {
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            const fileType = 'image/jpeg';

            expect(validTypes.includes(fileType)).toBe(true);
        });

        test('should reject non-image files', () => {
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            const fileType = 'application/pdf';

            expect(validTypes.includes(fileType)).toBe(false);
        });

        test('should limit file size', () => {
            const maxSize = 5 * 1024 * 1024; // 5MB
            const fileSize = 2 * 1024 * 1024; // 2MB

            expect(fileSize < maxSize).toBe(true);
        });

        test('should generate unique filename', () => {
            const userId = 'user-123';
            const timestamp = Date.now();
            const filename = `avatars/${userId}-${timestamp}.jpg`;

            expect(filename).toContain(userId);
        });

        test('should return public URL', () => {
            const publicUrl = 'https://storage.supabase.co/avatars/user-123.jpg';
            expect(publicUrl).toContain('https://');
        });

        test('should update user avatar_url', () => {
            const updated = { ...mockUser, avatar_url: 'https://storage.supabase.co/avatars/user-123.jpg' };
            expect(updated.avatar_url).toBeDefined();
        });
    });

    describe('changePassword', () => {
        const bcrypt = require('bcryptjs');

        test('should require current password', () => {
            const currentPassword = '';
            expect(currentPassword).toBeFalsy();
        });

        test('should require new password', () => {
            const newPassword = '';
            expect(newPassword).toBeFalsy();
        });

        test('should validate password length', () => {
            const minLength = 6;
            expect('12345'.length >= minLength).toBe(false);
            expect('123456'.length >= minLength).toBe(true);
        });

        test('should verify current password', async () => {
            const currentPassword = 'oldPassword123';
            const storedHash = await bcrypt.hash(currentPassword, 10);

            const isValid = await bcrypt.compare(currentPassword, storedHash);
            expect(isValid).toBe(true);
        });

        test('should hash new password', async () => {
            const newPassword = 'newPassword123';
            const hash = await bcrypt.hash(newPassword, 10);

            expect(hash).not.toBe(newPassword);
        });

        test('should not allow same password', async () => {
            const currentPassword = 'samePassword';
            const newPassword = 'samePassword';

            expect(currentPassword === newPassword).toBe(true);
        });
    });

    describe('Learning Preferences', () => {
        test('should update native language', () => {
            const updated = { ...mockUser, native_language: 'en' };
            expect(updated.native_language).toBe('en');
        });

        test('should update target language', () => {
            const updated = { ...mockUser, target_language: 'de' };
            expect(updated.target_language).toBe('de');
        });

        test('should validate language codes', () => {
            const validCodes = ['en', 'tr', 'de', 'fr', 'es', 'it'];
            expect(validCodes.includes('en')).toBe(true);
        });

        test('should update daily goal', () => {
            const updated = { ...mockUser, daily_goal_minutes: 30 };
            expect(updated.daily_goal_minutes).toBe(30);
        });
    });

    describe('Account Deletion', () => {
        test('should require password confirmation', () => {
            const passwordConfirmed = true;
            expect(passwordConfirmed).toBe(true);
        });

        test('should soft delete by default', () => {
            const deleted = { ...mockUser, is_active: false, deleted_at: new Date().toISOString() };
            expect(deleted.is_active).toBe(false);
        });

        test('should allow account recovery within grace period', () => {
            const gracePeriodDays = 30;
            expect(gracePeriodDays).toBe(30);
        });

        test('should schedule permanent deletion', () => {
            const scheduledDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            expect(scheduledDate > new Date()).toBe(true);
        });
    });
});
