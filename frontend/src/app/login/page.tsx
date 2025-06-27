'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/lib/auth";
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('LoginPage handleSubmit - Email:', email, 'Password:', password); 
    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password, rememberMe);
      if (result.success) {
        router.push('/welcome'); // Başarılı login sonrası welcome sayfasına yönlendir
      } else {
        setError(result.message || 'Giriş başarısız');
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Logo ve başlık */}
      <header className="w-full flex justify-center items-center py-8">
        <div className="flex items-center space-x-4">
          <img src="/logo.svg" alt="LingRoot Logo" className="w-12 h-12" />
          <span className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent tracking-tight">LingRoot</span>
        </div>
      </header>
      
      {/* Giriş formu */}
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 shadow-md rounded-lg">
          <div>
            <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
              Giriş Yap
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              AI-powered English learning platform
            </p>
          </div>
          
          {/* Hata mesajı */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          {/* Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="E-posta adresinizi girin"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Şifrenizi girin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              {/* Beni hatırla checkbox */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  />
                  <label 
                    htmlFor="remember-me" 
                    className="ml-3 text-sm font-medium text-gray-900 cursor-pointer select-none"
                  >
                    Beni hatırla
                  </label>
                </div>
                <div className="text-sm text-gray-600">
                  {rememberMe ? (
                    <span className="flex items-center text-green-600">
                      <i className="fas fa-check-circle mr-1"></i>
                      30 gün aktif
                    </span>
                  ) : (
                    <span className="text-gray-500">1 saat aktif</span>
                  )}
                </div>
              </div>
            </div>

            {/* Şifremi unuttum linki */}
            <div className="flex justify-end">
              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                  Şifremi unuttum?
                </Link>
              </div>
            </div>

            {/* Giriş butonu */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>
            </div>
          </form>
          
          {/* Kayıt ol linki */}
          <div className="text-sm text-center mt-4">
            <button onClick={() => router.push('/register')} className="font-medium text-blue-600 hover:text-blue-500">
              Hesabınız yok mu? Kayıt olun
            </button>
          </div>
        </div>
      </main>
      
      {/* Basit footer */}
      <footer className="w-full flex flex-col items-center py-4 text-xs text-gray-400">
        <div>&copy; {new Date().getFullYear()} LingRoot. All rights reserved.</div>
      </footer>
    </div>
  );
}
