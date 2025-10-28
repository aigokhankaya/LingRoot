'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../src/lib/auth';
import { resendVerificationEmail } from '../src/lib/api';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const debug = (router.query.debug as string) === '1';
  const nextRaw = (router.query.next as string) || '';
  const nextDecoded = useMemo(() => {
    if (!nextRaw) return '';
    try { return decodeURIComponent(nextRaw); } catch { return nextRaw; }
  }, [nextRaw]);
  const debugTarget = nextDecoded && nextDecoded.trim() ? nextDecoded : '/welcome';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Reset errorCode before attempting login so UI reflects the latest state
    setErrorCode(null);

    try {
      const result = await login(email, password, rememberMe);
      if (result.success) {
        let target = nextDecoded && nextDecoded.trim() ? nextDecoded : '/welcome';
        try { sessionStorage.removeItem('postLoginNext'); } catch {}
        if (target.includes('#')) {
          window.location.assign(target);
        } else {
          router.replace(target);
        }
      } else {
        setError(result.message || 'Giriş başarısız');
        setErrorCode(result.code || null);
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
      setErrorCode((err && err.code) || null);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendMessage(null);
    setResendLoading(true);
    try {
      await resendVerificationEmail(email);
      setResendMessage('Aktivasyon e-postası gönderildi. Lütfen gelen kutunuzu kontrol edin.');
    } catch (e: any) {
      setResendMessage(e?.message || 'İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {debug && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-100 text-yellow-900 text-xs p-2 border-b border-yellow-300">
          <div className="max-w-3xl mx-auto">
            <strong>DEBUG</strong> — nextRaw: <code className="break-all">{nextRaw}</code> | next: <code className="break-all">{nextDecoded}</code> | target: <code className="break-all">{debugTarget}</code> | errorCode: <code>{errorCode || 'null'}</code>
          </div>
        </div>
      )}
      <header className="w-full flex justify-center items-center py-8">
        <div className="flex items-center space-x-4">
          <img src="/lingroot-icon.svg" alt="LingRoot Logo" className="w-12 h-12" />
          <span className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent tracking-tight">LingRoot</span>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 shadow-md rounded-lg">
          <div>
            <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">Giriş Yap</h2>
            <p className="mt-2 text-center text-sm text-gray-600">AI-powered English learning platform</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {errorCode === 'EMAIL_NOT_VERIFIED' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 mb-2">E-postanız doğrulanmamış görünüyor. Hesabınızı aktifleştirmek için e-postanızı kontrol edin.</p>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="email"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-posta adresi"
                />
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading || !email}
                  className="px-3 py-2 text-sm rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {resendLoading ? 'Gönderiliyor...' : 'Aktivasyon maili gönder'}
                </button>
              </div>
              {resendMessage && (
                <p className="text-xs text-gray-700">{resendMessage}</p>
              )}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                <input id="email-address" name="email" type="email" autoComplete="email" required className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="E-posta adresinizi girin" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Şifrenizi girin" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              <div className="flex items-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300" style={{ backgroundColor: '#fefce8', borderColor: '#facc15', minHeight: '60px' }}>
                <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#2563eb', cursor: 'pointer' }} />
                <label htmlFor="remember-me" className="ml-4 text-base font-bold text-gray-900 cursor-pointer" style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>
                  🔒 BENİ HATIRLA (30 gün boyunca oturum açık kalsın)
                </label>
              </div>

              <div className="text-sm text-center p-2 bg-blue-100 rounded">
                <strong>Debug:</strong> Beni hatırla durumu = <span className="font-bold text-blue-600">{rememberMe ? 'SEÇİLİ ✅' : 'SEÇİLİ DEĞİL ❌'}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">Şifremi unuttum?</Link>
              </div>
            </div>

            <div>
              <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>
            </div>
          </form>

          <div className="text-sm text-center mt-4">
            <button onClick={() => router.push('/register')} className="font-medium text-blue-600 hover:text-blue-500">Hesabınız yok mu? Kayıt olun</button>
          </div>
        </div>
      </main>

      <footer className="w-full flex flex-col items-center py-4 text-xs text-gray-400">
        <div>&copy; {new Date().getFullYear()} LingRoot. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default LoginPage as NextPage;
