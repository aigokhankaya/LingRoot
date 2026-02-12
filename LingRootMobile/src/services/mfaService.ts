/**
 * MFA Service
 * 
 * Handles MFA (Multi-Factor Authentication) operations with a potentially
 * separate backend URL (e.g. tunneling).
 * 
 * Created: 2026-01-16
 * Updated: 2026-01-16 (Extracted from api.ts)
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import secureStorage from './secureStorage';
import { getApiBaseUrl } from './environmentConfig';
import { EXPO_PUBLIC_API_URL, EXPO_PUBLIC_MFA_API_URL } from '@env';

// Determine Base URLs from @env (synchronous, available at build time)
const PRODUCTION_URL = 'https://lingroot-production.up.railway.app';
const rawEnvUrl = (EXPO_PUBLIC_API_URL || '').trim().replace(/^\uFEFF/, '');
const resolvedApiUrl = rawEnvUrl.startsWith('http') ? rawEnvUrl : PRODUCTION_URL;

let API_BASE_URL = resolvedApiUrl;
let MFA_API_BASE_URL = EXPO_PUBLIC_MFA_API_URL || resolvedApiUrl;

// Also update from async config (in case of dynamic overrides)
getApiBaseUrl().then(url => {
    API_BASE_URL = url;
    if (!EXPO_PUBLIC_MFA_API_URL) {
        MFA_API_BASE_URL = url;
    }
});

// Global unauthorized handler
let unauthorizedHandler: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: () => void) => {
    unauthorizedHandler = handler;
};

// Create axios instance
const mfaApiClient = axios.create({
    baseURL: MFA_API_BASE_URL,
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Refresh logic (simplified clone from api.ts to avoid circular deps or complexity)
// In a perfect world, this should be a shared utility.
let refreshPromise: Promise<void> | null = null;
async function performTokenRefresh(): Promise<void> {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
        try {
            const refreshToken = await secureStorage.getItem('refresh_token');
            if (!refreshToken) throw new Error('no_refresh_token');
            const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
            });
            if (!res.ok) throw new Error('Refresh failed');
            const body = await res.json();
            const newAccess = body?.data?.token;
            const newRefresh = body?.data?.refreshToken;
            if (newAccess && newRefresh) {
                await secureStorage.setItem('auth_token', newAccess);
                await secureStorage.setItem('refresh_token', newRefresh);
            }
        } finally {
            refreshPromise = null;
        }
    })();
    return refreshPromise;
}

// Request Interceptor
mfaApiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await secureStorage.getItem('auth_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            // Ensure baseURL is up to date if it wasn't ready at creation
            if (config.baseURL === resolvedApiUrl && MFA_API_BASE_URL !== resolvedApiUrl) {
                config.baseURL = MFA_API_BASE_URL;
            }
        } catch (error) {
            console.error('Error getting token for MFA:', error);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
mfaApiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            const msg = (error.response?.data?.message || '').toString();
            const isExplicitTokenProblem =
                msg.toLowerCase().includes('token expired') ||
                msg.toLowerCase().includes('invalid token');

            if (isExplicitTokenProblem && error.config && !(error.config as any).__retryAfterRefresh) {
                try {
                    await performTokenRefresh();
                    const newToken = await secureStorage.getItem('auth_token');
                    if (newToken) {
                        (error.config as any).__retryAfterRefresh = true;
                        error.config.headers.Authorization = `Bearer ${newToken}`;
                        return await mfaApiClient.request(error.config);
                    }
                } catch {
                    // Logout if refresh fails
                    try {
                        await secureStorage.multiRemove(['auth_token', 'user_data', 'refresh_token']);
                        if (unauthorizedHandler) unauthorizedHandler();
                    } catch { }
                }
            }
        }
        return Promise.reject(error);
    }
);

export const mfaService = {
    // Setup MFA - Generate QR code
    async setupMfa(): Promise<{ success: boolean; qrCode?: string; secret?: string; message?: string }> {
        try {
            const response = await mfaApiClient.post('/api/mfa/setup');
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'MFA kurulumu başarısız';
            throw new Error(msg);
        }
    },

    // Verify MFA setup with token
    async verifyMfaSetup(token: string): Promise<{ success: boolean; backupCodes?: string[]; message?: string }> {
        try {
            const response = await mfaApiClient.post('/api/mfa/verify-setup', { token });
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'MFA doğrulama başarısız';
            throw new Error(msg);
        }
    },

    // Verify MFA token during login
    async verifyMfaLogin(token: string): Promise<{ success: boolean; message?: string }> {
        try {
            const response = await mfaApiClient.post('/api/mfa/verify-login', { token });
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'MFA doğrulama başarısız';
            throw new Error(msg);
        }
    },

    // Disable MFA
    async disableMfa(password: string): Promise<{ success: boolean; message?: string }> {
        try {
            const response = await mfaApiClient.post('/api/mfa/disable', { password });
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'MFA devre dışı bırakılamadı';
            throw new Error(msg);
        }
    },

    // Get MFA status
    async getMfaStatus(): Promise<{ success: boolean; mfaEnabled?: boolean; message?: string }> {
        try {
            const response = await mfaApiClient.get('/api/mfa/status');
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'MFA durumu alınamadı';
            throw new Error(msg);
        }
    },

    // Regenerate backup codes
    async regenerateBackupCodes(password: string): Promise<{ success: boolean; backupCodes?: string[]; message?: string }> {
        try {
            const response = await mfaApiClient.post('/api/mfa/regenerate-backup-codes', { password });
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Yedek kodlar oluşturulamadı';
            throw new Error(msg);
        }
    },

    // Verify backup code
    async verifyBackupCode(code: string): Promise<{ success: boolean; message?: string }> {
        try {
            const response = await mfaApiClient.post('/api/mfa/verify-backup-code', { code });
            return response.data;
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Yedek kod doğrulaması başarısız';
            throw new Error(msg);
        }
    },
};
