/**
 * Topic API Module Tests
 * 
 * Unit tests for the Topic API endpoints
 */

import { createTopicApi, TopicApi } from '../endpoints/topic';
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

describe('TopicApi', () => {
    let mockAxios: jest.Mocked<AxiosInstance>;
    let topicApi: TopicApi;

    beforeEach(() => {
        mockAxios = createMockAxios();
        topicApi = createTopicApi(mockAxios);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getTree', () => {
        it('should fetch topic tree successfully', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    topics: [
                        { id: '1', title: 'Topic 1', children: [] },
                        { id: '2', title: 'Topic 2', children: [] },
                    ],
                    total: 2,
                },
            };
            mockAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await topicApi.getTree();

            expect(mockAxios.get).toHaveBeenCalledWith('/api/topic-hierarchy/topics/tree');
            expect(result.success).toBe(true);
            expect(result.topics).toHaveLength(2);
            expect(result.total).toBe(2);
        });

        it('should handle error when fetching topic tree', async () => {
            mockAxios.get.mockRejectedValueOnce(new Error('Network error'));

            await expect(topicApi.getTree()).rejects.toThrow('Network error');
        });
    });

    describe('createTopic', () => {
        it('should create a new topic successfully', async () => {
            const params = { title: 'New Topic', description: 'Test description', level: 'B1' };
            const mockResponse = {
                data: {
                    success: true,
                    topic: { id: '123', ...params },
                },
            };
            mockAxios.post.mockResolvedValueOnce(mockResponse);

            const result = await topicApi.createTopic(params);

            expect(mockAxios.post).toHaveBeenCalledWith('/api/topic-hierarchy/topics', params);
            expect(result.success).toBe(true);
            expect(result.topic.title).toBe('New Topic');
        });
    });

    describe('generateSubtopics', () => {
        it('should generate subtopics for a topic', async () => {
            const topicId = 'parent-123';
            const params = { count: 5, language: 'en' };
            const mockResponse = {
                data: {
                    success: true,
                    subtopics: [
                        { id: 'sub-1', title: 'Subtopic 1' },
                        { id: 'sub-2', title: 'Subtopic 2' },
                    ],
                },
            };
            mockAxios.post.mockResolvedValueOnce(mockResponse);

            const result = await topicApi.generateSubtopics(topicId, params);

            expect(mockAxios.post).toHaveBeenCalledWith(
                `/api/topic-hierarchy/topics/${topicId}/subtopics`,
                params
            );
            expect(result.success).toBe(true);
            expect(result.subtopics).toHaveLength(2);
        });
    });

    describe('deleteTopic', () => {
        it('should delete a topic and its children', async () => {
            const topicId = 'topic-to-delete';
            const mockResponse = { data: { success: true } };
            mockAxios.delete.mockResolvedValueOnce(mockResponse);

            const result = await topicApi.deleteTopic(topicId);

            expect(mockAxios.delete).toHaveBeenCalledWith(
                `/api/topic-hierarchy/topics/${topicId}`
            );
            expect(result.success).toBe(true);
        });
    });

    describe('getSuggestions', () => {
        it('should get topic suggestions', async () => {
            const topic = 'Artificial Intelligence';
            const language = 'en';
            const mockResponse = {
                data: {
                    success: true,
                    suggestions: ['Machine Learning', 'Neural Networks', 'Deep Learning'],
                },
            };
            mockAxios.post.mockResolvedValueOnce(mockResponse);

            const result = await topicApi.getSuggestions(topic, language);

            expect(mockAxios.post).toHaveBeenCalledWith(
                '/api/topic-pipeline/suggestions',
                { topic, language }
            );
            expect(result.success).toBe(true);
            expect(result.suggestions).toHaveLength(3);
        });
    });
});
