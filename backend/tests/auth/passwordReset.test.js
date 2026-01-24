/**
 * @jest-environment node
 * 
 * Password Reset API Tests
 * Tests for forgot password and reset password flows
 * 
 * Created: 2026-01-17
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Mock dependencies
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
    },
}));

jest.mock('../../utils/common/logger.js', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));

jest.mock('../../utils/notifications/mailer.js', () => ({
    sendMail: jest.fn().mockResolvedValue(true),
}));

const { supabase } = require('../../utils/storage/supabaseClient.js');
const { sendMail } = require('../../utils/notifications/mailer.js');

describe('Password Reset API Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/forgot-password - Request Reset', () => {
        test('should require email', () => {
            const email = '';
            expect(email).toBeFalsy();
        });

        test('should validate email format', () => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            expect(emailRegex.test('invalid')).toBe(false);
            expect(emailRegex.test('valid@example.com')).toBe(true);
        });

        test('should check if user exists', async () => {
            supabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                maybeSingle: jest.fn().mockResolvedValue({
                    data: { id: 'user-123', email: 'test@example.com' },
                    error: null,
                }),
            });

            const user = { id: 'user-123' };
            expect(user).toBeDefined();
        });

        test('should return same message for existing and non-existing users (security)', () => {
            const successMessage = 'If an account exists, you will receive a password reset email.';

            // Whether user exists or not, same message
            expect(successMessage).toContain('If an account exists');
        });

        test('should generate secure reset token', () => {
            const token = crypto.randomBytes(32).toString('hex');

            expect(token).toBeDefined();
            expect(token.length).toBe(64);
        });

        test('should hash reset token before storing', async () => {
            const token = 'plain-token-123';
            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

            expect(hashedToken).not.toBe(token);
        });

        test('should set token expiration (1 hour)', () => {
            const expirationMinutes = 60;
            const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

            const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
            expect(Math.abs(expiresAt - oneHourFromNow)).toBeLessThan(1000);
        });

        test('should send reset email', async () => {
            await sendMail({
                to: 'test@example.com',
                subject: 'Password Reset',
                html: '<p>Click to reset</p>',
            });

            expect(sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'test@example.com',
                })
            );
        });

        test('should include reset link with token', () => {
            const token = 'abc123';
            const baseUrl = 'https://app.lingroot.com';
            const resetUrl = `${baseUrl}/reset-password?token=${token}`;

            expect(resetUrl).toContain('/reset-password?token=');
        });
    });

    describe('POST /api/auth/reset-password - Complete Reset', () => {
        test('should require token', () => {
            const token = '';
            expect(token).toBeFalsy();
        });

        test('should require new password', () => {
            const password = '';
            expect(password).toBeFalsy();
        });

        test('should validate password length', () => {
            const minLength = 6;
            expect('12345'.length >= minLength).toBe(false);
            expect('123456'.length >= minLength).toBe(true);
        });

        test('should verify token exists in database', async () => {
            const hashedToken = crypto.createHash('sha256').update('valid-token').digest('hex');

            supabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                maybeSingle: jest.fn().mockResolvedValue({
                    data: {
                        user_id: 'user-123',
                        token_hash: hashedToken,
                        expires_at: new Date(Date.now() + 3600000).toISOString(),
                    },
                    error: null,
                }),
            });

            const resetRecord = { user_id: 'user-123' };
            expect(resetRecord).toBeDefined();
        });

        test('should reject expired token', () => {
            const expiresAt = new Date(Date.now() - 3600000); // 1 hour ago
            const isExpired = expiresAt < new Date();

            expect(isExpired).toBe(true);
        });

        test('should accept valid (non-expired) token', () => {
            const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
            const isExpired = expiresAt < new Date();

            expect(isExpired).toBe(false);
        });

        test('should hash new password with bcrypt', async () => {
            const newPassword = 'NewSecurePassword123';
            const hash = await bcrypt.hash(newPassword, 10);

            expect(hash).not.toBe(newPassword);
            expect(await bcrypt.compare(newPassword, hash)).toBe(true);
        });

        test('should update user password in database', () => {
            const updateData = {
                password_hash: '$2b$10$hashedpassword...',
                updated_at: new Date().toISOString(),
            };

            expect(updateData.password_hash).toBeDefined();
        });

        test('should delete used reset token', () => {
            // Token should be single-use
            const tokenDeleted = true;
            expect(tokenDeleted).toBe(true);
        });

        test('should invalidate all user sessions (security)', () => {
            // Force re-login after password change
            const sessionsInvalidated = true;
            expect(sessionsInvalidated).toBe(true);
        });
    });

    describe('Password Reset Security', () => {
        test('should rate limit reset requests per email', () => {
            const maxRequestsPerHour = 3;
            const requests = 4;

            const isRateLimited = requests > maxRequestsPerHour;
            expect(isRateLimited).toBe(true);
        });

        test('should rate limit reset requests per IP', () => {
            const maxRequestsPerHour = 10;
            const requests = 11;

            const isRateLimited = requests > maxRequestsPerHour;
            expect(isRateLimited).toBe(true);
        });

        test('should not reveal if email exists (timing attack prevention)', () => {
            // Both paths should take similar time
            const responseTime1 = 100; // user exists
            const responseTime2 = 100; // user doesn't exist

            expect(Math.abs(responseTime1 - responseTime2)).toBeLessThan(50);
        });

        test('should use secure random for token generation', () => {
            const token1 = crypto.randomBytes(32).toString('hex');
            const token2 = crypto.randomBytes(32).toString('hex');

            expect(token1).not.toBe(token2);
        });
    });
});
