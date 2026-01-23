import React, { useEffect, useState } from 'react';
import { useAuth } from '../src/lib/auth';
import { useMembership } from '../src/context/MembershipContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaUserEdit, FaVolumeUp, FaCheckCircle, FaExclamationCircle, FaChartLine, FaHeadphones, FaMicrophone, FaClock, FaFire, FaTrophy } from 'react-icons/fa';
import { getContentHistory, getUsageSummary, saveInterfaceLanguage } from '../src/lib/api';
import { computeEstimates, formatEstimate, type UsageSummary, computeCostAwareEstimates, COST_PER_1K, CHARS_PER_VIDEO_MINUTE, CHARS_PER_A4_PAGE, type VoiceCategory, type CostAwarePerCategory } from '../src/lib/usageEstimates';
import InterestManager from '../src/components/InterestManager';
import Footer from '../src/components/Footer';
import BrandWordmark from '../src/components/BrandWordmark';
import { useTranslation } from '../src/lib/i18n';
import AppHeader from '../src/components/AppHeader';

export default function Profile() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const { badge, dailyLimit, remaining, currentPlanName } = useMembership();
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [contentHistory, setContentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [locale, setLocale] = useState<string>('tr-TR');
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [estimates, setEstimates] = useState<{ remainingChars: number | null; remainingVideoMinutes: number | null; remainingA4Pages: number | null } | null>(null);
  const [perCategory, setPerCategory] = useState<CostAwarePerCategory | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [interfaceLanguage, setInterfaceLanguage] = useState<'tr' | 'en' | 'de' | 'ar'>('tr');
  const [defaultLevel, setDefaultLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('B1');
  const [loginTotal, setLoginTotal] = useState(0);
  const [lastLogin, setLastLogin] = useState<string | null>(null);

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
            { type: 'Listening', desc: 'Dinleme egzersizi tamamlandı', date: '2025-05-09', status: 'success' },
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
      if (!user) return;
      try {
        const res = await getContentHistory(user.id);
        if (res.success) {
          setContentHistory(res.data || []);
        }
      } catch (e) {
        setContentHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    }
    if (user) {
      fetchHistory();
    }
  }, [user]);

  // Kullanım özeti ve tahminleri getir
  useEffect(() => {
    async function fetchUsage() {
      if (!user) return;
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
    if (user) {
      fetchUsage();
    }
  }, [user]);

  // Tercih edilen locale'i ve profil ayarlarını yükle
  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('lingroot_locale') : null;
      if (stored) setLocale(stored);
      else if (typeof navigator !== 'undefined' && navigator.language) setLocale(navigator.language);

      if (typeof window !== 'undefined') {
        setFirstName(localStorage.getItem('lingroot_firstName') || '');
        setLastName(localStorage.getItem('lingroot_lastName') || '');
        setPhone(localStorage.getItem('lingroot_phone') || '');
        const storedInterfaceLang = localStorage.getItem('lingroot_interfaceLanguage') as string | null;
        const rawLang = (storedInterfaceLang || 'tr') as string;
        if (rawLang === 'tr' || rawLang === 'en' || rawLang === 'de' || rawLang === 'ar') {
          setInterfaceLanguage(rawLang);
        } else {
          setInterfaceLanguage('tr');
        }
        setDefaultLevel((localStorage.getItem('lingroot_defaultLevel') as any) || 'B1');
      }
    } catch { }
  }, [isAuthenticated]);

  // Giriş istatistiklerini localStorage'dan yükle
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      if (typeof window === 'undefined') return;
      const totalStr = localStorage.getItem('lingroot_loginCount') || '0';
      const total = parseInt(totalStr, 10);
      setLoginTotal(Number.isFinite(total) ? total : 0);

      const lastTsStr = localStorage.getItem('lingroot_lastLogin');
      if (lastTsStr) {
        const ts = parseInt(lastTsStr, 10);
        if (Number.isFinite(ts)) {
          const d = new Date(ts);
          setLastLogin(d.toLocaleString('tr-TR'));
        }
      }
    } catch { }
  }, [isAuthenticated]);

  const handleLocaleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || 'tr-TR';
    const langCode = value.split('-')[0] as 'tr' | 'en' | 'de' | 'ar';

    setLocale(value);
    setInterfaceLanguage(langCode);

    try {
      // Tüm ilgili localStorage anahtarlarını güncelle
      localStorage.setItem('lingroot_locale', value);
      localStorage.setItem('lingroot_interfaceLanguage', langCode);
      localStorage.setItem('lingroot_language', langCode);

      // Veritabanına kaydet
      await saveInterfaceLanguage(langCode);

      // Değişikliğin tüm uygulamaya yansıması için sayfayı yenile
      window.location.reload();
    } catch (error) {
      console.error('Dil değiştirme hatası:', error);
      window.location.reload();
    }
  };

  // Auth loading durumunda loading göster
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">{t('loading')}</p>
        </div>
      </main>
    );
  }

  // Auth tamamlandıktan sonra user kontrolü
  if (!isAuthenticated || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-xl text-gray-500">
        <div className="text-center">
          <p className="mb-4">{t('profile_auth_required')}</p>
          <Link href="/login" className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md">
            {t('profile_login_button')}
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
    contentCreated: loadingHistory ? 0 : contentHistory.length,
    totalLogins: loginTotal,
    lastLogin: lastLogin || '-',
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Üst Bar */}
      <AppHeader />

      {/* Hoş geldin mesajı */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-slate-900 rounded-2xl p-8 flex items-center space-x-6 shadow-xl">
          <div className="w-20 h-20 flex items-center justify-center rounded-full bg-white shadow-lg p-2">
            <img src="/lingroot-icon.svg" alt="LingRoot" className="w-full h-full" />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-extrabold text-white drop-shadow-md">{t('profile_welcome')} {displayName}!</h2>
            <p className="text-white/80 text-lg mt-1">{t('profile_subtitle')}</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/welcome">
              <button className="px-6 py-3 bg-white hover:bg-gray-100 text-primary rounded-xl text-base font-bold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 transform hover:scale-105">
                <FaVolumeUp className="text-xl" />
                <span>{t('profile_continue_listening')}</span>
              </button>
            </Link>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-white font-medium">{t('profile_native_language')}</label>
              <select
                className="border border-gray-200 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                value={locale}
                onChange={handleLocaleChange}
              >
                <option value="tr-TR">Türkçe (TR)</option>
                <option value="en-US">English (US)</option>
                <option value="de-DE">Deutsch (DE)</option>
                <option value="ar-AE">العربية (AE)</option>
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
                  {displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="w-full">
                  <h2 className="text-2xl font-extrabold text-gray-900 mb-1">{displayName}</h2>
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-primary text-primary-foreground shadow-md">
                    <FaTrophy className="mr-2" />
                    {(currentPlanName || badge?.label || t('membership_free')) + ' ' + t('membership_suffix')}
                  </span>
                </div>
              </div>
              <Link href="/profile" className="mt-6 w-full inline-flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg">
                <FaUserEdit className="mr-2" /> {t('profile_edit_profile')}
              </Link>
            </div>

            {/* İstatistikler */}
            <div className="bg-muted rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-border">
              <div className="flex items-center mb-6">
                <FaChartLine className="text-3xl text-primary mr-3" />
                <h3 className="text-2xl font-bold text-gray-900">{t('profile_stats_title')}</h3>
              </div>
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 font-medium flex items-center"><FaHeadphones className="mr-2 text-primary" />{t('profile_content_created')}</span>
                    <span className="text-3xl font-black text-primary">{stats.contentCreated}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 font-medium flex items-center"><FaFire className="mr-2 text-orange-500" />{t('profile_total_logins')}</span>
                    <span className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{stats.totalLogins}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium flex items-center"><FaClock className="mr-2 text-gray-500" />{t('profile_last_login')}</span>
                    <span className="text-sm font-semibold text-gray-700">{stats.lastLogin}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Sağ Kolon - Profil Bilgilerim */}
          <div className="lg:col-span-2 space-y-6">
            {/* Paket Bilgilerim sekmesi taşındı (Dashboard) */}

            {/* Hızlı Erişim Kartları */}
            <div className="bg-muted rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-border">
              <div className="flex items-center mb-6">
                <FaUserEdit className="text-3xl text-primary mr-3" />
                <h3 className="text-2xl font-bold text-gray-900">{t('profile_info_title')}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-xs uppercase text-gray-500 font-semibold mb-1">{t('profile_name_label')}</div>
                  <div className="text-base font-semibold text-gray-900">
                    {(firstName + ' ' + lastName).trim() || displayName}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-xs uppercase text-gray-500 font-semibold mb-1">{t('profile_email_label')}</div>
                  <div className="text-base font-semibold text-gray-900">{user.email}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-xs uppercase text-gray-500 font-semibold mb-1">{t('profile_membership_label')}</div>
                  <div className="text-base font-semibold text-gray-900">
                    {currentPlanName || badge?.label || t('membership_free')}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-xs uppercase text-gray-500 font-semibold mb-1">{t('profile_phone_label')}</div>
                  <div className="text-base font-semibold text-gray-900">{phone || '-'}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-xs uppercase text-gray-500 font-semibold mb-1">{t('profile_interface_language_label')}</div>
                  <div className="text-base font-semibold text-gray-900">
                    {(() => {
                      const key =
                        interfaceLanguage === 'tr'
                          ? 'language_tr'
                          : interfaceLanguage === 'en'
                            ? 'language_en'
                            : interfaceLanguage === 'de'
                              ? 'language_de'
                              : interfaceLanguage === 'ar'
                                ? 'language_ar'
                                : 'language_en';
                      return t(key);
                    })()}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-xs uppercase text-gray-500 font-semibold mb-1">{t('profile_voice_language_label')}</div>
                  <div className="text-base font-semibold text-gray-900">{locale}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-xs uppercase text-gray-500 font-semibold mb-1">{t('profile_default_level_label')}</div>
                  <div className="text-base font-semibold text-gray-900">{defaultLevel}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-xs uppercase text-gray-500 font-semibold mb-1">{t('profile_voice_content_count_label')}</div>
                  <div className="text-base font-semibold text-gray-900">
                    {loadingHistory ? t('loading') : contentHistory.length}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Link
                  href="/settings"
                  className="inline-flex items-center px-5 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
                >
                  <FaUserEdit className="mr-2" />
                  {t('profile_edit_settings_button')}
                </Link>
              </div>
            </div>
          </div>

          {/* Alt Bölüm - Paket + İlgi Alanları + Günlük Haklar */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Paket Bilgileri */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('profile_package_summary_title')}</h3>
              <p className="text-sm text-gray-600">
                {t('profile_package_summary_desc')}{' '}
                <Link href="/dashboard?tab=paket-bilgilerim" className="text-primary font-semibold hover:underline">
                  {t('profile_package_summary_link')}
                </Link>{' '}
                {t('profile_package_summary_suffix')}
              </p>
            </div>

            {/* İlgi Alanları */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col">
              <InterestManager />
            </div>

            {/* Günlük Haklar */}
            <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-green-100">
              <div className="flex items-center mb-6">
                <FaMicrophone className="text-3xl text-green-600 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900">{t('profile_daily_limits_title')}</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-700 font-semibold">{t('profile_daily_limit_label')}</span>
                    <span className="text-2xl font-black text-primary">{dailyLimit === Infinity ? '\u221e' : dailyLimit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold">{t('profile_remaining_limit_label')}</span>
                    <span className="text-2xl font-black text-green-600">{remaining}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500" style={{ width: `${dailyLimit === Infinity ? 100 : (remaining / dailyLimit) * 100}%` }}></div>
                  </div>
                </div>
                <div className="pt-4 mt-2 border-t border-gray-100">
                  {/* Top headline metrics removed per request */}
                  {/* Pricing info (TL -> USD and 1/3 budget) */}
                  {usageSummary?.limits?.pricing && (
                    <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 p-2">
                      <div className="text-xs text-gray-700 font-semibold mb-1">{t('profile_package_price_info_title')}</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className="text-gray-600">{t('profile_package_price_try')}</div>
                        <div className="text-gray-900 font-medium">{new Intl.NumberFormat('tr-TR').format(usageSummary.limits.pricing.planPriceTry || 0)} TL</div>
                        <div className="text-gray-600">{t('profile_exchange_rate')}</div>
                        <div className="text-gray-900 font-medium">{usageSummary.limits.pricing.usdTryRate}</div>
                        <div className="text-gray-600">{t('profile_package_price_usd')}</div>
                        <div className="text-gray-900 font-medium">${(((usageSummary.limits.pricing.planPriceTry || 0) / (usageSummary.limits.pricing.usdTryRate || 1))).toFixed(2)}</div>
                        <div className="text-gray-600">{t('profile_monthly_budget')}</div>
                        <div className="text-gray-900 font-semibold">${(usageSummary.limits.pricing.budgetUsdFromTry || 0).toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                  {/* Cost breakdown and remaining USD budget */}
                  {usageSummary?.usage && (
                    <div className="mt-3 rounded-md bg-white border border-gray-200 p-2">
                      <div className="text-xs text-gray-700 font-semibold mb-1">{t('profile_cost_summary_title')}</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className="text-gray-600">{t('profile_openai_cost')}</div>
                        <div className="text-gray-900 font-medium">${(usageSummary.usage.openaiCostUsd || 0).toFixed(2)}</div>
                        <div className="text-gray-600">{t('profile_tts_cost')}</div>
                        <div className="text-gray-900 font-medium">${(usageSummary.usage.ttsCostUsd || 0).toFixed(2)}</div>
                        <div className="text-gray-600">{t('profile_total_cost')}</div>
                        <div className="text-gray-900 font-semibold">${(usageSummary.usage.totalCostUsd || 0).toFixed(2)}</div>
                        {usageSummary?.limits?.monthlyUsdLimit ? (
                          <>
                            <div className="text-gray-600">{t('profile_budget_usd')}</div>
                            <div className="text-gray-900 font-medium">${(usageSummary.limits.monthlyUsdLimit || 0).toFixed(2)}</div>
                            <div className="text-gray-600">{t('profile_remaining_budget')}</div>
                            <div className={`font-semibold ${((usageSummary.limits.monthlyUsdLimit || 0) - (usageSummary.usage.totalCostUsd || 0)) <= 0 ? 'text-red-600' : 'text-gray-900'}`}>
                              ${Math.max(0, (usageSummary.limits.monthlyUsdLimit || 0) - (usageSummary.usage.totalCostUsd || 0)).toFixed(2)}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  )}
                  {usageSummary?.isExceeded && (
                    <div className="mt-2 text-xs text-red-600">{t('profile_limit_exceeded')}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}
