/**
 * @lingroot/api-client
 * Content API Endpoints
 * 
 * Created: 2026-01-16
 * Version: 1.0
 */

import type { AxiosInstance } from 'axios';
import type {
    ApiResponse,
    ContentHistoryItem,
    SubmitContentRequest,
    PaginatedResponse,
} from '../types';

export interface ContentApi {
    // History
    getHistory(page?: number, limit?: number): Promise<PaginatedResponse<ContentHistoryItem>>;
    getHistoryItem(id: string): Promise<ApiResponse<ContentHistoryItem>>;
    getFullHistory(): Promise<ApiResponse<ContentHistoryItem[]>>;
    getUserAudioCount(): Promise<number>;

    // Content submission
    submit(request: SubmitContentRequest): Promise<ApiResponse<{ id: string }>>;

    // Progress tracking
    updateProgress(contentId: string, position: number, duration?: number): Promise<ApiResponse<{
        position: number;
        isCompleted: boolean;
        xpEarned: number;
    }>>;
    getInProgress(): Promise<ApiResponse<ContentHistoryItem[]>>;
    saveListeningProgress(audioUrl: string, position: number, duration: number): Promise<ApiResponse>;

    // Quiz
    generateQuiz(contentId: string): Promise<ApiResponse<{
        contentId: string;
        totalQuestions: number;
        questions: Array<{
            id: number;
            word: string;
            options: string[];
            correctAnswer: string;
        }>;
    }>>;
    submitQuiz(contentId: string, answers: Array<{
        word: string;
        selectedAnswer: string;
    }>): Promise<ApiResponse<{
        score: number;
        correctCount: number;
        totalQuestions: number;
        passed: boolean;
        xpEarned: number;
    }>>;

    // Deletion
    delete(contentId: string): Promise<ApiResponse>;

    // Ratings
    rate(contentId: string, rating: number, feedback?: string): Promise<ApiResponse>;
}

export function createContentApi(api: AxiosInstance): ContentApi {
    return {
        async getHistory(page?: number, limit?: number): Promise<PaginatedResponse<ContentHistoryItem>> {
            const params: Record<string, string> = {};
            if (page) params.page = String(page);
            if (limit) params.limit = String(limit);

            const response = await api.get<PaginatedResponse<ContentHistoryItem>>(
                '/api/content/history',
                { params }
            );
            return response.data;
        },

        async getHistoryItem(id: string): Promise<ApiResponse<ContentHistoryItem>> {
            const response = await api.get<ApiResponse<ContentHistoryItem>>(
                `/api/content/history/${encodeURIComponent(id)}`
            );
            return response.data;
        },

        async getFullHistory(): Promise<ApiResponse<ContentHistoryItem[]>> {
            const response = await api.get<ApiResponse<ContentHistoryItem[]>>(
                '/api/content/history',
                { params: { limit: '1000' } }
            );
            return response.data;
        },

        async getUserAudioCount(): Promise<number> {
            try {
                const response = await api.get<{ success: boolean; count: number }>('/api/content/count');
                return response.data.count || 0;
            } catch {
                // Fallback: get history and count
                const history = await api.get<PaginatedResponse<ContentHistoryItem>>(
                    '/api/content/history',
                    { params: { limit: '1' } }
                );
                return history.data.pagination?.total || 0;
            }
        },

        async submit(request: SubmitContentRequest): Promise<ApiResponse<{ id: string }>> {
            const payload = {
                input: request.input,
                input_type: request.inputType,
                level: request.level,
                mp3_url: request.mp3Url,
                translated_text: request.translatedText || '',
                adapted_text: request.adaptedText || '',
                chapter_id: request.chapterId ?? null,
                timepoints: request.timepoints,
                words: request.words,
                detected_mood: request.detectedMood,
                processing_duration_ms: request.processingDurationMs,
            };

            const response = await api.post<ApiResponse<{ id: string }>>('/api/content/submit', payload);
            return response.data;
        },

        async updateProgress(
            contentId: string,
            position: number,
            duration?: number
        ): Promise<ApiResponse<{ position: number; isCompleted: boolean; xpEarned: number }>> {
            const response = await api.put<ApiResponse<{ position: number; isCompleted: boolean; xpEarned: number }>>(
                `/api/content/${encodeURIComponent(contentId)}/progress`,
                { position, duration }
            );
            return response.data;
        },

        async getInProgress(): Promise<ApiResponse<ContentHistoryItem[]>> {
            const response = await api.get<ApiResponse<ContentHistoryItem[]>>('/api/content/in-progress');
            return response.data;
        },

        async saveListeningProgress(audioUrl: string, position: number, duration: number): Promise<ApiResponse> {
            const response = await api.post<ApiResponse>('/api/content/listening-progress', {
                audioUrl,
                position,
                duration,
            });
            return response.data;
        },

        async generateQuiz(contentId: string) {
            const response = await api.get(`/api/content/${encodeURIComponent(contentId)}/quiz`);
            return response.data;
        },

        async submitQuiz(contentId: string, answers: Array<{ word: string; selectedAnswer: string }>) {
            const response = await api.post(
                `/api/content/${encodeURIComponent(contentId)}/quiz/submit`,
                { answers }
            );
            return response.data;
        },

        async delete(contentId: string): Promise<ApiResponse> {
            const response = await api.delete<ApiResponse>(
                `/api/content/${encodeURIComponent(contentId)}`
            );
            return response.data;
        },

        async rate(contentId: string, rating: number, feedback?: string): Promise<ApiResponse> {
            const response = await api.post<ApiResponse>(
                `/api/content/${encodeURIComponent(contentId)}/rate`,
                { rating, feedback }
            );
            return response.data;
        },
    };
}
