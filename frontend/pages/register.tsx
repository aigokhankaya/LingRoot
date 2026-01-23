'use client';

import React, { useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../src/lib/auth';
import { initializeGoogleAuth, signInWithGoogle } from '../src/lib/googleAuth';
import Footer from '../src/components/Footer';
import BrandWordmark from '../src/components/BrandWordmark';
import { useTranslation } from '../src/lib/i18n';

// Phone number formatting helpers (Turkish format: +90 555 123 45 67)
function extractTRLocalDigits(value: string): string {
  const digits = (value || '').replace(/\D+/g, '');
  // Remove country code if present
  let d = digits.startsWith('90') ? digits.slice(2) : digits;
  // Drop a single leading 0 (common when typing local TR numbers like 0 5xx ...)
  if (d.startsWith('0')) d = d.slice(1);
  // Limit to max 10 local digits
  d = d.slice(0, 10);
  return d;
}

function formatTRPhone(value: string): string {
  const local = extractTRLocalDigits(value);
  let parts: string[] = [];
  if (local.length <= 3) {
    parts = [local];
  } else if (local.length <= 6) {
    parts = [local.slice(0, 3), local.slice(3)];
  } else if (local.length <= 8) {
    parts = [local.slice(0, 3), local.slice(3, 6), local.slice(6)];
  } else {
    parts = [local.slice(0, 3), local.slice(3, 6), local.slice(6, 8), local.slice(8, 10)];
  }
  const spaced = parts.filter(Boolean).join(' ').trim();
  // Always show +90 prefix while typing (unless empty)
  return spaced ? `+90 ${spaced}` : '';
}

function normalizeTRPhone(value: string): string {
  const local = extractTRLocalDigits(value);
  return `+90${local}`;
}

const RegisterPage: React.FC = () => {
  const router = useRouter();
  const { register, loginWithGoogle } = useAuth();
  const { t, currentLocale } = useTranslation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTRPhone(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Password confirmation validation
    if (password !== confirmPassword) {
      setError(t('register_password_mismatch') || 'Şifreler eşleşmiyor.');
      setLoading(false);
      return;
    }

    if (!acceptTerms) {
      setError(t('register_accept_terms_error') || 'Lütfen Kullanım Koşulları ve Gizlilik Politikasını kabul edin.');
      setLoading(false);
      return;
    }

    // Password minimum length validation
    if (password.length < 6) {
      setError(t('register_password_too_short') || 'Şifre en az 6 karakter olmalıdır.');
      setLoading(false);
      return;
    }

    // Phone validation: require 10 local digits for TR numbers
    const localDigits = extractTRLocalDigits(phoneNumber);
    if (localDigits.length !== 10) {
      setError(t('register_invalid_phone') || 'Lütfen geçerli bir telefon numarası girin.');
      setLoading(false);
      return;
    }

    try {
      // Normalize phone number to +90XXXXXXXXXX format
      const normalizedPhone = normalizeTRPhone(phoneNumber);
      // Pass currentLocale as the user's preferred language
      const result = await register(firstName, lastName, email, normalizedPhone, password, currentLocale);
      if (result.success) {
        // Registration successful, redirect to verify page
        router.push({
          pathname: '/verify',
          query: { email: email }
        });
      } else {
        setError(result.message || t('register_failed_generic'));
      }
    } catch (err: any) {
      setError(err.message || t('register_failed_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId || clientId === 'your-google-client-id-here.apps.googleusercontent.com') {
        throw new Error(t('login_google_client_id_error'));
      }

      await initializeGoogleAuth();
      const { credential } = await signInWithGoogle();
      // Note: loginWithGoogle in auth provider handles both login and registration on backend usually, 
      // or at least authenticates the user.
      const result = await loginWithGoogle(credential, false);

      if (result.success) {
        router.push('/welcome');
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
      <header className="w-full flex justify-center items-center py-8">
        <Link href="/" className="flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity">
          <img src="/lingroot-icon.svg" alt="LingRoot Logo" className="w-12 h-12" />
          <BrandWordmark className="text-3xl" />
        </Link>
      </header>

      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 shadow-md rounded-lg">
          <div>
            <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">{t('register')}</h2>
            <p className="mt-2 text-center text-sm text-gray-600">{t('register_subtitle')}</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 mb-1">{t('firstName')}</label>
                  <input
                    id="first-name"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={t('firstName_placeholder')}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-1">{t('lastName')}</label>
                  <input
                    id="last-name"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={t('lastName_placeholder')}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder={t('email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="phone-number" className="block text-sm font-medium text-gray-700 mb-1">{t('phoneNumber')}</label>
                <input
                  id="phone-number"
                  name="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  required
                  className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="+90 555 123 45 67"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={t('password_placeholder')}
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
                          <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10.58 10.58a2 2 0 102.83 2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M9.88 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 8-0.56 1.58-1.41 2.98-2.5 4.14M6.1 6.1C4.07 7.41 2.53 9.5 1 12c1.73 4.89 6 8 11 8 1.45 0 2.84-0.26 4.12-0.74" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">{t('confirmPassword') || 'Şifre Tekrarı'}</label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder={t('confirmPassword_placeholder') || 'Şifrenizi tekrar girin'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      {showConfirmPassword ? (
                        <>
                          <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10.58 10.58a2 2 0 102.83 2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M9.88 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 8-0.56 1.58-1.41 2.98-2.5 4.14M6.1 6.1C4.07 7.41 2.53 9.5 1 12c1.73 4.89 6 8 11 8 1.45 0 2.84-0.26 4.12-0.74" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    required
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="font-medium text-gray-700">
                    {t('accept_terms_prefix')}
                    <Link href="/terms" className="text-primary hover:underline">{t('terms_title') || 'Kullanım Koşulları'}</Link>
                    {' '}{t('and') || 've'}{' '}
                    <Link href="/privacy-policy" className="text-primary hover:underline">{t('privacy_policy_title') || 'Gizlilik Politikası'}</Link>
                    {' '}{t('accept_terms_suffix') || "'nı kabul ediyorum."}
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
                {loading ? t('register_button_loading') : t('register_button')}
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
                {googleLoading ? t('register_google_loading') : t('register_google_button')}
              </button>
            </div>
          </form>

          <div className="text-sm text-center mt-4">
            <button onClick={() => router.push('/login')} className="font-medium text-primary hover:text-primary/80">{t('already_have_account_login')}</button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RegisterPage as NextPage;
