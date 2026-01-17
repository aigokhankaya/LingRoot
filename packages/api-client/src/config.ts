/**
 * @lingroot/api-client
 * Configuration and Environment Handling
 * 
 * Created: 2026-01-16
 * Version: 1.0
 */

export interface ApiClientConfig {
    /** Base URL for the main API */
    baseUrl: string;
    /** Base URL for MFA operations (optional, defaults to baseUrl) */
    mfaBaseUrl?: string;
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Function to get the current auth token */
    getToken: () => Promise<string | null> | string | null;
    /** Function to set the auth token */
    setToken: (token: string) => Promise<void> | void;
    /** Function to get the refresh token */
    getRefreshToken: () => Promise<string | null> | string | null;
    /** Function to set the refresh token */
    setRefreshToken: (token: string) => Promise<void> | void;
    /** Function to clear all tokens (on logout or auth failure) */
    clearTokens: () => Promise<void> | void;
    /** Callback when user becomes unauthorized (token invalid/expired) */
    onUnauthorized?: () => void;
    /** Enable debug logging */
    debug?: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
    timeout: 180000, // 3 minutes
    debug: false,
} as const;

/**
 * Production API URLs
 */
export const PRODUCTION_URLS = {
    api: 'https://lingloops-backend.onrender.com',
    mfa: 'https://lingloops-backend.onrender.com',
} as const;

/**
 * Development API URLs
 */
export const DEVELOPMENT_URLS = {
    api: 'http://localhost:5001',
    mfa: 'http://localhost:5001',
} as const;

/**
 * Get default URLs based on environment
 */
export function getDefaultUrls(isDevelopment: boolean = false): { api: string; mfa: string } {
    return isDevelopment ? DEVELOPMENT_URLS : PRODUCTION_URLS;
}

/**
 * Validate configuration
 */
export function validateConfig(config: Partial<ApiClientConfig>): void {
    if (!config.baseUrl) {
        throw new Error('[@lingroot/api-client] baseUrl is required');
    }
    if (!config.getToken) {
        throw new Error('[@lingroot/api-client] getToken function is required');
    }
    if (!config.setToken) {
        throw new Error('[@lingroot/api-client] setToken function is required');
    }
    if (!config.getRefreshToken) {
        throw new Error('[@lingroot/api-client] getRefreshToken function is required');
    }
    if (!config.setRefreshToken) {
        throw new Error('[@lingroot/api-client] setRefreshToken function is required');
    }
    if (!config.clearTokens) {
        throw new Error('[@lingroot/api-client] clearTokens function is required');
    }
}

/**
 * Merge user config with defaults
 */
export function mergeConfig(config: ApiClientConfig): Required<ApiClientConfig> {
    validateConfig(config);

    return {
        baseUrl: config.baseUrl,
        mfaBaseUrl: config.mfaBaseUrl || config.baseUrl,
        timeout: config.timeout ?? DEFAULT_CONFIG.timeout,
        getToken: config.getToken,
        setToken: config.setToken,
        getRefreshToken: config.getRefreshToken,
        setRefreshToken: config.setRefreshToken,
        clearTokens: config.clearTokens,
        onUnauthorized: config.onUnauthorized || (() => { }),
        debug: config.debug ?? DEFAULT_CONFIG.debug,
    };
}
