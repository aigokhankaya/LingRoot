import React, { useEffect, useState } from 'react';
import { useAuth } from '../src/lib/auth';
import { useMembership } from '../src/context/MembershipContext';
import Link from 'next/link';
import { FaUserEdit, FaVolumeUp, FaBook, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { getContentHistory, getUsageSummary } from '../src/lib/api';
import { computeEstimates, formatEstimate, type UsageSummary, computeCostAwareEstimates, COST_PER_1K, CHARS_PER_VIDEO_MINUTE, CHARS_PER_A4_PAGE, type VoiceCategory, type CostAwarePerCategory } from '../src/lib/usageEstimates';
import InterestManager from '../src/components/InterestManager';

export default function Profile() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { badge, dailyLimit, remaining } = useMembership();
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [contentHistory, setContentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [locale, setLocale] = useState<string>('tr-TR');
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [estimates, setEstimates] = useState<{ remainingChars: number | null; remainingVideoMinutes: number | null; remainingA4Pages: number | null } | null>(null);
  const [perCategory, setPerCategory] = useState<CostAwarePerCategory | null>(null);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const res = await fetch('/api/content/history');
        if (res.ok) {
          const data = await res.json();
          setActivities(data.data || []);
        } else {
          setActivities([
            { type: 'TTS', desc: 'Metinden Sese oluşturuldu', date: '2025-05-12', status: 'success' },
            { type: 'Vocabulary', desc: 'Kelime listesi indirildi', date: '2025-05-10', status: 'success' },
            { type: 'Pronunciation', desc: 'Telaffuz egzersizi yapıldı', date: '2025-05-09', status: 'error' },
          ]);
        }
      } catch {
        setActivities([
          { type: 'TTS', desc: 'Metinden Sese oluşturuldu', date: '2025-05-12', status: 'success' },
          { type: 'Vocabulary', desc: 'Kelime listesi indirildi', date: '2025-05-10', status: 'success' },
          { type: 'Pronunciation', desc: 'Telaffuz egzersizi yapıldı', date: '2025-05-09', status: 'error' },
        ]);
      } finally {
        setLoadingActivities(false);
      }
    }
    fetchActivities();
  }, []);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await getContentHistory();
        if (res.success) {
          setContentHistory(res.data || []);
        }
      } catch (e) {
        setContentHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    }
    fetchHistory();
  }, []);

  // Kullanım özeti ve tahminleri getir
  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await getUsageSummary();
        if (res?.success) {
          const data = res.data || {};
          setUsageSummary(data);
          setEstimates(computeEstimates(data));
          setPerCategory(computeCostAwareEstimates(data));
        }
      } catch (e) {
        setUsageSummary(null);
        setEstimates(null);
      }
    }
    fetchUsage();
  }, []);

  // Tercih edilen locale'i yükle
  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('lingroot_locale') : null;
      if (stored) setLocale(stored);
      else if (typeof navigator !== 'undefined' && navigator.language) setLocale(navigator.language);
    } catch {}
  }, [isAuthenticated]);

  

  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || 'tr-TR';
    setLocale(value);
    try { localStorage.setItem('lingroot_locale', value); } catch {}
  };

  // Auth loading durumunda loading göster
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  // Auth tamamlandıktan sonra user kontrolü
  if (!isAuthenticated || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-xl text-gray-500">
        <div className="text-center">
          <p className="mb-4">Oturum açmanız gerekiyor.</p>
          <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md">
            Giriş Yap
          </Link>
        </div>
      </main>
    );
  }

  const displayName = (user as any).name || user.email;
  const avatar = (user as any).avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
  const role = user.role || 'user';
  const membershipStatus = user.membershipStatus || 'free';

  // Örnek istatistikler (gerçek projede API'den alınır)
  const stats = {
    contentCreated: 12,
    totalLogins: 5,
    lastLogin: '2025-05-13 10:42',
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Üst Bar */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
                              <span className="w-8 h-8 flex items-center justify-center rounded bg-blue-600 text-white font-bold text-sm">LR</span>
                <h1 className="text-xl font-semibold text-gray-900">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent font-extrabold">LingRoot</span> Dashboard
                </h1>
            </div>
            <div className="flex items-center space-x-2">
              <Link href="/profile" className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-sm border border-gray-300">
                  {displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)}
                </span>
                <span className="text-gray-700 text-sm font-medium">{user.email}</span>
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition border border-red-100"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hoş geldin mesajı */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 flex items-center space-x-4">
          <span className="w-14 h-14 flex items-center justify-center rounded-full border-2 border-blue-200 bg-gray-200 text-gray-700 text-xl font-bold">
            {displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)}
          </span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Hoş geldin, {displayName}!</h2>
            <p className="text-gray-600">Bugün ne öğrenmek istersin?</p>
          </div>
          <div className="ml-auto flex items-center space-x-2">
            <label className="text-sm text-gray-600">Ana Dil</label>
            <select className="border rounded-md px-2 py-1 text-sm" value={locale} onChange={handleLocaleChange}>
              <option value="tr-TR">Türkçe (TR)</option>
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="de-DE">Deutsch (DE)</option>
              <option value="fr-FR">Français (FR)</option>
              <option value="es-ES">Español (ES)</option>
              <option value="es-MX">Español (MX)</option>
              <option value="it-IT">Italiano (IT)</option>
              <option value="pt-PT">Português (PT)</option>
              <option value="pt-BR">Português (BR)</option>
              <option value="nl-NL">Nederlands (NL)</option>
              <option value="sv-SE">Svenska (SE)</option>
              <option value="no-NO">Norsk (NO)</option>
              <option value="da-DK">Dansk (DK)</option>
              <option value="pl-PL">Polski (PL)</option>
              <option value="cs-CZ">Čeština (CZ)</option>
              <option value="ro-RO">Română (RO)</option>
              <option value="hu-HU">Magyar (HU)</option>
              <option value="el-GR">Ελληνικά (GR)</option>
              <option value="bg-BG">Български (BG)</option>
              <option value="ru-RU">Русский (RU)</option>
              <option value="uk-UA">Українська (UA)</option>
              <option value="ar-SA">العربية (SA)</option>
              <option value="he-IL">עברית (IL)</option>
              <option value="hi-IN">हिन्दी (IN)</option>
              <option value="id-ID">Bahasa Indonesia (ID)</option>
              <option value="ms-MY">Bahasa Melayu (MY)</option>
              <option value="th-TH">ไทย (TH)</option>
              <option value="vi-VN">Tiếng Việt (VN)</option>
              <option value="zh-CN">简体中文 (CN)</option>
              <option value="zh-TW">繁體中文 (TW)</option>
              <option value="ja-JP">日本語 (JP)</option>
              <option value="ko-KR">한국어 (KR)</option>
              <option value="fi-FI">Suomi (FI)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ana İçerik */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sol Kolon - Profil ve İstatistikler */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profil Kartı */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center space-x-4">
                <span className="w-16 h-16 flex items-center justify-center rounded-full border-2 border-blue-200 bg-gray-200 text-gray-700 text-2xl font-bold">
                  {displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)}
                </span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
                  <p className="text-gray-500 text-sm">{user.email}</p>
                  <span className={`inline-flex items-center px-2 py-1 mt-2 rounded text-xs font-semibold bg-blue-100 text-blue-700`}>
                    {badge?.label || 'Ücretsiz'} Üyelik
                  </span>
                </div>
              </div>
              <Link href="/profile" className="mt-4 inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition">
                <FaUserEdit className="mr-2" /> Profili Düzenle
              </Link>
            </div>

            {/* İstatistikler */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">İstatistikler</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Oluşturulan İçerik</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.contentCreated}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Toplam Giriş</span>
                  <span className="text-2xl font-bold text-green-600">{stats.totalLogins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Son Giriş</span>
                  <span className="text-sm text-gray-500">{stats.lastLogin}</span>
                </div>
              </div>
            </div>

            {/* İlgi Alanları */}
            <InterestManager />

            {/* Günlük Haklar */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Günlük Haklar</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Günlük Limit</span>
                  <span className="font-semibold text-blue-600">{dailyLimit === Infinity ? 'Sınırsız' : dailyLimit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Kalan</span>
                  <span className="font-semibold text-green-600">{remaining}</span>
                </div>
                <div className="pt-4 mt-2 border-t border-gray-100">
                  {/* Top headline metrics removed per request */}
                  {/* Pricing info (TL -> USD and 1/3 budget) */}
                  {usageSummary?.limits?.pricing && (
                    <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 p-2">
                      <div className="text-xs text-gray-700 font-semibold mb-1">Paket Fiyat Bilgisi</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
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
                  {/* Cost breakdown and remaining USD budget */}
                  {usageSummary?.usage && (
                    <div className="mt-3 rounded-md bg-white border border-gray-200 p-2">
                      <div className="text-xs text-gray-700 font-semibold mb-1">Aylık Maliyet Özeti</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
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
                    <div className="mt-3">
                      <div className="text-xs text-gray-700 font-semibold mb-1">Kategoriye göre kalan kullanım</div>
                      <div className="grid grid-cols-1 gap-1">
                        {(['standard','neural2','wavenet','studio','chirp3d'] as VoiceCategory[]).map((cat) => (
                          <div key={cat} className="text-xs py-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 capitalize">{cat}</span>
                              <span className="font-medium text-gray-900">
                                {formatEstimate(perCategory[cat].remainingChars, 'karakter')} · {formatEstimate(
                                  perCategory[cat].remainingCharsByUsd === null ? null : Math.floor((perCategory[cat].remainingCharsByUsd || 0) / CHARS_PER_VIDEO_MINUTE),
                                  'dk'
                                )} · {formatEstimate(
                                  perCategory[cat].remainingCharsByUsd === null ? null : Math.floor((perCategory[cat].remainingCharsByUsd || 0) / CHARS_PER_A4_PAGE),
                                  'sayfa'
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5 text-[11px] text-gray-600">
                              <span>Karakter limiti</span>
                              <span className="text-gray-800">{formatEstimate(perCategory[cat].remainingCharsByLimit, 'karakter')}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-gray-600">
                              <span>USD'e göre</span>
                              <span className="text-gray-800">{formatEstimate(perCategory[cat].remainingCharsByUsd, 'karakter')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {perCategory.standard.remainingUsdBasis !== null && (
                        <div className="text-[11px] text-gray-500 mt-1">Uygulanan limit = min(Karakter, USD). Fiyatlar (1K): std/wvn ${COST_PER_1K.standard}, n2 ${COST_PER_1K.neural2}, studio ${COST_PER_1K.studio}, chirp3d ${COST_PER_1K.chirp3d}</div>
                      )}
                      {(() => {
                        // Bottleneck uyarısı (karakter limiti dar boğaz ise çoğu kategori aynı olur)
                        const cats = ['standard','neural2','wavenet','studio','chirp3d'] as VoiceCategory[];
                        const allSame = cats.every((c) => perCategory[c].remainingChars === perCategory[cats[0]].remainingChars);
                        const charLimitExists = perCategory.standard.remainingCharsByLimit !== null;
                        if (allSame && charLimitExists) {
                          return <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">Karakter limiti dar boğaz olduğu için tüm kategoriler aynı görünüyor.</div>;
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  {usageSummary?.isExceeded && (
                    <div className="mt-2 text-xs text-red-600">Paket kullanım sınırınız aşıldı.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sağ Kolon - Hızlı Erişim ve Aktiviteler */}
          <div className="lg:col-span-2 space-y-6">
            {/* Paket Bilgilerim sekmesi taşındı (Dashboard) */}

            {/* Hızlı Erişim Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/text-to-speech" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border border-blue-100">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Metinden Sese</h3>
                  <p className="text-gray-500 text-sm">Metinlerinizi sesli hale getirin</p>
                </div>
              </Link>
              <Link href="/pronunciation" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border border-green-100">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Telaffuz</h3>
                  <p className="text-gray-500 text-sm">Telaffuz egzersizleri yapın</p>
                </div>
              </Link>
              <Link href="/vocabulary" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border border-yellow-100">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Kelime Hazinesi</h3>
                  <p className="text-gray-500 text-sm">Kelime listelerinizi yönetin</p>
                </div>
              </Link>
              <Link href="/profile" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border border-purple-100">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Profil</h3>
                  <p className="text-gray-500 text-sm">Hesap ayarlarınızı yönetin</p>
                </div>
              </Link>
            </div>

            {/* Geçmiş İçerikler */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Geçmiş Sesli İçeriklerim</h3>
              </div>
              {loadingHistory ? (
                <div className="text-gray-400 text-sm">Yükleniyor...</div>
              ) : contentHistory.length === 0 ? (
                <div className="text-gray-500 text-sm">Henüz içerik üretilmemiş.</div>
              ) : (
                <div className="space-y-4">
                  {contentHistory.map((item: any) => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-4 shadow flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-blue-700 mb-1">{item.input_source}</div>
                        <div className="text-xs text-gray-500 mb-1">Seviye: {item.level} | {new Date(item.created_at).toLocaleString()}</div>
                        <audio controls src={item.mp3_url} className="w-full mb-1" />
                        {item.vtt_url && (
                          <a href={item.vtt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">Altyazı dosyasını indir</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} LingRoot. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </main>
  );
} 