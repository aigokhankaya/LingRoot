'use client';

import React from 'react';

type UsageSummary = {
  subscription?: any;
  hasPlan?: boolean;
  usage?: {
    openaiTokens?: number;
    ttsChars?: number;
    totalCostUsd?: number;
  };
  limits?: {
    openaiTokenLimit?: number;
    ttsCharLimit?: number;
    monthlyUsdLimit?: number;
  };
  isExceeded?: boolean;
};

const PackageInfo: React.FC = () => {
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = React.useState<boolean>(true);
  const [plansError, setPlansError] = React.useState<string | null>(null);
  const [usage, setUsage] = React.useState<UsageSummary | null>(null);
  const [loadingUsage, setLoadingUsage] = React.useState<boolean>(true);
  const [submitting, setSubmitting] = React.useState<string | null>(null);
  const [locale, setLocale] = React.useState<string>('tr-TR');

  React.useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('lingroot_locale') : null;
      if (stored) setLocale(stored);
      else if (typeof navigator !== 'undefined' && navigator.language) setLocale(navigator.language);
    } catch {}

    const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;

    const fetchAll = async () => {
      try {
        setLoadingUsage(true);
        if (token) {
          const u = await fetch('/api/subscription/usage-summary', { headers: { 'Authorization': `Bearer ${token}` } });
          const uJson = await u.json();
          if (u.ok && uJson?.success) setUsage(uJson.data);
        }
      } catch {}
      finally { setLoadingUsage(false); }

      try {
        setLoadingPlans(true);
        setPlansError(null);
        const res = await fetch('/api/subscription/plans');
        const json = await res.json();
        if (res.ok && json?.success) {
          setPlans((json.data || []).filter((p: any) => p.is_active));
        } else {
          if (!token) throw new Error('Planlar getirilemedi');
          const res2 = await fetch('/api/admin/plans', { headers: { 'Authorization': `Bearer ${token}` } });
          const json2 = await res2.json();
          if (!res2.ok || !json2?.success) throw new Error(json2?.message || 'Planlar getirilemedi');
          setPlans((json2.data || []).filter((p: any) => p.is_active));
        }
      } catch (e: any) {
        setPlansError(e?.message || 'Planlar getirilemedi');
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchAll();
  }, []);

  const handleSelectPlan = (planId: string) => {
    setSubmitting(planId);
    window.location.href = `/payment?planId=${encodeURIComponent(planId)}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Paket Bilgilerim</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Mevcut Paket</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{(() => {
            const sub = usage?.subscription;
            if (!sub) return '—';
            if (sub.plan?.name) return sub.plan.name;
            if (sub.plantype) return sub.plantype;
            if (sub.stripepriceid) {
              const pByStripe = plans.find((x: any) => x.stripe_price_id === sub.stripepriceid);
              if (pByStripe?.name) return pByStripe.name;
            }
            if (sub.plan_id) {
              const pById = plans.find((x: any) => x.id === sub.plan_id);
              if (pById?.name) return pById.name;
            }
            return '—';
          })()}</div>
          <div className="text-sm text-gray-500 mt-2">Durum: <span className="text-gray-800">{usage?.subscription?.status || '—'}</span></div>
          <div className="text-sm text-gray-500 mt-1">Dönem Bitiş: <span className="text-gray-800">{(() => {
            const sub = usage?.subscription;
            const endIso = sub?.current_period_end || sub?.enddate || sub?.endDate;
            if (!endIso) return '—';
            try {
              return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(endIso));
            } catch {
              return new Date(endIso).toLocaleString(locale);
            }
          })()}</span></div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Kullanım</div>
          {loadingUsage ? (
            <div className="text-gray-600">Yükleniyor...</div>
          ) : usage?.hasPlan ? (
            <div className="text-sm text-gray-700 space-y-1 mt-1">
              <div>OpenAI Token: <span className="font-semibold">{usage?.usage?.openaiTokens ?? 0}</span> / <span className="text-gray-500">{usage?.limits?.openaiTokenLimit ?? '—'}</span></div>
              <div>TTS Karakter: <span className="font-semibold">{usage?.usage?.ttsChars ?? 0}</span> / <span className="text-gray-500">{usage?.limits?.ttsCharLimit ?? '—'}</span></div>
              <div>Aylık USD: <span className="font-semibold">${usage?.usage?.totalCostUsd ?? 0}</span> / <span className="text-gray-500">${usage?.limits?.monthlyUsdLimit ?? '—'}</span></div>
              {usage?.isExceeded && <div className="text-red-600 mt-1">Kullanım sınırınız aşıldı.</div>}
            </div>
          ) : (
            <div className="text-gray-600">Aktif paket bulunamadı.</div>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-2">Paket Seçimi</div>
          {loadingPlans ? (
            <div className="text-gray-600">Paketler yükleniyor...</div>
          ) : plansError ? (
            <div className="text-red-600 text-sm">{plansError}</div>
          ) : (
            <div className="space-y-2">
              {plans.map((p: any) => (
                <button
                  key={p.id}
                  className={`w-full text-left border rounded-md px-3 py-2 hover:bg-gray-50 transition ${submitting === p.id ? 'opacity-70 cursor-wait' : ''}`}
                  onClick={() => handleSelectPlan(p.id)}
                  disabled={!!submitting}
                  title={p.description || ''}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500">₺{p.price}/{p.interval === 'yearly' ? 'yıl' : 'ay'}</div>
                    </div>
                    <span className="text-indigo-600 text-sm font-medium">{submitting === p.id ? 'İşleniyor...' : 'Seç'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PackageInfo;


