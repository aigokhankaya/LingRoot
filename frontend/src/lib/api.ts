
// Common types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    code?: string;
    [key: string]: any;
}

/**
* Constructs the full API URL given a path.
*/
export const getApiUrl = (path: string): string => {
    if (!path) return '/api';
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `/api/${cleanPath}`;
};

/**
* Creates standard headers for API requests.
*/
export const createHeaders = (contentType: string = 'application/json'): HeadersInit => {
    const headers: Record<string, string> = {
        'Content-Type': contentType,
    };
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('lingroot_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const lang = localStorage.getItem('lingroot_interfaceLanguage');
        if (lang) {
            headers['Accept-Language'] = lang;
        }
    }
    return headers;
};

// --- Helper for standardized fetch calls ---
async function fetchApi<T = any>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = getApiUrl(path);
    const headers = createHeaders();
    const config = {
        ...options,
        headers: {
            ...headers,
            ...options.headers,
        },
        credentials: 'include' as RequestCredentials,
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        if (!response.ok) {
            console.error(`API Error (${path}):`, data.message);
        }
        return data;
    } catch (error: any) {
        console.error(`Network Error (${path}):`, error);
        return { success: false, message: error.message || 'Network error' };
    }
}

// --- Auth & User Settings ---

export const getUserSettings = async () => fetchApi('user-settings');

export const resendVerificationEmail = async (email: string) =>
    fetchApi('auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email })
    });

// --- Notifications ---

export const getUnreadNotificationCount = async () => fetchApi('notifications/unread-count');
export const getNotifications = async (page = 1, limit = 20) => fetchApi(`notifications?page=${page}&limit=${limit}`);
export const markNotificationAsRead = async (id: string) => fetchApi(`notifications/${id}/read`, { method: 'PUT' });
export const markAllNotificationsAsRead = async () => fetchApi('notifications/read-all', { method: 'PUT' });
export const deleteNotification = async (id: string) => fetchApi(`notifications/${id}`, { method: 'DELETE' });

// --- Vocabulary ---

export const lookupVocabularyWord = async (word: string, context?: string) =>
    fetchApi('vocabulary/lookup', {
        method: 'POST',
        body: JSON.stringify({ word, context })
    });

export const addWordWithTranslation = async (data: any) =>
    fetchApi('vocabulary/add-with-translation', {
        method: 'POST',
        body: JSON.stringify(data)
    });

// --- Topic Hierarchy ---

export const getTopicTree = async () => fetchApi('topic-hierarchy');
export const createMainTopic = async (title: string, language: string) =>
    fetchApi('topic-hierarchy', {
        method: 'POST',
        body: JSON.stringify({ title, language })
    });
export const generateSubtopics = async (parentId: string, parentTitle: string) =>
    fetchApi('topic-hierarchy/generate-subtopics', {
        method: 'POST',
        body: JSON.stringify({ parentId, parentTitle })
    });
export const addManualSubtopic = async (parentId: string, title: string) =>
    fetchApi('topic-hierarchy/manual', {
        method: 'POST',
        body: JSON.stringify({ parentId, title })
    });
export const deleteTopicAndChildren = async (id: string) =>
    fetchApi(`topic-hierarchy/${id}`, { method: 'DELETE' });

export const getTopicDetailSuggestions = async (topicTitle: string, language: string) =>
    fetchApi('topic-suggest/suggestions', {
        method: 'POST',
        body: JSON.stringify({ topic: topicTitle, language })
    });

// --- Content & TTS ---

export const processTts = async (text: string, voiceId?: string, speed?: number) =>
    fetchApi('tts/process', {
        method: 'POST',
        body: JSON.stringify({ text, voiceId, speed })
    });

export const submitContent = async (data: any) =>
    fetchApi('content/submit', {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const markTopicAudioListened = async (topicId: string, duration: number) =>
    fetchApi('topic-mastery/listen', {
        method: 'POST',
        body: JSON.stringify({ topicId, duration })
    });

export const getIncompleteListenings = async () => fetchApi('content/incomplete');

export const saveListeningProgress = async (id: string, progress: number, duration: number) =>
    fetchApi(`content/${id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ progress, duration })
    });

export const getListeningProgress = async (id: string) => fetchApi(`content/${id}/progress`);

export const getContentHistory = async (userId: string, page = 1) =>
    fetchApi(`users/${userId}/audio-history?page=${page}`);

export const createPodcast = async (options: any) =>
    fetchApi('podcasts/create', {
        method: 'POST',
        body: JSON.stringify(options)
    });

export const createDocumentFromText = async (text: string, title?: string) =>
    fetchApi('documents/create-from-text', {
        method: 'POST',
        body: JSON.stringify({ text, title })
    });

export const fetchArticleDetails = async (url: string) =>
    fetchApi('external-services/fetch-article', {
        method: 'POST',
        body: JSON.stringify({ url })
    });

export const getHashtagNews = async (hashtag: string) =>
    fetchApi(`external-services/hashtag-news?hashtag=${encodeURIComponent(hashtag)}`);

// --- User Stats & Interests ---

export const getUserStats = async (userId: string) => fetchApi(`users/${userId}/stats`);
export const getUsageSummary = async (userId: string) => fetchApi(`users/${userId}/usage`);

export const getUserInterests = async () => fetchApi('user-sectors/interests'); // user-sectorRoutes usually handles this or userRoutes
export const updateUserInterests = async (interests: string[]) =>
    fetchApi('user-sectors/interests', {
        method: 'PUT',
        body: JSON.stringify({ interests })
    });

export const saveUserBookFavorites = async (bookIds: string[]) =>
    fetchApi('user-book-favorites', {
        method: 'POST',
        body: JSON.stringify({ ids: bookIds })
    });

// --- Suggestions ---

export const generateHobbySuggestions = async (hobbies: string[]) =>
    fetchApi('hobby-suggestions/generate', {
        method: 'POST',
        body: JSON.stringify({ hobbies })
    });

export const getRandomHobbySuggestions = async () => fetchApi('hobby-suggestions/random');

// --- Export 'api' object for compatibility ---

export const api = {
    getApiUrl,
    createHeaders,
    getUserSettings,
    resendVerificationEmail,
    getUnreadNotificationCount,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    lookupVocabularyWord,
    addWordWithTranslation,
    getTopicTree,
    createMainTopic,
    generateSubtopics,
    addManualSubtopic,
    deleteTopicAndChildren,
    getTopicDetailSuggestions,
    processTts,
    submitContent,
    markTopicAudioListened,
    getIncompleteListenings,
    saveListeningProgress,
    getListeningProgress,
    getContentHistory,
    createPodcast,
    createDocumentFromText,
    fetchArticleDetails,
    getHashtagNews,
    getUserStats,
    getUsageSummary,
    getUserInterests,
    updateUserInterests,
    saveUserBookFavorites,
    generateHobbySuggestions,
    getRandomHobbySuggestions
};

export default api;
