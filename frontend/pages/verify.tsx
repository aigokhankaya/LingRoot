import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getApiUrl } from '../src/lib/api';
import { useTranslation } from '../src/lib/i18n';

import Link from 'next/link';

export default function VerifyPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { token } = router.query as { token?: string };
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      if (!token || typeof token !== 'string') return;
      setStatus('loading');
      setMessage(t('verify_verifying'));
      try {
        const url = getApiUrl(`auth/verify-email/${encodeURIComponent(token)}`);
        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.success) {
          setStatus('success');
          setMessage(json.message || t('verify_success'));
        } else {
          setStatus('error');
          setMessage(json?.message || `Doğrulama başarısız (HTTP ${res.status}).`);
        }
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || t('content_selection_error_generic'));
      }
    };
    run();
  }, [token, router, t]);

  return (
    <>
      <Head>
        <title>{t('verify_title')} - LingRoot</title>
      </Head>
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div>
          <h1 style={{ marginBottom: '1rem' }}>{t('verify_title')}</h1>
          {status === 'loading' && <p>{message}</p>}
          {status === 'success' && (
            <>
              <p style={{ color: 'green' }}>{message}</p>
              <p><Link href="/login">{t('verify_success_link')}</Link></p>
            </>
          )}
          {status === 'error' && (
            <>
              <p style={{ color: 'crimson' }}>{message}</p>
              <p>
                {t('verify_error_expired')}
              </p>
            </>
          )}
          {status === 'idle' && <p>{t('verify_waiting')}</p>}
        </div>
      </div>
    </>
  );
}
