'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getApiUrl, createHeaders } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(getApiUrl('auth/forgot-password'), {
        method: 'POST',
        headers: createHeaders('application/json'),
        body: JSON.stringify({ email }),
        credentials: 'include'
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || t('support_alert_generic_error'));
      setMessage(t('forgot_password_success_message'));
      // Başarılı ise reset-password ekranına yönlendir ve e-postayı taşı
      try {
        await new Promise((r) => setTimeout(r, 300));
      } catch {}
      router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch (e: any) {
      setError(e.message || t('support_alert_generic_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">{t('forgot_password_title')}</h1>
        <p className="text-sm text-gray-600 text-center">{t('forgot_password_desc')}</p>
        {message && <div className="p-3 rounded bg-green-50 text-green-700 text-sm">{message}</div>}
        {error && <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">{t('forgot_password_email_label')}</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                   className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t('forgot_password_email_placeholder')} />
          </div>
          <button type="submit" disabled={loading}
                  className="w-full bg-indigo-600 text-white rounded py-2 hover:bg-indigo-700 disabled:opacity-50">
            {loading ? t('forgot_password_sending') : t('forgot_password_button')}
          </button>
        </form>
        <div className="text-center text-sm">
          <Link className="text-indigo-600 hover:underline" href="/reset-password">{t('forgot_password_already_have_code')}</Link>
        </div>
      </div>
    </div>
  );
}
