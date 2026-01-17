'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../src/lib/auth';
import { resendVerificationEmail } from '../src/lib/api';
import { initializeGoogleAuth, signInWithGoogle } from '../src/lib/googleAuth';
import Footer from '../src/components/Footer';
import BrandWordmark from '../src/components/BrandWordmark';
import { useTranslation } from '../src/lib/i18n';
import { AnalyticsHelper } from '../src/utils/AnalyticsHelper';


const LoginPage: React.FC = () => {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const debug = (router.query.debug as string) === '1';
  const nextRaw = (router.query.next as string) || '';
  const nextDecoded = useMemo(() => {
    if (!nextRaw) return '';
    try { return decodeURIComponent(nextRaw); } catch { return nextRaw; }
  }, [nextRaw]);
  /* Existing code */
  const debugTarget = nextDecoded && nextDecoded.trim() ? nextDecoded : '/welcome';

  useEffect(() => {
    AnalyticsHelper.logScreenView('Login', 'LoginPage');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Reset errorCode before attempting login so UI reflects the latest state
    setErrorCode(null);

    try {
      const result = await login(email, password, rememberMe);
      if (result.success) {
        // Her zaman welcome sayfasına yönlendir
        const target = '/welcome';
        try { sessionStorage.removeItem('postLoginNext'); } catch { }
        router.replace(target);
      } else {
        setError(result.message || t('login_failed_generic'));
        setErrorCode(result.code || null);
      }
    } catch (err: any) {
      setError(err.message || t('login_failed_error'));
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
      setResendMessage(t('login_resend_activation_success'));
    } catch (e: any) {
      setResendMessage(e?.message || t('server_error'));
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setErrorCode(null);
    setGoogleLoading(true);
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId || clientId === 'your-google-client-id-here.apps.googleusercontent.com') {
        throw new Error(t('login_google_client_id_error'));
      }

      await initializeGoogleAuth();
      const { credential } = await signInWithGoogle();
      const result = await loginWithGoogle(credential, rememberMe);

      if (result.success) {
        // Her zaman welcome sayfasına yönlendir
        const target = '/welcome';
        try { sessionStorage.removeItem('postLoginNext'); } catch { }
        router.replace(target);
      } else {
        setError(result.message || t('login_failed_generic'));
      }
    } catch (err: any) {
      setError(err.message || t('login_failed_error'));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {debug && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-100 text-yellow-900 text-xs p-2 border-b border-yellow-300">
          <div className="max-w-3xl mx-auto">
            <strong>DEBUG</strong> — nextRaw: <code className="break-all">{nextRaw}</code> | next: <code className="break-all">{nextDecoded}</code> | target: <code className="break-all">{debugTarget}</code> | errorCode: <code>{errorCode || 'null'}</code>
          </div>
        </div>
      )}
      <header className="w-full flex justify-center items-center py-8">
        <Link href="/" className="flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity">
          <img src="/lingroot-icon.svg" alt="LingRoot Logo" className="w-12 h-12" />
          <BrandWordmark className="text-3xl" />
        </Link>
      </header>

      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 shadow-md rounded-lg">
          <div>
            <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">{t('login')}</h2>
            <p className="mt-2 text-center text-sm text-gray-600">{t('footer_tagline')}</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {errorCode === 'EMAIL_NOT_VERIFIED' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 mb-2">{t('login_email_not_verified_message')}</p>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="email"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login_resend_email_placeholder')}
                />
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading || !email}
                  className="px-3 py-2 text-sm rounded-md text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  {resendLoading ? t('login_resend_activation_loading') : t('login_resend_activation_button')}
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
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                <input id="email-address" name="email" type="email" autoComplete="email" required className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" placeholder={t('login_resend_email_placeholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={t('login_password_placeholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      {showPassword ? (
                        <>
                          <path
                            d="M3 3l18 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M10.58 10.58a2 2 0 102.83 2.83"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M9.88 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 8-0.56 1.58-1.41 2.98-2.5 4.14M6.1 6.1C4.07 7.41 2.53 9.5 1 12c1.73 4.89 6 8 11 8 1.45 0 2.84-0.26 4.12-0.74"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      ) : (
                        <>
                          <path
                            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <label
                htmlFor="remember-me"
                className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none"
              >
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span>{t('login_remember_me')}</span>
              </label>
            </div>

            <div className="flex justify-end">
              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-primary hover:text-primary/80">{t('login_forgot_password')}</Link>
              </div>
            </div>

            <div className="space-y-3">
              <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
                {loading ? t('login_button_loading') : t('login_button')}
              </button>

              <div className="flex items-center gap-3">
                <span className="flex-1 h-px bg-gray-200" />
                <span className="text-xs uppercase text-gray-400">{t('login_or')}</span>
                <span className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.6h5.09c-.22 1.18-.88 2.18-1.87 2.86l3.02 2.34c1.76-1.62 2.78-4 2.78-6.8 0-.66-.06-1.3-.18-1.9H12z" />
                  <path fill="#34A853" d="M5.27 14.29l-3.2 2.45C3.5 19.72 7.45 22 12 22c2.7 0 4.96-.9 6.62-2.44l-3.02-2.34C14.64 18.32 13.4 18.8 12 18.8c-3.02 0-5.57-2.03-6.73-4.89z" />
                  <path fill="#4A90E2" d="M2.07 7.71A9.98 9.98 0 0 0 2 12c0 1.61.38 3.13 1.05 4.47l3.22-2.49A5.94 5.94 0 0 1 6 12c0-.94.22-1.82.62-2.6l-3.55-2.69z" />
                  <path fill="#FBBC05" d="M12 5.2c1.47 0 2.79.51 3.83 1.52l2.86-2.86C16.96 1.83 14.7 1 12 1 7.45 1 3.5 3.28 2.07 7.71l3.55 2.69C6.43 7.54 8.98 5.51 12 5.2z" />
                </svg>
                {googleLoading ? t('login_google_loading') : t('login_google_button')}
              </button>
            </div>
          </form>

          <div className="text-sm text-center mt-4">
            <button onClick={() => router.push('/register')} className="font-medium text-primary hover:text-primary/80">{t('no_account_register')}</button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LoginPage as NextPage;
