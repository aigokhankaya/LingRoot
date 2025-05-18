import { User, UserUpdateData } from '@/types/user';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/admin';

function mapUserFromApi(apiUser: any): User {
  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role,
    membershipStatus: apiUser.membership_status || apiUser.membershipStatus,
    avatar: apiUser.avatar,
    createdAt: apiUser.created_at || apiUser.createdAt,
    updatedAt: apiUser.updated_at || apiUser.updatedAt,
    firstName: apiUser.first_name || apiUser.firstName,
    lastName: apiUser.last_name || apiUser.lastName,
    lastLogin: apiUser.last_login || apiUser.lastLogin,
    isActive: apiUser.is_active ?? apiUser.isActive,
    phoneNumber: apiUser.phone_number || apiUser.phoneNumber,
    preferences: apiUser.preferences,
    loginCount: apiUser.login_count ?? apiUser.loginCount,
    contentCount: apiUser.content_count ?? apiUser.contentCount,
  };
}

// Fetch all users
export const fetchUsers = async (): Promise<User[]> => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
    const response = await fetch(`${API_URL}/admin/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
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
export const deleteUser = async (id: string): Promise<void> => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
    const response = await fetch(`${API_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    throw error;
  }
};

// Update user
export const updateUser = async (id: string, userData: UserUpdateData): Promise<User> => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
    const response = await fetch(`${API_URL}/admin/users/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData),
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
    const response = await fetch(`${API_URL}/admin/users/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return mapUserFromApi(data);
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    throw error;
  }
}; 