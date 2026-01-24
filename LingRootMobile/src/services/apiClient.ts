/**
 * Mobile API Client Wrapper
 * 
 * Wrapper for @lingroot/api-client that configures it for React Native.
 * Uses AsyncStorage for token persistence.
 * 
 * Created: 2026-01-16
 */

// React Native global for development mode
declare const __DEV__: boolean;

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiClient, setAxios, LingRootApiClient } from '@lingroot/api-client';
import { getApiBaseUrl } from './environmentConfig';

// Initialize axios for the shared client (cast to any to avoid version mismatch)
setAxios(axios as any);

// Storage keys
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';

// Unauthorized handler (set by AppNavigator or AuthContext)
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
    unauthorizedHandler = handler;
}

// Singleton client instance
let clientInstance: LingRootApiClient | null = null;
let initPromise: Promise<LingRootApiClient> | null = null;

/**
 * Initialize the API client
 * Call this once at app startup (e.g., in App.tsx)
 */
export async function initializeApiClient(): Promise<LingRootApiClient> {
    if (clientInstance) {
        return clientInstance;
    }

    if (initPromise) {
        return initPromise;
    }

    initPromise = (async () => {
        const baseUrl = await getApiBaseUrl();
        console.log('🔗 [API Client] Initializing with baseUrl:', baseUrl);

        clientInstance = createApiClient({
            baseUrl,
            timeout: 180000, // 3 minutes for Render cold start

            getToken: async () => {
                return AsyncStorage.getItem(TOKEN_KEY);
            },

            setToken: async (token: string) => {
                await AsyncStorage.setItem(TOKEN_KEY, token);
            },

            getRefreshToken: async () => {
                return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
            },

            setRefreshToken: async (token: string) => {
                await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
            },

            clearTokens: async () => {
                await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_DATA_KEY]);
            },

            onUnauthorized: () => {
                console.log('⚠️ [API Client] Unauthorized - clearing tokens');
                if (unauthorizedHandler) {
                    unauthorizedHandler();
                }
            },

            debug: __DEV__,
        });

        return clientInstance;
    })();

    return initPromise;
}

/**
 * Get the API client instance
 * Throws if not initialized
 */
export function getApiClient(): LingRootApiClient {
    if (!clientInstance) {
        throw new Error('API Client not initialized. Call initializeApiClient() first.');
    }
    return clientInstance;
}

/**
 * Get the API client, initializing if needed
 * Use this for lazy access
 */
export async function getApiClientAsync(): Promise<LingRootApiClient> {
    if (clientInstance) {
        return clientInstance;
    }
    return initializeApiClient();
}

// ========================================
// Backend Wake Helper (Render Cold Start)
// ========================================
let lastBackendAwakeAt: number | null = null;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wake backend if it's hibernating (Render.com cold start)
 * Returns true if backend is awake, false otherwise
 */
export async function wakeBackendIfNeeded(force: boolean = false): Promise<boolean> {
    try {
        const client = await getApiClientAsync();
        const baseUrl = client.http.defaults.baseURL || '';

        // If we recently confirmed it's awake, skip
        if (!force && lastBackendAwakeAt && Date.now() - lastBackendAwakeAt < 120000) {
            return true;
        }

        const healthUrl = `${baseUrl}/api/health`;
        const res = await fetch(healthUrl, { method: 'GET' });
        if (res.ok) {
            lastBackendAwakeAt = Date.now();
            return true;
        }

        // Render hibernation returns 503
        if (res.status !== 503) {
            return false;
        }

        // Try to wake by polling a few times with backoff
        for (let attempt = 1; attempt <= 6; attempt++) {
            const delay = 800 * attempt + 400;
            await sleep(delay);
            try {
                const ping = await fetch(healthUrl, { method: 'GET' });
                if (ping.ok) {
                    lastBackendAwakeAt = Date.now();
                    return true;
                }
            } catch { }
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Get the API client with backend wake check
 * Use this for operations that need the backend to be awake
 */
export async function getApiClientWithWake(): Promise<LingRootApiClient> {
    await wakeBackendIfNeeded();
    return getApiClientAsync();
}

// ========================================
// Error Handling Helpers
// ========================================

/**
 * Standard error message extraction from API errors
 */
export function extractErrorMessage(error: any, defaultMessage: string): string {
    if (error?.response?.data?.message) {
        return error.response.data.message;
    }
    if (error?.message) {
        return error.message;
    }
    return defaultMessage;
}

/**
 * Check if error is a usage limit exceeded error
 */
export function isUsageLimitError(error: any): boolean {
    return error?.response?.data?.code === 'USAGE_LIMIT_EXCEEDED';
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: any): boolean {
    return error?.code === 'ECONNABORTED';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
    return error?.message === 'Network Error' || error?.code === 'ERR_NETWORK';
}

// Re-export types for convenience
export type { LingRootApiClient } from '@lingroot/api-client';
export * from '@lingroot/api-client';
