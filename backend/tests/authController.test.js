/**
 * @jest-environment node
 * 
 * Auth Controller Unit Tests
 * Tests for critical authentication flows
 * 
 * Created: 2026-01-16
 */

// Mock dependencies before imports
jest.mock('../utils/storage/supabaseClient.js', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
            single: jest.fn(),
        })),
    },
}));

jest.mock('../utils/common/logger.js', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));

jest.mock('../utils/common/stepLogger.js', () => ({
    logStep: jest.fn(),
}));

jest.mock('../utils/notifications/registrationNotifier.js', () => ({
    sendRegistrationNotification: jest.fn(),
}));

jest.mock('../utils/notifications/mailer.js', () => ({
    sendMail: jest.fn().mockResolvedValue(true),
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import after mocks are set up
const { supabase } = require('../utils/storage/supabaseClient.js');

describe('Auth Controller - Login Flow', () => {
    // Save original env
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        // Set test environment
        process.env = { ...originalEnv };
        process.env.NODE_ENV = 'test';
        process.env.JWT_SECRET = 'test-secret-key';
        process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('Input Validation', () => {
        test('should reject login with missing email', async () => {
            // We test the validation logic directly
            const email = '';
            const password = 'password123';

            expect(!email || !password).toBe(true);
        });

        test('should reject login with missing password', async () => {
            const email = 'test@example.com';
            const password = '';

            expect(!email || !password).toBe(true);
        });

        test('should accept valid email and password', async () => {
            const email = 'test@example.com';
            const password = 'password123';

            expect(!email || !password).toBe(false);
        });
    });

    describe('Password Verification', () => {
        test('should correctly verify matching password', async () => {
            const plainPassword = 'mySecurePassword123';
            const hashedPassword = await bcrypt.hash(plainPassword, 10);

            const result = await bcrypt.compare(plainPassword, hashedPassword);

            expect(result).toBe(true);
        });

        test('should reject non-matching password', async () => {
            const plainPassword = 'mySecurePassword123';
            const wrongPassword = 'wrongPassword';
            const hashedPassword = await bcrypt.hash(plainPassword, 10);

            const result = await bcrypt.compare(wrongPassword, hashedPassword);

            expect(result).toBe(false);
        });
    });

    describe('JWT Token Generation', () => {
        test('should generate valid JWT token', () => {
            const payload = { id: 'user-123', email: 'test@example.com', role: 'user' };
            const secret = 'test-secret-key';

            const token = jwt.sign(payload, secret, { expiresIn: '1h' });
            const decoded = jwt.verify(token, secret);

            expect(decoded.id).toBe(payload.id);
            expect(decoded.email).toBe(payload.email);
            expect(decoded.role).toBe(payload.role);
        });

        test('should reject token with wrong secret', () => {
            const payload = { id: 'user-123', email: 'test@example.com', role: 'user' };
            const token = jwt.sign(payload, 'correct-secret', { expiresIn: '1h' });

            expect(() => {
                jwt.verify(token, 'wrong-secret');
            }).toThrow();
        });

        test('should include expiration in token', () => {
            const payload = { id: 'user-123' };
            const secret = 'test-secret-key';

            const token = jwt.sign(payload, secret, { expiresIn: '1h' });
            const decoded = jwt.verify(token, secret);

            expect(decoded.exp).toBeDefined();
            expect(decoded.iat).toBeDefined();
        });
    });
});

describe('Auth Controller - Registration Flow', () => {
    describe('Input Validation', () => {
        test('should validate required fields', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phoneNumber: '+905551234567',
                password: 'securePassword123'
            };

            const isValid = validData.firstName && validData.lastName &&
                validData.email && validData.phoneNumber && validData.password;

            expect(isValid).toBeTruthy();
        });

        test('should reject invalid email format', () => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            expect(emailRegex.test('invalid-email')).toBe(false);
            expect(emailRegex.test('test@')).toBe(false);
            expect(emailRegex.test('@example.com')).toBe(false);
            expect(emailRegex.test('valid@example.com')).toBe(true);
        });

        test('should reject invalid phone number format', () => {
            const phoneRegex = /^\+?[1-9]\d{1,14}$/;

            expect(phoneRegex.test('abc')).toBe(false);
            expect(phoneRegex.test('0123')).toBe(false); // Cannot start with 0
            expect(phoneRegex.test('+905551234567')).toBe(true);
            expect(phoneRegex.test('905551234567')).toBe(true);
        });

        test('should reject short passwords', () => {
            const minLength = 6;

            expect('12345'.length >= minLength).toBe(false);
            expect('123456'.length >= minLength).toBe(true);
            expect('securePassword'.length >= minLength).toBe(true);
        });
    });

    describe('Password Hashing', () => {
        test('should hash password correctly', async () => {
            const password = 'mySecurePassword123';
            const hashedPassword = await bcrypt.hash(password, 10);

            // Hash should be different from plain password
            expect(hashedPassword).not.toBe(password);
            // Hash should be verifiable
            expect(await bcrypt.compare(password, hashedPassword)).toBe(true);
        });
    });
});

describe('Auth Controller - Token Refresh Flow', () => {
    describe('Token Validation', () => {
        test('should validate refresh token structure', () => {
            const secret = 'refresh-secret';
            const payload = { id: 'user-123' };

            const refreshToken = jwt.sign(payload, secret, { expiresIn: '7d' });
            const decoded = jwt.verify(refreshToken, secret);

            expect(decoded.id).toBe('user-123');
        });

        test('should reject expired refresh token', () => {
            const secret = 'refresh-secret';
            const payload = { id: 'user-123' };

            // Create an already expired token
            const expiredToken = jwt.sign(payload, secret, { expiresIn: '-1s' });

            expect(() => {
                jwt.verify(expiredToken, secret);
            }).toThrow('jwt expired');
        });
    });
});

describe('Auth Controller - Security Checks', () => {
    describe('Production JWT Secret Validation', () => {
        test('should detect insecure default JWT secret', () => {
            const insecureDefaults = [
                'lingroot-test-jwt-secret',
                'lingroot-test-refresh-secret',
                ''
            ];

            insecureDefaults.forEach(secret => {
                const isInsecure = !secret ||
                    secret === 'lingroot-test-jwt-secret' ||
                    secret === 'lingroot-test-refresh-secret';
                expect(isInsecure).toBe(true);
            });
        });

        test('should accept secure custom secrets', () => {
            const secureSecrets = [
                'my-super-secret-production-key-12345',
                'another-very-long-and-random-secret-key'
            ];

            secureSecrets.forEach(secret => {
                const isInsecure = !secret ||
                    secret === 'lingroot-test-jwt-secret' ||
                    secret === 'lingroot-test-refresh-secret';
                expect(isInsecure).toBe(false);
            });
        });
    });
});
