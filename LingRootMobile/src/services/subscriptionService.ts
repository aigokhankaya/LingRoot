import { getApiClientAsync } from './apiClient';

export interface UsageSummary {
    remaining_minutes: number;
    total_minutes: number;
    used_minutes: number;
    reset_date?: string;
    plan_name?: string;
    plan_id?: string;
    isExceeded?: boolean;
    hasPlan?: boolean;
}

export interface PlanFeatures {
    homepage_features?: {
        text_input?: boolean;
        youtube?: boolean;
        file_upload?: boolean;
        podcast?: boolean;
        topic_suggestions?: boolean;
        topic_tree?: boolean;
        book?: boolean;
        liro?: boolean;
        daily_usage_patterns?: boolean;
    };
    voice_categories?: {
        standard?: boolean;
        wavenet?: boolean;
        neural2?: boolean;
        studio?: boolean;
        chirp3d?: boolean;
        amazon_standard?: boolean;
        amazon_neural?: boolean;
        amazon_generative?: boolean;
    };
    sentence_patterns?: {
        enabled?: boolean;
        max_patterns?: number;
    };
}

export interface UserPlanFeatures {
    plan_id: string | null;
    plan_name: string | null;
    features: PlanFeatures;
}

export async function getUsageSummary(): Promise<{ success: boolean; data: UsageSummary }> {
    const client = await getApiClientAsync();
    const response = await client.http.get('/api/subscription/usage-summary');
    return response.data;
}

export async function getSubscriptionPlans(): Promise<{ success: boolean; data: any[] }> {
    const client = await getApiClientAsync();
    const response = await client.http.get('/api/subscription/plans');
    return response.data;
}

// Get user's plan features
export const getMyPlanFeatures = async (): Promise<UserPlanFeatures> => {
    const client = await getApiClientAsync();
    try {
        const response = await client.http.get('/api/subscriptions/my-features');
        if (response.data.success) {
            return response.data.data;
        }
        return getDefaultPlanFeatures();
    } catch (error) {
        console.error('Error fetching plan features:', error);
        return getDefaultPlanFeatures();
    }
};

// Get default plan features (for users without active subscription)
export const getDefaultPlanFeatures = (): UserPlanFeatures => {
    return {
        plan_id: null,
        plan_name: null,
        features: {
            homepage_features: {
                text_input: true,
                youtube: false,
                file_upload: false,
                podcast: false,
                topic_suggestions: true,
                topic_tree: false,
                book: false,
                liro: false,
                daily_usage_patterns: false,
            },
            voice_categories: {
                standard: true,
                wavenet: false,
                neural2: false,
                studio: false,
                chirp3d: false,
                amazon_standard: false,
                amazon_neural: false,
                amazon_generative: false,
            },
            sentence_patterns: {
                enabled: false,
                max_patterns: 0
            }
        }
    };
};
