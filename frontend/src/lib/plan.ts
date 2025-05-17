import { API_BASE_URL, createHeaders, ApiResponse } from './api';

// Types
export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanCreateParams {
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  isActive?: boolean;
}

export interface PlanUpdateParams {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  interval?: 'monthly' | 'yearly';
  features?: string[];
  isActive?: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'expired';
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  plan?: Plan;
}

// Get all plans
export const getAllPlans = async (): Promise<ApiResponse<Plan[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/subscription/plans`, {
      headers: createHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get plans');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get all plans error:', error);
    throw error;
  }
};

// Get plan by ID
export const getPlanById = async (planId: string): Promise<ApiResponse<Plan>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/subscription/plans/${planId}`, {
      headers: createHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get plan');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get plan error:', error);
    throw error;
  }
};

// Create new plan (admin only)
export const createPlan = async (planData: PlanCreateParams): Promise<ApiResponse<Plan>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/subscription/plans`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(planData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create plan');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Create plan error:', error);
    throw error;
  }
};

// Update plan (admin only)
export const updatePlan = async (planId: string, planData: PlanUpdateParams): Promise<ApiResponse<Plan>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/subscription/plans/${planId}`, {
      method: 'PUT',
      headers: createHeaders(),
      body: JSON.stringify(planData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update plan');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Update plan error:', error);
    throw error;
  }
};

// Delete plan (admin only)
export const deletePlan = async (planId: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/subscription/plans/${planId}`, {
      method: 'DELETE',
      headers: createHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete plan');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Delete plan error:', error);
    throw error;
  }
};

// Get current user subscription
export const getCurrentSubscription = async (): Promise<ApiResponse<Subscription>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/subscription/current`, {
      headers: createHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get current subscription');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get current subscription error:', error);
    throw error;
  }
};

// Subscribe to a plan
export const subscribeToPlan = async (planId: string): Promise<ApiResponse<Subscription>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/subscription/subscribe`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ planId })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to subscribe to plan');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Subscribe to plan error:', error);
    throw error;
  }
};

// Cancel subscription
export const cancelSubscription = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/subscription/cancel`, {
      method: 'POST',
      headers: createHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to cancel subscription');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Cancel subscription error:', error);
    throw error;
  }
};

// Get all subscriptions (admin only)
export const getAllSubscriptions = async (): Promise<ApiResponse<Subscription[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/subscriptions`, {
      headers: createHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get all subscriptions');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    throw error;
  }
};

// Get user subscription by user ID (admin only)
export const getUserSubscription = async (userId: string): Promise<ApiResponse<Subscription>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/subscriptions/user/${userId}`, {
      headers: createHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get user subscription');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get user subscription error:', error);
    throw error;
  }
};
