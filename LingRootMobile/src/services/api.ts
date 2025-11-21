import axios from 'axios';
import { TTSRequest, TTSResponse, APIResponse, BookSearchResponse, BookChapter } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from './environmentConfig';
import { EXPO_PUBLIC_MFA_API_URL } from '@env';

// Backend URL - Will be set dynamically based on environment setting
let API_BASE_URL = 'https://lingloops-backend.onrender.com';
let MFA_API_BASE_URL = 'https://lingloops-backend.onrender.com'; // Default to same as main API

// Initialize API base URL from environment config
getApiBaseUrl().then(url => {
  API_BASE_URL = url;
  console.log('🔗 API_BASE_URL initialized:', API_BASE_URL);
  // Update axios client baseURL
  apiClient.defaults.baseURL = API_BASE_URL;
}).catch(err => {
  console.error('❌ Failed to initialize API_BASE_URL:', err);
});

// Initialize MFA API base URL from environment config (if separate URL is provided)
if (EXPO_PUBLIC_MFA_API_URL) {
  MFA_API_BASE_URL = EXPO_PUBLIC_MFA_API_URL;
  console.log('🔐 MFA_API_BASE_URL initialized:', MFA_API_BASE_URL);
  console.log('📍 MFA requests will go to: CLOUDFLARE TUNNEL');
} else {
  console.log('🔐 MFA_API_BASE_URL using default (same as API_BASE_URL)');
  console.log('📍 MFA requests will go to: NORMAL BACKEND');
}

// Debug logs removed for production cleanliness

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
      await sleep(delay);
      try {
        const ping = await fetch(healthUrl, { method: 'GET' });
        if (ping.ok) {
          lastBackendAwakeAt = Date.now();
          return true;
        }
      } catch { }
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

// MFA API client - uses separate base URL for MFA operations
const mfaApiClient = axios.create({
  baseURL: MFA_API_BASE_URL,
  timeout: 60000, // 1 dakika timeout (lokal tunnel için)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to get current API base URL
export const getCurrentApiBaseUrl = () => API_BASE_URL;
export const getMfaApiBaseUrl = () => MFA_API_BASE_URL;

// Simple single-flight refresh lock
let refreshPromise: Promise<void> | null = null;
async function performTokenRefresh(): Promise<void> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) throw new Error('no_refresh_token');
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Allow either body or Authorization; we use body here
        },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body?.message || '').toString().toLowerCase();
        throw new Error(msg || `refresh_failed_${res.status}`);
      }
      const body = await res.json();
      const newAccess = body?.data?.token;
      const newRefresh = body?.data?.refreshToken;
      if (!newAccess || !newRefresh) throw new Error('invalid_refresh_response');
      await AsyncStorage.setItem('auth_token', newAccess);
      await AsyncStorage.setItem('refresh_token', newRefresh);
    } finally {
      // Reset lock after completion (success or failure)
      const _ = refreshPromise; // keep ref to avoid race
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

// Track if we've shown the token warning to avoid spam
let tokenWarningShown = false;

// Request interceptor - authentication token eklemek için
apiClient.interceptors.request.use(
  async (config) => {
    // Backend JWT token'ını AsyncStorage'dan al
    try {
      const token = await AsyncStorage.getItem('auth_token');
      // Reduced logging - only log when token is missing
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // Only log once per session to avoid spam
        if (!tokenWarningShown) {
          console.log('⚠️ [API INTERCEPTOR] No token found - user may need to login');
          tokenWarningShown = true;
        }
      }
      // Log normal API requests (only for non-health endpoints to reduce noise)
      if (config.url && !config.url.includes('/health')) {
        console.log(`🌐 [API REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
        console.log(`📍 [API REQUEST] Target: ${API_BASE_URL}`);
      }
    } catch (error) {
      console.error('❌ [API INTERCEPTOR] Error getting token:', error);
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

    // If backend hibernated (Render 503), try waking and retry once
    if (error.response?.status === 503 && error.config && !(error.config as any).__wakeRetry) {
      const woke = await wakeBackendIfNeeded(true);
      if (woke) {
        (error.config as any).__wakeRetry = true;
        try {
          return await apiClient.request(error.config);
        } catch (retryErr: any) {

        }
      }
    }

    // Token error handling: only act on explicit token problems
    if (error.response?.status === 401) {
      const msg = (error.response?.data?.message || '').toString();
      const isExplicitTokenProblem =
        msg.toLowerCase().includes('token expired') ||
        msg.toLowerCase().includes('invalid token');

      if (isExplicitTokenProblem && error.config && !(error.config as any).__retryAfterRefresh) {
        // Attempt refresh once
        try {
          await performTokenRefresh();
          const newToken = await AsyncStorage.getItem('auth_token');
          if (newToken) {
            (error.config as any).__retryAfterRefresh = true;
            error.config.headers = error.config.headers || {};
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return await apiClient.request(error.config);
          }
        } catch (refreshErr) {
          // If refresh fails, clear and notify
          try {
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('user_data');
            await AsyncStorage.removeItem('refresh_token');
          } catch { }
          try {
            if (unauthorizedHandler) unauthorizedHandler();
          } catch { }
        }
      } else if (isExplicitTokenProblem) {
        // Already retried or no config -> clear and notify
        try {
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user_data');
          await AsyncStorage.removeItem('refresh_token');
        } catch { }
        try {
          if (unauthorizedHandler) unauthorizedHandler();
        } catch { }
      }
    }

    return Promise.reject(error);
  }
);

// MFA API client interceptors - same auth logic as main API
mfaApiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Log MFA request destination
      console.log(`🔐 [MFA REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`📍 [MFA REQUEST] Target: ${MFA_API_BASE_URL}`);
    } catch (error) {
      console.error('❌ [MFA API INTERCEPTOR] Error getting token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

mfaApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Token error handling for MFA
    if (error.response?.status === 401) {
      const msg = (error.response?.data?.message || '').toString();
      const isExplicitTokenProblem =
        msg.toLowerCase().includes('token expired') ||
        msg.toLowerCase().includes('invalid token');

      if (isExplicitTokenProblem && error.config && !(error.config as any).__retryAfterRefresh) {
        try {
          await performTokenRefresh();
          const newToken = await AsyncStorage.getItem('auth_token');
          if (newToken) {
            (error.config as any).__retryAfterRefresh = true;
            error.config.headers = error.config.headers || {};
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return await mfaApiClient.request(error.config);
          }
        } catch (refreshErr) {
          try {
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('user_data');
            await AsyncStorage.removeItem('refresh_token');
          } catch { }
          try {
            if (unauthorizedHandler) unauthorizedHandler();
          } catch { }
        }
      }
    }

    return Promise.reject(error);
  }
);

export const apiService = {
  // Network connectivity check
  async checkConnectivity(): Promise<boolean> {
    try {

      // Attempt to wake backend if sleeping
      const woke = await wakeBackendIfNeeded(false);
      if (woke) {
        return true;
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 60000);

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



      if (response.ok) {
        const responseText = await response.text();

        return true;
      } else {
        const errorText = await response.text();
        return false;
      }
    } catch (error: any) {


      // Provide specific error messages for common issues
      if (error.name === 'AbortError') {

      } else if (error.message.includes('Network request failed')) {

      } else if (error.message.includes('fetch')) {

      } else if (error.message.includes('TypeError')) {

      }
      return false;
    }
  },

  // Text-to-Speech API (Sync)
  async processTextToSpeech(request: TTSRequest): Promise<TTSResponse> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.post<TTSResponse>('/api/tts/process', request, {
        // Büyük metinlerde çeviri/uyarlama+TTS uzun sürebilir
        timeout: 600000, // 10 dakika
      });
      return response.data;
    } catch (error: any) {
      // Network hatası kontrolü - detaylı log öncesi
      const isNetworkError = error.message === 'Network Error' || error.code === 'ERR_NETWORK';

      if (isNetworkError) {
        console.log('⚠️ [TTS] Network connection interrupted (likely backgrounded). Server processing may continue.');
      } else {
        // Detaylı hata logu (sadece network hatası değilse)
        console.error('🔴 [TTS ERROR] Full error:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          hasResponse: !!error.response,
          isTimeout: error.code === 'ECONNABORTED',
          isNetworkError: error.message === 'Network Error'
        });
      }

      const code = error?.response?.data?.code;
      if (code === 'USAGE_LIMIT_EXCEEDED') {
        throw new Error('Paket kullanım sınırınız aşıldı. Lütfen paket yükseltin veya sonraki dönemi bekleyin.');
      }

      // Timeout hatası
      if (error.code === 'ECONNABORTED') {
        throw new Error('TTS işlemi zaman aşımına uğradı. Lütfen daha kısa bir metin deneyin.');
      }

      // Network hatası
      if (error.message === 'Network Error') {
        throw new Error('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.');
      }

      throw new Error(error.response?.data?.message || 'TTS işlemi başarısız');
    }
  },

  // Text-to-Speech API (Async - with notification)
  async processTextToSpeechAsync(request: TTSRequest): Promise<{ success: boolean; jobId: string; message: string; estimatedTime: string }> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.post('/api/tts/process-async', request, {
        timeout: 30000, // 30 saniye - sadece job oluşturma için
      });
      return response.data;
    } catch (error: any) {
      console.error('🔴 [ASYNC TTS ERROR]:', error);
      throw new Error(error.response?.data?.message || 'Async TTS işlemi başlatılamadı');
    }
  },

  // File Upload için TTS (Async)
  async processFileToSpeechAsync(file: FormData): Promise<{ success: boolean; jobId: string; message: string; estimatedTime: string }> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.post('/api/tts/process-async', file, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 saniye - sadece job oluşturma için
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Async dosya TTS işlemi başlatılamadı');
    }
  },

  // Get job status
  async getJobStatus(jobId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/tts/job/${jobId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Job durumu alınamadı');
    }
  },

  // Get unread notifications
  // Get unread notifications
  async getUnreadNotifications(): Promise<any[]> {
    try {
      const response = await apiClient.get('/api/tts/notifications/unread');
      return response.data.notifications || [];
    } catch (error: any) {
      // If 404, it likely means no notifications found or endpoint not ready for this user
      if (error.response && error.response.status === 404) {
        return [];
      }
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await apiClient.post(`/api/tts/notifications/${notificationId}/read`);
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  },

  async getUsageSummary(): Promise<APIResponse<any>> {
    try {
      await wakeBackendIfNeeded();
      const res = await apiClient.get<APIResponse<any>>('/api/subscription/usage-summary');
      return res.data as any;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Kullanım bilgileri alınamadı');
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

  // Sync Feedback - Senkronizasyon test için
  async sendSyncFeedback(feedbackData: {
    trackId: string;
    currentWordIndex: number;
    currentTime: number;
    expectedWord: string;
    feedback: 'YES' | 'NO';
    wordTimings: any[];
    timestamp: string;
  }): Promise<APIResponse<any>> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.post<APIResponse<any>>('/api/tts/sync-feedback', feedbackData);
      return response.data;
    } catch (error: any) {
      console.error('Error sending sync feedback:', error);
      throw new Error(error.response?.data?.message || 'Feedback gönderilemedi');
    }
  },

  // Kullanıcı profili güncelleme
  async updateProfile(userId: string, data: any): Promise<APIResponse> {
    try {
      // Ensure backend is awake (Render cold start protection)
      await wakeBackendIfNeeded();
      const response = await apiClient.put<APIResponse>(`/api/users/${userId}`, data, {
        timeout: 60000, // 60s per-request timeout for profile update
      });
      return response.data;
    } catch (error: any) {
      const msg = error?.code === 'ECONNABORTED' ? 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.' : (error.response?.data?.message || 'Profil güncellenemedi');
      throw new Error(msg);
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
      // silent in production
      return null;
    }
  },

  // Favorites
  async getUserFavorites(): Promise<string[]> {
    try {
      const response = await apiClient.get('/api/user-favorites');
      return response.data?.data || [];
    } catch (e) {
      // silent in production
      return [];
    }
  },

  // Favorite items with full details in a single call
  async getUserFavoriteDetails(): Promise<any[]> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.get('/api/user-favorites/details');
      return response.data?.data || [];
    } catch (e) {
      // silent in production
      return [];
    }
  },

  // Current authenticated user info (used to prefill phone)
  async getMe(): Promise<any> {
    try {
      await wakeBackendIfNeeded();
      const res = await apiClient.get('/api/auth/me');
      // Backend sometimes returns { success, user } or { success, data }
      const user = res.data?.user || res.data?.data || res.data;
      return user || {};
    } catch (e: any) {
      // Return empty object on failure to avoid breaking UI
      return {};
    }
  },

  async saveUserFavorites(ids: string[]): Promise<boolean> {
    try {
      const response = await apiClient.post('/api/user-favorites', { ids });
      return !!response.data?.success;
    } catch (e) {
      // silent in production
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
      const response = await apiClient.get(url);
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

  // Resend verification email
  async resendVerificationEmail(email: string): Promise<APIResponse> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.post<APIResponse>('/api/auth/resend-verification', { email });
      return response.data;
    } catch (error: any) {
      // Return generic message to avoid user enumeration differences
      const msg = error.response?.data?.message || 'Eğer e-posta adresi kayıtlı ise aktivasyon maili gönderildi.';
      throw new Error(msg);
    }
  },

  // Apple IAP receipt verification
  async verifyAppleReceipt(receiptData: string, productId: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.post('/api/iap/apple/verify', { receiptData, productId });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Abonelik doğrulaması başarısız';
      throw new Error(msg);
    }
  },

  // Google Play IAP purchase verification
  async verifyGooglePlayPurchase(purchaseToken: string, productId: string, packageName: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.post('/api/iap/google/verify', { purchaseToken, productId, packageName });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Abonelik doğrulaması başarısız';
      throw new Error(msg);
    }
  },

  // Get subscription plans (public endpoint)
  async getSubscriptionPlans(): Promise<{ success: boolean; data?: any[] }> {
    try {
      const response = await apiClient.get('/api/subscription/plans');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Paketler yüklenemedi';
      throw new Error(msg);
    }
  },

  // Account deletion endpoints
  async getAccountDeletionInfo(): Promise<{ success: boolean; data?: any }> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.get('/api/account/deletion-info');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Hesap bilgileri alınamadı';
      throw new Error(msg);
    }
  },

  async deleteAccount(): Promise<{ success: boolean; message?: string }> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.delete('/api/account/delete');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Hesap silme işlemi başarısız';
      throw new Error(msg);
    }
  },

  // TTS Provider Settings (Public endpoint for all users)
  async getTtsProvider(): Promise<{ provider: string }> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.get('/api/tts/provider');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching TTS provider:', error);
      // Return default provider if error
      return { provider: 'amazon' };
    }
  },

  // Admin-only TTS provider update (kept for backward compatibility)
  async updateTtsProvider(provider: string): Promise<void> {
    try {
      await wakeBackendIfNeeded();
      await apiClient.put('/api/admin/settings/tts_provider', { value: provider });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'TTS provider güncellenemedi');
    }
  },

  // Daily Usage Patterns API
  async getPatternsByLevel(level: string): Promise<{ success: boolean; patterns: any[]; count: number }> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.get(`/api/patterns/level/${level}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching patterns by level:', error);
      throw new Error(error.response?.data?.message || 'Pattern verisi alınamadı');
    }
  },

  async findPatternsInText(text: string, level: string): Promise<{ success: boolean; patterns: any[]; count: number }> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.post('/api/patterns/find', { text, level });
      return response.data;
    } catch (error: any) {
      console.error('Error finding patterns in text:', error);
      throw new Error(error.response?.data?.message || 'Pattern eşleştirme başarısız');
    }
  },

  async getUserPatternHistory(): Promise<{ success: boolean; patterns: any[]; count: number }> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.get('/api/patterns/history');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user pattern history:', error);
      throw new Error(error.response?.data?.message || 'Pattern geçmişi yüklenemedi');
    }
  },

  async registerDeviceToken(payload: { platform: 'android' | 'ios'; token: string; deviceId?: string | null; appVersion?: string }): Promise<boolean> {
    try {
      await wakeBackendIfNeeded();
      const response = await apiClient.post('/api/device-tokens', payload);
      return !!response.data?.success;
    } catch (error: any) {
      // Push token kaydı başarısız olursa uygulamayı bozmayalım
      try {
        console.error('Error registering device token:', error);
      } catch {}
      return false;
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
    const response = await apiClient.get('/api/vocabulary');
    return response.data.success ? response.data.data : [];
  } catch (error) {

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
    const response = await apiClient.post('/api/vocabulary/add', {
      word,
      definition,
      example_sentence: sentence,
      level: level?.toUpperCase(),
    });
    return response.data.data;
  } catch (error) {

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
    const response = await apiClient.post('/api/vocabulary/add-with-translation', {
      word,
      context,
      level,
      originalSentence
    });
    return response.data;
  } catch (error) {

    throw error;
  }
};

export const deleteWordFromVocabulary = async (wordId: number): Promise<void> => {
  try {
    const response = await apiClient.delete(`/api/vocabulary/${wordId}`);
  } catch (error) {

    throw error;
  }
};

export const updateWordInVocabulary = async (
  wordId: number,
  updates: Partial<VocabularyWord>
): Promise<VocabularyWord> => {
  try {
    const response = await apiClient.put(`/api/vocabulary/${wordId}`, updates);
    return response.data.data;
  } catch (error) {

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
  } catch (error) {

    throw new Error('Ayarlar kaydedilemedi');
  }
};

// User settings API
export const getUserSettings = async (): Promise<{ default_voice?: string; settings?: any }> => {
  try {
    const response = await apiClient.get('/api/user-settings');
    return response.data.data || {};
  } catch (error) {

    // Local fallback: read from AsyncStorage if backend route missing/unavailable
    try {
      const localDefaultVoice = await AsyncStorage.getItem('default_voice_local');
      if (localDefaultVoice) {
        return { default_voice: localDefaultVoice } as any;
      }
    } catch { }
    return {};
  }
};

export const saveDefaultVoiceSetting = async (voice: string): Promise<void> => {
  try {
    await apiClient.post('/api/user-settings/default-voice', { voice });
  } catch (error) {
    // Store locally so UX works even if backend route missing
    try {
      await AsyncStorage.setItem('default_voice_local', voice);
    } catch { }
    // Do not throw to allow UI to proceed
  }
};

// Plan Features Types
export interface PlanFeatures {
  homepage_features?: {
    text_input?: boolean;
    youtube?: boolean;
    file_upload?: boolean;
    podcast?: boolean;
    topic_suggestions?: boolean;
    book?: boolean;
  };
  voice_categories?: {
    standard?: boolean;
    wavenet?: boolean;
    neural2?: boolean;
    studio?: boolean;
    chirp3d?: boolean;
  };
  sentence_patterns?: {
    enabled?: boolean;
    max_patterns?: number;
  };
}

export interface UserPlanFeatures {
  plan_id: string | null;
  plan_name: string | null;
  features: PlanFeatures;
}

// Get user's plan features
export const getMyPlanFeatures = async (): Promise<UserPlanFeatures> => {
  try {
    const response = await apiClient.get('/api/subscriptions/my-features');
    if (response.data.success) {
      return response.data.data;
    }
    return getDefaultPlanFeatures();
  } catch (error) {
    console.error('Error fetching plan features:', error);
    return getDefaultPlanFeatures();
  }
};

// Get default plan features (for users without active subscription)
export const getDefaultPlanFeatures = (): UserPlanFeatures => {
  return {
    plan_id: null,
    plan_name: null,
    features: {
      homepage_features: {
        text_input: true,
        youtube: false,
        file_upload: false,
        podcast: false,
        topic_suggestions: true,
        book: false
      },
      voice_categories: {
        standard: true,
        wavenet: false,
        neural2: false,
        studio: false,
        chirp3d: false
      },
      sentence_patterns: {
        enabled: false,
        max_patterns: 0
      }
    }
  };
};

// ============================================
// MFA API Functions (uses separate MFA backend)
// ============================================

export const mfaService = {
  // Setup MFA - Generate QR code
  async setupMfa(): Promise<{ success: boolean; qrCode?: string; secret?: string; message?: string }> {
    try {
      const response = await mfaApiClient.post('/api/mfa/setup');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'MFA kurulumu başarısız';
      throw new Error(msg);
    }
  },

  // Verify MFA setup with token
  async verifyMfaSetup(token: string): Promise<{ success: boolean; backupCodes?: string[]; message?: string }> {
    try {
      const response = await mfaApiClient.post('/api/mfa/verify-setup', { token });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'MFA doğrulama başarısız';
      throw new Error(msg);
    }
  },

  // Verify MFA token during login
  async verifyMfaLogin(token: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await mfaApiClient.post('/api/mfa/verify-login', { token });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'MFA doğrulama başarısız';
      throw new Error(msg);
    }
  },

  // Disable MFA
  async disableMfa(password: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await mfaApiClient.post('/api/mfa/disable', { password });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'MFA devre dışı bırakılamadı';
      throw new Error(msg);
    }
  },

  // Get MFA status
  async getMfaStatus(): Promise<{ success: boolean; mfaEnabled?: boolean; message?: string }> {
    try {
      const response = await mfaApiClient.get('/api/mfa/status');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'MFA durumu alınamadı';
      throw new Error(msg);
    }
  },

  // Regenerate backup codes
  async regenerateBackupCodes(password: string): Promise<{ success: boolean; backupCodes?: string[]; message?: string }> {
    try {
      const response = await mfaApiClient.post('/api/mfa/regenerate-backup-codes', { password });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Yedek kodlar oluşturulamadı';
      throw new Error(msg);
    }
  },

  // Verify backup code
  async verifyBackupCode(code: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await mfaApiClient.post('/api/mfa/verify-backup-code', { code });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Yedek kod doğrulaması başarısız';
      throw new Error(msg);
    }
  },
};