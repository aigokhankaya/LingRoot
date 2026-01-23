/**
 * 🎯 Next Quest Banner Component
 * 
 * Kullanıcıya her zaman sıradaki hedefi gösterir.
 * Dashboard'un en üstünde yer alır.
 */

import React from 'react';
import { useRouter } from 'next/router';

interface CurrentQuest {
    id: number;
    title: string;
    description: string;
    icon_emoji: string;
    task_type: string;
    content_url?: string;
    required_daily_completions: number;
    current_daily_completions: number;
    reward_xp: number;
}

interface DailyQuest {
    id: string;
    task_type: string;
    task_title: string;
    parent_quest_node_id?: number;
    is_completed: boolean;
}

interface NextQuestBannerProps {
    currentQuest: CurrentQuest | null;
    relatedDailyQuests?: DailyQuest[];
}

export const NextQuestBanner: React.FC<NextQuestBannerProps> = ({
    currentQuest,
    relatedDailyQuests = []
}) => {
    const router = useRouter();

    if (!currentQuest) {
        return null;
    }

    const progress = currentQuest.required_daily_completions > 0
        ? Math.min((currentQuest.current_daily_completions / currentQuest.required_daily_completions) * 100, 100)
        : 0;

    const handleStartClick = () => {
        if (currentQuest.content_url) {
            router.push(currentQuest.content_url);
            return;
        }

        // Task tipine göre fallback
        const fallbackUrls: Record<string, string> = {
            vocabulary: '/vocabulary',
            listen: '/dashboard?tab=reading-history',
            quiz: '/quiz',
            milestone: '/dashboard',
        };
        router.push(fallbackUrls[currentQuest.task_type] || '/dashboard');
    };

    return (
        <div className="relative overflow-hidden bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-teal-200/50 mb-6">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>

            <div className="relative flex items-center justify-between gap-6">
                {/* Sol: Quest Bilgisi */}
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl md:text-3xl shadow-inner">
                        {currentQuest.icon_emoji || '🎯'}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] md:text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                🗺️ Sıradaki Hedefin
                            </span>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold truncate mb-0.5">
                            {currentQuest.title}
                        </h3>
                        <p className="text-xs md:text-sm text-white/80 truncate hidden sm:block">
                            {currentQuest.description}
                        </p>
                    </div>
                </div>

                {/* Orta: İlerleme */}
                <div className="hidden lg:flex flex-col items-center gap-1 px-6 border-l border-r border-white/20">
                    <span className="text-xl font-bold">{Math.round(progress)}%</span>
                    <div className="w-20 h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-white/70">
                        {currentQuest.current_daily_completions || 0}/{currentQuest.required_daily_completions || 3} görev
                    </span>
                </div>

                {/* Sağ: CTA Button */}
                <button
                    onClick={handleStartClick}
                    className="flex items-center gap-2 bg-white text-teal-600 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold text-sm md:text-base shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95"
                >
                    <span className="hidden sm:inline">Şimdi Başla</span>
                    <span className="sm:hidden">Başla</span>
                    <span>→</span>
                </button>
            </div>

            {/* Alt: İlgili Günlük Görevler */}
            {relatedDailyQuests.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
                        <span className="text-[10px] md:text-xs font-medium text-white/70 whitespace-nowrap flex-shrink-0">
                            Bugünkü Görevlerin:
                        </span>
                        {relatedDailyQuests.slice(0, 4).map((quest) => (
                            <div
                                key={quest.id}
                                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-medium whitespace-nowrap transition-all
                  ${quest.is_completed
                                        ? 'bg-white/30 line-through opacity-70'
                                        : 'bg-white/20 hover:bg-white/30'
                                    }
                `}
                            >
                                <span>{quest.is_completed ? '✅' : '○'}</span>
                                <span>{quest.task_title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Mobil ilerleme göstergesi */}
            <div className="lg:hidden mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className="text-xs font-medium">
                    {currentQuest.current_daily_completions || 0}/{currentQuest.required_daily_completions || 3}
                </span>
            </div>
        </div>
    );
};

export default NextQuestBanner;
