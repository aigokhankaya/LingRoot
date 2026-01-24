import {
    getTopicTree,
    createPodcast,
    getNotifications,
    getUnreadNotificationCount,
    lookupVocabularyWord
} from '../api';
import { apiClient } from '../apiClient';

// Mock apiClient
jest.mock('../apiClient', () => ({
    apiClient: {
        topic: {
            getTree: jest.fn(),
            createTopic: jest.fn(),
            getSuggestions: jest.fn(),
        },
        tts: {
            createPodcast: jest.fn(),
            process: jest.fn(),
        },
        notification: {
            getAll: jest.fn(),
            getUnreadCount: jest.fn(),
            markAsRead: jest.fn(),
        },
        vocabulary: {
            lookup: jest.fn(),
        },
        content: {
            getHistory: jest.fn(),
        },
        http: {
            post: jest.fn(),
            get: jest.fn(),
        }
    }
}));

describe('Frontend API Wrapper Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Topic API', () => {
        it('getTopicTree should return formatted response on success', async () => {
            const mockData = { topics: [{ id: '1', title: 'Test' }], total: 1 };
            (apiClient.topic.getTree as jest.Mock).mockResolvedValue(mockData);

            const result = await getTopicTree();

            expect(apiClient.topic.getTree).toHaveBeenCalled();
            expect(result).toEqual({ success: true, data: mockData });
        });

        it('getTopicTree should return error object on failure', async () => {
            (apiClient.topic.getTree as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await getTopicTree();

            expect(result.success).toBe(false);
            expect(result.data.topics).toEqual([]);
            expect(result.message).toBe('Network error');
        });
    });

    describe('TTS/Podcast API', () => {
        it('createPodcast should return result on success', async () => {
            const mockResponse = { success: true, podcast_url: 'http://test.com/audio.mp3' };
            (apiClient.tts.createPodcast as jest.Mock).mockResolvedValue(mockResponse);

            const result = await createPodcast({ topic: 'Space' });

            expect(apiClient.tts.createPodcast).toHaveBeenCalledWith({ topic: 'Space' });
            expect(result).toEqual(mockResponse);
        });

        it('createPodcast should handle errors', async () => {
            (apiClient.tts.createPodcast as jest.Mock).mockRejectedValue(new Error('Failed'));

            const result = await createPodcast({ topic: 'Error' });

            expect(result).toEqual({ success: false, message: 'Failed' });
        });
    });

    describe('Notification API', () => {
        it('getNotifications should format response correctly', async () => {
            const mockResponse = { notifications: [{ id: '1', message: 'Hi' }], unreadCount: 5 };
            (apiClient.notification.getAll as jest.Mock).mockResolvedValue(mockResponse);

            const result = await getNotifications(10, 0, false);

            expect(apiClient.notification.getAll).toHaveBeenCalledWith({ limit: 10, offset: 0, unreadOnly: false });
            expect(result).toEqual({
                success: true,
                data: mockResponse.notifications,
                unreadCount: mockResponse.unreadCount
            });
        });

        it('getUnreadNotificationCount should return count', async () => {
            (apiClient.notification.getUnreadCount as jest.Mock).mockResolvedValue({ count: 3 });

            const result = await getUnreadNotificationCount();

            expect(apiClient.notification.getUnreadCount).toHaveBeenCalled();
            expect(result).toEqual({ success: true, unreadCount: 3 });
        });
    });

    describe('Vocabulary API', () => {
        it('lookupVocabularyWord should return word data', async () => {
            const mockWord = { word: 'apple', definition: 'fruit' };
            (apiClient.vocabulary.lookup as jest.Mock).mockResolvedValue(mockWord);

            const result = await lookupVocabularyWord('apple');

            expect(apiClient.vocabulary.lookup).toHaveBeenCalledWith('apple');
            expect(result).toEqual(mockWord);
        });
    });
});
