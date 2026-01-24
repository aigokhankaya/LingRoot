/**
 * 🔄 Resume Content Card
 * 
 * Shows in-progress content items for quick resume.
 * Displayed on welcome page.
 */

import React, { useState, useEffect } from 'react';
import { getIncompleteListenings, IncompleteListeningItem } from '@/lib/api';

interface ResumeContentCardProps {
    onResumePlay: (item: IncompleteListeningItem) => void;
}

const ResumeContentCard: React.FC<ResumeContentCardProps> = ({ onResumePlay }) => {
    const [items, setItems] = useState<IncompleteListeningItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default

    useEffect(() => {
        loadInProgress();
    }, []);

    const loadInProgress = async () => {
        try {
            const response = await getIncompleteListenings();
            if (response.success && response.data?.incomplete) {
                setItems(response.data.incomplete);
            }
        } catch (err) {
            console.error('Yarıda kalan dinlemeler yüklenemedi:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRefreshing(true);
        loadInProgress();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getLevelBadgeColor = (level: string) => {
        const colors: Record<string, string> = {
            'A1': 'bg-green-100 text-green-700',
            'A2': 'bg-lime-100 text-lime-700',
            'B1': 'bg-yellow-100 text-yellow-700',
            'B2': 'bg-orange-100 text-orange-700',
            'C1': 'bg-red-100 text-red-700',
            'C2': 'bg-purple-100 text-purple-700',
        };
        return colors[level] || 'bg-slate-100 text-slate-700';
    };

    const getRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Az önce';
        if (diffMins < 60) return `${diffMins} dk önce`;
        if (diffHours < 24) return `${diffHours} saat önce`;
        if (diffDays < 7) return `${diffDays} gün önce`;
        return date.toLocaleDateString('tr-TR');
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm border border-amber-200 p-6 mb-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-amber-200 rounded-full"></div>
                    <div className="h-6 w-32 bg-amber-200 rounded"></div>
                </div>
                <div className="space-y-3">
                    {[1, 2].map(i => (
                        <div key={i} className="h-20 bg-amber-100 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-4 mb-6">
            {/* Collapsible Header */}
            <div
                className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <div
                        className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-sm z-10"
                        onClick={handleRefresh}
                        title="Yenile"
                    >
                        <span className={`text-base text-white ${refreshing ? 'animate-spin' : ''}`}>🔄</span>
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-slate-800">Dinlemeye Devam Et</h2>
                        <p className="text-xs text-slate-500">{items.length} yarıda kalan içerik</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <svg
                        className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
                <div className="mt-3 space-y-2">
                    {items.slice(0, 3).map((item) => (
                        <button
                            key={item.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onResumePlay(item);
                            }}
                            className="w-full flex items-center gap-3 p-3 bg-white hover:bg-amber-50 rounded-lg transition-all duration-200 text-left group border border-amber-100 hover:border-amber-300 hover:shadow-sm"
                        >
                            {/* Play Icon with Progress Ring */}
                            <div className="relative w-10 h-10 shrink-0">
                                <svg className="w-10 h-10 -rotate-90">
                                    <circle cx="20" cy="20" r="16" fill="none" stroke="#fde68a" strokeWidth="3" />
                                    <circle cx="20" cy="20" r="16" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${((item.progress_percentage || 0) / 100) * 100.5} 100.5`} strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-sm font-medium text-slate-800 truncate">
                                        {item.topics?.title || 'İçerik'}
                                    </p>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getLevelBadgeColor(item.topics?.level || 'A1')}`}>
                                        {item.topics?.level || 'A1'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">
                                        {formatTime(item.last_position_seconds || 0)} / {formatTime(item.total_duration_seconds || 0)}
                                    </span>
                                    <div className="flex-1 h-1 bg-amber-100 rounded-full overflow-hidden max-w-[80px]">
                                        <div
                                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                                            style={{ width: `${Math.min(item.progress_percentage || 0, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-semibold text-amber-600">
                                        %{Math.round(item.progress_percentage || 0)}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    {item.last_listened_at ? getRelativeTime(item.last_listened_at) : ''}
                                </p>
                            </div>

                            {/* Arrow */}
                            <div className="w-6 h-6 flex items-center justify-center text-amber-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {items.length > 3 && isExpanded && (
                <p className="text-center text-xs text-amber-600 mt-2">
                    +{items.length - 3} daha fazla içerik
                </p>
            )}
        </div>
    );
};

export default ResumeContentCard;
