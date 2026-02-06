/**
 * Content Service (New API Client Wrapper)
 *
 * This service wraps the new @lingroot/api-client content module
 * to provide backward-compatible functions for the existing codebase.
 *
 * Created: 2026-01-16
 * Updated: 2026-02-04 - Added 3-tier cache layer (MOB-M-008)
 */

import { getApiClientAsync, ContentHistoryItem, ApiResponse } from '../services/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Re-export types
export type { ContentHistoryItem };

// Cache configuration
const CONTENT_CACHE_KEY = '@lingroot:content_history_v1';
const CONTENT_CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const STATS_CACHE_KEY = '@lingroot:user_stats_v1';
const STATS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const COUNT_CACHE_KEY = '@lingroot:content_count_v1';
const COUNT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
  userId: string;
}

// Memory caches for instant access
let contentHistoryMemoryCache: CachedData<{ data: ContentHistoryItem[]; total_count?: number }> | null = null;
let statsMemoryCache: CachedData<{ count: number; totalDurationSeconds: number }> | null = null;
let countMemoryCache: CachedData<{ count: number; totalDurationSeconds: number }> | null = null;

// Cache validation helpers
const isCacheValid = <T>(cache: CachedData<T> | null, userId?: string): boolean => {
    if (!cache) return false;
    if (userId && cache.userId !== userId) return false;
    return true;
};

const isCacheStale = <T>(cache: CachedData<T>, ttl: number): boolean => {
    return Date.now() - cache.timestamp > ttl;
};

/**
 * Get user's audio/content history with 3-tier caching
 */
export async function getUserAudioHistory(
    userId: string,
    page: number = 1,
    limit: number = 50,
    forceRefresh: boolean = false
): Promise<{ success: boolean; data: ContentHistoryItem[]; total_count?: number }> {
    const startTime = Date.now();
    const effectiveUserId = userId || 'anonymous';

    // Only cache first page results
    if (page === 1 && !forceRefresh) {
        // 1. Memory cache check (fastest path)
        if (contentHistoryMemoryCache && isCacheValid(contentHistoryMemoryCache, effectiveUserId)) {
            const elapsed = Date.now() - startTime;
            console.log(`[ContentHistory] Cache HIT (memory) - ${elapsed}ms`);
            if (isCacheStale(contentHistoryMemoryCache, CONTENT_CACHE_TTL)) {
                // Background refresh
                fetchContentHistoryFromApi(userId, page, limit, effectiveUserId).catch(() => {});
            }
            return { success: true, ...contentHistoryMemoryCache.data };
        }

        // 2. AsyncStorage check
        try {
            const stored = await AsyncStorage.getItem(CONTENT_CACHE_KEY);
            if (stored) {
                const cached: CachedData<{ data: ContentHistoryItem[]; total_count?: number }> = JSON.parse(stored);
                if (isCacheValid(cached, effectiveUserId)) {
                    contentHistoryMemoryCache = cached;
                    const elapsed = Date.now() - startTime;
                    console.log(`[ContentHistory] Cache HIT (storage) - ${elapsed}ms`);
                    if (isCacheStale(cached, CONTENT_CACHE_TTL)) {
                        // Background refresh
                        fetchContentHistoryFromApi(userId, page, limit, effectiveUserId).catch(() => {});
                    }
                    return { success: true, ...cached.data };
                }
            }
        } catch (error) {
            console.warn('[ContentHistory] Error loading from storage:', error);
        }
    }

    // 3. API call (cache miss or non-first page)
    console.log('[ContentHistory] Cache MISS - fetching from API...');
    return await fetchContentHistoryFromApi(userId, page, limit, effectiveUserId);
}

async function fetchContentHistoryFromApi(
    userId: string,
    page: number,
    limit: number,
    effectiveUserId: string
): Promise<{ success: boolean; data: ContentHistoryItem[]; total_count?: number }> {
    const client = await getApiClientAsync();
    const response = await client.content.getHistory(page, limit);

    const result = {
        success: response.success,
        data: response.data || [],
        total_count: response.pagination?.total,
    };

    // Cache only first page
    if (page === 1 && result.success) {
        const cacheEntry: CachedData<{ data: ContentHistoryItem[]; total_count?: number }> = {
            data: { data: result.data, total_count: result.total_count },
            timestamp: Date.now(),
            userId: effectiveUserId,
        };
        contentHistoryMemoryCache = cacheEntry;
        try {
            await AsyncStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(cacheEntry));
        } catch (error) {
            console.warn('[ContentHistory] Error saving to storage:', error);
        }
    }

    return result;
}

/**
 * Get user's audio count and total duration with 3-tier caching
 */
export async function getUserAudioCount(
    userId: string,
    forceRefresh: boolean = false
): Promise<{ count: number; totalDurationSeconds: number }> {
    const startTime = Date.now();
    const effectiveUserId = userId || 'anonymous';

    if (!forceRefresh) {
        // 1. Memory cache check (fastest path)
        if (countMemoryCache && isCacheValid(countMemoryCache, effectiveUserId)) {
            // If cached duration is 0 but count > 0, data is likely stale — bypass cache
            if (countMemoryCache.data.totalDurationSeconds === 0 && countMemoryCache.data.count > 0) {
                console.log('[ContentCount] Cache BYPASS - duration=0 with count>0, fetching fresh data');
            } else {
                const elapsed = Date.now() - startTime;
                console.log(`[ContentCount] Cache HIT (memory) - ${elapsed}ms`);
                if (isCacheStale(countMemoryCache, COUNT_CACHE_TTL)) {
                    // Background refresh
                    fetchContentCountFromApi(effectiveUserId).catch(() => {});
                }
                return countMemoryCache.data;
            }
        }

        // 2. AsyncStorage check
        try {
            const stored = await AsyncStorage.getItem(COUNT_CACHE_KEY);
            if (stored) {
                const cached: CachedData<{ count: number; totalDurationSeconds: number }> = JSON.parse(stored);
                if (isCacheValid(cached, effectiveUserId)) {
                    // If cached duration is 0 but count > 0, data is likely stale — bypass cache
                    if (cached.data.totalDurationSeconds === 0 && cached.data.count > 0) {
                        console.log('[ContentCount] Cache BYPASS (storage) - duration=0 with count>0, fetching fresh data');
                    } else {
                        countMemoryCache = cached;
                        const elapsed = Date.now() - startTime;
                        console.log(`[ContentCount] Cache HIT (storage) - ${elapsed}ms`);
                        if (isCacheStale(cached, COUNT_CACHE_TTL)) {
                            // Background refresh
                            fetchContentCountFromApi(effectiveUserId).catch(() => {});
                        }
                        return cached.data;
                    }
                }
            }
        } catch (error) {
            console.warn('[ContentCount] Error loading from storage:', error);
        }
    }

    // 3. API call (cache miss)
    console.log('[ContentCount] Cache MISS - fetching from API...');
    return await fetchContentCountFromApi(effectiveUserId);
}

async function fetchContentCountFromApi(effectiveUserId: string): Promise<{ count: number; totalDurationSeconds: number }> {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.get('/api/content/count');
        const data = response.data;
        const result = {
            count: data?.count || 0,
            totalDurationSeconds: data?.total_duration_seconds || 0,
        };

        // Save to cache
        const cacheEntry: CachedData<{ count: number; totalDurationSeconds: number }> = {
            data: result,
            timestamp: Date.now(),
            userId: effectiveUserId,
        };
        countMemoryCache = cacheEntry;
        try {
            await AsyncStorage.setItem(COUNT_CACHE_KEY, JSON.stringify(cacheEntry));
        } catch (error) {
            console.warn('[ContentCount] Error saving to storage:', error);
        }

        return result;
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

    // Invalidate cache after new content is submitted
    if (response.success) {
        await invalidateContentCache();
    }

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
    // Invalidate cache after deletion
    await invalidateContentCache();
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

/**
 * Invalidate all content-related caches
 * Call this after content changes (new content, delete, etc.)
 */
export async function invalidateContentCache(): Promise<void> {
    console.log('[ContentService] Cache invalidated');
    contentHistoryMemoryCache = null;
    statsMemoryCache = null;
    countMemoryCache = null;
    try {
        await Promise.all([
            AsyncStorage.removeItem(CONTENT_CACHE_KEY),
            AsyncStorage.removeItem(STATS_CACHE_KEY),
            AsyncStorage.removeItem(COUNT_CACHE_KEY),
        ]);
    } catch (error) {
        console.warn('[ContentService] Error removing cache from storage:', error);
    }
}
