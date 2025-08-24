import axios from 'axios';
import { TTSRequest, TTSResponse, APIResponse, BookSearchResponse, BookChapter } from '../types';
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

// Render hibernation handling
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let lastBackendAwakeAt: number | null = null;

async function wakeBackendIfNeeded(force: boolean = false): Promise<boolean> {
  try {
    // If we recently confirmed it's awake, skip
    if (!force && lastBackendAwakeAt && Date.now() - lastBackendAwakeAt < 120000) {
      return true;
    }

    const healthUrl = `${API_BASE_URL}/api/health`;
    const res = await fetch(healthUrl, { method: 'GET' });
    if (res.ok) {
      lastBackendAwakeAt = Date.now();
      return true;
    }

    // Render hibernation returns 503 dynamic-hibernate-error-503
    if (res.status !== 503) {
      return false;
    }

    // Try to wake by polling a few times with backoff
    for (let attempt = 1; attempt <= 6; attempt++) {
      const delay = 800 * attempt + 400;
      console.log(`🔧 [API DEBUG] Backend waking... attempt ${attempt}/6, waiting ${delay}ms`);
      await sleep(delay);
      try {
        const ping = await fetch(healthUrl, { method: 'GET' });
        if (ping.ok) {
          console.log('🔧 [API DEBUG] Backend is awake.');
          lastBackendAwakeAt = Date.now();
          return true;
        }
      } catch {}
    }
    return false;
  } catch {
    return false;
  }
}

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
    
    // If backend hibernated (Render 503), try waking and retry once
    if (error.response?.status === 503 && error.config && !(error.config as any).__wakeRetry) {
      console.log('🔧 [API DEBUG] 503 detected. Trying to wake backend and retry...');
      const woke = await wakeBackendIfNeeded(true);
      if (woke) {
        (error.config as any).__wakeRetry = true;
        try {
          return await apiClient.request(error.config);
        } catch (retryErr) {
          console.error('🔧 [API DEBUG] Retry after wake failed:', retryErr?.message);
        }
      }
    }
    
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
      
      // Attempt to wake backend if sleeping
      const woke = await wakeBackendIfNeeded(false);
      if (woke) {
        console.log('🔧 [API DEBUG] ✅ Backend is awake (pre-check).');
        console.log('🔧 [API DEBUG] ==================');
        return true;
      }

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
      await wakeBackendIfNeeded();
      const response = await apiClient.post<TTSResponse>('/api/tts/process', request, {
        // Büyük metinlerde çeviri/uyarlama+TTS uzun sürebilir
        timeout: 600000, // 10 dakika
      });
      return response.data;
    } catch (error: any) {
      const code = error?.response?.data?.code;
      if (code === 'USAGE_LIMIT_EXCEEDED') {
        throw new Error('Paket kullanım sınırınız aşıldı. Lütfen paket yükseltin veya sonraki dönemi bekleyin.');
      }
      throw new Error(error.response?.data?.message || 'TTS işlemi başarısız');
    }
  },

  // File Upload için TTS
  async processFileToSpeech(file: FormData): Promise<TTSResponse> {
    try {
      await wakeBackendIfNeeded();
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
  async getUserAudioHistory(userId: string, page?: number, limit?: number): Promise<APIResponse> {
    try {
      const params = new URLSearchParams();
      if (page && page > 0) params.append('page', String(page));
      if (limit && limit > 0) params.append('limit', String(limit));
      const qs = params.toString();
      const url = qs ? `/api/users/${userId}/audio-history?${qs}` : `/api/users/${userId}/audio-history`;
      const response = await apiClient.get<APIResponse>(url);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Geçmiş yüklenemedi');
    }
  },

  // Tekil içerik kaydı (kullanıcının) - input/original metin için
  async getUserContentById(id: string): Promise<APIResponse> {
    try {
      const response = await apiClient.get<APIResponse>(`/api/users/content/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'İçerik yüklenemedi');
    }
  },

  // Forgot password (email)
  async forgotPassword(email: string): Promise<APIResponse> {
    const response = await apiClient.post<APIResponse>(`/api/auth/forgot-password`, { email });
    return response.data;
  },

  // Reset password with code
  async resetPassword(email: string, code: string, newPassword: string): Promise<APIResponse> {
    const response = await apiClient.post<APIResponse>(`/api/auth/reset-password`, { email, code, newPassword });
    return response.data;
  },

  // Fast count endpoint
  async getUserAudioCount(userId: string): Promise<number | null> {
    try {
      const response = await apiClient.get(`/api/users/${userId}/audio-count`);
      if (response.data?.success) return typeof response.data.count === 'number' ? response.data.count : 0;
      return null;
    } catch (e) {
      console.warn('getUserAudioCount failed:', e);
      return null;
    }
  },

  // Favorites
  async getUserFavorites(): Promise<string[]> {
    try {
      const response = await apiClient.get('/api/user-favorites');
      return response.data?.data || [];
    } catch (e) {
      console.warn('getUserFavorites failed:', e);
      return [];
    }
  },

  async saveUserFavorites(ids: string[]): Promise<boolean> {
    try {
      const response = await apiClient.post('/api/user-favorites', { ids });
      return !!response.data?.success;
    } catch (e) {
      console.warn('saveUserFavorites failed:', e);
      return false;
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

  // Narration rewrite (like web): turn a topic/suggestion into a full narration text
  async rewriteToNarration(inputText: string, level: string): Promise<{ success: boolean; data?: { narration_text: string } }> {
    try {
      const response = await apiClient.post('/api/narration/rewrite', {
        input_text: inputText,
        level,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Öneri metne dönüştürülemedi');
    }
  },

  // Books API
  async searchBooks(params: { q?: string; title?: string; author?: string; page?: number; per_page?: number }): Promise<BookSearchResponse> {
    try {
      const sp = new URLSearchParams();
      if (params.q && params.q.trim()) sp.append('q', params.q.trim());
      if (params.title && params.title.trim()) sp.append('title', params.title.trim());
      if (params.author && params.author.trim()) sp.append('author', params.author.trim());
      if (params.page) sp.append('page', String(params.page));
      if (params.per_page) sp.append('per_page', String(params.per_page));
      if (!sp.toString()) {
        throw new Error('En az bir arama kriteri gerekli');
      }
      const response = await apiClient.get(`/api/books/search?${sp.toString()}`);
      return response.data as BookSearchResponse;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Kitap arama başarısız');
    }
  },

  async getBookChapters(bookId: number): Promise<BookChapter[]> {
    try {
      const response = await apiClient.get(`/api/books/${bookId}/chapters`);
      return response.data as BookChapter[];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Bölümler alınamadı');
    }
  },

  async getBookChapter(bookId: number, chapterId: number): Promise<BookChapter & { book_title?: string; book_authors?: string }> {
    try {
      const response = await apiClient.get(`/api/books/${bookId}/chapters/${chapterId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Bölüm alınamadı');
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