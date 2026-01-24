import axios from 'axios';
import { TTSRequest, TTSResponse, APIResponse, BookSearchResponse, BookChapter, Topic } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from './environmentConfig';
import { EXPO_PUBLIC_MFA_API_URL } from '@env';

// Import from unified apiClient wrapper
import {
  getApiClientAsync,
  getApiClientWithWake,
  wakeBackendIfNeeded as wakeBackendFromClient,
  isUsageLimitError,
  isTimeoutError,
  isNetworkError,
  extractErrorMessage,
  type LingRootApiClient,
} from './apiClient';

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

  // Text-to-Speech API (Sync) - Uses @lingroot/api-client
  async processTextToSpeech(request: TTSRequest): Promise<TTSResponse> {
    try {
      const client = await getApiClientWithWake();
      // apiClient.tts.process has same timeout (600000ms) configured
      // Cast to local TTSResponse type (minor type differences in 'level' field)
      return await client.tts.process(request) as unknown as TTSResponse;
    } catch (error: any) {
      // Network error check - detailed log before
      if (isNetworkError(error)) {
        console.log('⚠️ [TTS] Network connection interrupted (likely backgrounded). Server processing may continue.');
      } else {
        // Detailed error log (only if not network error)
        console.error('🔴 [TTS ERROR] Full error:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          hasResponse: !!error.response,
          isTimeout: isTimeoutError(error),
          isNetworkError: isNetworkError(error)
        });
      }

      if (isUsageLimitError(error)) {
        throw new Error('Paket kullanım sınırınız aşıldı. Lütfen paket yükseltin veya sonraki dönemi bekleyin.');
      }

      // Timeout error
      if (isTimeoutError(error)) {
        throw new Error('TTS işlemi zaman aşımına uğradı. Lütfen daha kısa bir metin deneyin.');
      }

      // Network error
      if (isNetworkError(error)) {
        throw new Error('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.');
      }

      throw new Error(extractErrorMessage(error, 'TTS işlemi başarısız'));
    }
  },

  // Topic narration generation (text only, no TTS) - Uses @lingroot/api-client
  async generateTopicNarrationFromSubject(
    subject: string,
    level: string
  ): Promise<APIResponse<{ adapted_text: string; translated_text: string; level: string }>> {
    try {
      const client = await getApiClientWithWake();
      const payload = {
        input: subject,
        type: 'subject',
        level,
        no_tts: true,
      };
      const response = await client.http.post<APIResponse<{ adapted_text: string; translated_text: string; level: string }>>(
        '/api/tts/process',
        payload,
        { timeout: 600000 }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Metin oluşturulamadı'));
    }
  },

  // Topic suggestions - Uses @lingroot/api-client
  async getTopicSuggestions(topic: string, level?: string): Promise<any> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.post('/api/topic-pipeline/suggestions', {
        topic,
        level,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Öneriler alınamadı'));
    }
  },

  // Podcast creation API (Sync) - Uses @lingroot/api-client
  // Supports both n8n webhook and Google TTS multi-speaker
  async createPodcast(params: {
    topic: string;
    level: string;
    duration: number | string;
    ttsProvider?: string; // 'n8n' (default) or 'google'
    hostSpeakerId?: string;
    guestSpeakerId?: string;
    ttsModel?: string;
    styleType?: string;
    voiceChoice?: string;
    personalityA?: string;
    personalityB?: string;
    includeHumor?: boolean;
    includeFiller?: boolean;
  }): Promise<any> {
    try {
      const client = await getApiClientWithWake();
      // Map params to PodcastParams type
      const podcastParams = {
        topic: params.topic,
        level: params.level,
        duration: params.duration,
        ttsProvider: (params.ttsProvider || 'n8n') as 'n8n' | 'google',
        hostSpeakerId: params.ttsProvider === 'google' ? params.hostSpeakerId : undefined,
        guestSpeakerId: params.ttsProvider === 'google' ? params.guestSpeakerId : undefined,
        ttsModel: params.ttsProvider === 'google' ? params.ttsModel : undefined,
        styleType: params.styleType,
        voiceChoice: params.voiceChoice,
        personalityA: params.personalityA,
        personalityB: params.personalityB,
        includeHumor: params.includeHumor,
        includeFiller: params.includeFiller,
      };
      return await client.tts.createPodcast(podcastParams);
    } catch (error: any) {
      console.error('🔴 [PODCAST API ERROR]:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      throw new Error(extractErrorMessage(error, 'Podcast oluşturma işlemi başarısız'));
    }
  },

  // Podcast creation API (Async - with notification) - Uses @lingroot/api-client
  async createPodcastAsync(params: {
    topic: string;
    level: string;
    duration: number | string;
    ttsProvider?: string; // must be 'google' for async endpoint
    hostSpeakerId?: string;
    guestSpeakerId?: string;
    ttsModel?: string;
    styleType?: string;
    personalityA?: string;
    personalityB?: string;
    includeHumor?: boolean;
    includeFiller?: boolean;
  }): Promise<{ success: boolean; jobId: string; message: string; estimatedTime: string }> {
    try {
      const client = await getApiClientWithWake();
      const podcastParams = {
        topic: params.topic,
        level: params.level,
        duration: params.duration,
        ttsProvider: (params.ttsProvider || 'google') as 'n8n' | 'google',
        hostSpeakerId: params.hostSpeakerId,
        guestSpeakerId: params.guestSpeakerId,
        ttsModel: params.ttsModel,
        styleType: params.styleType,
        personalityA: params.personalityA,
        personalityB: params.personalityB,
        includeHumor: params.includeHumor,
        includeFiller: params.includeFiller,
      };
      return await client.tts.createPodcastAsync(podcastParams);
    } catch (error: any) {
      console.error('🔴 [ASYNC PODCAST ERROR]:', error);
      const msg = extractErrorMessage(error, 'Async podcast işlemi başlatılamadı');
      const err: any = new Error(msg);
      if (error.response?.data?.code) {
        err.code = error.response.data.code;
      }
      throw err;
    }
  },

  // Text-to-Speech API (Async - with notification) - Uses @lingroot/api-client
  async processTextToSpeechAsync(request: TTSRequest): Promise<{ success: boolean; jobId: string; message: string; estimatedTime: string }> {
    try {
      const client = await getApiClientWithWake();
      return await client.tts.processAsync(request);
    } catch (error: any) {
      console.error('🔴 [ASYNC TTS ERROR]:', error);
      const msg = extractErrorMessage(error, 'Async TTS işlemi başlatılamadı');
      const err: any = new Error(msg);
      if (error.response?.data?.code) {
        err.code = error.response.data.code;
      }
      throw err;
    }
  },

  // File Upload for TTS (Async) - Uses @lingroot/api-client
  async processFileToSpeechAsync(file: FormData): Promise<{ success: boolean; jobId: string; message: string; estimatedTime: string }> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.post('/api/tts/process-async', file, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });
      return response.data;
    } catch (error: any) {
      const msg = extractErrorMessage(error, 'Async dosya TTS işlemi başlatılamadı');
      const err: any = new Error(msg);
      if (error.response?.data?.code) {
        err.code = error.response.data.code;
      }
      throw err;
    }
  },

  // Get job status - Uses @lingroot/api-client
  async getJobStatus(jobId: string): Promise<any> {
    try {
      const client = await getApiClientAsync();
      return await client.tts.getJobStatus(jobId);
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Job durumu alınamadı'));
    }
  },

  // Get active async TTS job for current user (if any) - Uses @lingroot/api-client
  async getActiveTtsJob(): Promise<{ success: boolean; hasActiveJob: boolean; job?: any }> {
    try {
      const client = await getApiClientWithWake();
      return await client.tts.getActiveJob();
    } catch (error: any) {
      // If endpoint is not available or returns 404, treat as no active job
      if (error.response && error.response.status === 404) {
        return { success: false, hasActiveJob: false };
      }
      return { success: false, hasActiveJob: false };
    }
  },

  // Get unread notifications - Uses @lingroot/api-client
  async getUnreadNotifications(): Promise<any[]> {
    try {
      const client = await getApiClientAsync();
      const response = await client.http.get('/api/tts/notifications/unread');
      return response.data.notifications || [];
    } catch (error: any) {
      // If 404, it likely means no notifications found or endpoint not ready for this user
      if (error.response && error.response.status === 404) {
        return [];
      }
      // Silent fail for polling - don't spam console with 401 errors
      return [];
    }
  },

  // Mark notification as read - Uses @lingroot/api-client
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const client = await getApiClientAsync();
      await client.http.post(`/api/tts/notifications/${notificationId}/read`);
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  },

  // Usage Summary - Uses @lingroot/api-client
  async getUsageSummary(): Promise<APIResponse<any>> {
    try {
      const client = await getApiClientWithWake();
      const result = await client.subscription.getUsageSummary();
      return result as unknown as APIResponse<any>;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Kullanım bilgileri alınamadı'));
    }
  },

  // File Upload for TTS - Uses @lingroot/api-client
  async processFileToSpeech(file: FormData): Promise<TTSResponse> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.post<TTSResponse>('/api/tts/process', file, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Dosya TTS işlemi başarısız'));
    }
  },

  // Sync Feedback - Uses @lingroot/api-client
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
      const client = await getApiClientWithWake();
      const response = await client.http.post<APIResponse<any>>('/api/tts/sync-feedback', feedbackData);
      return response.data;
    } catch (error: any) {
      console.error('Error sending sync feedback:', error);
      throw new Error(extractErrorMessage(error, 'Feedback gönderilemedi'));
    }
  },

  // User profile update - Uses @lingroot/api-client
  async updateProfile(userId: string, data: any): Promise<APIResponse> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.put<APIResponse>(`/api/users/${userId}`, data, {
        timeout: 60000,
      });
      return response.data;
    } catch (error: any) {
      const msg = isTimeoutError(error) ? 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.' : extractErrorMessage(error, 'Profil güncellenemedi');
      throw new Error(msg);
    }
  },

  // User audio history - Uses @lingroot/api-client
  async getUserAudioHistory(
    userId: string,
    page?: number,
    limit?: number,
    search?: string,
    level?: string,
    inputType?: string
  ): Promise<APIResponse> {
    try {
      const client = await getApiClientAsync();
      const params = new URLSearchParams();
      if (page && page > 0) params.append('page', String(page));
      if (limit && limit > 0) params.append('limit', String(limit));
      if (search && search.trim()) params.append('search', search.trim());
      if (level && level !== 'all') params.append('level', level);
      if (inputType && inputType !== 'all') params.append('input_type', inputType);
      const qs = params.toString();
      const url = qs ? `/api/users/${userId}/audio-history?${qs}` : `/api/users/${userId}/audio-history`;
      const response = await client.http.get<APIResponse>(url);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Geçmiş yüklenemedi'));
    }
  },

  // Get single content by ID - Uses @lingroot/api-client
  async getUserContentById(id: string): Promise<APIResponse> {
    try {
      const client = await getApiClientAsync();
      const response = await client.http.get<APIResponse>(`/api/users/content/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'İçerik yüklenemedi'));
    }
  },

  // Fast audio count for Home statistics - Uses @lingroot/api-client
  async getUserAudioCount(userId: string): Promise<number> {
    try {
      const client = await getApiClientAsync();
      return await client.content.getUserAudioCount();
    } catch (error) {
      console.error('Error fetching audio count:', error);
      return 0;
    }
  },

  // Full content history for fallback counting when page is capped - Uses @lingroot/api-client
  async getFullContentHistory(): Promise<APIResponse> {
    try {
      const client = await getApiClientAsync();
      const result = await client.content.getFullHistory();
      return result as unknown as APIResponse;
    } catch (error: any) {
      console.error('Error fetching full content history:', error?.response?.data || error?.message || error);
      return { success: false, data: [] } as any;
    }
  },

  // Save content and audio file to contenthistory table - Uses @lingroot/api-client
  async submitContent(
    input: string,
    inputType: string,
    level: string,
    mp3Url: string,
    translatedText?: string,
    adaptedText?: string,
    chapterId?: string | number,
    timepoints?: any[],
    words?: any[]
  ): Promise<APIResponse> {
    try {
      console.log('[Mobile][submitContent] Sending payload to /api/content/submit', {
        inputPreview: input ? input.substring(0, 80) : 'EMPTY',
        inputType,
        level,
        hasMp3Url: !!mp3Url,
        translatedPreview: translatedText ? translatedText.substring(0, 80) : 'EMPTY',
        adaptedPreview: adaptedText ? adaptedText.substring(0, 80) : 'EMPTY',
        chapterId: chapterId ?? null,
      });

      const client = await getApiClientAsync();
      const request = {
        input,
        inputType: inputType as any, // Cast to TTSInputType
        level: level as any, // Cast to CEFRLevel
        mp3Url,
        translatedText: translatedText || '',
        adaptedText: adaptedText || '',
        chapterId: chapterId ?? undefined,
        timepoints: (Array.isArray(timepoints) && timepoints.length > 0) ? timepoints : undefined,
        words: (Array.isArray(words) && words.length > 0) ? words : undefined,
      };

      const result = await client.content.submit(request);
      return result as unknown as APIResponse;
    } catch (error: any) {
      console.error('[Mobile][submitContent] Error while saving contenthistory:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      throw new Error(extractErrorMessage(error, 'İçerik kaydedilemedi'));
    }
  },

  // Health check
  // Health check - Uses @lingroot/api-client
  async healthCheck(): Promise<APIResponse> {
    try {
      const client = await getApiClientAsync();
      const response = await client.http.get<APIResponse>('/api/health');
      return response.data;
    } catch (error: any) {
      throw new Error('API bağlantısı başarısız');
    }
  },

  // Vocabulary lookup - Uses @lingroot/api-client
  async lookupVocabularyWord(word: string): Promise<{ success: boolean; found: boolean; data?: any; hasUserWord?: boolean }> {
    try {
      const client = await getApiClientWithWake();
      const result = await client.vocabulary.lookup(word);
      return result as unknown as { success: boolean; found: boolean; data?: any; hasUserWord?: boolean };
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Kelime aranırken hata oluştu';
      throw new Error(msg);
    }
  },

  // Topic Tree - Uses @lingroot/api-client
  async getTopicTree(): Promise<APIResponse<{ topics: Topic[]; total: number }>> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.get<APIResponse<{ topics: Topic[]; total: number }>>(
        '/api/topic-hierarchy/topics/tree'
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Konu ağacı alınamadı'));
    }
  },

  // Create main topic - Uses @lingroot/api-client
  async createMainTopic(data: {
    title: string;
    description?: string;
    level?: string;
  }): Promise<APIResponse<{ topic: Topic }>> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.post<APIResponse<{ topic: Topic }>>(
        '/api/topic-hierarchy/topics',
        data
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Ana konu oluşturulamadı'));
    }
  },

  // Generate subtopics - Uses @lingroot/api-client
  async generateSubtopics(
    topicId: string,
    data: {
      count?: number;
      language?: string;
      angle?: string;
    }
  ): Promise<APIResponse<{ subtopics: Topic[] }>> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.post<APIResponse<{ subtopics: Topic[] }>>(
        `/api/topic-hierarchy/topics/${topicId}/subtopics`,
        data
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Alt konular oluşturulamadı'));
    }
  },

  // Add manual subtopic - Uses @lingroot/api-client
  async addManualSubtopic(
    topicId: string,
    data: {
      title: string;
      description?: string;
    }
  ): Promise<APIResponse<{ subtopic: Topic }>> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.post<APIResponse<{ subtopic: Topic }>>(
        `/api/topic-hierarchy/topics/${topicId}/subtopics/manual`,
        data
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Alt konu eklenemedi'));
    }
  },

  // Delete topic and children - Uses @lingroot/api-client
  async deleteTopicAndChildren(topicId: string): Promise<APIResponse> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.delete<APIResponse>(
        `/api/topic-hierarchy/topics/${topicId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Konu silinemedi'));
    }
  },

  // Get topic path - Uses @lingroot/api-client
  async getTopicPath(topicId: string): Promise<APIResponse<{ path: Topic[] }>> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.get<APIResponse<{ path: Topic[] }>>(
        `/api/topic-hierarchy/topics/${topicId}/path`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Konu yolu alınamadı'));
    }
  },

  // Create content from topic - Uses @lingroot/api-client
  async createContentFromTopic(
    topicId: string,
    data?: {
      voice?: string;
      speaking_rate?: number;
    }
  ): Promise<APIResponse<{ topic: Topic; suggested_input: string }>> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.post<APIResponse<{ topic: Topic; suggested_input: string }>>(
        `/api/topic-hierarchy/topics/${topicId}/create-content`,
        data || {}
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Konu içeriği alınamadı'));
    }
  },

  // Mark topic audio listened - Uses @lingroot/api-client
  async markTopicAudioListened(mp3Url: string): Promise<APIResponse> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.post<APIResponse>(
        '/api/topic-hierarchy/topics/mark-listened',
        { mp3_url: mp3Url }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Ses kaydı dinlenmiş olarak işaretlenemedi'));
    }
  },

  // Get available voices - Uses @lingroot/api-client
  async getAvailableVoices(): Promise<APIResponse> {
    try {
      const client = await getApiClientWithWake();
      const result = await client.tts.listVoices();
      // Map to legacy APIResponse format
      return { success: true, data: result } as unknown as APIResponse;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Ses listesi yüklenemedi'));
    }
  },

  // Filtered voices - Uses @lingroot/api-client
  async getFilteredVoices(accent?: string, gender?: string, emotion?: string, category?: string): Promise<APIResponse> {
    try {
      const client = await getApiClientAsync();
      // Build filters object, excluding 'all' values
      const filters: { gender?: string; accent?: string; category?: string } = {};
      if (accent && accent !== 'all') filters.accent = accent;
      if (gender && gender !== 'all') filters.gender = gender;
      if (category && category !== 'all') filters.category = category;
      // Note: emotion is not directly supported in the api-client filter, kept for backward compat

      const result = await client.tts.getFilteredVoices(filters);
      return { success: true, data: result } as unknown as APIResponse;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Filtrelenmiş sesler yüklenemedi'));
    }
  },

  // Narration rewrite (like web): turn a topic/suggestion into a full narration text - Uses @lingroot/api-client
  async rewriteToNarration(inputText: string, level: string): Promise<{ success: boolean; data?: { narration_text: string } }> {
    try {
      const client = await getApiClientAsync();
      const response = await client.http.post('/api/narration/rewrite', {
        input_text: inputText,
        level,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Öneri metne dönüştürülemedi'));
    }
  },

  // Books API - Uses @lingroot/api-client
  async searchBooks(params: { q?: string; title?: string; author?: string; page?: number; per_page?: number }): Promise<BookSearchResponse> {
    try {
      const query = params.q || params.title || params.author || '';
      if (!query.trim()) {
        throw new Error('En az bir arama kriteri gerekli');
      }

      const client = await getApiClientAsync();
      const result = await client.book.search(query.trim(), params.page, params.per_page);
      return result as unknown as BookSearchResponse;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Kitap arama başarısız');
    }
  },

  // Get book chapters - Uses @lingroot/api-client
  async getBookChapters(bookId: number): Promise<BookChapter[]> {
    try {
      const client = await getApiClientAsync();
      const result = await client.book.getChapters(bookId);
      return (result.data || []) as unknown as BookChapter[];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Bölümler alınamadı');
    }
  },

  // Get single book chapter - Uses @lingroot/api-client
  async getBookChapter(bookId: number, chapterId: number): Promise<BookChapter & { book_title?: string; book_authors?: string }> {
    try {
      const client = await getApiClientAsync();
      const result = await client.book.getChapter(bookId, chapterId);
      return (result.data || result) as unknown as (BookChapter & { book_title?: string; book_authors?: string });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Bölüm alınamadı');
    }
  },

  // Resend verification email - Uses @lingroot/api-client
  async resendVerificationEmail(email: string): Promise<APIResponse> {
    try {
      const client = await getApiClientWithWake();
      const result = await client.auth.resendVerification(email);
      return result as unknown as APIResponse;
    } catch (error: any) {
      const msg = extractErrorMessage(error, 'Eğer e-posta adresi kayıtlı ise aktivasyon maili gönderildi.');
      throw new Error(msg);
    }
  },

  // Apple IAP receipt verification - Uses @lingroot/api-client
  async verifyAppleReceipt(receiptData: string, productId: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const client = await getApiClientWithWake();
      const result = await client.subscription.verifyApplePurchase(receiptData, productId);
      return result as unknown as { success: boolean; data?: any; message?: string };
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Abonelik doğrulaması başarısız'));
    }
  },

  // Google Play IAP purchase verification - Uses @lingroot/api-client
  async verifyGooglePlayPurchase(purchaseToken: string, productId: string, packageName: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const client = await getApiClientWithWake();
      // Note: packageName not used in api-client, but kept for signature compatibility
      const result = await client.subscription.verifyGooglePurchase(purchaseToken, productId);
      return result as unknown as { success: boolean; data?: any; message?: string };
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Abonelik doğrulaması başarısız'));
    }
  },

  // Get subscription plans - Uses @lingroot/api-client
  async getSubscriptionPlans(): Promise<{ success: boolean; data?: any[] }> {
    try {
      const client = await getApiClientAsync();
      const result = await client.subscription.getPlans();
      return result as unknown as { success: boolean; data?: any[] };
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Paketler yüklenemedi'));
    }
  },

  // Account deletion info - Uses @lingroot/api-client
  async getAccountDeletionInfo(): Promise<{ success: boolean; data?: any }> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.get('/api/account/deletion-info');
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Hesap bilgileri alınamadı'));
    }
  },

  // Delete account - Uses @lingroot/api-client
  async deleteAccount(): Promise<{ success: boolean; message?: string }> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.delete('/api/account/delete');
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'Hesap silme işlemi başarısız'));
    }
  },

  // TTS Provider Settings - Uses @lingroot/api-client
  async getTtsProvider(): Promise<{ provider: string }> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.get('/api/tts/provider');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching TTS provider:', error);
      return { provider: 'amazon' };
    }
  },

  // Admin-only TTS provider update - Uses @lingroot/api-client
  async updateTtsProvider(provider: string): Promise<void> {
    try {
      const client = await getApiClientWithWake();
      await client.http.put('/api/admin/settings/tts_provider', { value: provider });
    } catch (error: any) {
      throw new Error(extractErrorMessage(error, 'TTS provider güncellenemedi'));
    }
  },

  // Daily Usage Patterns API - Uses @lingroot/api-client
  async getPatternsByLevel(level: string): Promise<{ success: boolean; patterns: any[]; count: number }> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.get(`/api/patterns/level/${level}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching patterns by level:', error);
      throw new Error(extractErrorMessage(error, 'Pattern verisi alınamadı'));
    }
  },

  // Find patterns in text - Uses @lingroot/api-client
  async findPatternsInText(text: string, level: string): Promise<{ success: boolean; patterns: any[]; count: number }> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.post('/api/patterns/find', { text, level });
      return response.data;
    } catch (error: any) {
      console.error('Error finding patterns in text:', error);
      throw new Error(extractErrorMessage(error, 'Pattern eşleştirme başarısız'));
    }
  },

  // Get user pattern history - Uses @lingroot/api-client
  async getUserPatternHistory(): Promise<{ success: boolean; patterns: any[]; count: number }> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.get('/api/patterns/history');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user pattern history:', error);
      throw new Error(extractErrorMessage(error, 'Pattern geçmişi yüklenemedi'));
    }
  },

  // Register device token - Uses @lingroot/api-client
  async registerDeviceToken(payload: { platform: 'android' | 'ios'; token: string; deviceId?: string | null; appVersion?: string }): Promise<boolean> {
    try {
      const client = await getApiClientWithWake();
      const response = await client.http.post('/api/device-tokens', payload);
      return !!response.data?.success;
    } catch (error: any) {
      try {
        console.error('Error registering device token:', error);
      } catch { }
      return false;
    }
  },

  // Favorites Management - Uses @lingroot/api-client
  async getUserFavorites(): Promise<string[]> {
    try {
      const client = await getApiClientAsync();
      const response = await client.http.get('/api/favorites');
      if (response.data?.success && Array.isArray(response.data?.favorites)) {
        return response.data.favorites.map((f: any) => String(f.item_id));
      }
      return [];
    } catch (error) {
      console.warn('Error fetching favorites:', error);
      return [];
    }
  },

  // Toggle favorite - Uses @lingroot/api-client
  async toggleUserFavorite(itemId: string, itemType: string = 'content_item'): Promise<boolean> {
    try {
      const client = await getApiClientAsync();
      const response = await client.http.post('/api/favorites/toggle', {
        itemType,
        itemId
      });
      return response.data?.success || false;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }
  },

  async getUserFavoriteDetails(): Promise<any[]> {
    return [];
  },

  async saveUserFavorites(ids: string[]): Promise<boolean> {
    console.warn('saveUserFavorites is deprecated. Use toggleUserFavorite instead.');
    return true;
  }
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

// Get user vocabulary words - Uses @lingroot/api-client
export const getVocabulary = async (): Promise<VocabularyWord[]> => {
  try {
    const client = await getApiClientAsync();
    const result = await client.vocabulary.getUserWords();
    return (result.data || []) as unknown as VocabularyWord[];
  } catch (error) {
    throw error;
  }
};

// Add word to vocabulary - Uses @lingroot/api-client
export const addWordToVocabulary = async (
  word: string,
  definition?: string,
  sentence?: string,
  level?: string
): Promise<VocabularyWord> => {
  try {
    const client = await getApiClientAsync();
    const response = await client.http.post('/api/vocabulary/add', {
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

// Add word with translation - Uses @lingroot/api-client
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
    const client = await getApiClientAsync();
    const response = await client.http.post('/api/vocabulary/add-with-translation', {
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

// Delete word from vocabulary - Uses @lingroot/api-client
export const deleteWordFromVocabulary = async (wordId: number): Promise<void> => {
  try {
    const client = await getApiClientAsync();
    await client.vocabulary.removeWord(String(wordId));
  } catch (error) {
    throw error;
  }
};

// Update word in vocabulary - Uses @lingroot/api-client
export const updateWordInVocabulary = async (
  wordId: number,
  updates: Partial<VocabularyWord>
): Promise<VocabularyWord> => {
  try {
    const client = await getApiClientAsync();
    const response = await client.http.put(`/api/vocabulary/${wordId}`, updates);
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

// Get reminder settings - Uses @lingroot/api-client
export const getReminderSettings = async (): Promise<ReminderSettings> => {
  try {
    const client = await getApiClientAsync();
    const response = await client.http.get('/api/reminder-settings');
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

// Save reminder settings - Uses @lingroot/api-client
export const saveReminderSettings = async (settings: ReminderSettings): Promise<void> => {
  try {
    const client = await getApiClientAsync();
    await client.http.post('/api/reminder-settings', settings);
  } catch (error) {
    throw new Error('Ayarlar kaydedilemedi');
  }
};

// User settings API - Uses @lingroot/api-client
export const getUserSettings = async (): Promise<{ default_voice?: string; settings?: any }> => {
  try {
    const client = await getApiClientAsync();
    const response = await client.http.get('/api/user-settings');
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

// Save default voice setting - Uses @lingroot/api-client
export const saveDefaultVoiceSetting = async (voice: string): Promise<void> => {
  try {
    const client = await getApiClientAsync();
    await client.http.post('/api/user-settings/default-voice', { voice });
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
    topic_tree?: boolean;
    book?: boolean;
    liro?: boolean;
    daily_usage_patterns?: boolean;
  };
  voice_categories?: {
    standard?: boolean;
    wavenet?: boolean;
    neural2?: boolean;
    studio?: boolean;
    chirp3d?: boolean;
    amazon_standard?: boolean;
    amazon_neural?: boolean;
    amazon_generative?: boolean;
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

// Get user's plan features - Uses @lingroot/api-client
export const getMyPlanFeatures = async (): Promise<UserPlanFeatures> => {
  try {
    const client = await getApiClientAsync();
    const response = await client.http.get('/api/subscriptions/my-features');
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
        topic_tree: false,
        book: false,
        liro: false,
        daily_usage_patterns: false,
      },
      voice_categories: {
        standard: true,
        wavenet: false,
        neural2: false,
        studio: false,
        chirp3d: false,
        amazon_standard: false,
        amazon_neural: false,
        amazon_generative: false,
      },
      sentence_patterns: {
        enabled: false,
        max_patterns: 0
      }
    }
  };
};

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