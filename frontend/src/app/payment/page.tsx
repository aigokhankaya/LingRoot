'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PaymentPage() {
  const router = useRouter();
  const params = useSearchParams();
  const planId = params?.get?.('planId') || null;
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null), []);

  useEffect(() => {
    if (!planId) {
      setError('Geçersiz plan');
      setLoading(false);
      return;
    }
    const loadPlan = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/subscription/plans');
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.message || 'Planlar yüklenemedi');
        const p = (json.data || []).find((x: any) => x.id === planId);
        if (!p) throw new Error('Plan bulunamadı');
        setPlan(p);
      } catch (e: any) {
        setError(e?.message || 'Plan yüklenemedi');
      } finally {
        setLoading(false);
      }
    };
    loadPlan();
  }, [planId]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      router.push('/login');
      return;
    }
    if (!planId) return;
    try {
      setSubmitting(true);
      // Mock Iyzico: her zaman başarılı kabul et ve backend mock aktivasyonu çağır
      const res = await fetch('/api/subscription/mock-iyzico', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planId })
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Ödeme başarısız');
      router.push('/profile');
    } catch (e: any) {
      alert(e?.message || 'Ödeme sırasında bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Ödeme</h1>
          <button className="text-sm text-indigo-600" onClick={() => router.back()}>Geri</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-gray-600">Yükleniyor...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-lg border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Kart Bilgileri</h2>
              <form onSubmit={handlePay} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Kart Üzerindeki İsim</label>
                  <input className="w-full border rounded-md px-3 py-2" placeholder="Ad Soyad" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Kart Numarası</label>
                  <input className="w-full border rounded-md px-3 py-2" placeholder="5555 4444 3333 2222" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">SKT (AA/YY)</label>
                    <input className="w-full border rounded-md px-3 py-2" placeholder="12/28" required />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">CVV</label>
                    <input className="w-full border rounded-md px-3 py-2" placeholder="123" required />
                  </div>
                </div>
                <button type="submit" disabled={submitting} className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md ${submitting ? 'opacity-70 cursor-wait' : ''}`}>
                  {submitting ? 'İşleniyor...' : 'Satın Al'}
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-3">Bu ekran mock Iyzico ödeme simülasyonudur; her zaman başarılı kabul edilir.</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
              <h3 className="text-md font-semibold text-gray-900">Seçili Paket</h3>
              <div className="mt-2">
                <div className="text-lg font-semibold text-gray-900">{plan?.name}</div>
                <div className="text-gray-600 text-sm mb-2">{plan?.description || '—'}</div>
                <div className="text-2xl font-bold text-gray-900">₺{plan?.price}<span className="text-sm font-normal text-gray-500 ml-1">/{plan?.interval === 'yearly' ? 'yıl' : 'ay'}</span></div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


