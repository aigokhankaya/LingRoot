
'use client';

import { useEffect, useState } from 'react';
import { supabase, getUserRole } from '@/lib/supabaseClient'; // Assuming supabase client and role checker
import { useRouter } from 'next/navigation';
import { logAdminAction, fetchAdminLogs, AuditLog } from '@/lib/logging'; // Import logging functions and type

// Define AdminUser type based on requirements
interface AdminUser { // TODO: Refine based on actual 'admin_users' table structure
    id: string; // Assuming an ID
    email: string;
    role: 'super_admin' | 'support_admin';
    created_at?: string; // Optional
}

export default function AdminRolesPage() {
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]); // Use imported AuditLog type
    const [loadingAdmins, setLoadingAdmins] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminRole, setNewAdminRole] = useState<'super_admin' | 'support_admin'>('support_admin');
    const [isAdding, setIsAdding] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkCurrentUserRoleAndFetchData = async () => {
            setLoadingAdmins(true);
            setLoadingLogs(true);
            setError(null);
            try {
                // 1. Check current user's session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session?.user) {
                    throw new Error('Not authenticated');
                }

                // 2. Fetch current user's role
                // IMPORTANT: getUserRole needs to securely fetch the role (e.g., from a 'profiles' or 'admin_users' table)
                const role = await getUserRole(session.user.id);
                setCurrentUserRole(role);

                // 3. Enforce page access based on role
                // Only allow 'super_admin' or 'support_admin' (or general 'admin' if that's the role name)
                if (role !== 'super_admin' && role !== 'support_admin') { // Adjust role names if different
                    console.warn(`Access Denied: User ${session.user.email} with role '${role}' tried to access admin roles page.`);
                    throw new Error('Access Denied');
                }

                // 4. Fetch Admin Users (if authorized)
                // TODO: Implement actual data fetching from a secure backend endpoint or Supabase function
                // This endpoint should verify the caller is an admin before returning data.
                const placeholderAdmins: AdminUser[] = [
                    { id: 'admin1', email: 'super@example.com', role: 'super_admin' },
                    { id: 'admin2', email: 'support@example.com', role: 'support_admin' },
                ];
                await new Promise(res => setTimeout(res, 300)); // Simulate fetch
                setAdminUsers(placeholderAdmins);
                setLoadingAdmins(false);

                // 5. Fetch Audit Logs (if authorized)
                // TODO: Implement actual data fetching from a secure backend endpoint or Supabase function.
                // This endpoint should verify the caller is an admin.
                const logs = await fetchAdminLogs();
                setAuditLogs(logs.data);
                setLoadingLogs(false);

            } catch (err: any) {
                console.error("Error in AdminRolesPage useEffect:", err);
                setError(err.message || "Failed to load data.");
                if (err.message === 'Not authenticated' || err.message === 'Access Denied') {
                    router.push('/admin/login'); // Redirect unauthorized users
                }
                setLoadingAdmins(false);
                setLoadingLogs(false);
            }
        };

        checkCurrentUserRoleAndFetchData();
    }, [router]);

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        // **RBAC Check 1: UI Level** - Prevent non-super_admins from even submitting
        if (currentUserRole !== 'super_admin') {
            setError('Permission Denied: Only super admins can add new admins.');
            return;
        }
        if (!newAdminEmail) {
            setError('Email is required.');
            return;
        }
        setIsAdding(true);
        setError(null);

        try {
            // **RBAC Check 2: Backend/Function Level (CRITICAL)**
            // TODO: Call a secure Supabase function or API endpoint to add the admin.
            // This backend function MUST verify that the calling user has the 'super_admin' role before proceeding.
            console.log(`Simulating: Add new admin: ${newAdminEmail} with role ${newAdminRole}`);
            await new Promise(res => setTimeout(res, 1000)); // Simulate API call
            const newAdminId = `new-${Date.now()}`;

            // Log the action (placeholder call)
            await logAdminAction('Added Admin', {
                targetType: 'admin',
                targetId: newAdminId,
                details: { email: newAdminEmail, role: newAdminRole }
            });

            // On success, refetch admin users and logs or add locally
            setAdminUsers([...adminUsers, { id: newAdminId, email: newAdminEmail, role: newAdminRole }]);
            setNewAdminEmail('');
            // Refetch logs to show the new entry
            setLoadingLogs(true);
            const updatedLogs = await fetchAdminLogs();
            setAuditLogs(updatedLogs.data);
            setLoadingLogs(false);
            alert(`Simulated: Admin ${newAdminEmail} added. Action logged.`);

        } catch (err: any) {
            console.error("Add Admin Error:", err);
            setError(err.message || 'Failed to add admin.');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteAdmin = async (adminId: string, adminEmail: string) => {
        // **RBAC Check 1: UI Level** - Prevent non-super_admins from triggering
         if (currentUserRole !== 'super_admin') {
            alert('Permission Denied: Only super admins can remove admins.');
            return;
        }

        // Optional: Prevent self-deletion or deleting the last super_admin (implement logic here or backend)
        // const { data: { session } } = await supabase.auth.getSession();
        // if (session?.user?.email === adminEmail) {
        //     alert("You cannot remove yourself.");
        //     return;
        // }

        if (confirm(`Are you sure you want to remove admin privileges for ${adminEmail}?`)) {
            try {
                // **RBAC Check 2: Backend/Function Level (CRITICAL)**
                // TODO: Call a secure Supabase function or API endpoint to remove the admin.
                // This backend function MUST verify that the calling user has the 'super_admin' role before proceeding.
                console.log(`Simulating: Remove admin ${adminId} (${adminEmail})`);
                await new Promise(res => setTimeout(res, 500)); // Simulate API call

                // Log the action (placeholder call)
                await logAdminAction('Removed Admin', {
                    targetType: 'admin',
                    targetId: adminId,
                    details: { email: adminEmail }
                });

                // On success, refetch admin users and logs or remove locally
                setAdminUsers(adminUsers.filter(admin => admin.id !== adminId));
                // Refetch logs to show the new entry
                setLoadingLogs(true);
                const updatedLogs = await fetchAdminLogs();
                setAuditLogs(updatedLogs.data);
                setLoadingLogs(false);
                alert(`Simulated: Admin ${adminEmail} removed. Action logged.`);

            } catch (err: any) {
                 console.error("Delete Admin Error:", err);
                 alert(`Failed to remove admin: ${err.message || 'Unknown error'}`);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Admin Roles & Security</h1>
                    <a href="/admin/dashboard" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">← Back to Dashboard</a>
                </div>

                {error && <div className="mb-4 text-center py-2 text-red-500 bg-red-100 dark:bg-red-900/50 rounded">Error: {error}</div>}

                {/* Admin User Management */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Manage Admin Users</h2>
                    {loadingAdmins && <div className="text-center py-4">Loading admins...</div>}
                    {!loadingAdmins && (
                        <div className="overflow-x-auto mb-4">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {adminUsers.map((admin) => (
                                        <tr key={admin.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{admin.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{admin.role}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {/* **RBAC Check**: Only show Remove button to super_admin */}
                                                {currentUserRole === 'super_admin' && (
                                                    <button
                                                        onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 disabled:opacity-50"
                                                        // disabled={admin.email === session?.user?.email} // Optional: Prevent self-delete
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                                {/* Support admins see no actions here */} 
                                                {currentUserRole !== 'super_admin' && <span className="text-gray-400">--</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {adminUsers.length === 0 && (
                                        <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No admin users found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* **RBAC Check**: Only show Add New Admin Form to super_admin */}
                    {currentUserRole === 'super_admin' && (
                        <form onSubmit={handleAddAdmin} className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Add New Admin</h3>
                            <div className="flex flex-col sm:flex-row sm:items-end space-y-2 sm:space-y-0 sm:space-x-2">
                                <div className="flex-grow">
                                    <label htmlFor="newAdminEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                    <input
                                        type="email"
                                        id="newAdminEmail"
                                        value={newAdminEmail}
                                        onChange={(e) => setNewAdminEmail(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="new.admin@example.com"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="newAdminRole" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                                    <select
                                        id="newAdminRole"
                                        value={newAdminRole}
                                        onChange={(e) => setNewAdminRole(e.target.value as 'super_admin' | 'support_admin')}
                                        className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="support_admin">Support Admin</option>
                                        <option value="super_admin">Super Admin</option>
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isAdding}
                                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"
                                >
                                    {isAdding ? 'Adding...' : 'Add Admin'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Audit Log Section - Access controlled by page-level check in useEffect */}
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Admin Action Log</h2>
                    {loadingLogs && <div className="text-center py-4">Loading logs...</div>}
                    {!loadingLogs && (
                         <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Timestamp</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Admin Email</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Target</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {auditLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(log.created_at).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{log.admin_email || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{log.action}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                {log.target_type && log.target_id ? `${log.target_type}: ${log.target_id}` : '--'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                {log.details ? (
                                                    <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded overflow-x-auto">{JSON.stringify(log.details, null, 2)}</pre>
                                                ) : '--'}
                                            </td>
                                        </tr>
                                    ))}
                                    {auditLogs.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No audit logs found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

