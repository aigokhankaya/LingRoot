import { API_BASE_URL, createHeaders, ApiResponse } from './api';
import { User } from './user'; // Assuming User interface is defined in user.ts

// Types
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalContent: number;
  [key: string]: any;
}

// Get dashboard statistics (admin only)
export const getDashboardStats = async (): Promise<ApiResponse<DashboardStats>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: createHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get dashboard stats');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    throw error;
  }
};

// Placeholder for updating user info by admin
// Backend endpoint PUT /admin/users/:id is available
export const updateUserAdmin = async (userId: string, userData: Partial<User>): Promise<ApiResponse<User>> => {
  console.warn('updateUserAdmin function needs implementation based on specific requirements.');
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PUT',
      headers: createHeaders(),
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update user (admin)');
    }

    return await response.json();
  } catch (error) {
    console.error('Update user (admin) error:', error);
    throw error;
  }
};

// Placeholder for updating user subscription by admin
// Backend endpoint PUT /admin/subscriptions/:id is available
// Note: This usually involves updating the subscription record, not directly assigning a plan.
// The exact implementation depends on how the backend handles subscription updates.
export const updateUserSubscriptionAdmin = async (subscriptionId: string, updateData: any): Promise<ApiResponse<any>> => {
  console.warn('updateUserSubscriptionAdmin function needs implementation based on specific backend logic.');
  try {
    const response = await fetch(`${API_BASE_URL}/admin/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      headers: createHeaders(),
      body: JSON.stringify(updateData) // e.g., { status: 'active', planId: 'new_plan_id' }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update subscription (admin)');
    }

    return await response.json();
  } catch (error) {
    console.error('Update subscription (admin) error:', error);
    throw error;
  }
};
