import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../src/lib/auth';
import { useMembership } from '../src/context/MembershipContext';
import Link from 'next/link';
import { FaUserEdit, FaVolumeUp, FaBook, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { getContentHistory } from '../src/lib/api';
import InterestManager from '../src/components/InterestManager';

export default function Profile() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { badge, dailyLimit, remaining } = useMembership();
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [contentHistory, setContentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

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
              <Image src="/logo.svg" alt="LingRoot" width={32} height={32} sizes="32px" priority />
              <h1 className="text-xl font-semibold text-gray-900">LingRoot Dashboard</h1>
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
          <Image src={avatar} alt={displayName} width={56} height={56} className="rounded-full border-2 border-blue-200 object-cover" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Hoş geldin, {displayName}!</h2>
            <p className="text-gray-600">Bugün ne öğrenmek istersin?</p>
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
                <Image src={avatar} alt={displayName} width={64} height={64} sizes="64px" className="rounded-full border-2 border-blue-200 object-cover" />
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
              </div>
            </div>
          </div>

          {/* Sağ Kolon - Hızlı Erişim ve Aktiviteler */}
          <div className="lg:col-span-2 space-y-6">
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