// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const process: {
  env: {
    NEXT_PUBLIC_API_URL?: string;
    NEXT_PUBLIC_MFA_API_URL?: string;
    NEXT_PUBLIC_TRANSCRIPT_SERVICE_URL?: string;
    NEXT_PUBLIC_PODCAST_WEBHOOK_URL?: string;
    NEXT_PUBLIC_PODCAST_WEBHOOK_TOKEN?: string;
    NODE_ENV?: string;
    [key: string]: string | undefined;
  };
};

/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Get the base URL for API requests
export const getApiBaseUrl = (): string => {
  // In development, always use direct backend URL
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return 'http://localhost:5001';
  }

  // In production, use the configured API URL or fallback to Render URL
  return process.env.NEXT_PUBLIC_API_URL || 'https://lingloops-backend.onrender.com';
};

// Get the base URL for MFA API requests (separate backend for MFA)
export const getMfaApiBaseUrl = (): string => {
  // If MFA URL is explicitly set, use it
  if (process.env.NEXT_PUBLIC_MFA_API_URL) {
    if (typeof window !== 'undefined') {
      console.log('🔐 MFA_API_BASE_URL:', process.env.NEXT_PUBLIC_MFA_API_URL);
      console.log('📍 MFA requests will go to: CLOUDFLARE TUNNEL');
    }
    return process.env.NEXT_PUBLIC_MFA_API_URL;
  }

  // Otherwise, use the same as main API
  if (typeof window !== 'undefined') {
    console.log('🔐 MFA_API_BASE_URL: using default (same as API_BASE_URL)');
    console.log('📍 MFA requests will go to: NORMAL BACKEND');
  }
  return getApiBaseUrl();
};

// API_BASE_URL for backward compatibility
export const API_BASE_URL = getApiBaseUrl();
export const MFA_API_BASE_URL = getMfaApiBaseUrl();

export const TRANSCRIPT_SERVICE_URL = process.env.NEXT_PUBLIC_TRANSCRIPT_SERVICE_URL || 'http://localhost:8001';

// Get complete API URL for a specific endpoint
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();

  // Debug logging for production
  if (typeof window !== 'undefined') {
    console.log('[API URL DEBUG] baseUrl:', baseUrl);
    console.log('[API URL DEBUG] endpoint:', endpoint);
    console.log('[API URL DEBUG] NODE_ENV:', process.env.NODE_ENV);
    console.log('[API URL DEBUG] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  }

  // Clean up endpoint - remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  // Build the API path
  let apiPath: string;

  // Check if baseUrl already contains '/api' path
  const baseUrlContainsApi = baseUrl.includes('/api');

  if (baseUrlContainsApi) {
    // If baseUrl already contains '/api', don't add it again
    apiPath = `/${cleanEndpoint}`;
  } else if (cleanEndpoint.startsWith('api/')) {
    // If endpoint already starts with 'api/', use it as is
    apiPath = `/${cleanEndpoint}`;
  } else {
    // Otherwise, add '/api/' prefix
    apiPath = `/api/${cleanEndpoint}`;
  }

  // For direct backend URLs
  if (baseUrl) {
    // Make sure we don't have double slashes
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const finalUrl = `${cleanBaseUrl}${apiPath}`;

    // Debug logging
    if (typeof window !== 'undefined') {
      console.log('[API URL DEBUG] finalUrl:', finalUrl);
    }

    return finalUrl;
  }

  // For relative URLs (fallback)
  return apiPath;
};

// Create a configured axios instance
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a separate axios instance for MFA API
export const mfaApi = axios.create({
  baseURL: getMfaApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;

    // If token exists, add to headers
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log normal API requests (only for non-health endpoints to reduce noise)
    if (typeof window !== 'undefined' && config.url && !config.url.includes('/health')) {
      console.log(`🌐 [API REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`📍 [API REQUEST] Target: ${getApiBaseUrl()}`);
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Add request interceptor for MFA API authentication
mfaApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;

    // If token exists, add to headers
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log MFA request destination
    if (typeof window !== 'undefined') {
      console.log(`🔐 [MFA REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`📍 [MFA REQUEST] Target: ${getMfaApiBaseUrl()}`);
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Helper function for API requests
export const apiRequest = async <T>(
  method: string,
  endpoint: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    // Clean up endpoint
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    // Build URL - if endpoint already starts with 'api/', use as is, otherwise add '/api/' prefix
    const url = cleanEndpoint.startsWith('api/') ? `/${cleanEndpoint}` : `/api/${cleanEndpoint}`;

    const response: AxiosResponse<T> = await api.request({
      method,
      url,
      data,
      ...config,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      throw error.response.data;
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response received from server');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(error.message || 'Unknown error occurred');
    }
  }
};

// Global vocabulary lookup - sadece sözlükteki kaydı döndürür, kullanıcıya ekleme yapmaz
export const lookupVocabularyWord = async (
  word: string
): Promise<{ success: boolean; found: boolean; data: VocabularyWord | null; hasUserWord?: boolean }> => {
  try {
    const baseUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:5001/api/vocabulary/lookup'
      : '/api/vocabulary/lookup';

    const headers = createHeaders('application/json');

    const url = `${baseUrl}?word=${encodeURIComponent(word)}`;

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error looking up vocabulary word:', error);
    throw error;
  }
};

export interface ProcessInputData {
  type: "text" | "youtube" | "podcast" | "file" | "weblink" | "topic" | "book" | "subject" | "chapter";
  input?: string;
  text?: string;
  file?: File;
  level: string;
  SesHızı?: number;
  voice?: string;
  chapter?: string;
  chapter_id?: string;
  topic_id?: string;
  suppressPlanAlerts?: boolean;
  targetDurationMinutes?: number; // İçerik süresi (1.5, 5, 10, 15 dakika)
  mood?: string;
}

export interface TtsResponseData {
  success?: boolean;
  message: string;
  mp3_url: string;
  level: string;
  vtt_url: string;
  timepoints?: any[];
  words?: string[];
  // Snake case versions (for database)
  translated_text?: string;
  adapted_text?: string;
  // Camel case versions (for frontend)
  translatedText?: string;
  adaptedText?: string;
  detected_mood?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  mp3_url?: string;
  vtt_url?: string;
  level?: string;
}

// Document + section types for PDF/document workflow
export interface DocumentRecord {
  id: number;
  user_id: string | null;
  title: string;
  original_filename?: string | null;
  mime_type?: string | null;
  page_count?: number | null;
  language?: string | null;
  created_at: string;
}

export interface DocumentSection {
  id: number;
  document_id: number;
  section_index: number;
  section_title: string;
  section_text: string;
  word_count: number;
  created_at: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  message?: string;
  document: DocumentRecord;
  sections: DocumentSection[];
}

// Fetch all documents for the authenticated user
export const getUserDocuments = async (): Promise<ApiResponse<DocumentRecord[]>> => {
  const url = getApiUrl('/documents');
  const headers = createHeaders();
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  return handleApiResponse<DocumentRecord[]>(response);
};

// Fetch all sections for a specific document
export const getDocumentSections = async (
  documentId: number
): Promise<ApiResponse<DocumentSection[]>> => {
  const url = getApiUrl(`/documents/${encodeURIComponent(String(documentId))}/sections`);
  const headers = createHeaders();
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  return handleApiResponse<DocumentSection[]>(response);
};

// YouTube transcript servisini çağırmak için fonksiyon
export const fetchYoutubeTranscript = async (youtubeUrl: string, languageCode: string = 'en'): Promise<string | null> => {
  try {
    // ... (rest of the code remains the same)
    console.log(`YouTube transkript çekme işlemi başlatılıyor: ${youtubeUrl} (${languageCode})`);

    // Doğrudan transkript servisine istek gönder
    try {
      const response = await fetch(`${TRANSCRIPT_SERVICE_URL}/scrape-transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          url: youtubeUrl,
          language_code: languageCode || 'auto'
        }),
        // CORS için credentials: 'omit' kullan
        credentials: 'omit'
      });

      console.log("Transkript servisi yanıt durumu:", response.status);

      if (!response.ok) {
        throw new Error(`Transkript servisi hatası: ${response.status}`);
      }

      const data = await response.json();
      console.log("API yanıtı:", data);

      if (!data.transcript || typeof data.transcript !== 'string') {
        throw new Error('Transkript boş veya geçersiz');
      }

      console.log(`Transkript başarıyla alındı: ${data.transcript.substring(0, 100)}...`);
      return data.transcript.trim();
    } catch (err) {
      console.error(`Gerçek transkript servisi hatası:`, err);
      throw err;
    }
  } catch (error) {
    console.error('YouTube transkript çekme hatası:', error);
    return "Transkript çekilemedi. Lütfen daha sonra tekrar deneyin.";
  }
};

export const getToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("lingroot_token");
  }
  return null;
};

export const createHeaders = (contentType?: string): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  // Token varsa ekle
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

// Resend verification email
export const resendVerificationEmail = async (email: string): Promise<ApiResponse> => {
  const url = getApiUrl('auth/resend-verification');
  const headers = createHeaders('application/json');
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email }),
    credentials: 'include'
  });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      errMsg = j.message || errMsg;
    } catch { }
    throw new Error(errMsg);
  }
  return res.json();
};

async function handleApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      errorMessage = `${errorMessage}: ${response.statusText}`;
    }
    console.error("API Error:", errorMessage);
    const error = new Error(errorMessage);
    (error as any).response = response;
    throw error;
  }
  try {
    return await response.json() as ApiResponse<T>;
  } catch (e) {
    console.error("API Response JSON Parse Error:", e);
    throw new Error("Failed to parse successful API response.");
  }
}

export const processTts = async (data: ProcessInputData): Promise<TtsResponseData> => {
  const { type, input, file, level, SesHızı, voice, chapter_id, topic_id, suppressPlanAlerts, targetDurationMinutes, mood } = data;
  const url = `${getApiUrl("tts/process")}`;
  let headers: Record<string, string>;
  let body: string | FormData;

  if (type === "text") {
    headers = createHeaders("application/json");
    const payload = { input, type, level, SesHızı, voice, chapter_id } as any;
    if (topic_id) {
      (payload as any).topic_id = topic_id;
    }
    if (targetDurationMinutes) {
      (payload as any).targetDurationMinutes = targetDurationMinutes;
    }
    if (mood) {
      (payload as any).mood = mood;
    }
    console.log('🧭 [TTS PAYLOAD DEBUG] Prepared JSON payload:', payload);
    body = JSON.stringify(payload);
  } else {
    headers = createHeaders();
    const formData = new FormData();
    formData.append("level", level);
    formData.append("type", type);
    if (SesHızı !== undefined) formData.append("SesHızı", SesHızı.toString());
    if (voice) formData.append("voice", voice);
    if (chapter_id) formData.append("chapter_id", chapter_id);
    if (topic_id) formData.append("topic_id", topic_id);
    if (targetDurationMinutes) formData.append("targetDurationMinutes", targetDurationMinutes.toString());
    if (mood) formData.append("mood", mood);

    if (input && type !== "file") {
      formData.append("input", input);
    }
    if (file) {
      formData.append("file", file);
    }

    console.log('🧭 [TTS PAYLOAD DEBUG] Prepared FormData payload:', {
      level, type, SesHızı, voice, chapter_id,
      inputPreview: (input || '').toString().slice(0, 80),
      hasFile: !!file
    });
    body = formData;
  }

  try {
    console.log('🚀 [TTS API] Request starting...', { url, type, level });

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
      credentials: 'include'
    });

    console.log('📊 [TTS API] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    // CRITICAL: Check response status BEFORE parsing JSON
    let apiResponse: any;
    if (!response.ok) {
      // Try to parse JSON error; fallback to text
      try {
        apiResponse = await response.json();
      } catch {
        const errorText = await response.text();
        throw new Error(`TTS API failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      if (apiResponse?.code === 'USAGE_LIMIT_EXCEEDED') {
        const link = '/dashboard?tab=paket-bilgilerim';
        // if not suppressed, we used to show alert+redirect; now modal handles UX
        const err: any = new Error(`Paket kullanım sınırınız aşıldı. Lütfen paket yükseltin (${link}).`);
        err.code = 'USAGE_LIMIT_EXCEEDED';
        err.status = 402;
        throw err;
      }
      if (apiResponse?.code === 'NO_ACTIVE_PLAN') {
        const link = '/dashboard?tab=paket-bilgilerim';
        // if not suppressed, we used to show alert+redirect; now modal handles UX
        const err: any = new Error(`Aktif paketiniz yok. Lütfen paket seçin (${link}).`);
        err.code = 'NO_ACTIVE_PLAN';
        err.status = 402;
        throw err;
      }
      throw new Error(apiResponse?.message || `TTS API failed: ${response.status} ${response.statusText}`);
    } else {
      apiResponse = await response.json();
    }

    // Debug: Log what we received from backend
    console.log('🔍 [API DEBUG] Backend response keys:', Object.keys(apiResponse));
    console.log('🔍 [API DEBUG] Success status in response:', apiResponse.success);
    console.log('🔍 [API DEBUG] Has mp3_url:', !!apiResponse.mp3_url);
    console.log('🔍 [API DEBUG] Timepoints in response:', apiResponse.timepoints?.length || 0);
    console.log('🔍 [API DEBUG] Words in response:', apiResponse.words?.length || 0);
    console.log('🔍 [API DEBUG] First 3 timepoints:', apiResponse.timepoints?.slice(0, 3));
    console.log('🔍 [API DEBUG] First 3 words:', apiResponse.words?.slice(0, 3));

    // YENI: Timepoints detaylarını kontrol et
    console.log('🔍 [API DEBUG] Timepoints type:', typeof apiResponse.timepoints);
    console.log('🔍 [API DEBUG] Timepoints structure:', apiResponse.timepoints?.slice(0, 2));
    console.log('🔍 [API DEBUG] Are timepoints array?', Array.isArray(apiResponse.timepoints));

    return {
      message: apiResponse.message || "",
      mp3_url: apiResponse.mp3_url || "",
      level: apiResponse.level || "",
      vtt_url: apiResponse.vtt_url || "",
      timepoints: apiResponse.timepoints || [],
      words: apiResponse.words || [],
      // Snake case versions (for database compatibility)
      translated_text: apiResponse.translated_text || "",
      adapted_text: apiResponse.adapted_text || "",
      // Camel case versions (for frontend)
      translatedText: apiResponse.translatedText || "",
      adaptedText: apiResponse.adaptedText || "",
      detected_mood: apiResponse.detected_mood,
    };
  } catch (error) {
    console.error("Process TTS API call error:", error);
    throw error;
  }
};

// Usage summary for subscription limits
export const getUsageSummary = async (): Promise<ApiResponse<any>> => {
  const url = getApiUrl('/subscription/usage-summary');
  const headers = createHeaders();
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  return await handleApiResponse(response);
};

// Function to submit content details after successful TTS processing
export const submitContent = async (
  input: string,
  inputType: string,
  level: string,
  mp3Url: string,
  translatedText?: string,
  adaptedText?: string,
  chapterId?: string | number,
  timepoints?: any[],
  words?: any[],
  detectedMood?: string,
  processingDurationMs?: number
): Promise<ApiResponse> => {
  const url = getApiUrl('/content/submit');
  const headers = createHeaders("application/json");

  const payload: any = {
    input,
    input_type: inputType,
    level,
    mp3_url: mp3Url,
    translated_text: translatedText || '',
    adapted_text: adaptedText || '',
    chapter_id: chapterId ?? null,
    detected_mood: detectedMood || null,
  };

  // Podcast senaryosunda MFA timepoints/words varsa backend'e ilet
  if (Array.isArray(timepoints) && timepoints.length > 0) {
    payload.timepoints = timepoints;
  }
  if (Array.isArray(words) && words.length > 0) {
    payload.words = words;
  }

  // Processing duration tracking
  if (typeof processingDurationMs === 'number' && processingDurationMs > 0) {
    payload.processing_duration_ms = Math.round(processingDurationMs);
  }

  const body = JSON.stringify(payload);

  try {
    console.log(`Calling Submit Content API: ${url}`);
    console.log('Headers:', headers);
    console.log('Body:', body);
    console.log('Submit Content Parameters:', {
      input: input || 'EMPTY',
      inputType: inputType || 'EMPTY',
      level: level || 'EMPTY',
      mp3Url: mp3Url || 'EMPTY',
      translatedText: translatedText || 'EMPTY',
      adaptedText: adaptedText || 'EMPTY',
      chapterId: chapterId ?? null,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
      credentials: 'include'
    });

    console.log('Submit Content Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Submit Content Error Response:', errorText);

      // Supabase 500 hatası için özel mesaj
      if (response.status === 500 || response.status === 503) {
        if (errorText.includes('Cloudflare') || errorText.includes('Internal server error')) {
          throw new Error(`Veritabanı geçici olarak erişilemez durumda. Lütfen birkaç dakika sonra tekrar deneyin. (${response.status})`);
        }
      }

      throw new Error(`Submit Content failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await handleApiResponse(response);
  } catch (error) {
    console.error("Submit Content API call error:", error);
    throw error;
  }
};

// Function to test Supabase connection
export const testSupabaseConnection = async (): Promise<ApiResponse> => {
  try {
    const url = getApiUrl('/content/test-db');
    const response = await fetch(url, {
      method: "GET",
      headers: createHeaders(),
      credentials: 'include'
    });

    console.log('Supabase Test Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase Test Error Response:', errorText);
      throw new Error(`Supabase test failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await handleApiResponse(response);
  } catch (error) {
    console.error("Supabase connection test error:", error);
    throw error;
  }
};

// Function to get content history for the authenticated user
export const getContentHistory = async (): Promise<ApiResponse> => {
  try {
    const url = getApiUrl('/content/history');
    const headers = createHeaders();

    console.log('Content history API çağrısı yapılıyor:', url);
    console.log('Headers:', headers);

    const response = await fetch(url, {
      method: "GET",
      headers: headers,
      credentials: 'include'
    });

    console.log('Content history response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Content history error response:', errorText);
      throw new Error(`Content history failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await handleApiResponse(response);
    console.log('Content history result:', result);

    return result;
  } catch (error) {
    console.error("İçerik geçmişi alınırken hata oluştu:", error);
    throw error;
  }
};

// Get in-progress content for resume functionality
export const getInProgressContent = async (): Promise<ApiResponse<any[]>> => {
  const url = getApiUrl('/content/in-progress');
  const headers = createHeaders();
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  return handleApiResponse<any[]>(response);
};

// Update listening progress for a content item
export const updateContentProgress = async (
  contentId: string,
  position: number,
  duration?: number
): Promise<ApiResponse<{ position: number; isCompleted: boolean; xpEarned: number }>> => {
  const url = getApiUrl(`/content/${contentId}/progress`);
  const headers = createHeaders('application/json');
  const response = await fetch(url, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify({ position, duration })
  });
  return handleApiResponse<{ position: number; isCompleted: boolean; xpEarned: number }>(response);
};

// Generate quiz for a content item
export const generateContentQuiz = async (contentId: string): Promise<ApiResponse<{
  contentId: string;
  totalQuestions: number;
  questions: Array<{
    id: number;
    word: string;
    options: string[];
    correctAnswer: string;
  }>;
}>> => {
  const url = getApiUrl(`/content/${contentId}/quiz`);
  const headers = createHeaders();
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  return handleApiResponse(response);
};

// Submit quiz answers
export const submitContentQuiz = async (
  contentId: string,
  answers: Array<{ word: string; selectedAnswer: string }>
): Promise<ApiResponse<{
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  xpEarned: number;
  results: Array<{ word: string; selectedAnswer: string; isCorrect: boolean }>;
}>> => {
  const url = getApiUrl(`/content/${contentId}/quiz/submit`);
  const headers = createHeaders('application/json');
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ answers })
  });
  return handleApiResponse(response);
};

// Book-based audio history item (linked to book chapters)
export interface BookHistoryItem {
  id: string;
  book_id: number | null;
  book_title: string;
  book_authors: string;
  cover_url?: string | null;
  subjects?: string | null;
  chapter_id: number | null;
  chapter_index: number | null;
  chapter_title: string;
  level: string;
  mp3_url: string;
  created_at: string;
  duration: number;
  input: string;
  input_type: string;
  words?: any[];
  timepoints?: any[];
}

// Fetch authenticated user's book-based audio history (paginated)
export const getUserBookHistory = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<BookHistoryItem[]>> => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const url = getApiUrl(`/users/${encodeURIComponent(userId)}/book-history?${params.toString()}`);
  const headers = createHeaders();
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  return handleApiResponse<BookHistoryItem[]>(response);
};

// Favorite books - metadata from books table
export interface FavoriteBookItem {
  id: number;
  title: string;
  authors: string;
  cover_url?: string | null;
  language?: string | null;
  subjects?: string | null;
  text_url?: string | null;
}

// Get only favorite book IDs for authenticated user
export const getUserBookFavorites = async (): Promise<ApiResponse<number[]>> => {
  const url = getApiUrl('/user-book-favorites');
  const headers = createHeaders();
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  return handleApiResponse<number[]>(response);
};

// Get full favorite book details for authenticated user
export const getUserBookFavoritesDetails = async (): Promise<ApiResponse<FavoriteBookItem[]>> => {
  const url = getApiUrl('/user-book-favorites/details');
  const headers = createHeaders();
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  return handleApiResponse<FavoriteBookItem[]>(response);
};

// Save book favorites (array of book IDs)
export const saveBookFavorites = async (ids: number[]): Promise<ApiResponse<number[]>> => {
  const url = getApiUrl('/user-book-favorites');
  const headers = createHeaders('application/json');
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ ids })
  });
  return handleApiResponse<number[]>(response);
};

// Book search result interface
export interface BookSearchResult {
  id: number;
  gutendex_id: number;
  title: string;
  authors: string;
  cover_url?: string;
  download_count: number;
  language: string;
  copyright: boolean;
  subjects?: string;
  text_url?: string;
  created_at: string;
}

export interface BookSearchResponse {
  books: BookSearchResult[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Search books
export const searchBooks = async (
  query: string,
  page: number = 1,
  perPage: number = 10
): Promise<BookSearchResponse> => {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    per_page: String(perPage)
  });
  const url = getApiUrl(`/books/search?${params.toString()}`);
  const headers = createHeaders();
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });

  if (!response.ok) {
    throw new Error(`Book search failed: ${response.status}`);
  }
  return response.json();
};

// Book chapter interface
export interface BookChapter {
  id: number;
  book_id: number;
  chapter_index: number;
  chapter_title: string;
  chapter_text: string;
  created_at: string;
}

// Get book chapters
export const getBookChapters = async (bookId: number): Promise<BookChapter[]> => {
  const url = getApiUrl(`/books/${bookId}/chapters`);
  const headers = createHeaders();
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });

  if (!response.ok) {
    throw new Error(`Failed to get chapters: ${response.status}`);
  }
  return response.json();
};

// Get cached chapter audio
export interface ChapterAudio {
  id: number;
  chapter_id: number;
  voice_model: string;
  speaking_rate: number;
  level: string;
  mp3_url: string;
  vtt_url?: string;
  created_at: string;
}

export const getChapterAudio = async (
  bookId: number,
  chapterId: number,
  voiceModel: string,
  speakingRate: number,
  level: string
): Promise<ChapterAudio | null> => {
  const params = new URLSearchParams({
    voice_model: voiceModel,
    speaking_rate: String(speakingRate),
    level
  });
  const url = getApiUrl(`/books/${bookId}/chapters/${chapterId}/audio?${params.toString()}`);
  const headers = createHeaders();
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to get chapter audio: ${response.status}`);
  }
  return response.json();
};

// Hashtag / hobi haber maddesi tipi
export interface HashtagNewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceName?: string;
  author?: string;
  publishedAt?: string;
  language?: string;
  type?: string;
}

// Belirli bir hashtag / konu için en güncel haberleri getir
export const getHashtagNews = async (
  query: string,
  limit: number,
  language: string = 'en'
): Promise<ApiResponse<HashtagNewsItem[]>> => {
  const url = getApiUrl('/content/process-hashtag');
  const headers = createHeaders('application/json');

  const body = JSON.stringify({
    query,
    limit,
    language,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body,
  });

  return handleApiResponse<HashtagNewsItem[]>(response);
};

// Haber URL'sinden tam metni getir
export const fetchArticleDetails = async (
  url: string
): Promise<ApiResponse<{ url: string; text: string; length: number }>> => {
  const apiUrl = getApiUrl('/content/article-details');
  const headers = createHeaders('application/json');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ url }),
  });

  return handleApiResponse<{ url: string; text: string; length: number }>(response);
};

// Create a document + sections from already extracted text (e.g. uploaded PDF)
export const createDocumentFromText = async (
  title: string,
  text: string
): Promise<DocumentUploadResponse> => {
  const url = getApiUrl('/documents/from-text');
  const headers = createHeaders('application/json');

  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ title, text }),
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      try {
        const textBody = await response.text();
        if (textBody) {
          errorMessage = `${errorMessage}: ${textBody}`;
        }
      } catch {
        // ignore
      }
    }
    throw new Error(errorMessage);
  }

  const json = await response.json();
  return json as DocumentUploadResponse;
};

// Save favorite book IDs for authenticated user
export const saveUserBookFavorites = async (ids: Array<number | string>): Promise<ApiResponse<number[]>> => {
  const url = getApiUrl('/user-book-favorites');
  const headers = createHeaders('application/json');
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ ids }),
  });
  return handleApiResponse<number[]>(response);
};

// User settings
export const getUserSettings = async (): Promise<{ default_voice?: string; settings?: any }> => {
  const url = getApiUrl('/user-settings');
  const headers = createHeaders();
  const res = await fetch(url, { headers, credentials: 'include' });
  if (!res.ok) throw new Error('Kullanıcı ayarları alınamadı');
  const json = await res.json();
  return json.data || {};
};

export const saveDefaultVoice = async (voice: string): Promise<void> => {
  const url = getApiUrl('/user-settings/default-voice');
  const headers = createHeaders('application/json');
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ voice }), credentials: 'include' });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Varsayılan ses kaydedilemedi: ${txt}`);
  }
};

export const saveInterfaceLanguage = async (language: 'tr' | 'en' | 'de' | 'ar'): Promise<void> => {
  const url = getApiUrl('/user-settings/interface-language');
  const headers = createHeaders('application/json');
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ language }),
    credentials: 'include',
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Arayüz dili kaydedilemedi: ${txt || res.statusText}`);
  }
};

// ==========================================
// LIBRARY SYSTEM API
// ==========================================

export interface LibraryItem {
  id: string; // 'book_123' or 'doc_456'
  real_id: number;
  type: 'book' | 'document';
  title: string;
  author: string;
  cover_url?: string;
  progress: number; // 0-100
  current_chapter: number;
  last_accessed: string;
  is_finished: boolean;
}

// Fetch combined library (Books + Docs)
export const getLibrary = async (): Promise<ApiResponse<LibraryItem[]>> => {
  const url = getApiUrl('/library');
  const headers = createHeaders();
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  return handleApiResponse<LibraryItem[]>(response);
};

// Update reading progress
export const updateProgress = async (
  type: 'book' | 'document',
  id: number,
  progressData: {
    chapterIndex?: number;
    positionSeconds?: number;
    progressPercentage?: number;
    isFinished?: boolean;
  }
): Promise<ApiResponse> => {
  const url = getApiUrl('/library/progress');
  const headers = createHeaders('application/json');
  const body = JSON.stringify({ type, id, ...progressData });

  // Use sendBeacon for more reliable updates on page unload if supported
  // But for now, stick to fetch for consistency
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
    credentials: 'include'
  });
  return handleApiResponse(response);
};

// Get library item details (chapters, progress)
export interface ChapterInfo {
  id: number;
  index: number;
  title: string;
  content: string;
}

export interface LibraryItemDetails {
  item: {
    id: number;
    title: string;
    author: string;
    cover_url?: string;
    type: 'book' | 'document';
  };
  chapters: ChapterInfo[];
  progress: {
    current_chapter_index: number;
    current_position_seconds: number;
    progress_percentage: number;
    is_finished: boolean;
  };
}

export const getLibraryItemDetails = async (
  id: number,
  type: 'book' | 'document'
): Promise<ApiResponse<LibraryItemDetails>> => {
  const url = getApiUrl(`/library/${id}?type=${type}`);
  const headers = createHeaders();
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  return handleApiResponse<LibraryItemDetails>(response);
};

// Hobi için 200 öneri oluştur ve kaydet
export const generateHobbySuggestions = async (hobby: string): Promise<any> => {
  const apiUrl = `${getApiUrl("hobby-suggestions/generate")}`;

  try {
    const headers = createHeaders('application/json');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ hobby }),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: errorText };
      }
      throw new Error(error.message || 'Hobi önerileri oluşturulamadı');
    }

    return await response.json();
  } catch (error) {
    console.error('🚨 Hobi önerileri oluşturulurken hata:', error);
    throw error;
  }
};

// Hobi için rastgele 5 öneri getir
export const getRandomHobbySuggestions = async (hobby: string): Promise<any> => {
  const apiUrl = `${getApiUrl("hobby-suggestions/random")}`;

  try {
    const headers = createHeaders('application/json');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ hobby }),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: errorText };
      }
      throw new Error(error.message || 'Hobi önerileri getirilemedi');
    }

    return await response.json();
  } catch (error) {
    console.error('🚨 Hobi önerileri getirilirken hata:', error);
    throw error;
  }
};

// Hobi önerilerinin var olup olmadığını kontrol et
export const checkHobbyExists = async (hobby: string): Promise<any> => {
  const apiUrl = `${getApiUrl("hobby-suggestions/check")}?hobby=${encodeURIComponent(hobby)}`;

  try {
    const headers = createHeaders('application/json');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Hobi kontrol edilemedi');
    }

    return await response.json();
  } catch (error) {
    console.error('🚨 Hobi kontrol edilirken hata:', error);
    throw error;
  }
};

// Kullanıcı ilgi alanlarını getirmek için API isteği gönderen fonksiyon
export const getUserInterests = async (): Promise<any> => {
  const apiUrl = `${getApiUrl("user-interests")}`;

  try {
    const headers = createHeaders('application/json');

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
      credentials: 'include'
    });

    if (!response.ok) {
      // Status kodu 200 değilse
      const errorText = await response.text();
      let errorMessage = `İlgi alanları alınamadı (${response.status})`;

      try {
        // JSON olarak ayrıştırmayı dene
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (jsonError) {
        // JSON ayrıştırma hatası, ham metni kullan
        console.error("Error response is not valid JSON:", errorText);
      }

      throw new Error(errorMessage);
    }

    try {
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        return { data: [] }; // Boş yanıt için güvenli değer
      }

      return JSON.parse(responseText);
    } catch (jsonError) {
      console.error("Failed to parse response as JSON:", jsonError);
      // İlgi alanları API yanıtı ayrıştırılamadı
      throw new Error("Sunucu yanıtı işlenirken hata oluştu");
    }
  } catch (error: any) {
    console.error('İlgi alanları alınırken hata oluştu:', error);
    throw error;
  }
};

// Kullanıcı ilgi alanlarını güncellemek için API isteği gönderen fonksiyon
export const updateUserInterests = async (interests: string[]): Promise<any> => {
  const apiUrl = `${getApiUrl("user-interests")}`;

  try {
    console.log("İlgi alanları güncelleniyor:", { interests, apiUrl });

    const headers = createHeaders('application/json');

    // İstek gövdesi
    const requestBody = { interests };
    console.log("İstek gövdesi:", JSON.stringify(requestBody));

    // API isteği
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(requestBody),
      credentials: 'include'
    });

    console.log("API yanıt durumu:", response.status, response.statusText);

    if (!response.ok) {
      // Status kodu 200 değilse
      const errorText = await response.text();
      console.error("API hata yanıtı:", errorText);

      let errorMessage = `İlgi alanları güncellenemedi (${response.status})`;

      try {
        // JSON olarak ayrıştırmayı dene
        const errorData = JSON.parse(errorText);
        if (errorData.error || errorData.message) {
          errorMessage = errorData.error || errorData.message;
        }
      } catch (jsonError) {
        // JSON ayrıştırma hatası, ham metni kullan
        console.error("Error response is not valid JSON:", errorText);
      }

      throw new Error(errorMessage);
    }

    try {
      const responseText = await response.text();
      console.log("API başarı yanıtı:", responseText);

      if (!responseText || responseText.trim() === '') {
        return { success: true }; // Boş yanıt için güvenli değer
      }

      return JSON.parse(responseText);
    } catch (jsonError) {
      console.error("Failed to parse response as JSON:", jsonError);
      // Sunucu yanıtı ayrıştırılamadı
      throw new Error("Sunucu yanıtı işlenirken hata oluştu");
    }
  } catch (error: any) {
    console.error('İlgi alanları güncellenirken hata oluştu:', error);
    throw error;
  }
};

// Metni anlatım formatına dönüştürmek için API isteği gönderen fonksiyon
export const rewriteToNarration = async (inputText: string, level: string): Promise<any> => {
  try {
    console.log('[API] rewriteToNarration called with:', { textLength: inputText.length, level });

    const token = getToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const url = getApiUrl('narration/rewrite');
    console.log('[API] rewriteToNarration URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        input_text: inputText,
        level: level
      }),
      credentials: 'include'
    });

    console.log('[API] rewriteToNarration response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] rewriteToNarration error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[API] rewriteToNarration response data:', data);

    return data;
  } catch (error) {
    console.error('[API] rewriteToNarration error:', error);
    throw error;
  }
};

// Konu detay önerileri al (topic-detail/suggestions endpoint)
export const getTopicDetailSuggestions = async (topic: string, level: string): Promise<ApiResponse<{ topic: string; level: string; suggestions: string[] }>> => {
  const apiUrl = getApiUrl("topic-detail/suggestions");
  const headers = createHeaders('application/json');

  console.log("🎯 Topic detail suggestions API çağrısı:", apiUrl, { topic, level });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ topic, level }),
      credentials: 'include'
    });

    console.log("📊 Topic detail suggestions response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Topic detail suggestions error response:", errorText);
      throw new Error(`Topic detail suggestions failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✅ Topic detail suggestions result:", result);
    return result;
  } catch (error) {
    console.error('🚨 Topic detail suggestions alınırken hata oluştu:', error);
    throw error;
  }
};

// Generated suggestions tablosundan konu başlıklarını getir
export const getGeneratedSuggestions = async (): Promise<any> => {
  const apiUrl = `${getApiUrl("topic-detail/generated-suggestions")}`;

  console.log("🎯 Generated suggestions API çağrısı:", apiUrl);

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      credentials: 'include'
    });

    console.log("📊 Generated suggestions response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Generated suggestions error response:", errorText);
      throw new Error(`Generated suggestions failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✅ Generated suggestions result:", result);
    return result;
  } catch (error) {
    console.error('🚨 Generated suggestions alınırken hata oluştu:', error);
    throw error;
  }
};

// Vocabulary API functions
export interface VocabularyWord {
  id?: number;
  word: string;
  original_word?: string;
  definition?: string;
  example_sentence?: string;
  example_sentence_turkish?: string; // Örnek cümlenin Türkçe çevirisi
  notes?: string;
  level?: string;
  is_learned?: boolean;
  original_sentence?: string; // Kelimenin orijinal metindeki cümlesi
  created_at?: string;
  updated_at?: string;
}

export const getVocabulary = async (): Promise<VocabularyWord[]> => {
  try {
    const url = process.env.NODE_ENV === 'development'
      ? 'http://localhost:5001/api/vocabulary'
      : '/api/vocabulary';

    const headers = createHeaders('application/json');

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    throw error;
  }
};

export const addWordToVocabulary = async (word: string, definition?: string, sentence?: string, level?: string): Promise<VocabularyWord> => {
  try {
    const url = process.env.NODE_ENV === 'development'
      ? 'http://localhost:5001/api/vocabulary/add'
      : '/api/vocabulary/add';

    const headers = createHeaders('application/json');

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({
        word,
        definition,
        sentence,
        level
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error adding word to vocabulary:', error);
    throw error;
  }
};

export const deleteWordFromVocabulary = async (wordId: number): Promise<void> => {
  try {
    const url = process.env.NODE_ENV === 'development'
      ? `http://localhost:5001/api/vocabulary/${wordId}`
      : `/api/vocabulary/${wordId}`;

    const headers = createHeaders('application/json');

    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting word from vocabulary:', error);
    throw error;
  }
};

export const updateWordInVocabulary = async (wordId: number, updates: Partial<VocabularyWord>): Promise<VocabularyWord> => {
  try {
    const url = process.env.NODE_ENV === 'development'
      ? `http://localhost:5001/api/vocabulary/${wordId}`
      : `/api/vocabulary/${wordId}`;

    const headers = createHeaders('application/json');

    const response = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error updating word in vocabulary:', error);
    throw error;
  }
};

// Kelime çevirisi ile birlikte ekleme
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
    // Use the existing /add endpoint which already does AI enrichment
    const url = process.env.NODE_ENV === 'development'
      ? 'http://localhost:5001/api/vocabulary/add-with-translation'
      : '/api/vocabulary/add-with-translation';

    const headers = createHeaders('application/json');

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({
        word,
        context, // Backend uses this as example sentence if definition not provided
        definition: undefined, // Let backend enrich via AI
        level,
        sourceContext: originalSentence
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Check if word already exists (409 Conflict)
      if (response.status === 409) {
        return {
          data: errorData.data || { word },
          message: errorData.error || 'Bu kelime zaten listenizde',
          isExisting: true
        };
      }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return {
      data: result.data,
      message: result.message || 'Kelime başarıyla eklendi',
      isExisting: false
    };
  } catch (error) {
    console.error('Error adding word with translation:', error);
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
    const fullUrl = getApiBaseUrl() + '/api/reminder-settings';
    console.log('🔍 [FRONTEND] Getting reminder settings from:', fullUrl);
    console.log('🔍 [FRONTEND] Environment:', process.env.NODE_ENV);
    console.log('🔍 [FRONTEND] API Base URL:', getApiBaseUrl());
    console.log('🔍 [FRONTEND] Axios baseURL:', api.defaults.baseURL);

    const response = await api.get('/api/reminder-settings');
    console.log('✅ [FRONTEND] Reminder settings response:', response.data);
    return response.data.data;
  } catch (error: any) {
    console.error('❌ [FRONTEND] Error getting reminder settings:', error);
    console.log('❌ [FRONTEND] Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method
    });
    console.log('🔄 [FRONTEND] Returning default settings due to error');
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
    console.log('💾 [DEBUG] Saving reminder settings to:', getApiBaseUrl() + '/api/reminder-settings');
    console.log('📤 [DEBUG] Settings being saved:', settings);
    const response = await api.post('/api/reminder-settings', settings);
    console.log('✅ [DEBUG] Save response:', response.data);
  } catch (error) {
    console.error('❌ [DEBUG] Error saving reminder settings:', error);
    throw new Error('Ayarlar kaydedilemedi');
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
    const response = await api.get('/api/subscriptions/my-features');
    if (response.data.success) {
      return response.data.data;
    }
    // Return default features on error
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
        chirp3d: false
      },
      sentence_patterns: {
        enabled: false,
        max_patterns: 0
      }
    }
  };
};

// Check if a specific homepage feature is enabled
export const hasHomepageFeature = (features: PlanFeatures | null, featureName: keyof NonNullable<PlanFeatures['homepage_features']>): boolean => {
  if (!features?.homepage_features) return false;
  return features.homepage_features[featureName] === true;
};

// Check if a specific voice category is enabled
export const hasVoiceCategory = (features: PlanFeatures | null, categoryName: keyof NonNullable<PlanFeatures['voice_categories']>): boolean => {
  if (!features?.voice_categories) return false;
  return features.voice_categories[categoryName] === true;
};

// User Stats Types
export interface UserStats {
  vocabulary: {
    total: number;
    learned: number;
    inProgress: number;
  };
  subscription: {
    plan: string;
    audioCreationCount: number;
  };
  activity: {
    currentStreak: number;
    longestStreak: number;
    dailyGoalProgress: number;
    weeklyActivity: Array<{
      date: string;
      active: boolean;
    }>;
  };
}

// Get user dashboard statistics
export const getUserStats = async (): Promise<UserStats | null> => {
  try {
    // Use the full API path so this hits Express route mounted at /api/stats
    const response = await api.get('/api/stats/dashboard');
    if (response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
};

// Podcast API Types
// Supports both n8n webhook and Google TTS multi-speaker
export interface PodcastCreationParams {
  topic: string;
  level: string;
  duration: number;
  ttsProvider?: string; // 'n8n' (default) or 'google'
  hostSpeakerId?: string;
  guestSpeakerId?: string;
  styleType?: string;
  voiceChoice?: string;
  personalityA?: string;
  personalityB?: string;
  includeHumor?: boolean;
  includeFiller?: boolean;
}

export interface PodcastCreationResponse {
  success?: boolean;
  status?: string;
  message?: string;
  podcast_url?: string;
  transcript?: string;
  dialogue?: string;
  audio_url?: string;
  vtt_subtitles?: string;
  srt_subtitles?: string;
  duration_seconds?: string;
  file_name?: string;
  // MFA alignment data from backend (for precise sync on web)
  timepoints?: Array<{
    timeSeconds: number;
    endTimeSeconds?: number;
    word?: string;
    markName?: string;
  }>;
  words?: string[];
  data?: any;
}

// Get external service configuration
const getExternalServiceConfig = async (serviceName: string): Promise<any> => {
  try {
    const url = getApiUrl(`external-services/public/${serviceName}`);
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Service configuration not found: ${serviceName}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error: any) {
    console.error('🔧 [CONFIG] Error fetching service config:', error);
    throw error;
  }
};

// Create podcast - use backend proxy /api/tts/create-podcast
export const createPodcast = async (params: PodcastCreationParams): Promise<PodcastCreationResponse> => {
  try {
    console.log('🎙️ [PODCAST] Creating podcast via backend with params:', params);

    // Backend TTS route will proxy to n8n and normalize response
    const url = getApiUrl('tts/create-podcast');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    // Attach auth token like axios interceptor does
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('lingroot_token');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🎙️ [PODCAST] Backend error response:', errorText);
      let errorData: any;
      try {
        errorData = errorText ? JSON.parse(errorText) : null;
      } catch {
        errorData = { message: errorText };
      }
      throw new Error(errorData?.message || `Podcast oluşturma başarısız: ${response.status}`);
    }

    const rawBody = await response.text();
    if (!rawBody || rawBody.trim().length === 0) {
      throw new Error('Podcast service returned empty response body (HTTP 200).');
    }
    let result: any;
    try {
      result = JSON.parse(rawBody);
    } catch (e) {
      console.error('🎙️ [PODCAST] Backend returned non-JSON response:', rawBody?.slice(0, 500));
      throw new Error('Podcast service returned non-JSON response from backend.');
    }
    console.log('🎙️ [PODCAST] Backend success response:', result);
    console.log('🎙️ [PODCAST] Dialogue field check:', {
      hasDialogue: !!result.dialogue,
      dialogueLength: result.dialogue?.length || 0,
      dialoguePreview: result.dialogue?.substring(0, 100),
      hasTranscript: !!result.transcript,
    });

    // Backend already normalizes keys for web & mobile clients
    // Ensure shape matches PodcastCreationResponse expected by welcome.tsx
    const audioUrl = result.podcast_url || result.audio_url || result.mp3_url;
    const vttUrl = result.vtt_subtitles || result.vtt_url || '';
    const responseBody: PodcastCreationResponse = {
      success: !!result.success,
      status: result.status,
      message: result.message,
      podcast_url: audioUrl,
      audio_url: audioUrl,
      vtt_subtitles: vttUrl,
      srt_subtitles: result.srt_subtitles,
      duration_seconds: result.duration_seconds,
      file_name: result.file_name,
      transcript: result.transcript || result.topic,
      dialogue: result.dialogue,
      // Pass through MFA word timings so web player can use them directly
      timepoints: Array.isArray(result.timepoints) ? result.timepoints : [],
      words: Array.isArray(result.words) ? result.words : [],
      data: result.data,
    };

    return responseBody;
  } catch (error: any) {
    console.error('🎙️ [PODCAST] Error creating podcast via backend:', error);
    throw error;
  }
};

// ============================================
// MFA API Functions (uses separate MFA backend)
// ============================================

export const mfaService = {
  // Setup MFA - Generate QR code
  async setupMfa(): Promise<{ success: boolean; qrCode?: string; secret?: string; message?: string }> {
    try {
      const response = await mfaApi.post('/api/mfa/setup');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'MFA kurulumu başarısız';
      throw new Error(msg);
    }
  },

  // Verify MFA setup with token
  async verifyMfaSetup(token: string): Promise<{ success: boolean; backupCodes?: string[]; message?: string }> {
    try {
      const response = await mfaApi.post('/api/mfa/verify-setup', { token });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'MFA doğrulama başarısız';
      throw new Error(msg);
    }
  },

  // Verify MFA token during login
  async verifyMfaLogin(token: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await mfaApi.post('/api/mfa/verify-login', { token });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'MFA doğrulama başarısız';
      throw new Error(msg);
    }
  },

  // Disable MFA
  async disableMfa(password: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await mfaApi.post('/api/mfa/disable', { password });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'MFA devre dışı bırakılamadı';
      throw new Error(msg);
    }
  },

  // Get MFA status
  async getMfaStatus(): Promise<{ success: boolean; mfaEnabled?: boolean; message?: string }> {
    try {
      const response = await mfaApi.get('/api/mfa/status');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'MFA durumu alınamadı';
      throw new Error(msg);
    }
  },

  // Regenerate backup codes
  async regenerateBackupCodes(password: string): Promise<{ success: boolean; backupCodes?: string[]; message?: string }> {
    try {
      const response = await mfaApi.post('/api/mfa/regenerate-backup-codes', { password });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Yedek kodlar oluşturulamadı';
      throw new Error(msg);
    }
  },

  // Verify backup code
  async verifyBackupCode(code: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await mfaApi.post('/api/mfa/verify-backup-code', { code });
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Yedek kod doğrulaması başarısız';
      throw new Error(msg);
    }
  },
};

// ============================================
// TOPIC HIERARCHY API
// Çok katmanlı konu ağacı sistemi
// ============================================

export interface Topic {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  level: string;
  depth: number;
  order_index: number;
  is_manual: boolean;
  keywords: string[];
  created_at: string;
  updated_at: string;
  children?: Topic[];
  latest_content?: TopicContent | null;
  mood_tag?: string | null;
}

export interface TopicContent {
  id: string;
  topic_id: string;
  mp3_url: string | null;
  vtt_url: string | null;
  text_content: string | null;
  translated_text: string | null;
  adapted_text: string | null;
  level: string | null;
  voice_model: string | null;
  speaking_rate: number | null;
  duration_seconds: number | null;
  words: string[];
  timepoints: any;
  created_at: string;
  listened_at: string | null;
  // Listening progress fields
  last_position_seconds?: number;
  total_duration_seconds?: number;
  progress_percentage?: number;
  is_completed?: boolean;
  last_listened_at?: string | null;
}


/**
 * Ana konu oluştur
 */
export const createMainTopic = async (data: {
  title: string;
  description?: string;
  level?: string;
  mood?: string;
}): Promise<ApiResponse<{ topic: Topic }>> => {
  const url = getApiUrl('topic-hierarchy/topics');
  const headers = createHeaders('application/json');
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(data)
  });
  return await handleApiResponse(response);
};

/**
 * OpenAI ile alt konu üret
 */
export const generateSubtopics = async (
  topicId: string,
  data: {
    count?: number;
    language?: string;
    angle?: string;
  }
): Promise<ApiResponse<{ subtopics: Topic[] }>> => {
  const url = getApiUrl(`topic-hierarchy/topics/${topicId}/subtopics`);
  const headers = createHeaders('application/json');
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(data)
  });
  return await handleApiResponse(response);
};

/**
 * Manuel alt konu ekle
 */
export const addManualSubtopic = async (
  topicId: string,
  data: {
    title: string;
    description?: string;
  }
): Promise<ApiResponse<{ subtopic: Topic }>> => {
  const url = getApiUrl(`topic-hierarchy/topics/${topicId}/subtopics/manual`);
  const headers = createHeaders('application/json');
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(data)
  });
  return await handleApiResponse(response);
};

/**
 * Kullanıcının tüm konu ağacını getir
 */
export const getTopicTree = async (): Promise<ApiResponse<{
  topics: Topic[];
  total: number;
}>> => {
  const url = getApiUrl('topic-hierarchy/topics/tree');
  const headers = createHeaders();
  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include'
  });
  return await handleApiResponse(response);
};

/**
 * Breadcrumb için konu yolunu getir
 */
export const getTopicPath = async (topicId: string): Promise<ApiResponse<{
  path: Topic[];
}>> => {
  const url = getApiUrl(`topic-hierarchy/topics/${topicId}/path`);
  const headers = createHeaders();
  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include'
  });
  return await handleApiResponse(response);
};

/**
 * Konu ve tüm alt konularını sil
 */
export const deleteTopicAndChildren = async (topicId: string): Promise<ApiResponse> => {
  const url = getApiUrl(`topic-hierarchy/topics/${topicId}`);
  const headers = createHeaders();
  const response = await fetch(url, {
    method: 'DELETE',
    headers,
    credentials: 'include'
  });
  return await handleApiResponse(response);
};

/**
 * Konudan TTS içerik oluştur (bilgi getir, TTS workflow'u tetikle)
 */
export const createContentFromTopic = async (
  topicId: string,
  data?: {
    voice?: string;
    speaking_rate?: number;
  }
): Promise<ApiResponse<{
  topic: Topic;
  suggested_input: string;
}>> => {
  const url = getApiUrl(`topic-hierarchy/topics/${topicId}/create-content`);
  const headers = createHeaders('application/json');
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(data || {})
  });
  return await handleApiResponse(response);
};

/**
 * Konu sesini dinlenmiş olarak işaretle
 */
export const markTopicAudioListened = async (mp3Url: string): Promise<ApiResponse> => {
  const url = getApiUrl('topic-hierarchy/topics/mark-listened');
  const headers = createHeaders('application/json');
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ mp3_url: mp3Url })
  });
  return await handleApiResponse(response);
};

// ===================== NOTIFICATION API =====================

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  link?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  success: boolean;
  data: NotificationItem[];
  total: number;
  unreadCount: number;
  limit: number;
  offset: number;
}

export interface UnreadCountResponse {
  success: boolean;
  unreadCount: number;
}

/**
 * Get all notifications for the authenticated user
 */
export const getNotifications = async (
  limit: number = 20,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<NotificationListResponse> => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    unreadOnly: String(unreadOnly)
  });
  const url = getApiUrl(`notifications?${params.toString()}`);
  const headers = createHeaders();
  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch notifications: ${response.status}`);
  }
  return await response.json();
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (): Promise<UnreadCountResponse> => {
  const url = getApiUrl('notifications/unread-count');
  const headers = createHeaders();
  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch unread count: ${response.status}`);
  }
  return await response.json();
};

/**
 * Mark a specific notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<ApiResponse> => {
  const url = getApiUrl(`notifications/${notificationId}/read`);
  const headers = createHeaders();
  const response = await fetch(url, {
    method: 'PUT',
    headers,
    credentials: 'include'
  });
  return await handleApiResponse(response);
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<ApiResponse> => {
  const url = getApiUrl('notifications/read-all');
  const headers = createHeaders();
  const response = await fetch(url, {
    method: 'PUT',
    headers,
    credentials: 'include'
  });
  return await handleApiResponse(response);
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string): Promise<ApiResponse> => {
  const url = getApiUrl(`notifications/${notificationId}`);
  const headers = createHeaders();
  const response = await fetch(url, {
    method: 'DELETE',
    headers,
    credentials: 'include'
  });
  return await handleApiResponse(response);
};

// ===================== ADMIN NOTIFICATION API =====================

/**
 * Send notification to a user or all users (Admin only)
 */
export const sendNotification = async (data: {
  userId: string | 'all';
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}): Promise<ApiResponse> => {
  const url = getApiUrl('admin/notifications/send');
  const headers = createHeaders('application/json');
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(data)
  });
  return await handleApiResponse(response);
};

/**
 * Get notification history (Admin only)
 */
export const getNotificationHistory = async (
  limit: number = 50,
  offset: number = 0
): Promise<NotificationListResponse> => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });
  const url = getApiUrl(`admin/notifications/history?${params.toString()}`);
  const headers = createHeaders();
  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch notification history: ${response.status}`);
  }
  return await response.json();
};

// ==========================================
// LISTENING PROGRESS TRACKING API
// ==========================================

export interface IncompleteListeningItem {
  id: string;
  topic_id: string;
  mp3_url: string;
  vtt_url?: string;
  last_position_seconds: number;
  total_duration_seconds: number;
  progress_percentage: number;
  last_listened_at: string;
  created_at: string;
  words?: string[];
  timepoints?: Array<{ timeSeconds: number; endTimeSeconds?: number; word?: string }>;
  adapted_text?: string;
  translated_text?: string;
  topics: {
    id: string;
    title: string;
    level: string;
    parent_id: string | null;
  };
}

/**
 * Dinleme pozisyonunu kaydet
 */
export const saveListeningProgress = async (
  mp3_url: string,
  position_seconds: number,
  total_duration: number
): Promise<ApiResponse<{ position_seconds: number; progress_percentage: number; is_completed: boolean }>> => {
  const url = getApiUrl('/topic-hierarchy/topics/save-progress');
  const headers = createHeaders('application/json');
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ mp3_url, position_seconds, total_duration })
  });
  return handleApiResponse(response);
};

/**
 * Yarıda kalan dinlemeleri getir
 */
export const getIncompleteListenings = async (): Promise<ApiResponse<{ incomplete: IncompleteListeningItem[]; count: number }>> => {
  const url = getApiUrl('/topic-hierarchy/topics/incomplete');
  const headers = createHeaders();
  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include'
  });
  return handleApiResponse(response);
};

/**
 * Belirli bir içeriğin dinleme durumunu getir
 */
export const getListeningProgress = async (
  mp3_url: string
): Promise<ApiResponse<{
  position_seconds: number;
  total_duration_seconds: number;
  progress_percentage: number;
  is_completed: boolean;
  last_listened_at: string | null;
  listened_at: string | null;
  title: string;
}>> => {
  const encodedUrl = encodeURIComponent(mp3_url);
  const url = getApiUrl(`/topic-hierarchy/topics/progress/${encodedUrl}`);
  const headers = createHeaders();
  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include'
  });
  return handleApiResponse(response);
};
