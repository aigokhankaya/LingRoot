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

// ... types remain same ...

export async function getUsageSummary(): Promise<{ success: boolean; data: UsageSummary }> {
    const client = await getApiClientAsync();
    try {
        const result = await client.subscription.getUsageSummary();
        return { success: result.success, data: result.data as UsageSummary };
    } catch (error) {
        console.error('Error fetching usage summary:', error);
        return { success: false, data: {} as UsageSummary }; // Fallback
    }
}

export async function getSubscriptionPlans(): Promise<{ success: boolean; data: any[] }> {
    const client = await getApiClientAsync();
    try {
        const result = await client.subscription.getPlans();
        return { success: result.success, data: result.data as any[] };
    } catch (error) {
        console.error('Error fetching plans:', error);
        return { success: false, data: [] };
    }
}

// Get user's plan features
export const getMyPlanFeatures = async (): Promise<UserPlanFeatures> => {
    const client = await getApiClientAsync();
    try {
        // Uses corrected endpoint: /api/subscription/my-features
        const response = await client.subscription.getMyPlanFeatures();
        if (response.success) {
            // Backend returns { success: true, data: { plan_id, plan_name, features } }
            // But apiClient types might not reflect this structure correctly if interface mismatch
            const responseData = (response as any).data;

            if (!responseData) return getDefaultPlanFeatures();

            return {
                plan_id: responseData.plan_id || null,
                plan_name: responseData.plan_name || null,
                features: responseData.features || {}
            } as any;
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
