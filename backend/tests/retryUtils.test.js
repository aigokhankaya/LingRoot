/**
 * @jest-environment node
 * 
 * Retry Utils Unit Tests
 * Self-healing pattern doğrulaması
 */

const {
    withRetry,
    withCircuitBreaker,
    withGracefulDegradation,
    getCircuitBreakerStatus
} = require('../utils/common/retryUtils.js');

// Mock logger
jest.mock('../utils/common/logger.js', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
}));

describe('withRetry', () => {

    test('should return result on first successful attempt', async () => {
        const fn = jest.fn().mockResolvedValue('success');

        const result = await withRetry(fn, { maxRetries: 3 });

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure and succeed eventually', async () => {
        const fn = jest.fn()
            .mockRejectedValueOnce(new Error('fail 1'))
            .mockRejectedValueOnce(new Error('fail 2'))
            .mockResolvedValue('success');

        const result = await withRetry(fn, {
            maxRetries: 3,
            baseDelayMs: 10 // Fast for testing
        });

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(3);
    });

    test('should throw after max retries exceeded', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('always fails'));

        await expect(withRetry(fn, {
            maxRetries: 2,
            baseDelayMs: 10
        })).rejects.toThrow('always fails');

        expect(fn).toHaveBeenCalledTimes(2);
    });

    test('should not retry if shouldRetry returns false', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('do not retry'));

        await expect(withRetry(fn, {
            maxRetries: 3,
            shouldRetry: () => false
        })).rejects.toThrow('do not retry');

        expect(fn).toHaveBeenCalledTimes(1);
    });
});

describe('withGracefulDegradation', () => {

    test('should return result on success', async () => {
        const fn = jest.fn().mockResolvedValue('success');

        const result = await withGracefulDegradation(fn, 'default');

        expect(result).toBe('success');
    });

    test('should return default value on failure', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('fail'));

        const result = await withGracefulDegradation(fn, 'default');

        expect(result).toBe('default');
    });

    test('should return default object on failure', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('fail'));
        const defaultValue = { count: 0, items: [] };

        const result = await withGracefulDegradation(fn, defaultValue);

        expect(result).toEqual({ count: 0, items: [] });
    });
});

describe('getCircuitBreakerStatus', () => {

    test('should return empty object when no circuits exist', () => {
        const status = getCircuitBreakerStatus();
        expect(typeof status).toBe('object');
    });
});
