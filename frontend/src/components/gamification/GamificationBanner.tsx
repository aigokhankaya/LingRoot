/**
 * 🎯 Gamification Banner Component
 * 
 * Shows active challenge, daily goal progress, or streak reminder
 * at the top of the dashboard.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useGamification } from '@/hooks/useGamification';
import { Card } from '@/components/ui/card';

interface ActiveChallenge {
    id: number;
    title_tr: string;
    theme_icon: string;
    progress: number;
    total: number;
    daysLeft: number;
}

interface GamificationBannerProps {
    alwaysShow?: boolean;
}

export const GamificationBanner: React.FC<GamificationBannerProps> = (props) => {
    const router = useRouter();
    const { stats, loading } = useGamification();
    const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(null);
    const [dismissed, setDismissed] = useState(false);

    // Fetch active challenge
    useEffect(() => {
        const fetchChallenge = async () => {
            try {
                const token = localStorage.getItem('lingroot_token');
                if (!token) return;

                const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
                const res = await fetch(`${API_BASE}/api/gamification/challenges`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.success && data.data?.challenges?.length > 0) {
                    const challenge = data.data.challenges[0];
                    const userProgress = data.data.userProgress?.find((p: any) => p.challenge_id === challenge.id);

                    const today = new Date();
                    const endDate = new Date(challenge.week_end);
                    const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

                    setActiveChallenge({
                        id: challenge.id,
                        title_tr: challenge.title_tr,
                        theme_icon: challenge.theme_icon || '🎯',
                        progress: userProgress?.completed_tasks || 0,
                        total: challenge.tasks?.length || 3,
                        daysLeft
                    });
                }
            } catch (error) {
                console.error('[GamificationBanner] Fetch challenge error:', error);
            }
        };

        fetchChallenge();
    }, []);

    if (loading || dismissed) return null;

    // Priority: Low streak warning > Active challenge > Daily goal
    const streak = stats?.streak || 0;
    const dailyProgress = stats?.dailyQuestsCompleted || 0;

    // Streak at risk (0 activity today and have a streak)
    const isStreakAtRisk = streak > 0 && dailyProgress === 0;

    if (isStreakAtRisk) {
        return (
            <Card className="relative bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 mb-6 flex items-center justify-between rounded-xl shadow-lg overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-white rounded-full blur-2xl" />
                </div>

                <div className="relative flex items-center gap-4">
                    <div className="text-4xl animate-pulse">🔥</div>
                    <div>
                        <h3 className="font-bold text-lg">Streak'in Risk Altında!</h3>
                        <p className="text-white/80 text-sm">
                            {streak} günlük serini kaybetmemek için bugün bir içerik dinle.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => router.push('/progress')}
                    className="relative bg-white text-orange-600 px-6 py-2 rounded-lg font-semibold hover:bg-orange-50 transition-colors shadow-md"
                >
                    Hemen Başla
                </button>

                <button
                    onClick={() => setDismissed(true)}
                    className="absolute top-2 right-2 text-white/50 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </Card>
        );
    }

    if (activeChallenge && activeChallenge.daysLeft <= 3) {
        const progressPercent = (activeChallenge.progress / activeChallenge.total) * 100;

        return (
            <Card className="relative bg-gradient-to-r from-teal-500 to-cyan-600 text-white p-4 mb-6 flex items-center justify-between rounded-xl shadow-lg overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-1/3 w-40 h-40 bg-white rounded-full blur-3xl" />
                </div>

                <div className="relative flex items-center gap-4 flex-1">
                    <div className="text-4xl">{activeChallenge.theme_icon}</div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{activeChallenge.title_tr}</h3>
                            <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium">
                                {activeChallenge.daysLeft} gün kaldı
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <span className="text-sm font-medium">
                                {activeChallenge.progress}/{activeChallenge.total}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => window.location.href = '/dashboard#gamification'}
                    className="relative bg-white text-teal-600 px-6 py-2 rounded-lg font-semibold hover:bg-teal-50 transition-colors shadow-md ml-4"
                >
                    Detaylar
                </button>

                <button
                    onClick={() => setDismissed(true)}
                    className="absolute top-2 right-2 text-white/50 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </Card>
        );
    }

    // Check if onboarding is completed
    const isOnboardingComplete = stats?.onboardingCompleted ||
        (typeof window !== 'undefined' && localStorage.getItem('onboarding_completed') === 'true');

    // If alwaysShow is true (e.g. Welcome page), show daily progress summary OR onboarding prompt
    if (props.alwaysShow) {
        // If onboarding not complete, show "Create Your Roadmap" card
        if (!isOnboardingComplete) {
            return (
                <div
                    onClick={() => {
                        // Clear remind later flag and trigger onboarding
                        localStorage.removeItem('onboarding_remind_later');
                        router.push('/welcome?forceOnboarding=true');
                    }}
                    className="group cursor-pointer mb-8"
                >
                    <Card className="relative bg-gradient-to-r from-teal-500 to-emerald-600 text-white p-6 rounded-xl shadow-lg group-hover:shadow-xl group-hover:scale-[1.01] transition-all duration-300 overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-white rounded-full blur-3xl" />
                            <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-white rounded-full blur-2xl" />
                        </div>

                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                                        🗺️
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl flex items-center gap-2">
                                        Yol Haritanı Oluştur
                                        <span className="text-xs font-normal bg-white/20 px-2 py-0.5 rounded-full group-hover:bg-white/30 transition-colors">
                                            Başlamak için tıkla
                                        </span>
                                    </h3>
                                    <p className="text-white/80 mt-1">
                                        Kişisel öğrenme planını oluştur, seviyeni belirle ve hedeflerini seç!
                                    </p>
                                </div>
                            </div>

                            <div className="hidden md:flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-sm opacity-80">Yaklaşık</div>
                                    <div className="font-bold text-lg">2 dakika</div>
                                </div>
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m9 18 6-6-6-6" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            );
        }

        // Onboarding complete - show normal welcome card
        return (
            <div
                onClick={() => router.push('/dashboard?focus=daily-quests')}
                className="group cursor-pointer mb-8"
            >
                <Card className="relative bg-white border border-gray-100 p-6 rounded-xl shadow-sm group-hover:shadow-md group-hover:border-blue-100 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform duration-300">
                                    {stats?.level || 1}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                                    ⭐
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                                    Hoş geldin! 👋
                                    <span className="text-xs font-normal text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 group-hover:bg-blue-50 group-hover:text-blue-500">
                                        Detaylar için tıkla
                                    </span>
                                </h3>
                                <p className="text-gray-500 group-hover:text-gray-600 transition-colors">
                                    {streak > 0
                                        ? `${streak} günlük serin harika gidiyor!`
                                        : "Bugün yeni bir seriye başlamak için harika bir gün!"}
                                </p>
                            </div>
                        </div>

                        <div className="text-right hidden md:block">
                            <div className="text-sm font-medium text-gray-500 mb-1">Sonraki Seviye</div>
                            <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-500 group-hover:brightness-110"
                                        style={{ width: `${stats?.levelProgress || 0}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-blue-600 w-8 text-right">
                                    {Math.round(stats?.levelProgress || 0)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    // No urgent banner needed
    return null;
};

export default GamificationBanner;
