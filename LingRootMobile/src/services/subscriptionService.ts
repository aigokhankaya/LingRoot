import { getApiClientAsync } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache configuration
const PLAN_FEATURES_CACHE_KEY = '@lingroot:plan_features_v1';
const PLAN_FEATURES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedPlanFeatures {
    data: UserPlanFeatures;
    timestamp: number;
    userId: string;
}

// Memory cache for instant access
let memoryCache: CachedPlanFeatures | null = null;

export interface UsageSummary {
    remaining_minutes: number;
    total_minutes: number;
    used_minutes: number;
    reset_date?: string;
    plan_name?: string;
    plan_id?: string;
    isExceeded?: boolean;
    hasPlan?: boolean;
}

export interface PlanFeatures {
    homepage_features?: {
        text_input?: boolean;
        youtube?: boolean;
        file_upload?: boolean;
        podcast?: boolean;
        topic_suggestions?: boolean;
        topic_tree?: boolean;
        book?: boolean;
        liro?: boolean;
        daily_usage_patterns?: boolean;
    };
    voice_categories?: {
        standard?: boolean;
        wavenet?: boolean;
        neural2?: boolean;
        studio?: boolean;
        chirp3d?: boolean;
        amazon_standard?: boolean;
        amazon_neural?: boolean;
        amazon_generative?: boolean;
    };
    sentence_patterns?: {
        enabled?: boolean;
        max_patterns?: number;
    };
}

export interface UserPlanFeatures {
    plan_id: string | null;
    plan_name: string | null;
    features: PlanFeatures;
}

// ... types remain same ...

export async function getUsageSummary(): Promise<{ success: boolean; data: UsageSummary }> {
    const client = await getApiClientAsync();
    try {
        const result = await client.subscription.getUsageSummary();
        return { success: result.success, data: result.data as UsageSummary };
    } catch (error) {
        console.error('Error fetching usage summary:', error);
        return { success: false, data: {} as UsageSummary }; // Fallback
    }
}

export async function getSubscriptionPlans(): Promise<{ success: boolean; data: any[] }> {
    const client = await getApiClientAsync();
    try {
        const result = await client.subscription.getPlans();
        return { success: result.success, data: result.data as any[] };
    } catch (error) {
        console.error('Error fetching plans:', error);
        return { success: false, data: [] };
    }
}

// Cache validation helpers
const isCacheValid = (cache: CachedPlanFeatures | null, userId?: string): boolean => {
    if (!cache) return false;
    if (userId && cache.userId !== userId) return false;
    return true;
};

const isCacheStale = (cache: CachedPlanFeatures): boolean => {
    return Date.now() - cache.timestamp > PLAN_FEATURES_CACHE_TTL;
};

const loadFromStorage = async (): Promise<CachedPlanFeatures | null> => {
    try {
        const stored = await AsyncStorage.getItem(PLAN_FEATURES_CACHE_KEY);
        if (stored) {
            return JSON.parse(stored) as CachedPlanFeatures;
        }
    } catch (error) {
        console.warn('[PlanFeatures] Error loading from storage:', error);
    }
    return null;
};

const saveToCache = async (data: UserPlanFeatures, userId: string): Promise<void> => {
    const cacheEntry: CachedPlanFeatures = {
        data,
        timestamp: Date.now(),
        userId,
    };
    memoryCache = cacheEntry;
    try {
        await AsyncStorage.setItem(PLAN_FEATURES_CACHE_KEY, JSON.stringify(cacheEntry));
    } catch (error) {
        console.warn('[PlanFeatures] Error saving to storage:', error);
    }
};

const fetchFromApi = async (): Promise<UserPlanFeatures> => {
    const client = await getApiClientAsync();
    // Uses corrected endpoint: /api/subscription/my-features
    const response = await client.subscription.getMyPlanFeatures();
    if (response.success) {
        const responseData = (response as any).data;
        if (!responseData) return getDefaultPlanFeatures();
        return {
            plan_id: responseData.plan_id || null,
            plan_name: responseData.plan_name || null,
            features: responseData.features || {}
        };
    }
    return getDefaultPlanFeatures();
};

// Background refresh without blocking
const refreshInBackground = (userId: string): void => {
    console.log('[PlanFeatures] Background refresh started');
    fetchFromApi()
        .then(data => saveToCache(data, userId))
        .catch(err => console.warn('[PlanFeatures] Background refresh failed:', err));
};

// Get user's plan features with caching
export const getMyPlanFeatures = async (
    userId?: string,
    forceRefresh = false
): Promise<UserPlanFeatures> => {
    const startTime = Date.now();
    const effectiveUserId = userId || 'anonymous';

    // 1. Memory cache check (fastest path)
    if (!forceRefresh && memoryCache && isCacheValid(memoryCache, effectiveUserId)) {
        const elapsed = Date.now() - startTime;
        console.log(`[PlanFeatures] Cache HIT (memory) - ${elapsed}ms`);
        if (isCacheStale(memoryCache)) {
            refreshInBackground(effectiveUserId);
        }
        return memoryCache.data;
    }

    // 2. AsyncStorage check
    if (!forceRefresh) {
        const cached = await loadFromStorage();
        if (cached && isCacheValid(cached, effectiveUserId)) {
            memoryCache = cached;
            const elapsed = Date.now() - startTime;
            console.log(`[PlanFeatures] Cache HIT (storage) - ${elapsed}ms`);
            if (isCacheStale(cached)) {
                refreshInBackground(effectiveUserId);
            }
            return cached.data;
        }
    }

    // 3. API call (cache miss)
    console.log('[PlanFeatures] Cache MISS - fetching from API...');
    try {
        const result = await fetchFromApi();
        await saveToCache(result, effectiveUserId);
        const elapsed = Date.now() - startTime;
        console.log(`[PlanFeatures] API fetch complete - ${elapsed}ms`);
        return result;
    } catch (error) {
        console.error('[PlanFeatures] Error fetching from API:', error);
        return getDefaultPlanFeatures();
    }
};

// Invalidate cache (call after subscription changes)
export const invalidatePlanFeaturesCache = async (): Promise<void> => {
    console.log('[PlanFeatures] Cache invalidated');
    memoryCache = null;
    try {
        await AsyncStorage.removeItem(PLAN_FEATURES_CACHE_KEY);
    } catch (error) {
        console.warn('[PlanFeatures] Error removing from storage:', error);
    }
};

// Get default plan features (for users without active subscription)
export const getDefaultPlanFeatures = (): UserPlanFeatures => {
    return {
        plan_id: null,
        plan_name: null,
        features: {
            homepage_features: {
                text_input: true,
                youtube: false,
                file_upload: false,
                podcast: false,
                topic_suggestions: true,
                topic_tree: false,
                book: false,
                liro: false,
                daily_usage_patterns: false,
            },
            voice_categories: {
                standard: true,
                wavenet: false,
                neural2: false,
                studio: false,
                chirp3d: false,
                amazon_standard: false,
                amazon_neural: false,
                amazon_generative: false,
            },
            sentence_patterns: {
                enabled: false,
                max_patterns: 0
            }
        }
    };
};
