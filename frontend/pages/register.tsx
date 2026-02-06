'use client';

import React, { useState, useMemo } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../src/lib/auth';
import { initializeGoogleAuth, signInWithGoogle } from '../src/lib/googleAuth';
import Footer from '../src/components/Footer';
import BrandWordmark from '../src/components/BrandWordmark';
import { useTranslation } from '../src/lib/i18n';

// Error code mapping for user-friendly messages
const ERROR_CODE_MAP: Record<string, string> = {
  EMAIL_IN_USE: 'register_email_in_use',
  PHONE_IN_USE: 'register_phone_in_use',
  PASSWORD_TOO_WEAK: 'register_password_too_weak',
  PASSWORD_TOO_SHORT: 'register_password_too_weak',
  INVALID_EMAIL: 'register_invalid_email',
  INVALID_PHONE: 'register_invalid_phone',
  NAME_INVALID: 'register_name_invalid',
  RATE_LIMIT_EXCEEDED: 'register_rate_limit',
  DUPLICATE_ENTRY: 'register_duplicate_entry',
  REGISTRATION_FAILED: 'register_failed_generic',
  SERVER_ERROR: 'register_failed_error',
  NETWORK_ERROR: 'register_network_error'
};

// Phone number formatting helpers (International E.164 format)
// Supports: +90 555 123 4567 (TR), +1 555 123 4567 (US), +44 20 1234 5678 (UK), etc.

function formatPhoneNumber(value: string): string {
  // Keep only + at start and digits
  let cleaned = value.replace(/[^\d+]/g, '');

  // Ensure + is only at the start
  if (cleaned.includes('+')) {
    cleaned = '+' + cleaned.replace(/\+/g, '');
  }

  // If no + and starts with digits, add + prefix
  if (cleaned && !cleaned.startsWith('+')) {
    // If starts with 0, assume Turkish local number
    if (cleaned.startsWith('0')) {
      cleaned = '+90' + cleaned.slice(1);
    } else {
      cleaned = '+' + cleaned;
    }
  }

  // Limit total length (E.164 max is 15 digits + 1 for +)
  if (cleaned.length > 16) {
    cleaned = cleaned.slice(0, 16);
  }

  // Format with spaces for readability
  if (cleaned.length <= 1) return cleaned;

  // Extract country code and rest
  const withoutPlus = cleaned.slice(1);

  // Simple formatting: +XX XXX XXX XXXX (generic international)
  let formatted = '+';
  for (let i = 0; i < withoutPlus.length; i++) {
    if (i === 2 || i === 5 || i === 8 || i === 12) {
      formatted += ' ';
    }
    formatted += withoutPlus[i];
  }

  return formatted.trim();
}

function normalizePhoneNumber(value: string): string {
  // Remove all non-digit characters except +
  let cleaned = value.replace(/[^\d+]/g, '');

  // Ensure + is only at the start
  if (cleaned.includes('+')) {
    cleaned = '+' + cleaned.replace(/\+/g, '');
  }

  // If no + prefix and starts with 0, assume Turkish
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      cleaned = '+90' + cleaned.slice(1);
    } else {
      cleaned = '+' + cleaned;
    }
  }

  return cleaned;
}

function isValidPhoneNumber(value: string): boolean {
  const normalized = normalizePhoneNumber(value);
  // E.164: + followed by 7-15 digits (country code + number)
  return /^\+[1-9]\d{6,14}$/.test(normalized);
}

// Legacy function for backward compatibility
function extractTRLocalDigits(value: string): string {
  const normalized = normalizePhoneNumber(value);
  // For validation purposes, return the digits after country code
  return normalized.replace(/^\+\d{1,3}/, '');
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { level: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++; // Special characters bonus

    if (score <= 2) {
      return { level: 1, label: t('register_password_strength_weak') || 'Zayif', color: 'bg-red-500' };
    } else if (score <= 3) {
      return { level: 2, label: t('register_password_strength_medium') || 'Orta', color: 'bg-yellow-500' };
    } else {
      return { level: 3, label: t('register_password_strength_strong') || 'Guclu', color: 'bg-green-500' };
    }
  }, [password, t]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting || loading) return;

    setIsSubmitting(true);
    setLoading(true);
    setError(null);

    // Password confirmation validation
    if (password !== confirmPassword) {
      setError(t('register_password_mismatch') || 'Sifreler eslesmiyor.');
      setLoading(false);
      setIsSubmitting(false);
      return;
    }

    if (!acceptTerms) {
      setError(t('register_accept_terms_error') || 'Lutfen Kullanim Kosullari ve Gizlilik Politikasini kabul edin.');
      setLoading(false);
      setIsSubmitting(false);
      return;
    }

    // Password complexity validation (min 8 chars, uppercase, lowercase, digit)
    const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordComplexityRegex.test(password)) {
      setError(t('register_password_too_weak') || 'Sifre en az 8 karakter, bir buyuk harf, bir kucuk harf ve bir rakam icermelidir.');
      setLoading(false);
      setIsSubmitting(false);
      return;
    }

    // Phone validation: E.164 international format (+XXXXXXXXXXX)
    if (!isValidPhoneNumber(phoneNumber)) {
      setError(t('register_invalid_phone') || 'Lutfen gecerli bir telefon numarasi girin (orn: +90 555 123 4567).');
      setLoading(false);
      setIsSubmitting(false);
      return;
    }

    try {
      // Normalize phone number to E.164 format (+XXXXXXXXXXX)
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      // Pass currentLocale as the user's preferred language
      const result = await register(firstName, lastName, email, normalizedPhone, password, currentLocale);
      if (result.success) {
        // Registration successful, redirect to verify page
        router.push({
          pathname: '/verify',
          query: { email: email }
        });
      } else {
        // Map error code to user-friendly message
        const errorCode = result.code;
        const translationKey = errorCode ? ERROR_CODE_MAP[errorCode] : null;
        const userMessage = translationKey ? t(translationKey) : (result.message || t('register_failed_generic'));
        setError(userMessage);
      }
    } catch (err: unknown) {
      // Map error code from exception
      const error = err as { code?: string; message?: string };
      const errorCode = error.code;
      const translationKey = errorCode ? ERROR_CODE_MAP[errorCode] : null;
      const userMessage = translationKey ? t(translationKey) : (error.message || t('register_failed_error'));
      setError(userMessage);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Prevent double submission
    if (googleLoading || isSubmitting) return;

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
        // Map error code to user-friendly message
        const errorCode = (result as { code?: string }).code;
        const translationKey = errorCode ? ERROR_CODE_MAP[errorCode] : null;
        const userMessage = translationKey ? t(translationKey) : (result.message || t('login_failed_generic'));
        setError(userMessage);
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      const errorCode = error.code;
      const translationKey = errorCode ? ERROR_CODE_MAP[errorCode] : null;
      const userMessage = translationKey ? t(translationKey) : (error.message || t('login_failed_error'));
      setError(userMessage);
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
                  placeholder="+90 555 123 4567"
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
                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.level / 3) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength.level === 1 ? 'text-red-600' :
                        passwordStrength.level === 2 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {t('register_password_requirements') || 'En az 8 karakter, buyuk/kucuk harf ve rakam icermeli'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">{t('confirmPassword') || 'Sifre Tekrari'}</label>
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
              <button type="submit" disabled={loading || isSubmitting} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
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
