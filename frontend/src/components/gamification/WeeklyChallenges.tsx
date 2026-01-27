/**
 * 🎯 Weekly Challenges Component
 * 
 * Haftalık tema bazlı yarışmalar
 */

import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Task {
    type: string;
    target: number;
    xp_reward: number;
    title_tr: string;
    title_en: string;
}

interface Challenge {
    id: number;
    title_tr: string;
    title_en: string;
    description_tr: string;
    theme: string;
    theme_icon: string;
    week_end: string;
    tasks: Task[];
    total_xp_reward: number;
    joined: boolean;
    progress: {
        tasks_progress: Record<string, number>;
        completed_tasks: number;
        total_xp_earned: number;
        is_completed: boolean;
    } | null;
}

const THEME_COLORS: Record<string, string> = {
    science: 'from-blue-500 to-cyan-600',
    business: 'from-slate-600 to-slate-800',
    culture: 'from-amber-500 to-orange-600',
    general: 'from-teal-500 to-emerald-600',
};

export const WeeklyChallenges: React.FC = () => {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState<number | null>(null);

    const getToken = () => localStorage.getItem('lingroot_token');

    useEffect(() => {
        fetchChallenges();
    }, []);

    const fetchChallenges = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/gamification/challenges`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setChallenges(data.data);
            }
        } catch (error) {
            console.error('Challenges fetch failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const joinChallenge = async (challengeId: number) => {
        const token = getToken();
        if (!token) return;

        setJoining(challengeId);
        try {
            const res = await fetch(`${API_BASE}/api/gamification/challenges/${challengeId}/join`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                fetchChallenges(); // Refresh
            }
        } catch (error) {
            console.error('Join challenge failed:', error);
        } finally {
            setJoining(null);
        }
    };

    const getDaysRemaining = (endDate: string) => {
        const end = new Date(endDate);
        const now = new Date();
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(0, diff);
    };

    const getTaskProgress = (challenge: Challenge, taskIndex: number) => {
        if (!challenge.progress) return 0;
        return challenge.progress.tasks_progress[taskIndex.toString()] || 0;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-48 bg-slate-100 rounded-xl"></div>
            </div>
        );
    }

    if (challenges.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                <span className="text-5xl mb-4 block">🎯</span>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    Henüz aktif challenge yok
                </h3>
                <p className="text-slate-500 text-sm">
                    Yakında yeni haftalık yarışmalar eklenecek!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {challenges.map(challenge => {
                const daysLeft = getDaysRemaining(challenge.week_end);
                const isCompleted = challenge.progress?.is_completed;

                return (
                    <div
                        key={challenge.id}
                        className="bg-white rounded-2xl shadow-sm overflow-hidden"
                    >
                        {/* Header */}
                        <div className={`p-4 bg-gradient-to-r ${THEME_COLORS[challenge.theme] || THEME_COLORS.general} text-white`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{challenge.theme_icon}</span>
                                    <div>
                                        <h3 className="font-bold text-lg">{challenge.title_tr}</h3>
                                        <p className="text-white/80 text-sm">{challenge.description_tr}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">+{challenge.total_xp_reward}</div>
                                    <div className="text-xs text-white/70">XP Ödül</div>
                                </div>
                            </div>
                        </div>

                        {/* Time remaining */}
                        <div className="px-4 py-2 bg-slate-50 border-b flex items-center justify-between text-sm">
                            <span className="text-slate-500">⏱️ {daysLeft} gün kaldı</span>
                            {isCompleted && (
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                    ✅ Tamamlandı
                                </span>
                            )}
                        </div>

                        {/* Tasks */}
                        <div className="p-4 space-y-3">
                            {challenge.tasks.map((task, index) => {
                                const current = getTaskProgress(challenge, index);
                                const progress = Math.min(100, (current / task.target) * 100);
                                const isTaskDone = current >= task.target;

                                return (
                                    <div key={index} className="flex items-center gap-3">
                                        {/* Checkbox */}
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isTaskDone
                                                ? 'bg-green-500 text-white'
                                                : 'border-2 border-slate-200'
                                            }`}>
                                            {isTaskDone && <span className="text-sm">✓</span>}
                                        </div>

                                        {/* Task info */}
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-sm ${isTaskDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                    {task.title_tr}
                                                </span>
                                                <span className="text-xs text-teal-600 font-medium">
                                                    +{task.xp_reward} XP
                                                </span>
                                            </div>
                                            {challenge.joined && (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-teal-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-slate-400">
                                                        {current}/{task.target}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Action */}
                        {!challenge.joined && (
                            <div className="p-4 pt-0">
                                <button
                                    onClick={() => joinChallenge(challenge.id)}
                                    disabled={joining === challenge.id}
                                    className={`w-full py-3 rounded-xl font-semibold transition-all ${joining === challenge.id
                                            ? 'bg-slate-100 text-slate-400 cursor-wait'
                                            : 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-lg hover:scale-[1.02]'
                                        }`}
                                >
                                    {joining === challenge.id ? 'Katılıyor...' : '🎯 Meydan Okumaya Katıl'}
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default WeeklyChallenges;
