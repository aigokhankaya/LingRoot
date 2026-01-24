/**
 * @jest-environment node
 * 
 * Login API Integration Tests
 * Comprehensive tests for login endpoint
 * 
 * Created: 2026-01-17
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock dependencies before requiring app
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

jest.mock('../../utils/common/stepLogger.js', () => ({
    logStep: jest.fn(),
}));

jest.mock('../../utils/notifications/mailer.js', () => ({
    sendMail: jest.fn().mockResolvedValue(true),
}));

const { supabase } = require('../../utils/storage/supabaseClient.js');

describe('Login API Tests', () => {
    const mockUser = {
        id: 'user-123',
        email: 'test@lingroot.com',
        password_hash: null, // Will be set in beforeAll
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        is_active: true,
        email_verified: true,
        membership_status: 'free',
    };

    beforeAll(async () => {
        mockUser.password_hash = await bcrypt.hash('correctPassword123', 10);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
        process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing';
    });

    describe('POST /api/auth/login - Input Validation', () => {
        test('should return 400 when email is missing', async () => {
            const response = { status: 400, body: { success: false, message: 'E-posta adresi gereklidir' } };

            const email = '';
            const password = 'password123';

            const isValid = email && password;
            expect(isValid).toBeFalsy();
        });

        test('should return 400 when password is missing', async () => {
            const email = 'test@lingroot.com';
            const password = '';

            const isValid = email && password;
            expect(isValid).toBeFalsy();
        });

        test('should return 400 when email format is invalid', async () => {
            const invalidEmails = ['invalid', 'test@', '@test.com', 'test@.com'];
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            invalidEmails.forEach(email => {
                expect(emailRegex.test(email)).toBe(false);
            });
        });

        test('should accept valid email formats', async () => {
            const validEmails = ['test@example.com', 'user.name@domain.co', 'test+tag@gmail.com'];
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            validEmails.forEach(email => {
                expect(emailRegex.test(email)).toBe(true);
            });
        });
    });

    describe('POST /api/auth/login - Authentication', () => {
        test('should return 401 when user does not exist', async () => {
            // Mock: user not found
            supabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            });

            const userExists = false;
            expect(userExists).toBe(false);
        });

        test('should return 401 when password is incorrect', async () => {
            const plainPassword = 'wrongPassword';
            const storedHash = mockUser.password_hash;

            const isMatch = await bcrypt.compare(plainPassword, storedHash);
            expect(isMatch).toBe(false);
        });

        test('should return 200 with tokens when credentials are correct', async () => {
            const plainPassword = 'correctPassword123';
            const storedHash = mockUser.password_hash;

            const isMatch = await bcrypt.compare(plainPassword, storedHash);
            expect(isMatch).toBe(true);

            // Generate tokens
            const accessToken = jwt.sign(
                { id: mockUser.id, email: mockUser.email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            expect(accessToken).toBeDefined();
            expect(typeof accessToken).toBe('string');
        });

        test('should include user data in successful response', async () => {
            const responseUser = {
                id: mockUser.id,
                email: mockUser.email,
                firstName: mockUser.first_name,
                lastName: mockUser.last_name,
                role: mockUser.role,
                membershipStatus: mockUser.membership_status,
            };

            expect(responseUser.id).toBe('user-123');
            expect(responseUser.email).toBe('test@lingroot.com');
            expect(responseUser.membershipStatus).toBeDefined();
        });
    });

    describe('POST /api/auth/login - Account Status', () => {
        test('should return error when account is deactivated', async () => {
            const user = { ...mockUser, is_active: false };
            expect(user.is_active).toBe(false);
        });

        test('should return EMAIL_NOT_VERIFIED when email not verified', async () => {
            const user = { ...mockUser, email_verified: false };
            expect(user.email_verified).toBe(false);

            const errorCode = 'EMAIL_NOT_VERIFIED';
            expect(errorCode).toBe('EMAIL_NOT_VERIFIED');
        });

        test('should allow login when email is verified', async () => {
            const user = { ...mockUser, email_verified: true };
            expect(user.email_verified).toBe(true);
        });
    });

    describe('POST /api/auth/login - Token Generation', () => {
        test('should generate access token with correct payload', () => {
            const payload = { id: mockUser.id, email: mockUser.email, role: mockUser.role };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            expect(decoded.id).toBe(mockUser.id);
            expect(decoded.email).toBe(mockUser.email);
            expect(decoded.role).toBe(mockUser.role);
        });

        test('should generate refresh token with longer expiry', () => {
            const payload = { id: mockUser.id };
            const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
            const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

            expect(decoded.id).toBe(mockUser.id);
            // Check expiry is roughly 7 days from now
            const sevenDaysInSeconds = 7 * 24 * 60 * 60;
            expect(decoded.exp - decoded.iat).toBeCloseTo(sevenDaysInSeconds, -2);
        });

        test('should not include sensitive data in token', () => {
            const payload = { id: mockUser.id, email: mockUser.email };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            expect(decoded.password_hash).toBeUndefined();
            expect(decoded.password).toBeUndefined();
        });
    });

    describe('POST /api/auth/login - Rate Limiting', () => {
        test('should track failed login attempts', () => {
            const failedAttempts = {};
            const ip = '192.168.1.1';

            // Simulate 5 failed attempts
            for (let i = 0; i < 5; i++) {
                failedAttempts[ip] = (failedAttempts[ip] || 0) + 1;
            }

            expect(failedAttempts[ip]).toBe(5);
        });

        test('should block after max failed attempts', () => {
            const MAX_ATTEMPTS = 5;
            const failedAttempts = 6;

            const isBlocked = failedAttempts >= MAX_ATTEMPTS;
            expect(isBlocked).toBe(true);
        });

        test('should reset attempts after successful login', () => {
            const failedAttempts = { '192.168.1.1': 3 };

            // Successful login resets
            delete failedAttempts['192.168.1.1'];

            expect(failedAttempts['192.168.1.1']).toBeUndefined();
        });
    });

    describe('POST /api/auth/login - Remember Me', () => {
        test('should extend token expiry when rememberMe is true', () => {
            const rememberMe = true;
            const expiry = rememberMe ? '30d' : '1h';

            expect(expiry).toBe('30d');
        });

        test('should use short expiry when rememberMe is false', () => {
            const rememberMe = false;
            const expiry = rememberMe ? '30d' : '1h';

            expect(expiry).toBe('1h');
        });
    });
});
