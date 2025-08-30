import { User, UserUpdateData } from '@/types/user';
import { getApiUrl, createHeaders } from '@/lib/api';
import type { UsageSummary } from '@/lib/usageEstimates';

function mapUserFromApi(apiUser: any): User {
  const first = apiUser.firstname ?? apiUser.first_name ?? apiUser.firstName ?? '';
  const last = apiUser.lastname ?? apiUser.last_name ?? apiUser.lastName ?? '';
  const composedName = `${first} ${last}`.trim();
  return {
    id: apiUser.id,
    name: apiUser.name ?? (composedName || undefined),
    email: apiUser.email,
    role: apiUser.role,
    membershipStatus: apiUser.membership_status || apiUser.membershipStatus,
    avatar: apiUser.avatar,
    createdAt: apiUser.created_at || apiUser.createdAt,
    updatedAt: apiUser.updated_at || apiUser.updatedAt,
    firstName: apiUser.first_name || apiUser.firstName || apiUser.firstname,
    lastName: apiUser.last_name || apiUser.lastName || apiUser.lastname,
    lastLogin: apiUser.last_login || apiUser.lastLogin || apiUser.updated_at,
    isActive: (apiUser.is_active ?? apiUser.isActive ?? undefined) ?? (typeof apiUser.isverified === 'boolean' ? apiUser.isverified : undefined),
    phoneNumber: apiUser.phone_number || apiUser.phoneNumber || apiUser.phonenumber,
    preferences: apiUser.preferences,
    loginCount: apiUser.login_count ?? apiUser.loginCount,
    contentCount: apiUser.content_count ?? apiUser.contentCount,
  };
}

// Get usage summary for a specific user (admin)
export const getAdminUserUsage = async (id: string): Promise<{ success: boolean; data?: UsageSummary | null }> => {
  try {
    const response = await fetch(getApiUrl(`admin/users/${id}/usage`), {
      headers: createHeaders('application/json'),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const json = await response.json();
    return json;
  } catch (error) {
    console.error(`Error fetching admin usage for user ${id}:`, error);
    return { success: false };
  }
};

// Fetch all users
export const fetchUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch(getApiUrl('admin/users'), {
      headers: createHeaders('application/json'),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return Array.isArray(result.data) ? result.data.map(mapUserFromApi) : [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Delete a user
export const deleteUser = async (id: string): Promise<{ deletedAudioCount?: number; message?: string }> => {
  try {
    const response = await fetch(getApiUrl(`admin/users/${id}`), {
      method: 'DELETE',
      headers: createHeaders('application/json'),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    try {
      const json = await response.json();
      return { deletedAudioCount: json?.deletedAudioCount, message: json?.message };
    } catch {
      return {};
    }
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    throw error;
  }
};

// Bulk delete users
export const deleteUsersBulk = async (ids: string[]): Promise<{ deletedAudioCount?: number; message?: string }> => {
  try {
    const response = await fetch(getApiUrl('admin/users/bulk-delete'), {
      method: 'POST',
      headers: createHeaders('application/json'),
      body: JSON.stringify({ ids }),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    try {
      const json = await response.json();
      return { deletedAudioCount: json?.deletedAudioCount, message: json?.message };
    } catch {
      return {};
    }
  } catch (error) {
    console.error(`Error bulk deleting users:`, error);
    throw error;
  }
};

// Update user
export const updateUser = async (id: string, userData: UserUpdateData): Promise<User> => {
  try {
    const response = await fetch(getApiUrl(`admin/users/${id}`), {
      method: 'PATCH',
      headers: createHeaders('application/json'),
      body: JSON.stringify(userData),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return mapUserFromApi(data);
  } catch (error) {
    console.error(`Error updating user ${id}:`, error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (id: string): Promise<User> => {
  try {
    const response = await fetch(getApiUrl(`admin/users/${id}`), {
      headers: createHeaders('application/json'),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const json = await response.json();
    const data = json?.data ?? json; 
    return mapUserFromApi(data);
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    throw error;
  }
}; 