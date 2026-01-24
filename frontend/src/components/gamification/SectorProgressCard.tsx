/**
 * 📊 Sector Progress Card Component
 * 
 * Dashboard için sektör ilerleme kartı.
 * Vocabulary, content, module ilerlemesi ve XP gösterir.
 * 
 * @created 2026-01-23
 */

import React, { useState, useEffect } from 'react';

interface SectorProgressData {
    vocabulary: {
        learned: number;
        total: number;
        progress: number;
    };
    content: {
        completed: number;
        total: number;
        progress: number;
    };
    modules: {
        completed: number;
        total: number;
        progress: number;
    };
    totalXP: number;
    sectorStreak: number;
    longestStreak: number;
    lastActivity: string | null;
}

interface SectorInfo {
    id: number;
    name_tr: string;
    name_en?: string;
    icon: string;
    color: string;
}

interface SectorProgressCardProps {
    sector: SectorInfo;
    data?: SectorProgressData;
    isLoading?: boolean;
    onViewDetails?: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export const SectorProgressCard: React.FC<SectorProgressCardProps> = ({
    sector,
    data: propData,
    isLoading: propLoading = false,
    onViewDetails
}) => {
    const [data, setData] = useState<SectorProgressData | null>(propData || null);
    const [isLoading, setIsLoading] = useState(propLoading);

    useEffect(() => {
        if (!propData && sector.id) {
            fetchProgress();
        }
    }, [sector.id, propData]);

    const fetchProgress = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE}/api/sectors/${sector.id}/gamification/progress`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            const result = await response.json();
            if (result.success && result.data) {
                setData(result.data);
            }
        } catch (error) {
            console.error('Error fetching sector progress:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                    <div>
                        <div className="h-4 w-24 bg-slate-200 rounded mb-2" />
                        <div className="h-3 w-16 bg-slate-200 rounded" />
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="h-2 bg-slate-200 rounded-full" />
                    <div className="h-2 bg-slate-200 rounded-full" />
                    <div className="h-2 bg-slate-200 rounded-full" />
                </div>
            </div>
        );
    }

    const vocab = data?.vocabulary || { learned: 0, total: 0, progress: 0 };
    const content = data?.content || { completed: 0, total: 0, progress: 0 };
    const modules = data?.modules || { completed: 0, total: 0, progress: 0 };

    // Overall progress (weighted average)
    const overallProgress = Math.round(
        (vocab.progress * 0.4 + content.progress * 0.4 + modules.progress * 0.2)
    );

    return (
        <div
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all duration-300 cursor-pointer group"
            onClick={onViewDetails}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                        style={{ backgroundColor: `${sector.color}15` }}
                    >
                        {sector.icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 group-hover:text-teal-600 transition-colors">
                            {sector.name_tr}
                        </h3>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500">
                                {data?.totalXP || 0} XP
                            </span>
                            {(data?.sectorStreak || 0) > 0 && (
                                <span className="flex items-center gap-1 text-orange-500 font-medium">
                                    🔥 {data?.sectorStreak} gün
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Overall Progress Circle */}
                <div className="relative">
                    <svg className="w-14 h-14 -rotate-90">
                        <circle
                            cx="28"
                            cy="28"
                            r="24"
                            fill="none"
                            stroke="#E2E8F0"
                            strokeWidth="4"
                        />
                        <circle
                            cx="28"
                            cy="28"
                            r="24"
                            fill="none"
                            stroke={sector.color}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${(overallProgress / 100) * 150.8} 150.8`}
                            className="transition-all duration-700"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-slate-700">{overallProgress}%</span>
                    </div>
                </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-3">
                {/* Vocabulary */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">📚 Kelime</span>
                        <span className="text-slate-600 font-medium">
                            {vocab.learned} / {vocab.total}
                        </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${vocab.progress}%`,
                                backgroundColor: '#10B981'
                            }}
                        />
                    </div>
                </div>

                {/* Content */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">📖 İçerik</span>
                        <span className="text-slate-600 font-medium">
                            {content.completed} / {content.total}
                        </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${content.progress}%`,
                                backgroundColor: '#3B82F6'
                            }}
                        />
                    </div>
                </div>

                {/* Modules */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">🎯 Modül</span>
                        <span className="text-slate-600 font-medium">
                            {modules.completed} / {modules.total}
                        </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${modules.progress}%`,
                                backgroundColor: '#8B5CF6'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                    {data?.lastActivity
                        ? `Son: ${new Date(data.lastActivity).toLocaleDateString('tr-TR')}`
                        : 'Henüz başlanmadı'
                    }
                </div>
                <div className="flex items-center gap-1 text-xs text-teal-600 font-medium group-hover:translate-x-1 transition-transform">
                    Detaylar
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default SectorProgressCard;
