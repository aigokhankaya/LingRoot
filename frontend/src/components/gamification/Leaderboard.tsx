/**
 * 🏆 Leaderboard Component
 * 
 * Haftalık sıralama tablosu - Root temalı lig sistemi
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useGamification } from '@/hooks/useGamification';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface LeaderboardEntry {
    user_id: string;
    xp_earned: number;
    listening_minutes: number;
    content_completed: number;
    league: string;
    display_name: string;
    avatar_url: string | null;
    current_level: number;
    streak_count: number;
    rank: number;
}

interface League {
    code: string;
    name_tr: string;
    name_en: string;
    icon: string;
    rank_order: number;
}

const LEAGUE_COLORS: Record<string, string> = {
    seed: 'from-green-100 to-green-200 border-green-300',
    sprout: 'from-emerald-100 to-emerald-200 border-emerald-300',
    sapling: 'from-teal-100 to-teal-200 border-teal-300',
    flourish: 'from-pink-100 to-pink-200 border-pink-300',
    rooted: 'from-amber-100 to-amber-200 border-amber-300',
};

export const Leaderboard: React.FC = () => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [userRank, setUserRank] = useState<number | null>(null);
    const [currentLeague, setCurrentLeague] = useState<League | null>(null);
    const [loading, setLoading] = useState(true);
    const { stats } = useGamification();

    const getToken = () => localStorage.getItem('lingroot_token');

    useEffect(() => {
        fetchLeaderboard();
        fetchMyLeague();
    }, []);

    const fetchLeaderboard = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/gamification/leaderboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setLeaderboard(data.data.leaderboard);
                setUserRank(data.data.userRank);
            }
        } catch (error) {
            console.error('Leaderboard fetch failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyLeague = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/gamification/my-league`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setCurrentLeague(data.data);
            }
        } catch (error) {
            console.error('League fetch failed:', error);
        }
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-16 bg-slate-100 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Header with current league */}
            <div className={`p-4 bg-gradient-to-r ${LEAGUE_COLORS[currentLeague?.code || 'seed']} border-b`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{currentLeague?.icon || '🌱'}</span>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">
                                {currentLeague?.name_tr || 'Tohum'} Ligi
                            </h2>
                            <p className="text-sm text-slate-600">Haftalık Sıralama</p>
                        </div>
                    </div>
                    {userRank && (
                        <div className="bg-white/80 rounded-lg px-3 py-1.5 text-center">
                            <div className="text-xs text-slate-500">Sıralamanız</div>
                            <div className="text-xl font-bold text-slate-800">#{userRank}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Promotion/Demotion zones info */}
            <div className="px-4 py-2 bg-slate-50 border-b flex justify-between text-xs">
                <span className="text-green-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    İlk 10: Yükselme
                </span>
                <span className="text-red-500 flex items-center gap-1">
                    Son 5: Düşme
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                </span>
            </div>

            {/* Leaderboard list */}
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {leaderboard.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <span className="text-4xl mb-2 block">🌱</span>
                        Bu hafta henüz veri yok
                    </div>
                ) : (
                    leaderboard.map((entry, index) => {
                        const isCurrentUser = stats && entry.user_id === stats?.level?.toString(); // Compare with actual user
                        const isPromoZone = entry.rank <= 10;
                        const isDemoZone = entry.rank > leaderboard.length - 5;

                        return (
                            <div
                                key={entry.user_id}
                                className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors ${isCurrentUser ? 'bg-teal-50' : ''
                                    } ${isPromoZone ? 'border-l-4 border-l-green-400' : ''} ${isDemoZone ? 'border-l-4 border-l-red-400' : ''
                                    }`}
                            >
                                {/* Rank */}
                                <div className={`w-10 text-center font-bold ${entry.rank <= 3 ? 'text-2xl' : 'text-slate-500'
                                    }`}>
                                    {getRankIcon(entry.rank)}
                                </div>

                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold overflow-hidden">
                                    {entry.avatar_url ? (
                                        <Image src={entry.avatar_url} alt="" width={40} height={40} className="rounded-full object-cover" />
                                    ) : (
                                        entry.display_name?.charAt(0).toUpperCase() || '?'
                                    )}
                                </div>

                                {/* User info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-800 truncate">
                                            {entry.display_name || 'Kullanıcı'}
                                        </span>
                                        {entry.streak_count > 0 && (
                                            <span className="text-xs text-orange-500 flex items-center gap-0.5">
                                                🔥 {entry.streak_count}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        Level {entry.current_level} • {entry.listening_minutes} dk dinleme
                                    </div>
                                </div>

                                {/* XP */}
                                <div className="text-right">
                                    <div className="font-bold text-teal-600">{entry.xp_earned.toLocaleString()}</div>
                                    <div className="text-xs text-slate-400">XP</div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t text-center text-xs text-slate-500">
                Hafta sonu sıralama güncellenir
            </div>
        </div>
    );
};

export default Leaderboard;
