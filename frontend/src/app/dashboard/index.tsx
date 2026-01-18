"use client";
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PackageInfo from '@/components/PackageInfo';
import MembershipBadge from '@/components/user/MembershipBadge';
import UserProfile from '@/components/user/UserProfile';
import { useAuth } from '@/lib/auth';
import { useMembership } from '@/context/MembershipContext';
import { useRouter } from 'next/navigation';
import { NextQuestBanner, JourneyRoadmap, DailyQuestsCard } from '@/components/gamification';
import { useGamification } from '@/hooks/useGamification';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface RoadmapData {
  current: any | null;
  upcoming: any[];
  completed: any[];
  lockedPreview: any[];
  totalLocked: number;
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [tab, setTab] = React.useState<string>('genel');
  const { currentPlanName } = useMembership();
  const { stats } = useGamification();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) {
      const path = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const next = `${path}${search}${hash}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [isAuthenticated, router]);

  // Roadmap fetch
  useEffect(() => {
    const fetchRoadmap = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE}/api/gamification/roadmap`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          setRoadmap(data.data);
        }
      } catch (error) {
        console.error('[Dashboard] Roadmap fetch failed:', error);
      }
    };

    if (isAuthenticated) {
      fetchRoadmap();
    }
  }, [isAuthenticated]);

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

  const getDisplayName = () => {
    try {
      const firstName =
        typeof window !== 'undefined'
          ? localStorage.getItem('lingroot_firstName') || ''
          : '';
      const lastName =
        typeof window !== 'undefined'
          ? localStorage.getItem('lingroot_lastName') || ''
          : '';
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName) return fullName;
      if ((user as any).name) return (user as any).name as string;
      if (user.email) return user.email.split('@')[0];
      return 'Kullanıcı';
    } catch {
      return (
        ((user as any).name as string) ||
        (user.email ? user.email.split('@')[0] : 'Kullanıcı')
      );
    }
  };

  const displayName = getDisplayName();
  const avatar = (user as any).avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
  const role = user.role || 'user';
  const membershipStatus = user.membershipStatus || 'free';

  // İlgili günlük görevleri filtrele
  const relatedDailyQuests = stats?.dailyQuests.filter(
    q => q.parent_quest_node_id === roadmap?.current?.id
  ) || [];

  return (
    <main className="p-4 max-w-5xl mx-auto">
      {/* 🎯 Sıradaki Hedef Banner */}
      {roadmap?.current && (
        <NextQuestBanner
          currentQuest={{
            ...roadmap.current,
            required_daily_completions: roadmap.current.required_daily_completions || 3,
            current_daily_completions: roadmap.current.current_daily_completions || 0,
          }}
          relatedDailyQuests={relatedDailyQuests}
        />
      )}

      <h1 className="text-2xl font-bold mb-4">Kullanıcı Paneli</h1>
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <img src={avatar} alt={displayName} className="h-16 w-16 rounded-full" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <MembershipBadge status={membershipStatus} labelOverride={currentPlanName} className="mt-2" />
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
          <TabsTrigger value="yolculuk">Yolculuk</TabsTrigger>
          <TabsTrigger value="paket-bilgilerim">Paket Bilgilerim</TabsTrigger>
        </TabsList>

        <TabsContent value="genel">
          {/* 🎮 Gamification Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Günlük Görevler */}
            <DailyQuestsCard />

            {/* İstatistikler */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📊</span>
                <h2 className="text-xl font-bold text-slate-800">İstatistikler</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                  <div className="text-3xl font-bold text-teal-600">{stats?.level || 1}</div>
                  <div className="text-sm text-teal-700">Seviye</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <div className="text-3xl font-bold text-amber-600">{stats?.streak || 0}</div>
                  <div className="text-sm text-amber-700">Günlük Seri</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <div className="text-3xl font-bold text-indigo-600">{stats?.totalXP || 0}</div>
                  <div className="text-sm text-indigo-700">Toplam XP</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="text-3xl font-bold text-emerald-600">{stats?.dailyQuestsCompleted || 0}</div>
                  <div className="text-sm text-emerald-700">Bugün</div>
                </div>
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="yolculuk">
          {/* 🗺️ Yolculuk Haritası */}
          <JourneyRoadmap
            onQuestClick={(quest) => console.log('Quest clicked:', quest)}
          />
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