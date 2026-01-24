/**
 * Pattern API Module Tests
 * 
 * Unit tests for the Pattern API endpoints
 */

import { createPatternApi, PatternApi } from '../endpoints/pattern';
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

describe('PatternApi', () => {
    let mockAxios: jest.Mocked<AxiosInstance>;
    let patternApi: PatternApi;

    beforeEach(() => {
        mockAxios = createMockAxios();
        patternApi = createPatternApi(mockAxios);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getByLevel', () => {
        it('should fetch patterns by CEFR level', async () => {
            const level = 'B1';
            const mockResponse = {
                data: {
                    success: true,
                    patterns: [
                        { id: 1, pattern: 'break the ice', meaning: 'to start a conversation' },
                        { id: 2, pattern: 'piece of cake', meaning: 'something easy' },
                    ],
                    count: 2,
                },
            };
            mockAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await patternApi.getByLevel(level);

            expect(mockAxios.get).toHaveBeenCalledWith(`/api/patterns/level/${level}`);
            expect(result.success).toBe(true);
            expect(result.patterns).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should handle different CEFR levels', async () => {
            const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

            for (const level of levels) {
                mockAxios.get.mockResolvedValueOnce({
                    data: { success: true, patterns: [], count: 0 },
                });

                await patternApi.getByLevel(level);

                expect(mockAxios.get).toHaveBeenCalledWith(`/api/patterns/level/${level}`);
            }
        });
    });

    describe('findInText', () => {
        it('should find patterns in text', async () => {
            const text = 'Learning English is a piece of cake when you break the ice with practice.';
            const level = 'B1';
            const mockResponse = {
                data: {
                    success: true,
                    patterns: [
                        {
                            pattern: { id: 1, pattern: 'piece of cake' },
                            matchedText: 'a piece of cake',
                            startIndex: 20,
                            endIndex: 35,
                        },
                        {
                            pattern: { id: 2, pattern: 'break the ice' },
                            matchedText: 'break the ice',
                            startIndex: 45,
                            endIndex: 58,
                        },
                    ],
                    count: 2,
                },
            };
            mockAxios.post.mockResolvedValueOnce(mockResponse);

            const result = await patternApi.findInText(text, level);

            expect(mockAxios.post).toHaveBeenCalledWith('/api/patterns/find', { text, level });
            expect(result.success).toBe(true);
            expect(result.patterns).toHaveLength(2);
        });

        it('should work without level parameter', async () => {
            const text = 'Some text';
            mockAxios.post.mockResolvedValueOnce({
                data: { success: true, patterns: [], count: 0 },
            });

            await patternApi.findInText(text);

            expect(mockAxios.post).toHaveBeenCalledWith('/api/patterns/find', { text, level: undefined });
        });
    });

    describe('getHistory', () => {
        it('should fetch user pattern history', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    patterns: [
                        { id: 1, pattern_id: 101, encountered_at: '2026-01-24T10:00:00Z' },
                    ],
                    count: 1,
                },
            };
            mockAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await patternApi.getHistory();

            expect(mockAxios.get).toHaveBeenCalledWith('/api/patterns/history');
            expect(result.success).toBe(true);
            expect(result.patterns).toHaveLength(1);
        });
    });

    describe('getDailyPatterns', () => {
        it('should fetch daily patterns with default count', async () => {
            const level = 'B1';
            mockAxios.get.mockResolvedValueOnce({
                data: { success: true, patterns: [], count: 0 },
            });

            await patternApi.getDailyPatterns(level);

            expect(mockAxios.get).toHaveBeenCalledWith('/api/patterns/daily?level=B1&count=5');
        });

        it('should fetch daily patterns with custom count', async () => {
            const level = 'B2';
            const count = 10;
            mockAxios.get.mockResolvedValueOnce({
                data: { success: true, patterns: [], count: 0 },
            });

            await patternApi.getDailyPatterns(level, count);

            expect(mockAxios.get).toHaveBeenCalledWith('/api/patterns/daily?level=B2&count=10');
        });
    });
});
