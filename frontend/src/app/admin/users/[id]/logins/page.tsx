'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getApiUrl, createHeaders } from '@/lib/api';

interface LoginRecord {
  id?: string | number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  success?: boolean;
  message?: string;
  created_at?: string;
  timestamp?: string;
  location?: string;
}

export default function AdminUserLoginsPage() {
  const params = useParams<{ id: string }>();
  const userId = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id), [params]);

  const [items, setItems] = useState<LoginRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const url = getApiUrl(`admin/users/${userId}/logins`);
        const res = await fetch(url, { headers: createHeaders(), credentials: 'include' });
        if (!res.ok) {
          // If endpoint doesn't exist yet, show a friendly message.
          const txt = await res.text();
          throw new Error(txt || `Login geçmişi alınamadı (HTTP ${res.status})`);
        }
        const json = await res.json();
        const data = json?.data || json?.items || json || [];
        setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setItems(null);
        setError(e?.message || 'Login bilgileri alınamadı');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Login Bilgileri</h1>
      {error && (
        <div className="p-3 rounded border border-yellow-300 bg-yellow-50 text-yellow-800 mb-4">
          {error}
          <div className="text-xs text-yellow-700 mt-1">Bu API henüz mevcut olmayabilir. Backend&apos;e <code className="px-1 bg-yellow-100">GET /api/admin/users/:id/logins</code> eklenmelidir.</div>
        </div>
      )}
      {!error && (!items || items.length === 0) && (
        <div className="text-gray-600">Kayıtlı login bilgisi bulunamadı.</div>
      )}
      {!error && items && items.length > 0 && (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2 pr-3">Tarih</th>
                <th className="py-2 pr-3">Başarılı</th>
                <th className="py-2 pr-3">IP</th>
                <th className="py-2 pr-3">Cihaz</th>
                <th className="py-2 pr-3">Konum</th>
                <th className="py-2 pr-3">Mesaj</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, idx) => (
                <tr key={String(r.id ?? idx)} className="border-b last:border-0">
                  <td className="py-2 pr-3 text-gray-900">{formatDate(r.created_at || r.timestamp)}</td>
                  <td className="py-2 pr-3">{r.success ? '✓' : '✗'}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{r.ip || '-'}</td>
                  <td className="py-2 pr-3 text-gray-700">{truncate(r.userAgent, 80)}</td>
                  <td className="py-2 pr-3 text-gray-700">{r.location || '-'}</td>
                  <td className="py-2 pr-3 text-gray-700">{truncate(r.message || '', 120)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(s?: string) {
  if (!s) return '-';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch {
    return s;
  }
}

function truncate(str: string | undefined, n: number) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}
