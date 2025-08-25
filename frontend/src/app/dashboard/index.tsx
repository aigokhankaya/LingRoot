"use client";
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PackageInfo from '@/components/PackageInfo';
import MembershipBadge from '@/components/user/MembershipBadge';
import UserProfile from '@/components/user/UserProfile';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [tab, setTab] = React.useState<string>('genel');

  React.useEffect(() => {
    if (!isAuthenticated) {
      const path = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const next = `${path}${search}${hash}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [isAuthenticated, router]);

  // Initialize tab from query (?tab=...) then hash, and keep in sync
  React.useEffect(() => {
    const applyLocation = () => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const qp = url.searchParams.get('tab');
      if (qp) {
        setTab(qp);
      } else {
        const h = url.hash.replace('#', '');
        if (h) setTab(h);
      }
    };
    applyLocation();
    window.addEventListener('hashchange', applyLocation);
    window.addEventListener('popstate', applyLocation);
    return () => {
      window.removeEventListener('hashchange', applyLocation);
      window.removeEventListener('popstate', applyLocation);
    };
  }, []);

  if (!user) {
    return <div className="p-8 text-center text-lg">Yükleniyor...</div>;
  }

  // Eksik alanlar için fallback
  const displayName = (user as any).name || user.email;
  const avatar = (user as any).avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
  const role = user.role || 'user';
  const membershipStatus = user.membershipStatus || 'free';

  return (
    <main className="p-4 max-w-5xl mx-auto">
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

      <Tabs value={tab} onValueChange={(v) => { 
        setTab(v); 
        if (typeof window !== 'undefined') { 
          const url = new URL(window.location.href);
          url.searchParams.set('tab', v);
          // keep hash too for backward-compat
          url.hash = v;
          window.history.replaceState({}, '', url.toString());
        } 
      }}>
        <TabsList className="mb-4">
          <TabsTrigger value="genel">Genel</TabsTrigger>
          <TabsTrigger value="paket-bilgilerim">Paket Bilgilerim</TabsTrigger>
        </TabsList>

        <TabsContent value="genel">
          <section className="mt-4">
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
        </TabsContent>

        <TabsContent value="paket-bilgilerim">
          <section className="mt-4">
            <PackageInfo />
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
} 