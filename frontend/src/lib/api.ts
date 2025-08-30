// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const process: {
  env: {
    NEXT_PUBLIC_API_URL?: string;
    NEXT_PUBLIC_TRANSCRIPT_SERVICE_URL?: string;
    NODE_ENV?: string;
    [key: string]: string | undefined;
  };
};

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

// API_BASE_URL for backward compatibility
export const API_BASE_URL = getApiBaseUrl();

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

export interface ProcessInputData {
    type: "text" | "youtube" | "spotify" | "file" | "weblink" | "topic" | "book" | "subject";
    input?: string;
    text?: string;
    file?: File;
    level: string;
    SesHızı?: number;
    voice?: string;
    chapter?: string;
    chapter_id?: string;
    suppressPlanAlerts?: boolean;
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
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    mp3_url?: string;
    vtt_url?: string;
    level?: string;
}

// YouTube transcript servisini çağırmak için fonksiyon
export const fetchYoutubeTranscript = async (youtubeUrl: string, languageCode: string = 'en'): Promise<string | null> => {
  try {
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
    } catch {}
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
    const { type, input, file, level, SesHızı, voice, chapter_id, suppressPlanAlerts } = data;
    const url = `${getApiUrl("tts/process")}`;
    let headers: Record<string, string>;
    let body: string | FormData;

    if (type === "text") {
        headers = createHeaders("application/json");
        const payload = { input, type, level, SesHızı, voice, chapter_id } as any;
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
    adaptedText?: string
): Promise<ApiResponse> => {
    const url = getApiUrl('/content/submit');
    const headers = createHeaders("application/json");

    const body = JSON.stringify({
        input,
        input_type: inputType,
        level,
        mp3_url: mp3Url,
        translated_text: translatedText || '',
        adapted_text: adaptedText || '',
    });

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
            adaptedText: adaptedText || 'EMPTY'
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
            throw new Error(`Submit Content failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        return await handleApiResponse(response);
    } catch (error) {
        console.error("Submit Content API call error:", error);
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

// Detaylı konu önerileri için API isteği gönderen fonksiyon
export const getTopicDetailSuggestions = async (topic: string, level: string): Promise<any> => {
  const apiUrl = `${getApiUrl("topic-detail/suggestions")}`;
  
  console.log("🔗 API URL:", apiUrl);
  console.log("📝 Request data:", { topic, level });
  
  try {
    const headers = createHeaders('application/json');
    console.log("📋 Headers:", headers);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ topic, level }),
      credentials: 'include'
    });
    
    console.log("📊 Response status:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error response:", errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: errorText };
      }
      throw new Error(error.message || 'Detaylı konu önerileri alınamadı');
    }
    
    const result = await response.json();
    console.log("✅ Success response:", result);
    return result;
  } catch (error) {
    console.error('🚨 Konu önerileri alınırken hata oluştu:', error);
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
        context,
        level,
        originalSentence
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
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
    
    const response = await api.get('/reminder-settings'); // REMOVED /api/ prefix
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
    const response = await api.post('/reminder-settings', settings); // REMOVED /api/ prefix
    console.log('✅ [DEBUG] Save response:', response.data);
  } catch (error) {
    console.error('❌ [DEBUG] Error saving reminder settings:', error);
    throw new Error('Ayarlar kaydedilemedi');
  }
};

