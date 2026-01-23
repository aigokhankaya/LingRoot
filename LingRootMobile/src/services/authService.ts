/**
 * Auth Service (New API Client Wrapper)
 * 
 * This service wraps the new @lingroot/api-client auth module
 * to provide backward-compatible functions for the existing codebase.
 * 
 * Created: 2026-01-16
 */

import { getApiClientAsync, ApiResponse, LoginResponse } from '../services/apiClient';

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string): Promise<void> {
    const client = await getApiClientAsync();
    await client.auth.resendVerification(email);
}

/**
 * Request password reset (forgot password)
 */
export async function requestPasswordReset(email: string): Promise<void> {
    const client = await getApiClientAsync();
    await client.auth.forgotPassword(email);
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
    const client = await getApiClientAsync();
    await client.auth.resetPassword(token, newPassword);
}

/**
 * Login with email and password
 */
export async function login(
    email: string,
    password: string,
    rememberMe?: boolean
): Promise<LoginResponse> {
    const client = await getApiClientAsync();
    return client.auth.login({ email, password, rememberMe });
}

/**
 * Register new user
 */
export async function register(
    email: string,
    password: string,
    fullName?: string,
    phoneNumber?: string
): Promise<LoginResponse> {
    const client = await getApiClientAsync();
    // Split fullName into firstName and lastName
    const nameParts = (fullName || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return client.auth.register({
        email,
        password,
        firstName,
        lastName,
        phoneNumber: phoneNumber || '',
    });
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
    const client = await getApiClientAsync();
    await client.auth.logout();
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<ApiResponse<any>> {
    const client = await getApiClientAsync();
    return client.auth.getCurrentUser();
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<void> {
    const client = await getApiClientAsync();
    await client.auth.verifyEmail(token);
}

// Re-export types
export type { LoginResponse, ApiResponse };
