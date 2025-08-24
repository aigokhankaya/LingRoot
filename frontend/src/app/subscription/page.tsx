'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Plan = {
  id: string;
  name: string;
  description?: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features?: string[];
  is_active?: boolean;
  estimates?: { video_minutes?: number | null; text_pages?: number | null };
};

export default function SubscriptionPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);
        // Admin endpoint adds estimates; reuse for now
        const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
        const res = await fetch('/api/admin/plans', {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
            'Content-Type': 'application/json'
          }
        });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.message || 'Paketler yüklenemedi');
        const data = Array.isArray(json.data) ? json.data : [];
        setPlans(data.filter((p: any) => p.is_active));
      } catch (e: any) {
        setError(e?.message || 'Paketler yüklenemedi');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSelect = async (planId: string) => {
    try {
      setSubmitting(planId);
      const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch('/api/subscription/mock-iyzico', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planId })
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Ödeme işlemi başarısız');
      // Redirect to dashboard or success page
      router.push('/dashboard');
    } catch (e: any) {
      alert(e?.message || 'İşlem başarısız');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="fas fa-language text-indigo-600 text-2xl"></i>
            <h1 className="text-xl font-semibold text-gray-800">Paket Seçimi</h1>
          </div>
          <button className="text-sm text-indigo-600" onClick={() => router.push('/')}>Anasayfa</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">İhtiyacınıza uygun paketi seçin</h2>
          <p className="text-gray-600">Ödeme adımı (Iyzico) şimdilik mock; seçim sonrası paketiniz hemen aktif edilir.</p>
        </div>

        {loading && (
          <div className="text-center text-gray-600">Paketler yükleniyor...</div>
        )}
        {error && (
          <div className="text-center text-red-600">{error}</div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-gray-600 mt-1">{plan.description || '—'}</p>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  ₺{plan.price}
                  <span className="text-sm font-normal text-gray-500 ml-1">/{plan.interval === 'yearly' ? 'yıl' : 'ay'}</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {(plan.features || []).map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2"><i className="fas fa-check text-green-500 mt-0.5"></i><span>{f}</span></li>
                  ))}
                  {plan.estimates && (
                    <li className="text-xs text-gray-500 mt-2">
                      Tahmini: {plan.estimates.video_minutes ?? '—'} dk video, {plan.estimates.text_pages ?? '—'} sayfa metin
                    </li>
                  )}
                </ul>
                <button
                  className={`mt-auto w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md transition ${submitting === plan.id ? 'opacity-70 cursor-wait' : ''}`}
                  onClick={() => handleSelect(plan.id)}
                  disabled={!!submitting}
                >
                  {submitting === plan.id ? 'İşleniyor...' : 'Bu Paketi Seç'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


