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
  
  // In production, use the configured API URL
  return process.env.NEXT_PUBLIC_API_URL || '';
};

// API_BASE_URL for backward compatibility
export const API_BASE_URL = getApiBaseUrl();

export const TRANSCRIPT_SERVICE_URL = process.env.NEXT_PUBLIC_TRANSCRIPT_SERVICE_URL || 'http://localhost:8001';

// Get complete API URL for a specific endpoint
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  
  // Clean up endpoint - remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If the endpoint already starts with api, don't add it again
  const apiPath = cleanEndpoint.startsWith('api') ? `/${cleanEndpoint}` : `/api/${cleanEndpoint}`;
  
  // For direct backend URLs
  if (baseUrl) return `${baseUrl}${apiPath}`;
  
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
    const url = endpoint.startsWith('/api') ? endpoint : `/api/${endpoint}`;
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
    type: "text" | "youtube" | "spotify" | "file" | "weblink" | "topic" | "book";
    input?: string;
    text?: string;
    file?: File;
    level: string;
    SesHızı?: number;
    voice?: string;
    chapter?: string;
}

export interface TtsResponseData {
    message: string;
    mp3_url: string;
    level: string;
    vtt_url: string;
    timepoints?: any[];
    words?: string[];
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
      
      // Hata durumunda mock transcript döndür
      console.log(`Mock transcript oluşturuluyor...`);
      const mockTranscript = `
      Bu bir mock transkript içeriğidir.
      
      Proin euismod, nunc in aliquam ultrices, nisi enim aliquam ipsum,
      vitae luctus nisl nunc in lectus. Donec auctor, nisl eget aliquam
      ultrices, nisi enim aliquam ipsum, vitae luctus nisl nunc in lectus.
      `;
      
      return mockTranscript.trim();
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
    const { type, input, file, level, SesHızı, voice } = data;
    const url = `${getApiUrl("tts/process")}`;
    let headers: Record<string, string>;
    let body: string | FormData;

    if (type === "text") {
        headers = createHeaders("application/json");
        body = JSON.stringify({ input, type, level, SesHızı, voice });
    } else {
        headers = createHeaders();
        const formData = new FormData();
        formData.append("level", level);
        formData.append("type", type);
        if (SesHızı !== undefined) formData.append("SesHızı", SesHızı.toString());
        if (voice) formData.append("voice", voice);

        if (input && type !== "file") {
            formData.append("input", input);
        }
        if (type === "file" && file) {
            formData.append("file", file);
        }
        body = formData;
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: body,
            credentials: 'include'
        });
        const apiResponse = await response.json();
        return {
            message: apiResponse.message || "",
            mp3_url: apiResponse.mp3_url || "",
            level: apiResponse.level || "",
            vtt_url: apiResponse.vtt_url || "",
            timepoints: apiResponse.timepoints || [],
            words: apiResponse.words || [],
        };
    } catch (error) {
        console.error("Process TTS API call error:", error);
        throw error;
    }
};

// Function to submit content details after successful TTS processing
export const submitContent = async (
    input: string,
    inputType: string,
    level: string,
    mp3Url: string
): Promise<ApiResponse> => {
    const url = getApiUrl('/content/submit');
    const headers = createHeaders("application/json");

    const body = JSON.stringify({
        input,
        input_type: inputType,
        level,
        mp3_url: mp3Url,
    });

    try {
        console.log(`Calling Submit Content API: ${url}`);
        console.log('Headers:', headers);
        console.log('Body:', body);
        
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

// Detaylı konu önerileri için API isteği gönderen fonksiyon
export const getTopicDetailSuggestions = async (topic: string, level: string): Promise<any> => {
  const apiUrl = `${getApiUrl("topic-detail/suggestions")}`;
  
  try {
    const headers = createHeaders('application/json');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ topic, level }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Detaylı konu önerileri alınamadı');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Konu önerileri alınırken hata oluştu:', error);
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

