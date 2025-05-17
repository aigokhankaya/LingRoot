
'use client';

import { useEffect, useState } from 'react';
import { supabase, getUserRole } from '@/lib/supabaseClient'; // Import getUserRole
import { useRouter } from 'next/navigation';
import { logAdminAction } from '@/lib/logging'; // Import logging function

// Define User type based on expected data
interface User { // TODO: Refine based on actual Supabase table structure
    id: string;
    email: string | undefined;
    plan: string | null; // Assuming plan is stored in profiles or another table
    is_active: boolean | null; // Assuming status is stored
    created_at: string;
    content_count?: number; // Optional, will be fetched separately
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null); // State for current admin role
    const router = useRouter();

    useEffect(() => {
        const checkRoleAndFetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Check session and get user role
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session?.user) {
                    throw new Error('Not authenticated');
                }
                const role = await getUserRole(session.user.id);
                setCurrentUserRole(role);

                // 2. Enforce page access based on role
                if (role !== 'super_admin' && role !== 'support_admin') { // Allow both admin types to view users
                    console.warn(`Access Denied: User ${session.user.email} with role '${role}' tried to access user management page.`);
                    throw new Error('Access Denied');
                }

                // 3. Fetch users (if authorized)
                // TODO: Implement actual data fetching from a secure backend endpoint or Supabase function
                // This endpoint MUST verify the caller is an admin.
                console.log("Fetching users (placeholder)... Role:", role);
                const placeholderUsers: User[] = [
                    {
                        id: 'uuid-1', email: 'user1@example.com', plan: 'free', is_active: true,
                        created_at: new Date().toISOString(), content_count: 5
                    },
                    {
                        id: 'uuid-2', email: 'user2@example.com', plan: 'pro', is_active: true,
                        created_at: new Date(Date.now() - 86400000).toISOString(), content_count: 25
                    },
                    {
                        id: 'uuid-3', email: 'user3@example.com', plan: 'free', is_active: false,
                        created_at: new Date(Date.now() - 172800000).toISOString(), content_count: 0
                    },
                ];
                await new Promise(res => setTimeout(res, 500)); // Simulate fetch delay
                setUsers(placeholderUsers);

            } catch (err: any) {
                console.error("Error in UserManagementPage useEffect:", err);
                setError(err.message || "Failed to load user data.");
                if (err.message === 'Not authenticated' || err.message === 'Access Denied') {
                    router.push('/admin/login'); // Redirect unauthorized users
                }
            } finally {
                setLoading(false);
            }
        };

        checkRoleAndFetchUsers();
    }, [router]);

    const handlePlanChange = async (userId: string, currentPlan: string | null, newPlan: string) => {
        // **RBAC Check 1: Function Level**
        if (currentUserRole !== 'super_admin') {
            alert('Permission Denied: Only super admins can change user plans.');
            return;
        }

        const userEmail = users.find(u => u.id === userId)?.email || 'unknown';
        console.log(`TODO: Call Supabase function or API endpoint to update plan for user ${userId} (${userEmail}) to ${newPlan}`);
        // **RBAC Check 2: Backend/Function Level (CRITICAL)** - Backend must verify caller is super_admin
        try {
            // Simulate API call
            await new Promise(res => setTimeout(res, 500));

            // Log the action
            await logAdminAction('Changed User Plan', {
                targetType: 'user',
                targetId: userId,
                details: { email: userEmail, old_plan: currentPlan, new_plan: newPlan }
            });

            // Update UI (assuming success)
            setUsers(users.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
            alert(`Simulated: Plan changed for ${userEmail} to ${newPlan}. Action logged.`);

        } catch (err: any) {
            console.error("Plan Change Error:", err);
            alert(`Failed to change plan: ${err.message}`);
        }
    };

    const handleStatusChange = async (userId: string, currentStatus: boolean | null, newStatus: boolean) => {
        // **RBAC Check 1: Function Level**
        if (currentUserRole !== 'super_admin') {
            alert('Permission Denied: Only super admins can change user status.');
            return;
        }

        const userEmail = users.find(u => u.id === userId)?.email || 'unknown';
        const statusString = newStatus ? 'active' : 'inactive';
        console.log(`TODO: Call Supabase function or API endpoint to update status for user ${userId} (${userEmail}) to ${statusString}`);
        // **RBAC Check 2: Backend/Function Level (CRITICAL)** - Backend must verify caller is super_admin
        try {
            // Simulate API call
            await new Promise(res => setTimeout(res, 500));

            // Log the action
            await logAdminAction('Changed User Status', {
                targetType: 'user',
                targetId: userId,
                details: { email: userEmail, old_status: currentStatus, new_status: newStatus }
            });

            // Update UI (assuming success)
            setUsers(users.map(u => u.id === userId ? { ...u, is_active: newStatus } : u));
            alert(`Simulated: Status changed for ${userEmail} to ${statusString}. Action logged.`);

        } catch (err: any) {
            console.error("Status Change Error:", err);
            alert(`Failed to change status: ${err.message}`);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        // **RBAC Check 1: Function Level**
        if (currentUserRole !== 'super_admin') {
            alert('Permission Denied: Only super admins can delete users.');
            return;
        }

        const userEmail = users.find(u => u.id === userId)?.email || 'unknown';
        if (confirm(`Are you sure you want to delete user ${userId} (${userEmail})? This action cannot be undone.`)) {
            console.log(`TODO: Call Supabase function or API endpoint to delete user ${userId}`);
            // **RBAC Check 2: Backend/Function Level (CRITICAL)** - Backend must verify caller is super_admin
            // Requires careful handling, potentially soft delete first
            try {
                // Simulate API call
                await new Promise(res => setTimeout(res, 500));

                // Log the action
                await logAdminAction('Deleted User', {
                    targetType: 'user',
                    targetId: userId,
                    details: { email: userEmail }
                });

                // Update UI (assuming success)
                setUsers(users.filter(u => u.id !== userId));
                alert(`Simulated: User ${userEmail} deleted. Action logged.`);

            } catch (err: any) {
                console.error("Delete User Error:", err);
                alert(`Failed to delete user: ${err.message}`);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
                {/* Adjusted padding */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
                    {/* Responsive header */}
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200 text-center sm:text-left">User Management</h1>
                    <a href="/admin/dashboard" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">← Back to Dashboard</a>
                </div>

                {loading && <div className="text-center py-4">Loading users...</div>}
                {error && <div className="text-center py-4 text-red-500">Error: {error}</div>}

                {!loading && !error && (
                    <div className="overflow-x-auto">
                        {/* Added overflow-x-auto for horizontal scrolling on very small screens if needed */}
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    {/* Responsive Columns */}
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">Plan</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">Created At</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">Content Count</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">{user.email}</td>
                                        {/* Responsive Columns */}
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden md:table-cell">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.plan === 'pro' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
                                                {user.plan || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden lg:table-cell">{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center hidden lg:table-cell">{user.content_count ?? '--'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                            {/* Responsive Actions Layout */}
                                            {currentUserRole === 'super_admin' ? (
                                                <div className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-2">
                                                    <button onClick={() => handlePlanChange(user.id, user.plan, user.plan === 'pro' ? 'free' : 'pro')} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 text-left md:text-center">Toggle Plan</button>
                                                    <button onClick={() => handleStatusChange(user.id, user.is_active, !user.is_active)} className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-200 text-left md:text-center">Toggle Status</button>
                                                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 text-left md:text-center">Delete</button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">No actions</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No users found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

