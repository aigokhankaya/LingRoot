/**
 * Web API Client Wrapper
 * 
 * Wrapper for @lingroot/api-client that configures it for Next.js/React.
 * Uses localStorage for token persistence.
 * 
 * Created: 2026-01-16
 */

import axios from 'axios';
import { createApiClient, setAxios, LingRootApiClient } from '@lingroot/api-client';

// Initialize axios for the shared client (cast to any to avoid version mismatch)
setAxios(axios as any);

// Storage keys
const TOKEN_KEY = 'lingroot_token';
const REFRESH_TOKEN_KEY = 'lingroot_refresh_token';

/**
 * Check if we're running in browser environment
 */
const isBrowser = typeof window !== 'undefined';

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
        timeout: 180000, // 3 minutes

        getToken: () => {
            if (!isBrowser) return null;
            return localStorage.getItem(TOKEN_KEY);
        },

        setToken: (token: string) => {
            if (!isBrowser) return;
            localStorage.setItem(TOKEN_KEY, token);
        },

        getRefreshToken: () => {
            if (!isBrowser) return null;
            return localStorage.getItem(REFRESH_TOKEN_KEY);
        },

        setRefreshToken: (token: string) => {
            if (!isBrowser) return;
            localStorage.setItem(REFRESH_TOKEN_KEY, token);
        },

        clearTokens: () => {
            if (!isBrowser) return;
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            localStorage.removeItem('lingroot_user');
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
    get http() { return getApiClient().http; },
    get mfaHttp() { return getApiClient().mfaHttp; },
    refreshTokens: () => getApiClient().refreshTokens(),
};

// Re-export types for convenience
export type { LingRootApiClient } from '@lingroot/api-client';
export * from '@lingroot/api-client';

export default apiClient;
