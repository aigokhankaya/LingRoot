
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

// TODO: Define interfaces for stats if needed

export default function AdminDashboard() {
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
                console.error('Error fetching session:', sessionError);
                setError('Could not fetch user session.');
            } else if (session) {
                setUserEmail(session.user?.email || 'N/A');
            } else {
                // Should be handled by middleware, but as a fallback:
                router.push('/admin/login');
            }
            setLoading(false);
        };
        fetchSession();
    }, [router]);

    const handleLogout = async () => {
        setLoading(true);
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
            console.error('Error signing out:', signOutError);
            setError('Failed to sign out.');
            setLoading(false);
        } else {
            router.push('/admin/login');
        }
    };

    if (loading) {
        return <div className="p-4 text-center">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">Error: {error}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                {/* Header Section - Improved Responsiveness */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center sm:text-left">Admin Dashboard</h1>
                    <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">Logged in as: {userEmail}</span>
                        <button
                            onClick={handleLogout}
                            className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Stats Cards Section - Responsive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Placeholder Stats Cards */}
                    <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Total Users</h2>
                        <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">--</p>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">Active Users</h2>
                        <p className="text-3xl font-bold text-green-900 dark:text-green-100">--</p>
                    </div>
                    <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Content Items</h2>
                        <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">--</p>
                    </div>
                    <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold text-purple-800 dark:text-purple-200">Pending Actions</h2>
                        <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">--</p>
                    </div>
                </div>

                {/* Management Sections Links - Improved Layout */}
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Management Sections</h2>
                    {/* Using a grid for better alignment on larger screens */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                        <a href="/admin/users" className="block text-indigo-600 hover:underline dark:text-indigo-400 py-1">User Management</a>
                        <a href="/admin/content" className="block text-indigo-600 hover:underline dark:text-indigo-400 py-1">Content Management</a>
                        <a href="/admin/payments" className="block text-indigo-600 hover:underline dark:text-indigo-400 py-1">Payment Tracking</a>
                        <a href="/admin/statistics" className="block text-indigo-600 hover:underline dark:text-indigo-400 py-1">Usage Statistics</a>
                        <a href="/admin/roles" className="block text-indigo-600 hover:underline dark:text-indigo-400 py-1">Admin Roles & Security</a>
                    </div>
                </div>
            </div>
        </div>
    );
}

