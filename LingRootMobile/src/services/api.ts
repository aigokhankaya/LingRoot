import axios from 'axios';
import { TTSRequest, TTSResponse, APIResponse } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Backend URL'i expo constants'tan alacağız
// Production API URL'si kullanılıyor
// Web projesiyle aynı yapı: base URL + /api/ endpoint
const API_BASE_URL = 'https://lingloops-backend.onrender.com';

// Debug: API URL'sini kontrol et
console.log('🔧 [API DEBUG] ==================');
console.log('🔧 [API DEBUG] Constants.expoConfig:', Constants.expoConfig);
console.log('🔧 [API DEBUG] Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
console.log('🔧 [API DEBUG] EXPO_PUBLIC_API_URL:', Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL);
console.log('🔧 [API DEBUG] Final API_BASE_URL:', API_BASE_URL);
console.log('🔧 [API DEBUG] ==================');

// Global unauthorized handler to notify app on 401/expired token
let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  unauthorizedHandler = handler;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000, // 3 dakika timeout (Render.com cold start için)
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
      
      // Notify app to update auth state (navigate to login)
      try {
        if (unauthorizedHandler) {
          unauthorizedHandler();
        }
      } catch (notifyError) {
        console.error('Error notifying unauthorized handler:', notifyError);
      }

      console.log('🔧 [API DEBUG] User needs to login again');
    }
    
    return Promise.reject(error);
  }
);

export const apiService = {
  // Network connectivity check
  async checkConnectivity(): Promise<boolean> {
    try {
      console.log('🔧 [API DEBUG] ==================');
      console.log('🔧 [API DEBUG] Testing connectivity to:', API_BASE_URL);
      console.log('🔧 [API DEBUG] Full health check URL:', `${API_BASE_URL}/api/health`);
      console.log('🔧 [API DEBUG] User Agent:', navigator.userAgent);
      console.log('🔧 [API DEBUG] Online status:', navigator.onLine);
      console.log('🔧 [API DEBUG] Platform:', navigator.platform);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('🔧 [API DEBUG] Request timeout after 60 seconds');
        controller.abort();
      }, 60000);
      
      console.log('🔧 [API DEBUG] Fetch request başlatılıyor...');
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'LingRootMobile/1.0',
        },
        mode: 'cors',
        credentials: 'omit',
      });
      
      clearTimeout(timeoutId);
      
      console.log('🔧 [API DEBUG] Response received!');
      console.log('🔧 [API DEBUG] Response status:', response.status);
      console.log('🔧 [API DEBUG] Response ok:', response.ok);
      console.log('🔧 [API DEBUG] Response statusText:', response.statusText);
      console.log('🔧 [API DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const responseText = await response.text();
        console.log('🔧 [API DEBUG] Response body:', responseText);
        console.log('🔧 [API DEBUG] ✅ Backend connection successful!');
        console.log('🔧 [API DEBUG] ==================');
        return true;
      } else {
        const errorText = await response.text();
        console.log('🔧 [API DEBUG] Error response text:', errorText);
        console.log('🔧 [API DEBUG] ❌ Backend returned error status:', response.status);
        console.log('🔧 [API DEBUG] ==================');
        return false;
      }
    } catch (error: any) {
      console.log('🔧 [API DEBUG] ==================');
      console.error('🔧 [API DEBUG] ❌ Connectivity test failed!');
      console.error('🔧 [API DEBUG] Error type:', error.name);
      console.error('🔧 [API DEBUG] Error message:', error.message);
      console.error('🔧 [API DEBUG] Error code:', error.code);
      console.error('🔧 [API DEBUG] Error stack:', error.stack);
      
      // Provide specific error messages for common issues
      if (error.name === 'AbortError') {
        console.error('🔧 [API DEBUG] Request was aborted due to timeout');
      } else if (error.message.includes('Network request failed')) {
        console.error('🔧 [API DEBUG] Network request failed - check internet connection');
      } else if (error.message.includes('fetch')) {
        console.error('🔧 [API DEBUG] Fetch API error - possible CORS or network issue');
      } else if (error.message.includes('TypeError')) {
        console.error('🔧 [API DEBUG] TypeError - possible network or URL issue');
      }
      
      console.log('🔧 [API DEBUG] ==================');
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

  // Tüm içerik geçmişini getirme (limit yok) - sadece gerekirse kullanılmalı
  async getFullContentHistory(): Promise<APIResponse> {
    try {
      const response = await apiClient.get<APIResponse>(`/api/content/history`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'İçerik geçmişi alınamadı');
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
      // "all" değerlerini göndermeyelim; backend'de bunlar filtre olarak algılanmamalı
      if (accent && accent !== 'all') params.append('accent', accent);
      if (gender && gender !== 'all') params.append('gender', gender);
      if (emotion && emotion !== 'all') params.append('emotion', emotion);
      if (category && category !== 'all') params.append('category', category);

      const url = `/api/tts/voices/filter?${params.toString()}`;
      console.log('🎯 [VOICE FILTER DEBUG] Requesting:', url);
      const response = await apiClient.get(url);
      console.log('🎯 [VOICE FILTER DEBUG] Response keys:', Object.keys(response.data || {}));
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

// User settings API
export const getUserSettings = async (): Promise<{ default_voice?: string; settings?: any }> => {
  try {
    const response = await apiClient.get('/api/user-settings');
    return response.data.data || {};
  } catch (error) {
    console.error('📱 [API] Error getting user settings:', error);
    // Local fallback: read from AsyncStorage if backend route missing/unavailable
    try {
      const localDefaultVoice = await AsyncStorage.getItem('default_voice_local');
      if (localDefaultVoice) {
        return { default_voice: localDefaultVoice } as any;
      }
    } catch {}
    return {};
  }
};

export const saveDefaultVoiceSetting = async (voice: string): Promise<void> => {
  try {
    await apiClient.post('/api/user-settings/default-voice', { voice });
    console.log('📱 [API] Default voice saved:', voice);
  } catch (error) {
    console.error('📱 [API] Error saving default voice (will store locally):', error);
    // Store locally so UX works even if backend route missing
    try {
      await AsyncStorage.setItem('default_voice_local', voice);
      console.log('📱 [API] Default voice stored locally:', voice);
    } catch {}
    // Do not throw to allow UI to proceed
  }
};