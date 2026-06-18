/**
 * @lingroot/api-client
 * Core HTTP Client with Token Management
 * 
 * Created: 2026-01-16
 * Version: 1.0
 */

import type { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiClientConfig } from './config';
import type { ApiError, RefreshTokenResponse } from './types';
import { mergeConfig } from './config';

// We expect axios to be provided as a peer dependency
let axios: typeof import('axios').default;

/**
 * Initialize axios (must be called before using the client)
 */
export function setAxios(axiosInstance: typeof import('axios').default): void {
    axios = axiosInstance;
}

/**
 * Create HTTP client with interceptors for token management
 */
export function createHttpClient(config: ApiClientConfig): {
    api: AxiosInstance;
    mfaApi: AxiosInstance;
    refreshTokens: () => Promise<boolean>;
} {
    if (!axios) {
        throw new Error('[@lingroot/api-client] axios not initialized. Call setAxios() first.');
    }

    const mergedConfig = mergeConfig(config);
    let isRefreshing = false;
    let refreshPromise: Promise<boolean> | null = null;

    // Create main API client
    const api = axios.create({
        baseURL: mergedConfig.baseUrl,
        timeout: mergedConfig.timeout,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Create MFA API client (may use different base URL)
    const mfaApi = axios.create({
        baseURL: mergedConfig.mfaBaseUrl,
        timeout: mergedConfig.timeout,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    /**
     * Perform token refresh
     */
    async function refreshTokens(): Promise<boolean> {
        if (isRefreshing && refreshPromise) {
            return refreshPromise;
        }

        isRefreshing = true;
        refreshPromise = (async () => {
            try {
                const refreshToken = await mergedConfig.getRefreshToken();
                const refreshPayload = refreshToken ? { refreshToken } : {};

                const response = await axios.post<RefreshTokenResponse>(
                    `${mergedConfig.baseUrl}/api/auth/refresh`,
                    refreshPayload,
                    {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 30000,
                        withCredentials: true,
                    }
                );

                if (response.data.success && response.data.data) {
                    await mergedConfig.setToken(response.data.data.token);
                    await mergedConfig.setRefreshToken(response.data.data.refreshToken);

                    if (mergedConfig.debug) {
                        console.log('[@lingroot/api-client] Token refreshed successfully');
                    }

                    return true;
                }

                throw new Error('Invalid refresh response');
            } catch (error) {
                if (mergedConfig.debug) {
                    console.error('[@lingroot/api-client] Token refresh failed:', error);
                }

                await mergedConfig.clearTokens();
                mergedConfig.onUnauthorized();
                return false;
            } finally {
                isRefreshing = false;
                refreshPromise = null;
            }
        })();

        return refreshPromise;
    }

    /**
     * Request interceptor - add auth token
     */
    async function requestInterceptor(
        axiosConfig: InternalAxiosRequestConfig
    ): Promise<InternalAxiosRequestConfig> {
        try {
            const token = await mergedConfig.getToken();
            if (token) {
                axiosConfig.headers = axiosConfig.headers || {};
                axiosConfig.headers.Authorization = `Bearer ${token}`;
            }

            if (mergedConfig.debug && axiosConfig.url && !axiosConfig.url.includes('/health')) {
                console.log(`[@lingroot/api-client] ${axiosConfig.method?.toUpperCase()} ${axiosConfig.url}`);
            }
        } catch (error) {
            if (mergedConfig.debug) {
                console.error('[@lingroot/api-client] Error in request interceptor:', error);
            }
        }

        return axiosConfig;
    }

    /**
     * Response error interceptor - handle 401 and token refresh
     */
    async function responseErrorInterceptor(error: AxiosError<ApiError>): Promise<never> {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Check for explicit token problems
        if (error.response?.status === 401) {
            const message = error.response.data?.message?.toLowerCase() || '';
            const isTokenProblem =
                message.includes('token expired') ||
                message.includes('invalid token');

            if (isTokenProblem && !originalRequest._retry) {
                originalRequest._retry = true;

                const refreshed = await refreshTokens();
                if (refreshed) {
                    const newToken = await mergedConfig.getToken();
                    if (newToken && originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return api.request(originalRequest);
                    }
                }

                // Refresh failed, unauthorized callback already called
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }

    // Apply interceptors to main API
    api.interceptors.request.use(requestInterceptor, (error) => Promise.reject(error));
    api.interceptors.response.use(
        (response) => response,
        responseErrorInterceptor
    );

    // Apply interceptors to MFA API
    mfaApi.interceptors.request.use(requestInterceptor, (error) => Promise.reject(error));
    mfaApi.interceptors.response.use(
        (response) => response,
        responseErrorInterceptor
    );

    return { api, mfaApi, refreshTokens };
}

/**
 * Build API URL with proper path handling
 */
export function buildApiUrl(baseUrl: string, endpoint: string): string {
    // Remove trailing slash from base URL
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // Clean up endpoint
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    // Add /api prefix if not present
    if (!cleanEndpoint.startsWith('api/')) {
        cleanEndpoint = `api/${cleanEndpoint}`;
    }

    return `${cleanBase}/${cleanEndpoint}`;
}
