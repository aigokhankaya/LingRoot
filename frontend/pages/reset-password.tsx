'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getApiUrl, createHeaders } from '@/lib/api';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(getApiUrl('auth/reset-password'), {
        method: 'POST',
        headers: createHeaders('application/json'),
        body: JSON.stringify({ email, code, newPassword }),
        credentials: 'include'
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'İstek başarısız');
      setMessage('Şifreniz güncellendi. Giriş sayfasına geçebilirsiniz.');
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">Şifreyi Sıfırla</h1>
        <p className="text-sm text-gray-600 text-center">E-postanıza gelen 6 haneli kodu ve yeni şifrenizi girin.</p>
        {message && <div className="p-3 rounded bg-green-50 text-green-700 text-sm">{message}</div>}
        {error && <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">E-posta</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                   className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="ornek@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="code">6 Haneli Kod</label>
            <input id="code" type="text" required pattern="\d{6}" value={code} onChange={(e) => setCode(e.target.value)}
                   className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="123456" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="newPassword">Yeni Şifre</label>
            <input id="newPassword" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                   className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Yeni şifre" />
          </div>
          <button type="submit" disabled={loading}
                  className="w-full bg-indigo-600 text-white rounded py-2 hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Gönderiliyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
        <div className="text-center text-sm">
          <Link className="text-indigo-600 hover:underline" href="/login">Giriş sayfasına dön</Link>
        </div>
      </div>
    </div>
  );
}


