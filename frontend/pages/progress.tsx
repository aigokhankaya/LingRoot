/**
 * 📊 Progress Page
 * 
 * Kullanıcının gelişim takip sayfası.
 * Level, XP, Achievements, Journey Map ve Daily Quests.
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  LevelProgressBar,
  JourneyRoadmap,
  DailyQuestsCard,
  LevelUpModal,
  AchievementModal,
  OnboardingFlow,
  Leaderboard,
  WeeklyChallenges,
  StreakSociety
} from '@/components/gamification';
import { useGamification, Achievement } from '@/hooks/useGamification';
import AppHeader from '@/components/AppHeader';

const ProgressPage: React.FC = () => {
  const router = useRouter();
  const {
    stats,
    loading,
    showLevelUp,
    levelUpData,
    closeLevelUp,
    showAchievement,
    newAchievement,
    closeAchievement,
    checkIn,
    fetchStats: refreshStats
  } = useGamification();

  const [achievements, setAchievements] = useState<{ earned: Achievement[], available: Achievement[] }>({
    earned: [],
    available: []
  });
  const [showOnboardingFlow, setShowOnboardingFlow] = useState(false);
  const [roadmapRefreshTrigger, setRoadmapRefreshTrigger] = useState(0);

  // Check-in on page load and handle post-onboarding refresh
  useEffect(() => {
    checkIn();
    fetchAchievements();

    // Check if user just completed onboarding and needs data refresh
    const justCompleted = localStorage.getItem('onboarding_just_completed');
    if (justCompleted === 'true') {
      console.log('[ProgressPage] Onboarding just completed, refreshing all data...');
      localStorage.removeItem('onboarding_just_completed');

      // Delay to ensure backend has finished processing
      setTimeout(() => {
        refreshStats();
        setRoadmapRefreshTrigger(prev => prev + 1);
        fetchAchievements();
      }, 500);
    }
  }, []);

  const fetchAchievements = async () => {
    try {
      const token = localStorage.getItem('lingroot_token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/gamification/achievements`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAchievements({
          earned: data.data.earned || [],
          available: data.data.available || []
        });
      }
    } catch (error) {
      console.error('Achievements fetch error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>İlerleme | LingRoot</title>
      </Head>

      {/* 🎮 Onboarding Modal */}
      {showOnboardingFlow && (
        <OnboardingFlow
          onComplete={() => {
            setShowOnboardingFlow(false);
            refreshStats();
            // Trigger JourneyRoadmap refresh after onboarding completes
            setRoadmapRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      <div className="min-h-screen bg-background">
        {/* Header */}
        <AppHeader />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">

          {/* Level Progress */}
          <section>
            <LevelProgressBar showStreak={true} />
          </section>

          {/* Quick Actions */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vocabulary Card */}
            <button
              onClick={() => router.push('/vocabulary?mode=random')}
              className="group bg-gradient-to-br from-teal-500 to-emerald-600 p-6 rounded-2xl shadow-lg text-white text-left hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-3xl mb-2 block">📚</span>
                  <h3 className="text-lg font-bold">Kelime Kartları</h3>
                  <p className="text-sm text-white/80 mt-1">Günlük tekrarını yap ve hafızanı güçlendir</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Phrases Card */}
            <button
              onClick={() => router.push('/phrases')}
              className="group bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white text-left hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-3xl mb-2 block">💬</span>
                  <h3 className="text-lg font-bold">Cümle Kalıpları</h3>
                  <p className="text-sm text-white/80 mt-1">Deyimler ve kalıplarla pratik yap</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Liro Chat Card */}
            <button
              onClick={() => router.push('/welcome')}
              className="group bg-gradient-to-br from-violet-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white text-left hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-3xl mb-2 block">🦊</span>
                  <h3 className="text-lg font-bold">Liro ile Pratik</h3>
                  <p className="text-sm text-white/80 mt-1">Konuşarak ve dinleyerek öğren</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          </section>

          {/* Stats Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <span className="text-3xl mb-2">📚</span>
              <span className="text-2xl font-bold text-slate-800">{stats?.achievementProgress || '0/0'}</span>
              <span className="text-sm text-slate-500 font-medium mt-1">Başarımlar</span>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <span className="text-3xl mb-2">🔥</span>
              <span className="text-2xl font-bold text-orange-500">{stats?.longestStreak || 0}</span>
              <span className="text-sm text-slate-500 font-medium mt-1">En Uzun Seri</span>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <span className="text-3xl mb-2">⚡</span>
              <span className="text-2xl font-bold text-teal-600">{stats?.totalXP?.toLocaleString() || 0}</span>
              <span className="text-sm text-slate-500 font-medium mt-1">Toplam XP</span>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <span className="text-3xl mb-2">❄️</span>
              <span className="text-2xl font-bold text-sky-500">{stats?.freezeBalance || 0}</span>
              <span className="text-sm text-slate-500 font-medium mt-1">Dondurma Hakkı</span>
            </div>
          </section>

          {/* 🗺️ Journey Map - PRIMARY: Either shows roadmap or onboarding CTA */}
          <section>
            <JourneyRoadmap
              refreshTrigger={roadmapRefreshTrigger}
              onQuestClick={(quest) => {
                console.log('Quest clicked:', quest);
                // Route based on task_type
                if (quest.task_type === 'vocabulary') {
                  router.push('/vocabulary');
                } else if (quest.task_type === 'listen' || quest.task_type === 'speak') {
                  router.push('/welcome');
                } else {
                  // Default: go to welcome/content creation
                  router.push('/welcome');
                }
              }}
              onStartOnboarding={() => setShowOnboardingFlow(true)}
            />
          </section>

          {/* Daily Quests */}
          <section>
            <DailyQuestsCard />
          </section>

          {/* Sosyal & Meydan Okumalar */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">🎮</span>
              <h2 className="text-2xl font-bold text-slate-800">Sosyal & Meydan Okumalar</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <Leaderboard />
              </div>
              <div className="md:col-span-1">
                <WeeklyChallenges />
              </div>
              <div className="md:col-span-1">
                <StreakSociety />
              </div>
            </div>
          </section>

          {/* Achievements */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">🏆</span>
              <h2 className="text-2xl font-bold text-slate-800">Başarımların</h2>
            </div>

            {achievements.earned.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Kazanılanlar</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {achievements.earned.map((ach) => (
                    <div key={ach.id} className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex flex-col items-center text-center transition-transform hover:-translate-y-1">
                      <span className="text-4xl mb-3 drop-shadow-sm">{ach.icon_emoji}</span>
                      <span className="text-sm font-semibold text-slate-700 leading-tight">{ach.title_tr}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {achievements.available.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Sırada Bekleyenler</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {achievements.available.slice(0, 6).map((ach) => (
                    <div key={ach.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col items-center text-center opacity-70 hover:opacity-100 transition-opacity">
                      <span className="text-4xl mb-3 grayscale opacity-60">{ach.icon_emoji}</span>
                      <span className="text-sm font-semibold text-slate-600 leading-tight mb-2">{ach.title_tr}</span>
                      <span className="text-xs text-slate-400 line-clamp-2">{ach.description_tr}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
};

export default ProgressPage;
