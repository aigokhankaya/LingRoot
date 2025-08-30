'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAdminUserUsage } from '@/services/userService';
import { computeCostAwareEstimates, type UsageSummary, formatEstimate, CHARS_PER_VIDEO_MINUTE, CHARS_PER_A4_PAGE, type VoiceCategory, COST_PER_1K } from '@/lib/usageEstimates';

export default function AdminUserPackagePage() {
  const params = useParams<{ id: string }>();
  const userId = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id), [params]);

  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [perCategory, setPerCategory] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getAdminUserUsage(userId);
        if (res?.success) {
          const data = (res as any).data || null;
          setUsageSummary(data);
          if (data) setPerCategory(computeCostAwareEstimates(data)); else setPerCategory(null);
        } else {
          setUsageSummary(null);
          setPerCategory(null);
        }
      } catch (e: any) {
        setError(e?.message || 'Paket bilgileri alınamadı');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div className="text-red-600">Hata: {error}</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Paket Bilgileri</h1>
      {!usageSummary || usageSummary.hasPlan === false ? (
        <div className="text-gray-600">Aktif paket yok.</div>
      ) : (
        <div className="space-y-4">
          {usageSummary?.limits?.pricing && (
            <div className="rounded border p-3">
              <div className="text-sm font-semibold text-gray-700 mb-2">Paket Fiyat Bilgisi</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Paket fiyatı (TL)</div>
                <div className="text-gray-900 font-medium">{new Intl.NumberFormat('tr-TR').format(usageSummary.limits.pricing.planPriceTry || 0)} TL</div>
                <div className="text-gray-600">Kur (USD/TRY)</div>
                <div className="text-gray-900 font-medium">{usageSummary.limits.pricing.usdTryRate}</div>
                <div className="text-gray-600">Paket fiyatı (USD)</div>
                <div className="text-gray-900 font-medium">${(((usageSummary.limits.pricing.planPriceTry || 0) / (usageSummary.limits.pricing.usdTryRate || 1))).toFixed(2)}</div>
                <div className="text-gray-600">Aylık bütçe (1/3 USD)</div>
                <div className="text-gray-900 font-semibold">${(usageSummary.limits.pricing.budgetUsdFromTry || 0).toFixed(2)}</div>
              </div>
            </div>
          )}

          {usageSummary?.usage && (
            <div className="rounded border p-3">
              <div className="text-sm font-semibold text-gray-700 mb-2">Aylık Maliyet Özeti</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">OpenAI maliyeti</div>
                <div className="text-gray-900 font-medium">${(usageSummary.usage.openaiCostUsd || 0).toFixed(2)}</div>
                <div className="text-gray-600">TTS maliyeti</div>
                <div className="text-gray-900 font-medium">${(usageSummary.usage.ttsCostUsd || 0).toFixed(2)}</div>
                <div className="text-gray-600">Toplam maliyet</div>
                <div className="text-gray-900 font-semibold">${(usageSummary.usage.totalCostUsd || 0).toFixed(2)}</div>
                {usageSummary?.limits?.monthlyUsdLimit ? (
                  <>
                    <div className="text-gray-600">Bütçe (USD)</div>
                    <div className="text-gray-900 font-medium">${(usageSummary.limits.monthlyUsdLimit || 0).toFixed(2)}</div>
                    <div className="text-gray-600">Kalan bütçe</div>
                    <div className={`font-semibold ${((usageSummary.limits.monthlyUsdLimit || 0) - (usageSummary.usage.totalCostUsd || 0)) <= 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      ${Math.max(0, (usageSummary.limits.monthlyUsdLimit || 0) - (usageSummary.usage.totalCostUsd || 0)).toFixed(2)}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {perCategory && (
            <div className="rounded border p-3">
              <div className="text-sm font-semibold text-gray-700 mb-2">Kategoriye göre kalan kullanım</div>
              <div className="grid grid-cols-1 gap-2">
                {(['standard','neural2','wavenet','studio','chirp3d'] as VoiceCategory[]).map((cat) => (
                  <div key={cat} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 capitalize">{cat}</span>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{formatEstimate(perCategory[cat].remainingChars, 'karakter')}</div>
                        <div className="font-medium text-gray-900">{formatEstimate(
                          perCategory[cat].remainingCharsByUsd === null ? null : Math.floor((perCategory[cat].remainingCharsByUsd || 0) / CHARS_PER_VIDEO_MINUTE),
                          'dk'
                        )}</div>
                        <div className="font-medium text-gray-900">{formatEstimate(
                          perCategory[cat].remainingCharsByUsd === null ? null : Math.floor((perCategory[cat].remainingCharsByUsd || 0) / CHARS_PER_A4_PAGE),
                          'sayfa'
                        )}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {perCategory.standard.remainingUsdBasis !== null && (
                <div className="text-[11px] text-gray-500 mt-1">Uygulanan limit = min(Karakter, USD). Fiyatlar (1K): std/wvn ${COST_PER_1K.standard}, n2 ${COST_PER_1K.neural2}, studio ${COST_PER_1K.studio}, chirp3d ${COST_PER_1K.chirp3d}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
