'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            console.log('Attempting admin login for:', email);
            
            // Use JWT backend API instead of Supabase
            const response = await fetch(getApiUrl('auth/login'), {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    email: email, 
                    password: password,
                    rememberMe: rememberMe
                }),
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Invalid login credentials.');
            }

            console.log('Backend login successful, checking role...');
            
            // Check if user is admin
            const user = data.data.user;
            if (user.role !== 'admin') {
                throw new Error('Access denied: User is not an administrator.');
            }

            // Store JWT token
            if (data.data.token) {
                localStorage.setItem('lingroot_token', data.data.token);
                localStorage.setItem('lingroot_remember_me', rememberMe.toString());
                
                // Cookie'lere de kaydet (middleware için)
                document.cookie = `lingroot_token=${data.data.token}; path=/; ${rememberMe ? 'max-age=2592000' : 'max-age=3600'}; SameSite=Strict`;
                document.cookie = `lingroot_remember_me=${rememberMe}; path=/; ${rememberMe ? 'max-age=2592000' : 'max-age=3600'}; SameSite=Strict`;
            }

            console.log('Admin login successful, redirecting...');
            router.push('/admin/dashboard');

        } catch (err: any) {
            console.error('Admin login process error:', err);
            setError(err.message || 'An unexpected error occurred during login.');
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
                    <div className="mb-6 flex items-center space-x-2">
                        <div className="relative">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="sr-only"
                            />
                            <div 
                                className={`w-5 h-5 border-2 rounded cursor-pointer flex items-center justify-center ${
                                    rememberMe 
                                        ? 'bg-indigo-600 border-indigo-600' 
                                        : 'bg-white border-gray-300 hover:border-indigo-400 dark:bg-gray-700 dark:border-gray-600'
                                }`}
                                onClick={() => setRememberMe(!rememberMe)}
                            >
                                {rememberMe && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        <label 
                            htmlFor="rememberMe" 
                            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                            onClick={() => setRememberMe(!rememberMe)}
                        >
                            Beni hatırla
                        </label>
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

