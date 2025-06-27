'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { loginWithGoogle } = useAuth();

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

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('🚀 Admin Google ile giriş işlemi başlatılıyor...');
            
            // Google Auth modülünü dinamik olarak import et
            console.log('📦 Google Auth modülü yükleniyor...');
            const { initializeGoogleAuth, signInWithGoogle } = await import('../../../lib/googleAuth');
            
            // Google Auth'u başlat
            console.log('🔧 Google Auth başlatılıyor...');
            await initializeGoogleAuth();
            
            // Google Sign-In'i tetikle
            console.log('🎯 Google Sign-In tetikleniyor...');
            const { credential } = await signInWithGoogle();
            
            // useAuth hook'undan loginWithGoogle fonksiyonunu kullan
            console.log('🔐 Backend ile kimlik doğrulama yapılıyor...');
            const result = await loginWithGoogle(credential, rememberMe);
            
            if (result.success) {
                // Kullanıcı admin mi kontrol et (auth context'ten user bilgisini al)
                const token = localStorage.getItem('lingroot_token');
                if (token) {
                    const response = await fetch(getApiUrl('auth/me'), {
                        method: 'GET',
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const data = await response.json();
                    if (data.success && data.user?.role === 'admin') {
                        console.log('✅ Admin Google ile giriş başarılı, admin dashboard\'a yönlendiriliyor...');
                        router.push('/admin/dashboard');
                    } else {
                        setError('Bu hesabın admin yetkisi bulunmuyor.');
                        localStorage.removeItem('lingroot_token');
                    }
                } else {
                    setError('Giriş işlemi tamamlanamadı.');
                }
            } else {
                console.error('❌ Backend kimlik doğrulama hatası:', result.message);
                setError(result.message || 'Google ile giriş yaparken bir hata oluştu.');
            }
        } catch (err: any) {
            console.error('❌ Admin Google giriş hatası:', err);
            
            // Kullanıcı dostu hata mesajları
            let userErrorMessage = 'Google ile giriş yaparken bir hata oluştu.';
            
            if (err.message.includes('popup') || err.message.includes('pencere')) {
                userErrorMessage = 'Google giriş penceresi açılamadı veya kapatıldı. Lütfen popup engelleyiciyi kontrol edin ve tekrar deneyin.';
            } else if (err.message.includes('cancelled') || err.message.includes('iptal')) {
                userErrorMessage = 'Google girişi iptal edildi.';
            } else if (err.message.includes('timeout') || err.message.includes('zaman aşımı')) {
                userErrorMessage = 'Google giriş zaman aşımına uğradı. Lütfen tekrar deneyin.';
            } else if (err.message.includes('yapılandırılmamış') || err.message.includes('Client ID')) {
                userErrorMessage = 'Google giriş servisi geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
            } else if (err.message.includes('yüklenmedi') || err.message.includes('Services')) {
                userErrorMessage = 'Google servisleri yüklenemedi. İnternet bağlantınızı kontrol edin ve sayfayı yenileyin.';
            } else if (err.message.includes('Failed to fetch') || err.message.includes('bağlanılamadı')) {
                userErrorMessage = 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
            }
            
            setError(userErrorMessage);
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
                
                {/* Google ile giriş butonu */}
                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">veya</span>
                        </div>
                    </div>
                    
                    <div className="mt-6">
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100 mr-2"></div>
                                    Google ile bağlanılıyor...
                                </div>
                            ) : (
                                <div className="flex items-center justify-center">
                                    <i className="fab fa-google mr-2 text-red-500"></i> 
                                    Google ile Giriş Yap
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

