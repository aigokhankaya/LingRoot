/**
 * @lingroot/api-client
 * Book API Endpoints
 * 
 * Created: 2026-01-16
 * Version: 1.0
 */

import type { AxiosInstance } from 'axios';
import type {
    ApiResponse,
    Book,
    BookChapter,
    PaginatedResponse,
} from '../types';

export interface BookApi {
    // Search & Discovery
    search(query: string, page?: number, limit?: number): Promise<PaginatedResponse<Book>>;
    getPopular(limit?: number): Promise<ApiResponse<Book[]>>;
    getBySubject(subject: string, limit?: number): Promise<ApiResponse<Book[]>>;

    // Book Details
    getById(bookId: number): Promise<ApiResponse<Book>>;
    getChapters(bookId: number): Promise<ApiResponse<BookChapter[]>>;
    getChapter(bookId: number, chapterIndex: number): Promise<ApiResponse<BookChapter>>;

    // User Library
    getUserBooks(): Promise<ApiResponse<Book[]>>;
    addToLibrary(bookId: number): Promise<ApiResponse>;
    removeFromLibrary(bookId: number): Promise<ApiResponse>;

    // Progress
    getProgress(bookId: number): Promise<ApiResponse<{
        bookId: number;
        completedChapters: number[];
        currentChapter: number;
        totalChapters: number;
        progressPercent: number;
    }>>;
    updateProgress(bookId: number, chapterIndex: number): Promise<ApiResponse>;
}

export function createBookApi(api: AxiosInstance): BookApi {
    return {
        async search(query: string, page = 1, limit = 20): Promise<PaginatedResponse<Book>> {
            const response = await api.get<PaginatedResponse<Book>>('/api/books/search', {
                params: { q: query, page, limit },
            });
            return response.data;
        },

        async getPopular(limit = 10): Promise<ApiResponse<Book[]>> {
            const response = await api.get<ApiResponse<Book[]>>('/api/books/popular', {
                params: { limit },
            });
            return response.data;
        },

        async getBySubject(subject: string, limit = 20): Promise<ApiResponse<Book[]>> {
            const response = await api.get<ApiResponse<Book[]>>('/api/books/subject', {
                params: { subject, limit },
            });
            return response.data;
        },

        async getById(bookId: number): Promise<ApiResponse<Book>> {
            const response = await api.get<ApiResponse<Book>>(`/api/books/${bookId}`);
            return response.data;
        },

        async getChapters(bookId: number): Promise<ApiResponse<BookChapter[]>> {
            const response = await api.get<ApiResponse<BookChapter[]>>(`/api/books/${bookId}/chapters`);
            return response.data;
        },

        async getChapter(bookId: number, chapterIndex: number): Promise<ApiResponse<BookChapter>> {
            const response = await api.get<ApiResponse<BookChapter>>(
                `/api/books/${bookId}/chapters/${chapterIndex}`
            );
            return response.data;
        },

        async getUserBooks(): Promise<ApiResponse<Book[]>> {
            const response = await api.get<ApiResponse<Book[]>>('/api/books/library');
            return response.data;
        },

        async addToLibrary(bookId: number): Promise<ApiResponse> {
            const response = await api.post<ApiResponse>(`/api/books/${bookId}/library`);
            return response.data;
        },

        async removeFromLibrary(bookId: number): Promise<ApiResponse> {
            const response = await api.delete<ApiResponse>(`/api/books/${bookId}/library`);
            return response.data;
        },

        async getProgress(bookId: number) {
            const response = await api.get(`/api/books/${bookId}/progress`);
            return response.data;
        },

        async updateProgress(bookId: number, chapterIndex: number): Promise<ApiResponse> {
            const response = await api.put<ApiResponse>(`/api/books/${bookId}/progress`, {
                chapterIndex,
            });
            return response.data;
        },
    };
}
