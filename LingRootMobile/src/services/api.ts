import axios from 'axios';
import { TTSRequest, TTSResponse, APIResponse } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend URL'i environment variables'dan alacağız
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.7:5001';

// Debug: API URL'sini kontrol et
console.log('🔧 [API DEBUG]');
console.log('EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
console.log('API_BASE_URL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 dakika timeout (PDF işleme için)
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
    console.error('🚨 [API ERROR] Error message:', error.message);
    console.error('🚨 [API ERROR] Status:', error.response?.status);
    console.error('🚨 [API ERROR] Status text:', error.response?.statusText);
    console.error('🚨 [API ERROR] Response data:', error.response?.data);
    console.error('🚨 [API ERROR] Request URL:', error.config?.url);
    console.error('🚨 [API ERROR] Request method:', error.config?.method);
    
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
  // Network connectivity check
  async checkConnectivity(): Promise<boolean> {
    try {
      console.log('🔧 [API DEBUG] Testing connectivity to:', API_BASE_URL);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_BASE_URL}/healthz`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const isConnected = response.ok;
      console.log('🔧 [API DEBUG] Connectivity test result:', isConnected);
      return isConnected;
    } catch (error: any) {
      console.error('🔧 [API DEBUG] Connectivity test failed:', error.message);
      return false;
    }
  },

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
        timeout: 300000, // 5 dakika timeout (dosya işleme uzun sürebilir)
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
  async getFilteredVoices(accent?: string, gender?: string, emotion?: string, category?: string): Promise<APIResponse> {
    try {
      const params = new URLSearchParams();
      if (accent) params.append('accent', accent);
      if (gender) params.append('gender', gender);
      if (emotion) params.append('emotion', emotion);
      if (category) params.append('category', category);
      
      const response = await apiClient.get<APIResponse>(`/api/tts/voices/filter?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Filtrelenmiş sesler yüklenemedi');
    }
  },
}; 

// Vocabulary API functions
export interface VocabularyWord {
  id?: number;
  word: string;
  original_word?: string;
  definition?: string;
  example_sentence?: string;
  example_sentence_turkish?: string;
  notes?: string;
  level?: string;
  is_learned?: boolean;
  original_sentence?: string;
  created_at?: string;
  updated_at?: string;
}

export const getVocabulary = async (): Promise<VocabularyWord[]> => {
  try {
    console.log('🔧 [API DEBUG] Fetching vocabulary...');
    const response = await apiClient.get('/api/vocabulary');
    console.log('🔧 [API DEBUG] Vocabulary response:', response.data);
    return response.data.success ? response.data.data : [];
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    throw error;
  }
};

export const addWordToVocabulary = async (
  word: string, 
  definition?: string, 
  sentence?: string, 
  level?: string
): Promise<VocabularyWord> => {
  try {
    console.log('🔧 [API DEBUG] Adding word to vocabulary:', { word, definition, sentence, level });
    const response = await apiClient.post('/api/vocabulary/add', {
      word,
      definition,
      example_sentence: sentence,
      level: level?.toUpperCase(),
    });
    console.log('🔧 [API DEBUG] Add word response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Error adding word to vocabulary:', error);
    throw error;
  }
};

// Kelime çevirisi ile birlikte ekleme (Web tarafındaki gibi)
export const addWordWithTranslation = async (
  word: string, 
  context: string, 
  level?: string,
  originalSentence?: string
): Promise<{
  data: VocabularyWord;
  message: string;
  isExisting: boolean;
  translationError?: boolean;
}> => {
  try {
    console.log('🔧 [API DEBUG] Adding word with translation:', { word, context, level, originalSentence });
    const response = await apiClient.post('/api/vocabulary/add-with-translation', {
      word,
      context,
      level,
      originalSentence
    });
    console.log('🔧 [API DEBUG] Add word with translation response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error adding word with translation:', error);
    throw error;
  }
};

export const deleteWordFromVocabulary = async (wordId: number): Promise<void> => {
  try {
    console.log('🔧 [API DEBUG] Deleting word from vocabulary:', wordId);
    const response = await apiClient.delete(`/api/vocabulary/${wordId}`);
    console.log('🔧 [API DEBUG] Delete word response:', response.data);
  } catch (error) {
    console.error('Error deleting word from vocabulary:', error);
    throw error;
  }
};

export const updateWordInVocabulary = async (
  wordId: number, 
  updates: Partial<VocabularyWord>
): Promise<VocabularyWord> => {
  try {
    console.log('🔧 [API DEBUG] Updating word in vocabulary:', wordId, updates);
    const response = await apiClient.put(`/api/vocabulary/${wordId}`, updates);
    console.log('🔧 [API DEBUG] Update word response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Error updating word in vocabulary:', error);
    throw error;
  }
};

// Reminder Settings API  
export interface ReminderSettings {
  wordsPerDay: number;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
}

export const getReminderSettings = async (): Promise<ReminderSettings> => {
  try {
    const response = await apiClient.get('/api/reminder-settings');
    return response.data.data;
  } catch (error) {
    console.error('📱 [API] Error getting reminder settings:', error);
    // Return default settings if API fails
    return {
      wordsPerDay: 5,
      startTime: '09:00',
      endTime: '18:00',
      isEnabled: true
    };
  }
};

export const saveReminderSettings = async (settings: ReminderSettings): Promise<void> => {
  try {
    await apiClient.post('/api/reminder-settings', settings);
    console.log('📱 [API] Reminder settings saved successfully:', settings);
  } catch (error) {
    console.error('📱 [API] Error saving reminder settings:', error);
    throw new Error('Ayarlar kaydedilemedi');
  }
}; 