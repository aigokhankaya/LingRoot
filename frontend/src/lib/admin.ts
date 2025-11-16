import { API_BASE_URL, createHeaders, ApiResponse, getApiUrl } from './api';
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
    const response = await fetch(getApiUrl('admin/stats'), {
      headers: createHeaders(),
      credentials: 'include',
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
    const response = await fetch(getApiUrl(`admin/users/${userId}`), {
      method: 'PUT',
      headers: createHeaders('application/json'),
      credentials: 'include',
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
    const response = await fetch(getApiUrl(`admin/subscriptions/${subscriptionId}`), {
      method: 'PUT',
      headers: createHeaders('application/json'),
      credentials: 'include',
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

// Get a user's audio history (admin-only)
export interface AdminAudioHistoryItem {
  id: string;
  user_id: string;
  input: string;
  input_type: string;
  level: string;
  mp3_url: string;
  translated_text?: string;
  adapted_text?: string;
  created_at: string;
  words?: string | any[];
  timepoints?: string | any[];
  words_count?: number | null;
  timepoints_count?: number | null;
  // cost fields
  openai_prompt_tokens?: number;
  openai_completion_tokens?: number;
  openai_total_tokens?: number;
  openai_cost_usd?: number;
  tts_characters?: number;
  tts_category?: 'Basic' | 'Premium' | 'Gold' | 'Platinum' | string;
  tts_cost_usd?: number;
  total_cost_usd?: number;
}

export interface AdminAudioHistoryResponse extends ApiResponse<AdminAudioHistoryItem[]> {
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const getUserAudioHistoryAdmin = async (
  userId: string,
  opts?: { page?: number; limit?: number; search?: string }
): Promise<AdminAudioHistoryResponse> => {
  const { page = 1, limit = 50, search = '' } = opts || {};
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  const response = await fetch(getApiUrl(`admin/users/${userId}/audio-history?${params.toString()}`), {
    headers: createHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || 'Failed to fetch user audio history (admin)');
  }
  return response.json();
};

// Delete audio files (admin-only)
export const deleteAudioFiles = async (
  userId: string,
  audioIds: string[]
): Promise<ApiResponse<{ deletedCount: number; deletedFromStorage: number }>> => {
  const response = await fetch(getApiUrl(`admin/users/${userId}/audio-files`), {
    method: 'DELETE',
    headers: createHeaders('application/json'),
    credentials: 'include',
    body: JSON.stringify({ audioIds }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to delete audio files');
  }
  return response.json();
};
