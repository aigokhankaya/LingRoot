import React, { useEffect, useState } from 'react';
import { useAuth } from '../src/lib/auth';
import { useMembership } from '../src/context/MembershipContext';
import Link from 'next/link';
import { FaUserEdit, FaVolumeUp, FaBook, FaCheckCircle, FaExclamationCircle, FaChartLine, FaHeadphones, FaMicrophone, FaClock, FaFire, FaTrophy } from 'react-icons/fa';
import { getContentHistory, getUsageSummary } from '../src/lib/api';
import { computeEstimates, formatEstimate, type UsageSummary, computeCostAwareEstimates, COST_PER_1K, CHARS_PER_VIDEO_MINUTE, CHARS_PER_A4_PAGE, type VoiceCategory, type CostAwarePerCategory } from '../src/lib/usageEstimates';
import InterestManager from '../src/components/InterestManager';
import PackageInfo from '../src/components/PackageInfo';
import Footer from '../src/components/Footer';

export default function Profile() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { badge, dailyLimit, remaining } = useMembership();
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [contentHistory, setContentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [locale, setLocale] = useState<string>('tr-TR');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
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
          <Link href="/login" className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md">
            Giriş Yap
          </Link>
        </div>
      </main>
    );
  }

  // Get name from localStorage or fallback to email
  const getDisplayName = () => {
    try {
      const firstName = localStorage.getItem('lingroot_firstName') || '';
      const lastName = localStorage.getItem('lingroot_lastName') || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || (user as any).name || user.email.split('@')[0];
    } catch {
      return (user as any).name || user.email.split('@')[0];
    }
  };

  const displayName = getDisplayName();
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
    <main className="min-h-screen bg-background">
      {/* Üst Bar */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/welcome" className="flex items-center space-x-4 group cursor-pointer">
              <img src="/lingroot-icon.svg" alt="LingRoot" className="w-12 h-12 transition-transform group-hover:scale-105" />
              <h1 className="text-xl font-semibold text-gray-900">
                <span className="text-primary font-extrabold">LingRoot</span> Dashboard
              </h1>
            </Link>
            <div className="flex items-center space-x-2">
              <Link href="/profile" className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-sm border border-gray-300">
                  {displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)}
                </span>
                <span className="text-gray-700 text-sm font-medium">{displayName || 'Kullanıcı'}</span>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-slate-900 rounded-2xl p-8 flex items-center space-x-6 shadow-xl">
          <div className="w-20 h-20 flex items-center justify-center rounded-full bg-white shadow-lg p-2">
            <img src="/lingroot-icon.svg" alt="LingRoot" className="w-full h-full" />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-extrabold text-white drop-shadow-md">Hoş geldin, {displayName}!</h2>
            <p className="text-white/80 text-lg mt-1">Bugün ne öğrenmek istersin?</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/welcome">
              <button className="px-6 py-3 bg-white hover:bg-gray-100 text-primary rounded-xl text-base font-bold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 transform hover:scale-105">
                <FaVolumeUp className="text-xl" />
                <span>Dinlemeye Devam Et</span>
              </button>
            </Link>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-white font-medium">Ana Dil</label>
              <select className="border-2 border-white/30 bg-white/20 text-white rounded-lg px-3 py-2 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50" value={locale} onChange={handleLocaleChange}>
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
      </div>

      {/* Ana İçerik */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sol Kolon - Profil ve İstatistikler */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profil Kartı */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-100">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-3xl font-black shadow-lg ring-4 ring-primary/20">
                  {displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)}
                </div>
                <div className="w-full">
                  <h2 className="text-2xl font-extrabold text-gray-900 mb-1">{displayName}</h2>
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-primary text-primary-foreground shadow-md">
                    <FaTrophy className="mr-2" />
                    {badge?.label || 'Ücretsiz'} Üyelik
                  </span>
                </div>
              </div>
              <Link href="/profile" className="mt-6 w-full inline-flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg">
                <FaUserEdit className="mr-2" /> Profili Düzenle
              </Link>
            </div>

            {/* İstatistikler */}
            <div className="bg-muted rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-border">
              <div className="flex items-center mb-6">
                <FaChartLine className="text-3xl text-primary mr-3" />
                <h3 className="text-2xl font-bold text-gray-900">İstatistikler</h3>
              </div>
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 font-medium flex items-center"><FaHeadphones className="mr-2 text-primary" />Oluşturulan İçerik</span>
                    <span className="text-3xl font-black text-primary">{stats.contentCreated}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{width: '60%'}}></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 font-medium flex items-center"><FaFire className="mr-2 text-orange-500" />Toplam Giriş</span>
                    <span className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{stats.totalLogins}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full" style={{width: '40%'}}></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium flex items-center"><FaClock className="mr-2 text-gray-500" />Son Giriş</span>
                    <span className="text-sm font-semibold text-gray-700">{stats.lastLogin}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Paket Bilgileri */}
            <PackageInfo />

            {/* İlgi Alanları */}
            <InterestManager />

            {/* Günlük Haklar */}
            <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-green-100">
              <div className="flex items-center mb-6">
                <FaMicrophone className="text-3xl text-green-600 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900">Günlük Haklar</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-700 font-semibold">Günlük Limit</span>
                    <span className="text-2xl font-black text-primary">{dailyLimit === Infinity ? '∞' : dailyLimit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold">Kalan Hak</span>
                    <span className="text-2xl font-black text-green-600">{remaining}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500" style={{width: `${dailyLimit === Infinity ? 100 : (remaining / dailyLimit) * 100}%`}}></div>
                  </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/text-to-speech" className="group bg-muted rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 p-8 border-2 border-primary/20 hover:border-primary/40 transform hover:-translate-y-1">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                    <FaVolumeUp className="text-2xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">Metinden Sese</h3>
                    <p className="text-gray-700 text-sm">Metinlerinizi sesli hale getirin</p>
                  </div>
                </div>
              </Link>
              <Link href="/pronunciation" className="group bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 p-8 border-2 border-green-200 hover:border-green-400 transform hover:-translate-y-1">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg group-hover:scale-110 transition-transform">
                    <FaMicrophone className="text-2xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">Telaffuz</h3>
                    <p className="text-gray-700 text-sm">Telaffuz egzersizleri yapın</p>
                  </div>
                </div>
              </Link>
              <Link href="/vocabulary" className="group bg-muted rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 p-8 border-2 border-primary/20 hover:border-primary/40 transform hover:-translate-y-1">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                    <FaBook className="text-2xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">Kelime Hazinesi</h3>
                    <p className="text-gray-700 text-sm">Kelime listelerinizi yönetin</p>
                  </div>
                </div>
              </Link>
              <Link href="/patterns" className="group bg-muted rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 p-8 border-2 border-primary/20 hover:border-primary/40 transform hover:-translate-y-1">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                    <span className="text-2xl">✨</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">Günlük Kullanım Kalıpları</h3>
                    <p className="text-gray-700 text-sm">İçeriklerinizdeki kalıpları keşfedin</p>
                  </div>
                </div>
              </Link>
              <Link href="/profile" className="group bg-muted rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 p-8 border-2 border-primary/20 hover:border-primary/40 transform hover:-translate-y-1">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                    <FaUserEdit className="text-2xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">Profil</h3>
                    <p className="text-gray-700 text-sm">Hesap ayarlarınızı yönetin</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Geçmiş İçerikler */}
            <div className="bg-muted rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-border">
              <div className="flex items-center mb-6">
                <FaHeadphones className="text-3xl text-primary mr-3" />
                <h3 className="text-2xl font-bold text-gray-900">Geçmiş Sesli İçeriklerim</h3>
              </div>
              {loadingHistory ? (
                <div className="text-gray-400 text-sm">Yükleniyor...</div>
              ) : contentHistory.length === 0 ? (
                <div className="text-gray-500 text-sm">Henüz içerik üretilmemiş.</div>
              ) : (
                <>
                  <div className="space-y-6">
                    {contentHistory
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((item: any) => (
                        <div key={item.id} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-primary/40">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <div className="font-bold text-lg text-gray-900">{item.input_source}</div>
                              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">Seviye: {item.level}</span>
                            </div>
                            <div className="text-sm text-gray-500 mb-4 flex items-center">
                              <FaClock className="mr-2" />
                              {new Date(item.created_at).toLocaleString('tr-TR')}
                            </div>
                            <audio controls src={item.mp3_url} className="w-full mb-3 rounded-lg" />
                            {item.vtt_url && (
                              <a href={item.vtt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:text-primary/80 font-semibold text-sm transition-colors">
                                <FaBook className="mr-2" />
                                Altyazı dosyasını indir
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                  {/* Pagination */}
                  {contentHistory.length > itemsPerPage && (
                    <div className="flex items-center justify-center space-x-2 mt-6 pt-6 border-t border-border">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Önceki
                      </button>
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.ceil(contentHistory.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-4 py-2 rounded-lg transition ${
                              currentPage === page
                                ? 'bg-primary text-primary-foreground font-semibold'
                                : 'bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(contentHistory.length / itemsPerPage), prev + 1))}
                        disabled={currentPage === Math.ceil(contentHistory.length / itemsPerPage)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Sonraki
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}