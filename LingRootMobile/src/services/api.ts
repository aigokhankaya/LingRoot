import axios from 'axios';
import { TTSRequest, TTSResponse, APIResponse } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend URL'i environment variables'dan alacağız
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.4:5001';

// Debug: API URL'sini kontrol et
console.log('🔧 [API DEBUG]');
console.log('EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
console.log('API_BASE_URL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 saniye timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - authentication token eklemek için
apiClient.interceptors.request.use(
  async (config) => {
    // Backend JWT token'ını AsyncStorage'dan al
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔧 [API DEBUG] Token added to request:', token.substring(0, 20) + '...');
      } else {
        console.log('🔧 [API DEBUG] No token found in AsyncStorage');
      }
    } catch (error) {
      console.warn('Token alınamadı:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // Token expired handling
    if (error.response?.status === 401 || 
        error.response?.data?.message === 'Token expired' ||
        error.response?.data?.message === 'Unauthorized') {
      
      console.log('🔧 [API DEBUG] Token expired, clearing auth data');
      
      // Clear expired token and user data
      try {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user_data');
      } catch (clearError) {
        console.error('Error clearing auth data:', clearError);
      }
      
      // You might want to redirect to login here or emit an event
      // For now, just log the expiration
      console.log('🔧 [API DEBUG] User needs to login again');
    }
    
    return Promise.reject(error);
  }
);

export const apiService = {
  // Text-to-Speech API
  async processTextToSpeech(request: TTSRequest): Promise<TTSResponse> {
    try {
      const response = await apiClient.post<TTSResponse>('/api/tts/process', request);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'TTS işlemi başarısız');
    }
  },

  // File Upload için TTS
  async processFileToSpeech(file: FormData): Promise<TTSResponse> {
    try {
      const response = await apiClient.post<TTSResponse>('/api/tts/process', file, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Dosya TTS işlemi başarısız');
    }
  },

  // Kullanıcı profili güncelleme
  async updateProfile(userId: string, data: any): Promise<APIResponse> {
    try {
      const response = await apiClient.put<APIResponse>(`/api/users/${userId}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Profil güncellenemedi');
    }
  },

  // Kullanıcının audio geçmişini getirme
  async getUserAudioHistory(userId: string): Promise<APIResponse> {
    try {
      const response = await apiClient.get<APIResponse>(`/api/users/${userId}/audio-history`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Geçmiş yüklenemedi');
    }
  },

  // Health check
  async healthCheck(): Promise<APIResponse> {
    try {
      const response = await apiClient.get<APIResponse>('/api/health');
      return response.data;
    } catch (error: any) {
      throw new Error('API bağlantısı başarısız');
    }
  },

  // Konu önerileri alma
  async getTopicSuggestions(topic: string, level: string): Promise<any> {
    try {
      const response = await apiClient.post('/api/topic-detail/suggestions', {
        topic,
        level,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Konu önerileri alınamadı');
    }
  },

  // Mevcut sesleri getirme
  async getAvailableVoices(): Promise<APIResponse> {
    try {
      const response = await apiClient.get<APIResponse>('/api/tts/voices');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Sesler yüklenemedi');
    }
  },

  // Filtrelenmiş sesleri getirme
  async getFilteredVoices(accent?: string, gender?: string, emotion?: string): Promise<APIResponse> {
    try {
      const params = new URLSearchParams();
      if (accent) params.append('accent', accent);
      if (gender) params.append('gender', gender);
      if (emotion) params.append('emotion', emotion);
      
      const response = await apiClient.get<APIResponse>(`/api/tts/voices/filter?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Filtrelenmiş sesler yüklenemedi');
    }
  },
}; 