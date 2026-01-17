import { getApiClientAsync } from './apiClient';
import { BookChapter } from '../types';

export async function searchBooks(params: { q?: string; title?: string; author?: string; page?: number; per_page?: number }): Promise<any> {
    const client = await getApiClientAsync();
    const sp = new URLSearchParams();
    if (params.q) sp.append('q', params.q);
    if (params.title) sp.append('title', params.title);
    if (params.author) sp.append('author', params.author);
    if (params.page) sp.append('page', String(params.page));
    if (params.per_page) sp.append('per_page', String(params.per_page));

    const response = await client.http.get(`/api/books/search?${sp.toString()}`);
    return response.data;
}

export async function getBookChapters(bookId: number): Promise<BookChapter[]> {
    const client = await getApiClientAsync();
    const response = await client.http.get(`/api/books/${bookId}/chapters`);
    return response.data as BookChapter[];
}

export async function getBookChapter(bookId: number, chapterId: number): Promise<any> {
    const client = await getApiClientAsync();
    const response = await client.http.get(`/api/books/${bookId}/chapters/${chapterId}`);
    return response.data;
}
