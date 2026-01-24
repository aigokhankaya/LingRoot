/**
 * Content Service (New API Client Wrapper)
 * 
 * This service wraps the new @lingroot/api-client content module
 * to provide backward-compatible functions for the existing codebase.
 * 
 * Created: 2026-01-16
 */

import { getApiClientAsync, ContentHistoryItem, ApiResponse } from '../services/apiClient';

// Re-export types
export type { ContentHistoryItem };

/**
 * Get user's audio/content history
 */
export async function getUserAudioHistory(
    userId: string,
    page: number = 1,
    limit: number = 50
): Promise<{ success: boolean; data: ContentHistoryItem[]; total_count?: number }> {
    const client = await getApiClientAsync();
    const response = await client.content.getHistory(page, limit);

    return {
        success: response.success,
        data: response.data || [],
        total_count: response.pagination?.total,
    };
}

/**
 * Get user's audio count and total duration
 */
export async function getUserAudioCount(userId: string): Promise<{ count: number; totalDurationSeconds: number }> {
    const client = await getApiClientAsync();
    try {
        // Call the count endpoint which now returns both count and duration
        const response = await client.http.get('/api/content/count');
        const data = response.data;
        return {
            count: data?.count || 0,
            totalDurationSeconds: data?.total_duration_seconds || 0,
        };
    } catch {
        return { count: 0, totalDurationSeconds: 0 };
    }
}

/**
 * Get full content history (all items)
 */
export async function getFullContentHistory(): Promise<{ success: boolean; data: ContentHistoryItem[] }> {
    const client = await getApiClientAsync();
    const response = await client.content.getFullHistory();
    return {
        success: response.success || true,
        data: response.data || [],
    };
}

/**
 * Get content item by ID
 */
export async function getContentById(contentId: string): Promise<ContentHistoryItem | null> {
    const client = await getApiClientAsync();
    const response = await client.content.getHistoryItem(contentId);
    return response.data || null;
}

/**
 * Get content item by ID (alias for getContentById to match legacy API)
 */
export const getUserContentById = getContentById;

/**
 * Send Sync Feedback
 */
export async function sendSyncFeedback(feedbackData: {
    trackId: string;
    currentWordIndex: number;
    currentTime: number;
    expectedWord: string;
    feedback: 'YES' | 'NO';
    wordTimings: any[];
    timestamp: string;
}): Promise<any> {
    const client = await getApiClientAsync();
    const response = await client.http.post('/api/tts/sync-feedback', feedbackData);
    return response.data;
}

/**
 * Submit new content
 */
export async function submitContent(params: {
    input: string;
    input_type: string;
    level: string;
    mp3_url: string;
    translated_text?: string;
    adapted_text?: string;
    chapter_id?: string | number;
    timepoints?: any[];
    words?: string[];
    detected_mood?: string;
    processing_duration_ms?: number;
}): Promise<{ success: boolean; id?: string }> {
    const client = await getApiClientAsync();
    const response = await client.content.submit({
        input: params.input,
        inputType: params.input_type as any,
        level: params.level as any,
        mp3Url: params.mp3_url,
        translatedText: params.translated_text,
        adaptedText: params.adapted_text,
        chapterId: params.chapter_id,
        timepoints: params.timepoints,
        words: params.words,
        detectedMood: params.detected_mood,
        processingDurationMs: params.processing_duration_ms,
    });

    return {
        success: response.success,
        id: response.data?.id,
    };
}

/**
 * Update listening progress
 */
export async function updateListeningProgress(
    contentId: string,
    position: number,
    duration?: number
): Promise<{ position: number; isCompleted: boolean; xpEarned: number }> {
    const client = await getApiClientAsync();
    const response = await client.content.updateProgress(contentId, position, duration);
    return response.data || { position: 0, isCompleted: false, xpEarned: 0 };
}

/**
 * Save listening progress by audio URL (legacy)
 */
export async function saveListeningProgress(
    audioUrl: string,
    position: number,
    duration: number
): Promise<void> {
    const client = await getApiClientAsync();
    await client.content.saveListeningProgress(audioUrl, position, duration);
}

/**
 * Get in-progress content
 */
export async function getInProgressContent(): Promise<ContentHistoryItem[]> {
    const client = await getApiClientAsync();
    const response = await client.content.getInProgress();
    return response.data || [];
}

/**
 * Delete content
 */
export async function deleteContent(contentId: string): Promise<void> {
    const client = await getApiClientAsync();
    await client.content.delete(contentId);
}

/**
 * Generate quiz for content
 */
export async function generateQuiz(contentId: string): Promise<{
    contentId: string;
    totalQuestions: number;
    questions: Array<{
        id: number;
        word: string;
        options: string[];
        correctAnswer: string;
    }>;
}> {
    const client = await getApiClientAsync();
    const response = await client.content.generateQuiz(contentId);
    return response.data || { contentId, totalQuestions: 0, questions: [] };
}

/**
 * Submit quiz answers
 */
export async function submitQuiz(
    contentId: string,
    answers: Array<{ word: string; selectedAnswer: string }>
): Promise<{
    score: number;
    correctCount: number;
    totalQuestions: number;
    passed: boolean;
    xpEarned: number;
}> {
    const client = await getApiClientAsync();
    const response = await client.content.submitQuiz(contentId, answers);
    return response.data || { score: 0, correctCount: 0, totalQuestions: 0, passed: false, xpEarned: 0 };
}

/**
 * Rate content
 */
export async function rateContent(
    contentId: string,
    rating: number,
    feedback?: string
): Promise<void> {
    const client = await getApiClientAsync();
    await client.content.rate(contentId, rating, feedback);
}

// Favorites / Bookmarks (Legacy API Endpoints assumed)

/**
 * Get user favorites (IDs)
 */
export async function getUserFavorites(): Promise<string[]> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.get('/api/users/favorites');
        return response.data?.favorites || [];
    } catch {
        return [];
    }
}

/**
 * Save user favorites
 */
export async function saveUserFavorites(ids: string[]): Promise<boolean> {
    const client = await getApiClientAsync();
    try {
        await client.http.post('/api/users/favorites', { favorites: ids });
        return true;
    } catch {
        return false;
    }
}

/**
 * Get favorite content details
 */
export async function getUserFavoriteDetails(): Promise<any[]> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.get('/api/users/favorites/details');
        return response.data?.details || [];
    } catch {
        return [];
    }
}
