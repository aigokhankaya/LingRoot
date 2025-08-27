import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getApiUrl } from '../src/lib/api';

export default function VerifyPage() {
  const router = useRouter();
  const { token } = router.query as { token?: string };
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      if (!token || typeof token !== 'string') return;
      setStatus('loading');
      setMessage('Hesabınız doğrulanıyor...');
      try {
        const url = getApiUrl(`auth/verify-email/${encodeURIComponent(token)}`);
        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.success) {
          setStatus('success');
          setMessage(json.message || 'E-posta başarıyla doğrulandı. Yönlendiriliyorsunuz...');
          // Redirect to login or welcome after a short delay
          setTimeout(() => {
            router.replace('/login');
          }, 1500);
        } else {
          setStatus('error');
          setMessage(json?.message || `Doğrulama başarısız (HTTP ${res.status}).`);
        }
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Doğrulama sırasında bir hata oluştu.');
      }
    };
    run();
  }, [token, router]);

  return (
    <>
      <Head>
        <title>E-posta Doğrulama - LingRoot</title>
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
          <h1 style={{ marginBottom: '1rem' }}>E-posta Doğrulama</h1>
          {status === 'loading' && <p>{message}</p>}
          {status === 'success' && (
            <>
              <p style={{ color: 'green' }}>{message}</p>
              <p>Otomatik yönlendirilmezseniz <a href="/login">giriş</a> sayfasına gidebilirsiniz.</p>
            </>
          )}
          {status === 'error' && (
            <>
              <p style={{ color: 'crimson' }}>{message}</p>
              <p>
                Bağlantınızın süresi dolmuş olabilir. Lütfen <a href="/login">giriş</a> yapmayı deneyin ve 
                doğrulama e-postasını yeniden gönderin.
              </p>
            </>
          )}
          {status === 'idle' && <p>Token bekleniyor...</p>}
        </div>
      </div>
    </>
  );
}
