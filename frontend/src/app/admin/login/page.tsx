
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getUserRole } from '@/lib/supabaseClient'; // Import Supabase client and role checker

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            console.log('Attempting admin login for:', email);
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (loginError) {
                console.error('Supabase login error:', loginError.message);
                throw new Error(loginError.message || 'Invalid login credentials.');
            }

            if (!loginData.user) {
                throw new Error('Login failed: No user data received.');
            }

            console.log('Supabase login successful, checking role for user:', loginData.user.id);

            // Check user role
            // IMPORTANT: getUserRole needs to securely fetch the role
            const userRole = await getUserRole(loginData.user.id);
            console.log('User role:', userRole);

            // Allow 'super_admin' or 'support_admin' (adjust role names if different)
            if (userRole !== 'super_admin' && userRole !== 'support_admin') {
                // Log out the user if they are not an admin
                await supabase.auth.signOut();
                throw new Error('Access denied: User is not an administrator.');
            }

            console.log('Admin login successful, redirecting...');
            // Supabase client handles session persistence automatically.
            // Redirect to the admin dashboard
            router.push('/admin/dashboard');

        } catch (err: any) {
            console.error('Admin login process error:', err);
            setError(err.message || 'An unexpected error occurred during login.');
            // Ensure user is logged out in case of role check failure after successful Supabase login
            await supabase.auth.signOut().catch(signOutError => {
                console.error('Error signing out after failed admin check:', signOutError);
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            {/* Added p-4 to the outer container for small screen padding */}
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md">
                {/* Adjusted padding: p-6 default, sm:p-8 for larger screens */}
                <h1 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-200">Admin Login</h1>
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="admin@example.com"
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="••••••••"
                        />
                    </div>
                    {error && (
                        <p className="mb-4 text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}

