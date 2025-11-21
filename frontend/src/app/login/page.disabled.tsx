'use client';

// Disable static prerendering for this page; render dynamically at runtime
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/lib/auth";
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Debug helpers for mobile: show next/target when ?debug=1
  const debug = (searchParams?.get('debug') || '') === '1';
  const debugNextRaw = searchParams?.get('next') || '';
  const debugNext = debugNextRaw ? (() => { try { return decodeURIComponent(debugNextRaw); } catch { return debugNextRaw; } })() : '';
  const debugTarget = debugNext && debugNext.trim() ? debugNext : '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('LoginPage handleSubmit - Email:', email, 'Password:', password); 
    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password, rememberMe);
      if (result.success) {
        let nextRaw = searchParams?.get('next') || '';
        if (!nextRaw && typeof window !== 'undefined') {
          try { nextRaw = sessionStorage.getItem('postLoginNext') || ''; } catch {}
        }
        const next = nextRaw ? (() => { try { return decodeURIComponent(nextRaw); } catch { return nextRaw; } })() : '';
        let target = next && next.trim() ? next : '/dashboard';
        // Protective override: never fall back to /welcome
        if (target === '/welcome') target = '/dashboard';
        console.log('[LOGIN] redirecting to:', { nextRaw, next, target });
        if (typeof window !== 'undefined') { try { sessionStorage.removeItem('postLoginNext'); } catch {} }
        if (typeof window !== 'undefined' && target.includes('#')) {
          window.location.assign(target);
        } else {
          router.replace(target);
        }
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
      {debug && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-100 text-yellow-900 text-xs p-2 border-b border-yellow-300">
          <div className="max-w-3xl mx-auto">
            <strong>DEBUG</strong> — nextRaw: <code className="break-all">{debugNextRaw}</code> | next: <code className="break-all">{debugNext}</code> | target: <code className="break-all">{debugTarget}</code>
          </div>
        </div>
      )}
      {/* Logo ve başlık */}
      <header className="w-full flex justify-center items-center py-8">
        <div className="flex items-center space-x-4">
          <img src="/lingroot-icon.svg" alt="LingRoot Logo" className="w-12 h-12" />
          <span className="text-3xl font-extrabold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent tracking-tight">LingRoot</span>
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
                  className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Şifrenizi girin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              {/* Beni hatırla checkbox - Çok belirgin stil */}
              <div 
                className="flex items-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300"
                style={{ 
                  backgroundColor: '#fefce8', 
                  borderColor: '#facc15',
                  minHeight: '60px'
                }}
              >
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ 
                    width: '20px', 
                    height: '20px',
                    accentColor: 'hsl(var(--primary))',
                    cursor: 'pointer'
                  }}
                />
                <label 
                  htmlFor="remember-me" 
                  className="ml-4 text-base font-bold text-gray-900 cursor-pointer"
                  style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}
                >
                  🔒 BENİ HATIRLA (30 gün boyunca oturum açık kalsın)
                </label>
              </div>
              
              {/* Debug: Checkbox durumunu göster */}
              <div className="text-sm text-center p-2 bg-primary/10 rounded">
                <strong>Debug:</strong> Beni hatırla durumu = <span className="font-bold text-primary">{rememberMe ? 'SEÇİLİ ✅' : 'SEÇİLİ DEĞİL ❌'}</span>
              </div>
            </div>

            {/* Şifremi unuttum linki */}
            <div className="flex justify-end">
              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-primary hover:text-primary/80">
                  Şifremi unuttum?
                </Link>
              </div>
            </div>

            {/* Giriş butonu */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>
            </div>
          </form>
          
          {/* Kayıt ol linki */}
          <div className="text-sm text-center mt-4">
            <button onClick={() => router.push('/register')} className="font-medium text-primary hover:text-primary/80">
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
