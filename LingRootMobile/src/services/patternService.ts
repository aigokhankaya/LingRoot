import { getApiClientAsync } from './apiClient';

export async function getPatternsByLevel(level: string): Promise<{ success: boolean; patterns: any[]; count: number }> {
    const client = await getApiClientAsync();
    const response = await client.http.get(`/api/patterns/level/${level}`);
    return response.data;
}

export async function findPatternsInText(text: string, level: string): Promise<{ success: boolean; patterns: any[]; count: number }> {
    const client = await getApiClientAsync();
    const response = await client.http.post('/api/patterns/find', { text, level });
    return response.data;
}

export async function getUserPatternHistory(): Promise<{ success: boolean; patterns: any[]; count: number; message?: string }> {
    const client = await getApiClientAsync();
    const response = await client.http.get('/api/patterns/history');
    return response.data;
}
