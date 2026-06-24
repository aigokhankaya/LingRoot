/**
 * Web API Client Wrapper
 * 
 * Wrapper for @lingroot/api-client that configures it for Next.js/React.
 * Uses cookie-backed sessions for web auth.
 * 
 * Created: 2026-01-16
 * Updated: 2026-01-24
 */

import axios from 'axios';
import { createApiClient, setAxios, LingRootApiClient } from '@lingroot/api-client';

// Initialize axios for the shared client (cast to any to avoid version mismatch)
setAxios(axios as any);

/**
 * Check if we're running in browser environment
 */
const isBrowser = typeof window !== 'undefined';
let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

/**
 * Get base URL based on environment
 */
function getBaseUrl(): string {
    if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:5001';
    }
    return process.env.NEXT_PUBLIC_API_URL || 'https://lingloops-backend.onrender.com';
}

/**
 * Create the API client singleton
 */
let clientInstance: LingRootApiClient | null = null;

export function getApiClient(): LingRootApiClient {
    if (clientInstance) {
        return clientInstance;
    }

    clientInstance = createApiClient({
        baseUrl: getBaseUrl(),
        timeout: 1200000, // 20 minutes

        getToken: () => inMemoryAccessToken,

        setToken: (token: string) => {
            inMemoryAccessToken = token;
        },

        getRefreshToken: () => inMemoryRefreshToken,

        setRefreshToken: (token: string) => {
            inMemoryRefreshToken = token;
        },

        clearTokens: () => {
            inMemoryAccessToken = null;
            inMemoryRefreshToken = null;
        },

        onUnauthorized: () => {
            console.log('⚠️ [API Client] Unauthorized - redirecting to login');
            if (isBrowser) {
                window.location.href = '/login';
            }
        },

        debug: process.env.NODE_ENV === 'development',
    });

    return clientInstance;
}

/**
 * Convenience accessor for the client
 * Can be used directly: apiClient.auth.login(...)
 */
export const apiClient = {
    get auth() { return getApiClient().auth; },
    get tts() { return getApiClient().tts; },
    get content() { return getApiClient().content; },
    get subscription() { return getApiClient().subscription; },
    get chat() { return getApiClient().chat; },
    get book() { return getApiClient().book; },
    get vocabulary() { return getApiClient().vocabulary; },
    get topic() { return getApiClient().topic; },
    get pattern() { return getApiClient().pattern; },
    get notification() { return getApiClient().notification; },
    get http() { return getApiClient().http; },
    get mfaHttp() { return getApiClient().mfaHttp; },
    refreshTokens: () => getApiClient().refreshTokens(),
};

// Re-export types for convenience
export type { LingRootApiClient } from '@lingroot/api-client';
export * from '@lingroot/api-client';

export default apiClient;
