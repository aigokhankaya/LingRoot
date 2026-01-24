/**
 * API Client Integration Tests
 * 
 * Tests for the main createApiClient function and module integration
 */

import { checkApiHealth } from '../index';

describe('checkApiHealth', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('should return true when API is healthy', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
        });

        const result = await checkApiHealth('https://api.example.com');

        expect(result).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.example.com/api/health',
            expect.objectContaining({
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            })
        );
    });

    it('should return false when API is not healthy', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
        });

        const result = await checkApiHealth('https://api.example.com');

        expect(result).toBe(false);
    });

    it('should return false when fetch throws an error', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        const result = await checkApiHealth('https://api.example.com');

        expect(result).toBe(false);
    });
});

// Note: Full createApiClient tests require proper axios mocking which is complex.
// The individual endpoint modules (topic, pattern, notification) are tested separately.
// The integration test below verifies the module exports are correct.

describe('API Client Exports', () => {
    it('should export createApiClient function', () => {
        const { createApiClient } = require('../index');
        expect(typeof createApiClient).toBe('function');
    });

    it('should export checkApiHealth function', () => {
        const { checkApiHealth } = require('../index');
        expect(typeof checkApiHealth).toBe('function');
    });

    it('should export setAxios function', () => {
        const { setAxios } = require('../index');
        expect(typeof setAxios).toBe('function');
    });

    it('should export endpoint creators', () => {
        const endpoints = require('../endpoints');

        expect(typeof endpoints.createAuthApi).toBe('function');
        expect(typeof endpoints.createTTSApi).toBe('function');
        expect(typeof endpoints.createContentApi).toBe('function');
        expect(typeof endpoints.createSubscriptionApi).toBe('function');
        expect(typeof endpoints.createChatApi).toBe('function');
        expect(typeof endpoints.createBookApi).toBe('function');
        expect(typeof endpoints.createVocabularyApi).toBe('function');
        expect(typeof endpoints.createTopicApi).toBe('function');
        expect(typeof endpoints.createPatternApi).toBe('function');
        expect(typeof endpoints.createNotificationApi).toBe('function');
    });
});
