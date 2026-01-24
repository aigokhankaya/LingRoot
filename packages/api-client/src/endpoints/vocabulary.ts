/**
 * @lingroot/api-client
 * Vocabulary & SRS API Endpoints
 * 
 * Created: 2026-01-16
 * Version: 1.0
 */

import type { AxiosInstance } from 'axios';
import type {
    ApiResponse,
    VocabularyWord,
    UserWord,
    SRSReviewRequest,
    SRSReviewResponse,
    PaginatedResponse,
} from '../types';

export interface VocabularyApi {
    // Dictionary Lookup
    lookup(word: string): Promise<ApiResponse<{
        found: boolean;
        data: VocabularyWord | null;
        hasUserWord?: boolean;
    }>>;

    // User's Word List
    getUserWords(page?: number, limit?: number): Promise<PaginatedResponse<UserWord>>;
    addWord(word: string, source?: string): Promise<ApiResponse<UserWord>>;
    removeWord(wordId: string): Promise<ApiResponse>;

    // SRS (Spaced Repetition System)
    getDueWords(): Promise<ApiResponse<UserWord[]>>;
    submitReview(request: SRSReviewRequest): Promise<SRSReviewResponse>;
    getStats(): Promise<ApiResponse<{
        totalWords: number;
        masteredWords: number;
        learningWords: number;
        dueToday: number;
        streakDays: number;
        reviewsToday: number;
    }>>;

    // Collections
    getCollections(): Promise<ApiResponse<{
        id: string;
        name: string;
        wordCount: number;
    }[]>>;
    createCollection(name: string): Promise<ApiResponse<{ id: string; name: string }>>;
    addWordToCollection(collectionId: string, wordId: string): Promise<ApiResponse>;
    removeWordFromCollection(collectionId: string, wordId: string): Promise<ApiResponse>;
}

export function createVocabularyApi(api: AxiosInstance): VocabularyApi {
    return {
        async lookup(word: string): Promise<ApiResponse<{
            found: boolean;
            data: VocabularyWord | null;
            hasUserWord?: boolean;
        }>> {
            const response = await api.get('/api/vocabulary/lookup', {
                params: { word },
            });
            return response.data;
        },

        async getUserWords(page = 1, limit = 50): Promise<PaginatedResponse<UserWord>> {
            const response = await api.get<PaginatedResponse<UserWord>>('/api/vocabulary', {
                params: { page, limit },
            });
            return response.data;
        },

        async addWord(word: string, source?: string): Promise<ApiResponse<UserWord>> {
            const response = await api.post<ApiResponse<UserWord>>('/api/vocabulary/add', {
                word,
                source,
            });
            return response.data;
        },

        async removeWord(wordId: string): Promise<ApiResponse> {
            const response = await api.delete<ApiResponse>(`/api/vocabulary/${encodeURIComponent(wordId)}`);
            return response.data;
        },

        async getDueWords(): Promise<ApiResponse<UserWord[]>> {
            const response = await api.get<ApiResponse<UserWord[]>>('/api/vocabulary/due');
            return response.data;
        },

        async submitReview(request: SRSReviewRequest): Promise<SRSReviewResponse> {
            const response = await api.post<SRSReviewResponse>('/api/vocabulary/review', request);
            return response.data;
        },

        async getStats() {
            const response = await api.get('/api/vocabulary/stats');
            return response.data;
        },

        async getCollections() {
            const response = await api.get('/api/vocabulary/collections');
            return response.data;
        },

        async createCollection(name: string) {
            const response = await api.post('/api/vocabulary/collections', { name });
            return response.data;
        },

        async addWordToCollection(collectionId: string, wordId: string): Promise<ApiResponse> {
            const response = await api.post<ApiResponse>(
                `/api/vocabulary/collections/${encodeURIComponent(collectionId)}/words`,
                { wordId }
            );
            return response.data;
        },

        async removeWordFromCollection(collectionId: string, wordId: string): Promise<ApiResponse> {
            const response = await api.delete<ApiResponse>(
                `/api/vocabulary/collections/${encodeURIComponent(collectionId)}/words/${encodeURIComponent(wordId)}`
            );
            return response.data;
        },
    };
}
