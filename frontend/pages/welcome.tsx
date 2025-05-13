import React from 'react';
import Image from 'next/image';
import { useAuth } from '../src/lib/auth';
import { useMembership } from '../src/context/MembershipContext';
// import { getContentHistory } from '../src/lib/api'; // Gerekirse son aktiviteler için
import Link from 'next/link';

export default function Welcome() {
  const { user, logout } = useAuth();
  const { badge, dailyLimit, remaining } = useMembership();

  if (user === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-xl text-gray-500">
        Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.
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

  // Örnek son aktiviteler (gerçek projede API'den alınır)
  const activities = [
    { type: 'TTS', desc: 'Metinden Sese oluşturuldu', date: '2025-05-12' },
    { type: 'Vocabulary', desc: 'Kelime listesi indirildi', date: '2025-05-10' },
    { type: 'Pronunciation', desc: 'Telaffuz egzersizi yapıldı', date: '2025-05-09' },
  ];

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
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition border border-red-100"
            >
              Çıkış Yap
            </button>
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

            {/* Son Aktiviteler */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Son Aktiviteler</h3>
              </div>
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition">
                    <div className="w-24 text-xs text-gray-500 font-semibold">{activity.type}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.desc}</p>
                      <p className="text-xs text-gray-400">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
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