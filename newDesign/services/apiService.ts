/**
 * newDesign API Service
 * 
 * Bu dosya newDesign klasöründeki bileşenler için API entegrasyonu sağlar.
 * Mock veriler yerine gerçek backend API'lerini kullanır.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

/**
 * Token'ı localStorage'dan al
 */
const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('lingroot_token') || localStorage.getItem('token');
};

/**
 * API isteği yap
 */
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const token = getToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
};

// ==================== VOCABULARY API ====================

export interface VocabularyWord {
    id: number;
    word: string;
    definition?: string;
    example_sentence?: string;
    example_sentence_turkish?: string;
    original_sentence?: string;
    level?: string;
    is_learned: boolean;
    created_at?: string;
}

/**
 * Kullanıcının kelime listesini getir
 */
export const getVocabulary = async (): Promise<VocabularyWord[]> => {
    try {
        const response = await apiRequest('/api/vocabulary');
        if (response.success && Array.isArray(response.data)) {
            return response.data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching vocabulary:', error);
        return [];
    }
};

/**
 * Kelime ekle
 */
export const addWord = async (word: string): Promise<VocabularyWord | null> => {
    try {
        const response = await apiRequest('/api/vocabulary/add-with-translation', {
            method: 'POST',
            body: JSON.stringify({ word })
        });
        if (response.success && response.data) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Error adding word:', error);
        return null;
    }
};

/**
 * Kelime sil
 */
export const deleteWord = async (wordId: number): Promise<boolean> => {
    try {
        const response = await apiRequest(`/api/vocabulary/${wordId}`, {
            method: 'DELETE'
        });
        return response.success;
    } catch (error) {
        console.error('Error deleting word:', error);
        return false;
    }
};

/**
 * Kelime durumunu güncelle (öğrenildi/öğrenilmedi)
 */
export const updateWordStatus = async (wordId: number, isLearned: boolean): Promise<boolean> => {
    try {
        const response = await apiRequest(`/api/vocabulary/${wordId}`, {
            method: 'PUT',
            body: JSON.stringify({ is_learned: isLearned })
        });
        return response.success;
    } catch (error) {
        console.error('Error updating word status:', error);
        return false;
    }
};

// ==================== LIBRARY/CONTENT API ====================

export interface AudioContent {
    id: string;
    title: string;
    level: string;
    duration: string;
    isFavorite: boolean;
    date: string;
    type: 'text' | 'topic' | 'podcast' | 'file' | 'books';
    transcript?: string;
    originalTranscript?: string;
    mp3_url?: string;
    vtt_url?: string;
}

/**
 * Kullanıcının ses geçmişini getir
 */
export const getAudioHistory = async (page = 1, limit = 20): Promise<AudioContent[]> => {
    try {
        const response = await apiRequest(`/api/library/history?page=${page}&limit=${limit}`);
        if (response.success && Array.isArray(response.data)) {
            return response.data.map((item: any) => ({
                id: String(item.id),
                title: item.adapted_text || item.translated_text || item.input || 'Başlıksız',
                level: item.level || 'A1',
                duration: formatDuration(item.duration_seconds || 0),
                isFavorite: item.is_favorite || false,
                date: formatDate(item.created_at),
                type: item.input_type || 'text',
                transcript: item.adapted_text,
                originalTranscript: item.input,
                mp3_url: item.mp3_url,
                vtt_url: item.vtt_url
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching audio history:', error);
        return [];
    }
};

/**
 * Favori durumunu değiştir
 */
export const toggleFavorite = async (contentId: string, isFavorite: boolean): Promise<boolean> => {
    try {
        const response = await apiRequest(`/api/favorites/${isFavorite ? 'add' : 'remove'}`, {
            method: 'POST',
            body: JSON.stringify({ item_type: 'content_item', item_id: contentId })
        });
        return response.success;
    } catch (error) {
        console.error('Error toggling favorite:', error);
        return false;
    }
};

// ==================== USER INTERESTS API ====================

/**
 * Kullanıcının ilgi alanlarını getir
 */
export const getUserInterests = async (): Promise<string[]> => {
    try {
        const response = await apiRequest('/api/user-interests');
        if (Array.isArray(response)) {
            return response.map((item: any) => item.interest_keyword);
        }
        if (response.success && Array.isArray(response.data)) {
            return response.data.map((item: any) =>
                typeof item === 'string' ? item : item.interest_keyword
            );
        }
        return [];
    } catch (error) {
        console.error('Error fetching user interests:', error);
        return [];
    }
};

/**
 * Kullanıcının ilgi alanlarını güncelle
 */
export const updateUserInterests = async (interests: string[]): Promise<boolean> => {
    try {
        const response = await apiRequest('/api/user-interests', {
            method: 'PUT',
            body: JSON.stringify({ interests })
        });
        return response.success;
    } catch (error) {
        console.error('Error updating user interests:', error);
        return false;
    }
};

// ==================== HELPER FUNCTIONS ====================

function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Bugün';
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
    return date.toLocaleDateString('tr-TR');
}

export default {
    getVocabulary,
    addWord,
    deleteWord,
    updateWordStatus,
    getAudioHistory,
    toggleFavorite,
    getUserInterests,
    updateUserInterests
};
