import axios from 'axios';
import { api } from '../api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        data: {
          token: 'mock-token',
          user: {
            id: 1,
            email: 'test@example.com',
            name: 'Test User'
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await api.login('test@example.com', 'password123');

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle login error correctly', async () => {
      const mockError = new Error('Invalid credentials');
      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(api.login('test@example.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
    });

    it('should register user successfully', async () => {
      const mockResponse = {
        data: {
          message: 'User registered successfully',
          user: {
            id: 1,
            email: 'new@example.com',
            name: 'New User'
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await api.register('new@example.com', 'password123', 'New User');

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Content Management', () => {
    it('should fetch user content successfully', async () => {
      const mockResponse = {
        data: {
          content: [
            { id: 1, title: 'Test Content 1', type: 'text' },
            { id: 2, title: 'Test Content 2', type: 'youtube' }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await api.getUserContent();

      expect(mockedAxios.get).toHaveBeenCalledWith('/content/user');
      expect(result).toEqual(mockResponse.data.content);
    });

    it('should create content successfully', async () => {
      const mockResponse = {
        data: {
          id: 1,
          title: 'New Content',
          type: 'text',
          content: 'Test content'
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const contentData = {
        title: 'New Content',
        type: 'text',
        content: 'Test content'
      };

      const result = await api.createContent(contentData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/content', contentData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle content creation error', async () => {
      const mockError = new Error('Content creation failed');
      mockedAxios.post.mockRejectedValueOnce(mockError);

      const contentData = {
        title: 'New Content',
        type: 'text',
        content: 'Test content'
      };

      await expect(api.createContent(contentData)).rejects.toThrow('Content creation failed');
    });
  });

  describe('Text-to-Speech', () => {
    it('should process TTS request successfully', async () => {
      const mockResponse = {
        data: {
          audioUrl: 'https://example.com/audio.mp3',
          duration: 120,
          transcript: 'Test transcript'
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const ttsData = {
        text: 'Hello world',
        language: 'en',
        voice: 'male'
      };

      const result = await api.processTextToSpeech(ttsData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/tts', ttsData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle TTS processing error', async () => {
      const mockError = new Error('TTS processing failed');
      mockedAxios.post.mockRejectedValueOnce(mockError);

      const ttsData = {
        text: 'Hello world',
        language: 'en',
        voice: 'male'
      };

      await expect(api.processTextToSpeech(ttsData)).rejects.toThrow('TTS processing failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValueOnce(networkError);

      await expect(api.getUserContent()).rejects.toThrow('Network Error');
    });

    it('should handle 401 unauthorized errors', async () => {
      const unauthorizedError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      };
      mockedAxios.get.mockRejectedValueOnce(unauthorizedError);

      await expect(api.getUserContent()).rejects.toEqual(unauthorizedError);
    });
  });
}); 