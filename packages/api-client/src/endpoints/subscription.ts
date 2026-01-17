/**
 * @lingroot/api-client
 * Subscription API Endpoints
 * 
 * Created: 2026-01-16
 * Version: 1.0
 */

import type { AxiosInstance } from 'axios';
import type {
    ApiResponse,
    SubscriptionPlan,
    UserSubscription,
    UsageSummary,
} from '../types';

export interface SubscriptionApi {
    // Plans
    getPlans(): Promise<ApiResponse<SubscriptionPlan[]>>;
    getPlanById(planId: string): Promise<ApiResponse<SubscriptionPlan>>;

    // User subscription
    getCurrentSubscription(): Promise<ApiResponse<UserSubscription | null>>;
    getUsageSummary(): Promise<ApiResponse<UsageSummary>>;
    getMyPlanFeatures(): Promise<{
        success: boolean;
        features: {
            plan_name: string;
            homepage_features: Record<string, boolean>;
            limits: Record<string, number>;
        };
    }>;

    // IAP verification
    verifyApplePurchase(receiptData: string, productId?: string): Promise<ApiResponse<UserSubscription>>;
    verifyGooglePurchase(purchaseToken: string, productId: string): Promise<ApiResponse<UserSubscription>>;

    // Credit card payments (iyzico/Stripe)
    createPaymentIntent(planId: string): Promise<ApiResponse<{
        clientSecret: string;
        paymentIntentId: string;
    }>>;
    confirmPayment(paymentIntentId: string): Promise<ApiResponse<UserSubscription>>;

    // Cancellation
    cancelSubscription(): Promise<ApiResponse>;

    // Restore
    restorePurchases(): Promise<ApiResponse<UserSubscription | null>>;
}

export function createSubscriptionApi(api: AxiosInstance): SubscriptionApi {
    return {
        async getPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
            const response = await api.get<ApiResponse<SubscriptionPlan[]>>('/api/subscription/plans');
            return response.data;
        },

        async getPlanById(planId: string): Promise<ApiResponse<SubscriptionPlan>> {
            const response = await api.get<ApiResponse<SubscriptionPlan>>(
                `/api/subscription/plans/${encodeURIComponent(planId)}`
            );
            return response.data;
        },

        async getCurrentSubscription(): Promise<ApiResponse<UserSubscription | null>> {
            const response = await api.get<ApiResponse<UserSubscription | null>>('/api/subscription/current');
            return response.data;
        },

        async getUsageSummary(): Promise<ApiResponse<UsageSummary>> {
            const response = await api.get<ApiResponse<UsageSummary>>('/api/subscription/usage-summary');
            return response.data;
        },

        async getMyPlanFeatures(): Promise<{
            success: boolean;
            features: {
                plan_name: string;
                homepage_features: Record<string, boolean>;
                limits: Record<string, number>;
            };
        }> {
            const response = await api.get('/api/subscription/my-plan-features');
            return response.data;
        },

        async verifyApplePurchase(
            receiptData: string,
            productId?: string
        ): Promise<ApiResponse<UserSubscription>> {
            const response = await api.post<ApiResponse<UserSubscription>>('/api/iap/verify-apple', {
                receiptData,
                productId,
            });
            return response.data;
        },

        async verifyGooglePurchase(
            purchaseToken: string,
            productId: string
        ): Promise<ApiResponse<UserSubscription>> {
            const response = await api.post<ApiResponse<UserSubscription>>('/api/iap/verify-google', {
                purchaseToken,
                productId,
            });
            return response.data;
        },

        async createPaymentIntent(planId: string): Promise<ApiResponse<{
            clientSecret: string;
            paymentIntentId: string;
        }>> {
            const response = await api.post('/api/stripe/create-payment-intent', { planId });
            return response.data;
        },

        async confirmPayment(paymentIntentId: string): Promise<ApiResponse<UserSubscription>> {
            const response = await api.post('/api/stripe/confirm-payment', { paymentIntentId });
            return response.data;
        },

        async cancelSubscription(): Promise<ApiResponse> {
            const response = await api.post<ApiResponse>('/api/subscription/cancel');
            return response.data;
        },

        async restorePurchases(): Promise<ApiResponse<UserSubscription | null>> {
            const response = await api.post<ApiResponse<UserSubscription | null>>('/api/subscription/restore');
            return response.data;
        },
    };
}
