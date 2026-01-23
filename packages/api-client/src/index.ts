/**
 * @lingroot/api-client
 * Main Entry Point
 * 
 * Created: 2026-01-16
 * Version: 1.0
 * 
 * Usage:
 * ```typescript
 * import axios from 'axios';
 * import { createApiClient, setAxios } from '@lingroot/api-client';
 * 
 * // Initialize axios (required once)
 * setAxios(axios);
 * 
 * // Create client with configuration
 * const client = createApiClient({
 *   baseUrl: 'https://api.lingroot.com',
 *   getToken: async () => localStorage.getItem('token'),
 *   setToken: async (token) => localStorage.setItem('token', token),
 *   getRefreshToken: async () => localStorage.getItem('refreshToken'),
 *   setRefreshToken: async (token) => localStorage.setItem('refreshToken', token),
 *   clearTokens: async () => {
 *     localStorage.removeItem('token');
 *     localStorage.removeItem('refreshToken');
 *   },
 *   onUnauthorized: () => {
 *     // Redirect to login
 *   },
 * });
 * 
 * // Use the client
 * const result = await client.auth.login({ email, password });
 * const voices = await client.tts.listVoices();
 * ```
 */

import type { AxiosInstance } from 'axios';
import type { ApiClientConfig } from './config';
import { createHttpClient, setAxios } from './http';
import {
    createAuthApi,
    createTTSApi,
    createContentApi,
    createSubscriptionApi,
    createChatApi,
    createBookApi,
    createVocabularyApi,
    type AuthApi,
    type TTSApi,
    type ContentApi,
    type SubscriptionApi,
    type ChatApi,
    type BookApi,
    type VocabularyApi,
} from './endpoints';

// Re-export types
export * from './types';
export * from './config';
export { setAxios } from './http';

/**
 * Complete API client with all endpoint modules
 */
export interface LingRootApiClient {
    /** Authentication endpoints */
    auth: AuthApi;
    /** Text-to-Speech endpoints */
    tts: TTSApi;
    /** Content history and management endpoints */
    content: ContentApi;
    /** Subscription and billing endpoints */
    subscription: SubscriptionApi;
    /** Liro AI Chat endpoints */
    chat: ChatApi;
    /** Book search and reading endpoints */
    book: BookApi;
    /** Vocabulary and SRS endpoints */
    vocabulary: VocabularyApi;
    /** Raw axios instance for custom requests */
    http: AxiosInstance;
    /** MFA-specific axios instance */
    mfaHttp: AxiosInstance;
    /** Force refresh tokens */
    refreshTokens: () => Promise<boolean>;
}

/**
 * Create a fully configured LingRoot API client
 * 
 * @param config - Client configuration
 * @returns Complete API client with all modules
 */
export function createApiClient(config: ApiClientConfig): LingRootApiClient {
    const { api, mfaApi, refreshTokens } = createHttpClient(config);

    return {
        auth: createAuthApi(api),
        tts: createTTSApi(api),
        content: createContentApi(api),
        subscription: createSubscriptionApi(api),
        chat: createChatApi(api),
        book: createBookApi(api),
        vocabulary: createVocabularyApi(api),
        http: api,
        mfaHttp: mfaApi,
        refreshTokens,
    };
}

/**
 * Convenience function to check API health
 */
export async function checkApiHealth(baseUrl: string): Promise<boolean> {
    try {
        const response = await fetch(`${baseUrl}/api/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        return response.ok;
    } catch {
        return false;
    }
}

// Default export
export default createApiClient;
