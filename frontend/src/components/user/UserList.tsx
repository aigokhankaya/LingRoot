import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { User } from '@/types/user';
import { fetchUsers, deleteUser, updateUser } from '@/services/userService';
import Button from '@/components/common/Button';
import MembershipBadge from '@/components/user/MembershipBadge';

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteUser(userId);
      setUsers(users.filter(user => user.id !== userId));
    } catch (err) {
      setError('Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      const updatedUser = await updateUser(userId, { role: newRole });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: updatedUser.role } : user
      ));
    } catch (err) {
      setError('Failed to update user role');
      console.error('Error updating user role:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading users...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">{error}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Membership
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <Image
                      className="rounded-full object-cover"
                      src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                      alt={user.name}
                      width={40}
                      height={40}
                    />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{user.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <MembershipBadge status={user.membershipStatus} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <select
                  value={user.role}
                  onChange={(e) => handleUpdateRole(user.id, e.target.value as 'user' | 'admin')}
                  className="text-sm text-gray-900 border rounded px-2 py-1"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteUser(user.id)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserList; 