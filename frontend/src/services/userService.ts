import { User } from '@/types/user';

// Fetch all users
export const fetchUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch('/api/users');
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Delete a user
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete user');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Update user
export const updateUser = async (userId: string, userData: Partial<User>): Promise<User> => {
  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      throw new Error('Failed to update user');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (userId: string): Promise<User> => {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}; 