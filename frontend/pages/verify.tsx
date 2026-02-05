import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getApiUrl } from '../src/lib/api';
import { useTranslation } from '../src/lib/i18n';
import Link from 'next/link';

const VERIFY_TIMEOUT_MS = 15_000;

export default function VerifyPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { token, email } = router.query as { token?: string; email?: string };
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'timeout' | 'check_email'>('idle');
  const [message, setMessage] = useState<string>('');

  const verifyToken = useCallback(async (tokenValue: string) => {
    setStatus('loading');
    setMessage(t('verify_verifying'));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

    try {
      const url = getApiUrl(`auth/verify-email/${encodeURIComponent(tokenValue)}`);
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        setStatus('success');
        setMessage(json.message || t('verify_success'));
      } else {
        console.error('Verify failed:', res.status, json);
        setStatus('error');
        setMessage(json?.message || `${t('verify_failed_generic')} (HTTP ${res.status})`);
      }
    } catch (e: unknown) {
      clearTimeout(timeoutId);
      if (e instanceof DOMException && e.name === 'AbortError') {
        console.error('Verify timeout');
        setStatus('timeout');
        setMessage(t('verify_timeout'));
      } else {
        console.error('Verify error:', e);
        setStatus('error');
        setMessage(e instanceof Error ? e.message : t('content_selection_error_generic'));
      }
    }
  }, [t]);

  useEffect(() => {
    if (!router.isReady) return;

    if (token && typeof token === 'string') {
      verifyToken(token);
    } else if (email) {
      setStatus('check_email');
    }
  }, [token, email, router.isReady, verifyToken]);

  const handleRetry = () => {
    if (token && typeof token === 'string') {
      verifyToken(token);
    }
  };

  return (
    <>
      <Head>
        <title>{t('verify_title')} - LingRoot</title>
      </Head>

      <div className="min-h-screen flex flex-col bg-background">
        <header className="w-full flex justify-center items-center py-8">
          <Link href="/" className="flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity">
            <img src="/lingroot-icon.svg" alt="LingRoot Logo" className="w-12 h-12" />
            <span className="text-3xl font-bold text-gray-900">LingRoot</span>
          </Link>
        </header>

        <main className="flex-grow flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-8 shadow-md rounded-lg text-center">

            {status === 'loading' && (
              <div>
                <h1 className="text-2xl font-bold mb-4">{t('verify_verifying')}</h1>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            )}

            {status === 'success' && (
              <div>
                <div className="text-green-500 text-5xl mb-4">✓</div>
                <h1 className="text-2xl font-bold mb-2">{t('verify_success_title') || 'Doğrulama Başarılı'}</h1>
                <p className="text-gray-600 mb-6">{message}</p>
                <Link href="/login" className="inline-block px-6 py-3 bg-primary text-white font-medium rounded-md hover:bg-primary/90 transition-colors">
                  {t('login_button')}
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div>
                <div className="text-red-500 text-5xl mb-4">✕</div>
                <h1 className="text-2xl font-bold mb-2">{t('error')}</h1>
                <p className="text-red-600 mb-6">{message}</p>
                <p className="text-sm text-gray-500 mb-4">{t('verify_error_expired')}</p>
                <Link href="/login" className="text-primary hover:underline">
                  {t('login')}
                </Link>
              </div>
            )}

            {status === 'timeout' && (
              <div>
                <div className="text-amber-500 text-5xl mb-4">⏱</div>
                <h1 className="text-2xl font-bold mb-2">{t('verify_timeout_title')}</h1>
                <p className="text-gray-600 mb-6">{t('verify_timeout')}</p>
                <button
                  onClick={handleRetry}
                  className="inline-block px-6 py-3 bg-primary text-white font-medium rounded-md hover:bg-primary/90 transition-colors"
                >
                  {t('verify_retry')}
                </button>
                <div className="mt-4">
                  <Link href="/login" className="text-primary hover:underline text-sm">
                    {t('login')}
                  </Link>
                </div>
              </div>
            )}

            {status === 'check_email' && (
              <div>
                <div className="text-primary text-5xl mb-4">✉️</div>
                <h1 className="text-2xl font-bold mb-2">{t('welcome_popup_activation_title')}</h1>
                <p className="text-gray-600 mb-4">
                  {t('welcome_popup_activation_desc')}
                </p>
                <div className="bg-blue-50 p-3 rounded-md mb-4 break-all">
                  <p className="font-medium text-blue-800">{email}</p>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  {t('welcome_popup_activation_note')}
                </p>
                <Link href="/login" className="inline-block px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors">
                  {t('already_have_account_login')}
                </Link>
              </div>
            )}

            {status === 'idle' && (
              <div>
                <h1 className="text-xl font-bold">{t('verify_waiting')}</h1>
              </div>
            )}
          </div>
        </main>

      </div>
    </>
  );
}
