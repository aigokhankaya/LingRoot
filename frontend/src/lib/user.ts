import { API_BASE_URL, createHeaders, ApiResponse } from './api';

// Types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  isVerified: boolean;
  dailyContentUsed: number;
  lastContentDate: string | null;
  stripeCustomerId?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  bio?: string;
  preferences?: Record<string, any>;
}

// Get all users (admin only)
export const getAllUsers = async (): Promise<ApiResponse<User[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: createHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get users');
    }

    return await response.json();
  } catch (error) {
    console.error('Get all users error:', error);
    throw error;
  }
};

// Get user by ID (admin only)
export const getUserById = async (userId: string): Promise<ApiResponse<User>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      headers: createHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get user');
    }

    return await response.json();
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
};

// Get current user profile
export const getCurrentUserProfile = async (): Promise<ApiResponse<User>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: createHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get profile');
    }

    return await response.json();
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (profileData: UserProfile): Promise<ApiResponse<User>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: createHeaders(),
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update profile');
    }

    return await response.json();
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

// Change password
export const changePassword = async (currentPassword: string, newPassword: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to change password');
    }

    return await response.json();
  } catch (error) {
    console.error('Change password error:', error);
    throw error;
  }
};

// Request password reset
export const requestPasswordReset = async (email: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to request password reset');
    }

    return await response.json();
  } catch (error) {
    console.error('Request password reset error:', error);
    throw error;
  }
};

// Reset password with token
export const resetPassword = async (email: string, code: string, newPassword: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({
        email,
        code,
        newPassword
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to reset password');
    }

    return await response.json();
  } catch (error) {
    console.error('Reset password error:', error);
    throw error;
  }
};

// Update user role (admin only)
export const updateUserRole = async (userId: string, role: string): Promise<ApiResponse<User>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: createHeaders(),
      body: JSON.stringify({ role })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update user role');
    }

    return await response.json();
  } catch (error) {
    console.error('Update user role error:', error);
    throw error;
  }
};

// Delete user (admin only)
export const deleteUserAdmin = async (userId: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: createHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete user');
    }

    return await response.json();
  } catch (error) {
    console.error('Delete user (admin) error:', error);
    throw error;
  }
};

// Delete current user account (self-deletion)
export const deleteCurrentUserAccount = async (): Promise<ApiResponse> => {
  // TODO: Backend endpoint for self-deletion is required.
  // This is a placeholder function.
  console.warn('Backend endpoint for self-deletion is not available. This function is a placeholder.');
  try {
    // Replace with actual API call when backend endpoint is ready
    // Example: const response = await fetch(`${API_BASE_URL}/auth/delete-me`, { method: 'DELETE', headers: createHeaders() });
    // Simulate success for now, but indicate it's not functional
    return Promise.resolve({ success: false, message: 'Self-deletion endpoint not implemented in backend.' });
  } catch (error) {
    console.error('Delete current user account error:', error);
    throw error;
  }
};
