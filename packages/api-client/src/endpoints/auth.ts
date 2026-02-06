/**
 * @lingroot/api-client
 * Auth API Endpoints
 * 
 * Created: 2026-01-16
 * Version: 1.0
 */

import type { AxiosInstance } from 'axios';
import type {
    ApiResponse,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    User,
} from '../types';

export interface AuthApi {
    login(request: LoginRequest): Promise<LoginResponse>;
    register(request: RegisterRequest): Promise<LoginResponse>;
    logout(): Promise<ApiResponse>;
    getCurrentUser(): Promise<ApiResponse<User>>;
    resendVerification(email: string): Promise<ApiResponse>;
    forgotPassword(email: string): Promise<ApiResponse>;
    resetPassword(email: string, code: string, newPassword: string): Promise<ApiResponse>;
    verifyEmail(token: string): Promise<ApiResponse>;
    googleAuth(idToken: string): Promise<LoginResponse>;
    appleAuth(identityToken: string, user?: { firstName?: string; lastName?: string }): Promise<LoginResponse>;
}

export function createAuthApi(api: AxiosInstance): AuthApi {
    return {
        async login(request: LoginRequest): Promise<LoginResponse> {
            const response = await api.post<LoginResponse>('/api/auth/login', request);
            return response.data;
        },

        async register(request: RegisterRequest): Promise<LoginResponse> {
            const response = await api.post<LoginResponse>('/api/auth/register', request);
            return response.data;
        },

        async logout(): Promise<ApiResponse> {
            const response = await api.post<ApiResponse>('/api/auth/logout');
            return response.data;
        },

        async getCurrentUser(): Promise<ApiResponse<User>> {
            const response = await api.get<ApiResponse<User>>('/api/auth/me');
            return response.data;
        },

        async resendVerification(email: string): Promise<ApiResponse> {
            const response = await api.post<ApiResponse>('/api/auth/resend-verification', { email });
            return response.data;
        },

        async forgotPassword(email: string): Promise<ApiResponse> {
            const response = await api.post<ApiResponse>('/api/auth/forgot-password', { email });
            return response.data;
        },

        async resetPassword(email: string, code: string, newPassword: string): Promise<ApiResponse> {
            const response = await api.post<ApiResponse>('/api/auth/reset-password', { email, code, newPassword });
            return response.data;
        },

        async verifyEmail(token: string): Promise<ApiResponse> {
            const response = await api.post<ApiResponse>(`/api/auth/verify-email/${encodeURIComponent(token)}`);
            return response.data;
        },

        async googleAuth(idToken: string): Promise<LoginResponse> {
            const response = await api.post<LoginResponse>('/api/auth/google-login', { idToken });
            return response.data;
        },

        async appleAuth(
            identityToken: string,
            user?: { firstName?: string; lastName?: string }
        ): Promise<LoginResponse> {
            const response = await api.post<LoginResponse>('/api/auth/apple-login', {
                identityToken,
                user
            });
            return response.data;
        },
    };
}
