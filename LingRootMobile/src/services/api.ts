import axios from 'axios';
import { TTSRequest, TTSResponse, APIResponse } from '../types';

// Backend URL'i environment variables'dan alacağız
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

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
  (config) => {
    // Burada kullanıcı token'ını header'a ekleyebiliriz
    // const token = await AsyncStorage.getItem('auth_token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
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
}; 