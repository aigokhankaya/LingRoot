'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getApiUrl, createHeaders } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // URL query'den email'i doldur
  useEffect(() => {
    const queryEmail = (router.query?.email as string) || '';
    if (queryEmail && !email) {
      setEmail(queryEmail);
    }
  }, [router.query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      if (newPassword !== confirmPassword) {
        throw new Error(t('reset_password_mismatch_error'));
      }
      const res = await fetch(getApiUrl('auth/reset-password'), {
        method: 'POST',
        headers: createHeaders('application/json'),
        body: JSON.stringify({ email, code, newPassword }),
        credentials: 'include'
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || t('support_alert_generic_error'));
      setMessage(t('reset_password_success_message'));
    } catch (e: any) {
      setError(e.message || t('support_alert_generic_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">{t('reset_password_title')}</h1>
        <p className="text-sm text-gray-600 text-center">{t('reset_password_desc')}</p>
        {message && <div className="p-3 rounded bg-green-50 text-green-700 text-sm">{message}</div>}
        {error && <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">{t('forgot_password_email_label')}</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                   className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t('forgot_password_email_placeholder')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="code">{t('reset_password_code_label')}</label>
            <input id="code" type="text" required pattern="\d{6}" value={code} onChange={(e) => setCode(e.target.value)}
                   className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t('reset_password_code_placeholder')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="newPassword">{t('reset_password_new_password_label')}</label>
            <input id="newPassword" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                   className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t('reset_password_new_password_placeholder')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="confirmPassword">{t('reset_password_confirm_password_label')}</label>
            <input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                   className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t('reset_password_confirm_password_placeholder')} />
          </div>
          <button type="submit" disabled={loading}
                  className="w-full bg-indigo-600 text-white rounded py-2 hover:bg-indigo-700 disabled:opacity-50">
            {loading ? t('forgot_password_sending') : t('reset_password_button')}
          </button>
        </form>
        <div className="text-center text-sm">
          <Link className="text-indigo-600 hover:underline" href="/login">{t('reset_password_back_to_login')}</Link>
        </div>
      </div>
    </div>
  );
}
