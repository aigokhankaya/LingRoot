/**
 * 🔥 Streak Society Component
 * 
 * Streak toplulukları - 7/30/100 gün milestone'ları
 */

import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Society {
    code: string;
    name_tr: string;
    name_en: string;
    icon: string;
    color: string;
}

interface StreakSocietyData {
    currentStreak: number;
    society: Society | null;
    nextMilestone: number | null;
    daysToNext: number | null;
    memberCounts: Record<string, number>;
}

const SOCIETIES: Society[] = [
    { code: 'week_warrior', name_tr: 'Haftalık Savaşçılar', name_en: 'Week Warriors', icon: '⚔️', color: '#3B82F6' },
    { code: 'month_master', name_tr: 'Ay Ustaları', name_en: 'Month Masters', icon: '🌙', color: '#9333EA' },
    { code: 'legendary', name_tr: 'Efsanevi Kökler', name_en: 'Legendary Roots', icon: '👑', color: '#FFD700' },
];

export const StreakSociety: React.FC = () => {
    const [data, setData] = useState<StreakSocietyData | null>(null);
    const [loading, setLoading] = useState(true);

    const getToken = () => localStorage.getItem('lingroot_token');

    useEffect(() => {
        fetchStreakSociety();
    }, []);

    const fetchStreakSociety = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/gamification/streak-society`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error('Streak society fetch failed:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-32 bg-slate-100 rounded-xl"></div>
            </div>
        );
    }

    if (!data) return null;

    const progressPercent = data.nextMilestone
        ? ((data.currentStreak / data.nextMilestone) * 100)
        : 100;

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Current status */}
            <div className={`p-6 text-center ${data.society ? '' : 'bg-slate-50'}`}
                style={{ background: data.society ? `linear-gradient(135deg, ${data.society.color}20, ${data.society.color}10)` : undefined }}>

                {/* Streak flame */}
                <div className="relative inline-block mb-3">
                    <span className="text-6xl animate-pulse">{data.society?.icon || '🔥'}</span>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full px-2 py-0.5 shadow-md">
                        <span className="font-bold text-orange-600">{data.currentStreak}</span>
                    </div>
                </div>

                {data.society ? (
                    <>
                        <h3 className="text-xl font-bold text-slate-800 mb-1">
                            {data.society.name_tr}
                        </h3>
                        <p className="text-sm text-slate-500">
                            {data.currentStreak} günlük seri ile elit grubun bir üyesisin!
                        </p>
                    </>
                ) : (
                    <>
                        <h3 className="text-xl font-bold text-slate-800 mb-1">
                            Streak Society'ye Katıl!
                        </h3>
                        <p className="text-sm text-slate-500">
                            7 günlük seri ile Haftalık Savaşçılar'a katıl
                        </p>
                    </>
                )}

                {/* Progress to next milestone */}
                {data.nextMilestone && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>{data.currentStreak} gün</span>
                            <span>{data.nextMilestone} gün</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            Sonraki seviyeye {data.daysToNext} gün kaldı
                        </p>
                    </div>
                )}
            </div>

            {/* All societies */}
            <div className="p-4 border-t">
                <h4 className="text-sm font-semibold text-slate-600 mb-3">Streak Toplulukları</h4>
                <div className="space-y-2">
                    {SOCIETIES.map(society => {
                        const isCurrent = data.society?.code === society.code;
                        const memberCount = data.memberCounts[society.code] || 0;
                        const requirement = society.code === 'week_warrior' ? 7
                            : society.code === 'month_master' ? 30 : 100;
                        const isUnlocked = data.currentStreak >= requirement;

                        return (
                            <div
                                key={society.code}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isCurrent
                                        ? 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200'
                                        : isUnlocked
                                            ? 'bg-slate-50'
                                            : 'bg-slate-50/50 opacity-60'
                                    }`}
                            >
                                <span className={`text-2xl ${!isUnlocked ? 'grayscale' : ''}`}>
                                    {isUnlocked ? society.icon : '🔒'}
                                </span>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-700">
                                            {society.name_tr}
                                        </span>
                                        {isCurrent && (
                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                                Seninki
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {requirement}+ gün streak • {memberCount} üye
                                    </div>
                                </div>
                                {isUnlocked && (
                                    <span className="text-green-500 text-lg">✓</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default StreakSociety;
