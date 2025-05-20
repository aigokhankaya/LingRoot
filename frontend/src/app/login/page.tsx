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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password);
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
        <Image
          src="/LingRoot_MainLogo.png"
          alt="LingRoot Logo"
          width={160}
          height={48}
          priority
          className="object-contain"
        />
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
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">E-posta</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="E-posta"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Şifre</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Şifre"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Şifremi unuttum linki */}
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                  Şifremi unuttum
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
