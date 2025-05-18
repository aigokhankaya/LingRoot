import React from 'react';
import MembershipBadge from '@/components/user/MembershipBadge';
import UserProfile from '@/components/user/UserProfile';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!user) {
    return <div className="p-8 text-center text-lg">Yükleniyor...</div>;
  }

  // Eksik alanlar için fallback
  const displayName = (user as any).name || user.email;
  const avatar = (user as any).avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
  const role = user.role || 'user';
  const membershipStatus = user.membershipStatus || 'free';

  return (
    <main className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Kullanıcı Paneli</h1>
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <img src={avatar} alt={displayName} className="h-16 w-16 rounded-full" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <MembershipBadge status={membershipStatus} className="mt-2" />
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <span className="font-medium">Rol:</span> {role}
          </div>
        </div>
      </div>
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">İstatistikler</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded shadow">
            <div className="text-3xl font-bold text-blue-600">12</div>
            <div className="text-gray-600">Oluşturulan İçerik</div>
          </div>
          <div className="bg-green-50 p-4 rounded shadow">
            <div className="text-3xl font-bold text-green-600">5</div>
            <div className="text-gray-600">Toplam Giriş</div>
          </div>
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Son İçerikler</h2>
        <ul className="list-disc pl-6 text-gray-700">
          <li>Örnek içerik 1</li>
          <li>Örnek içerik 2</li>
          <li>Örnek içerik 3</li>
        </ul>
      </section>
    </main>
  );
} 