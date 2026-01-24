import { getApiUrl, createHeaders, ApiResponse } from './api';

// --- Topic Mastery API ---

export interface TopicMastery {
    user_id: string;
    topic_id: string;
    content_completed: number;
    content_total: number;
    total_listening_seconds: number;
    mastery_score: number;
    avg_rating: number;
    avg_completion_percentage: number;
    status: 'not_started' | 'in_progress' | 'completed' | 'mastered';
    first_interaction_at: string;
    last_interaction_at: string;
    completed_at: string | null;
    topic_name?: string;
    topic_level?: string;
}

export interface MasteryStats {
    total_topics: number;
    mastered_count: number;
    completed_count: number;
    in_progress_count: number;
    avg_mastery_score: number;
    total_listening_seconds: number;
    total_content_completed: number;
}

/**
 * Belirli bir konunun mastery bilgisini getir
 */
export const getTopicMastery = async (topicId: string): Promise<ApiResponse<TopicMastery>> => {
    const url = getApiUrl(`/topic-mastery/${topicId}`);
    const headers = createHeaders();
    const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
    return await handleResponse<TopicMastery>(response);
};

/**
 * Kullanıcının tüm topic mastery'lerini getir
 */
export const getUserMasteries = async (status?: string, limit: number = 50): Promise<ApiResponse<{ count: number; masteries: TopicMastery[] }>> => {
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    if (limit) queryParams.append('limit', limit.toString());

    const url = getApiUrl(`/topic-mastery?${queryParams.toString()}`);
    const headers = createHeaders();
    const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
    return await handleResponse<{ count: number; masteries: TopicMastery[] }>(response);
};

/**
 * Genel mastery istatistiklerini getir
 */
export const getMasteryStats = async (): Promise<ApiResponse<{ stats: MasteryStats }>> => {
    const url = getApiUrl('/topic-mastery/stats');
    const headers = createHeaders();
    const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
    return await handleResponse<{ stats: MasteryStats }>(response);
};


// --- Recommendations (User Embedding) API ---

export interface Recommendation {
    id: string;
    title: string;
    description: string;
    type: string;
    level: string;
    match_score: number; // 0-100
    reason?: string;
}

/**
 * Kullanıcıya özel içerik önerileri getir
 */
export const getRecommendations = async (): Promise<ApiResponse<{ recommendations: Recommendation[] }>> => {
    const url = getApiUrl('/recommendations');
    const headers = createHeaders();
    const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
    return await handleResponse<{ recommendations: Recommendation[] }>(response);
};

/**
 * Benzer kullanıcıları bul (Networking feature)
 */
export const getSimilarUsers = async (): Promise<ApiResponse<{ similarUsers: any[] }>> => {
    const url = getApiUrl('/recommendations/similar-users');
    const headers = createHeaders();
    const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
    return await handleResponse<{ similarUsers: any[] }>(response);
};

// Helper to handle response similarly to api.ts
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        console.error("API Error:", errorMessage);
        throw new Error(errorMessage);
    }
    return await response.json() as ApiResponse<T>;
}
