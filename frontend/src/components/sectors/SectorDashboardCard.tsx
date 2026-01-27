'use client';

/**
 * Sector Dashboard Card
 *
 * Dashboard'da kullanicinin ana sektoru icin ilerleme,
 * XP, kelime bilgisi ve onerilen icerikleri gosteren kart.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Briefcase,
    BookOpen,
    TrendingUp,
    Flame,
    ChevronRight,
    Sparkles,
    Target,
    GraduationCap,
    PlayCircle
} from 'lucide-react';
import {
    getUserPrimarySector,
    getSectorProgressSummary,
    getSectorRecommendations,
    SectorProgressSummary,
    UserSectorWithPosition
} from '@/lib/api';

interface SectorDashboardCardProps {
    className?: string;
}

interface ContentRecommendation {
    id: number;
    title: string;
    content_type: string;
    difficulty_level: string;
    estimated_time?: number;
}

// Icon mapping for sectors
const SECTOR_ICONS: Record<string, string> = {
    it_software: '💻',
    finance: '💰',
    tourism: '✈️',
    healthcare: '🏥',
    logistics: '🚛',
    marketing: '📱',
    engineering: '⚙️',
    legal: '⚖️',
    hr: '👥',
    retail: '🛒',
    education: '📚',
    real_estate: '🏠',
};

export function SectorDashboardCard({ className = '' }: SectorDashboardCardProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userSector, setUserSector] = useState<UserSectorWithPosition | null>(null);
    const [progress, setProgress] = useState<SectorProgressSummary | null>(null);
    const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);

    useEffect(() => {
        loadSectorData();
    }, []);

    const loadSectorData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get user's primary sector
            const sectorResponse = await getUserPrimarySector();

            if (!sectorResponse.success || !sectorResponse.data) {
                // User has no sector selected
                setUserSector(null);
                setLoading(false);
                return;
            }

            setUserSector(sectorResponse.data);

            // Get progress summary and recommendations in parallel
            const [progressResponse, recsResponse] = await Promise.all([
                getSectorProgressSummary(sectorResponse.data.sector_id),
                getSectorRecommendations(sectorResponse.data.sector_id, 3)
            ]);

            if (progressResponse.success && progressResponse.data) {
                setProgress(progressResponse.data);
            }

            if (recsResponse.success && recsResponse.data) {
                setRecommendations(Array.isArray(recsResponse.data) ? recsResponse.data : []);
            }
        } catch (err) {
            console.error('Error loading sector data:', err);
            setError('Sektor verileri yuklenemedi');
        } finally {
            setLoading(false);
        }
    };

    // Calculate sector level from XP
    const calculateLevel = (xp: number): number => {
        if (xp < 100) return 1;
        if (xp < 300) return 2;
        if (xp < 600) return 3;
        if (xp < 1000) return 4;
        if (xp < 1500) return 5;
        if (xp < 2100) return 6;
        if (xp < 2800) return 7;
        if (xp < 3600) return 8;
        if (xp < 4500) return 9;
        return 10;
    };

    // Loading state
    if (loading) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="h-20 bg-gray-200 rounded"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    // No sector selected - show CTA
    if (!userSector) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-2xl p-6 shadow-sm border border-teal-100 dark:border-teal-800 ${className}`}
            >
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-teal-100 dark:bg-teal-800 rounded-xl flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            Sektor Ingilizcesi
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Calistigin sektore ozel kelime ve iceriklerle profesyonel Ingilizce ogrenmeye basla.
                        </p>
                        <Link
                            href="/sectors"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <Sparkles className="w-4 h-4" />
                            Sektor Sec
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800 ${className}`}>
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                <button
                    onClick={loadSectorData}
                    className="mt-2 text-sm text-red-600 underline hover:no-underline"
                >
                    Tekrar dene
                </button>
            </div>
        );
    }

    // Validate sector data exists
    const sector = userSector?.sector;
    if (!sector) {
        // Sector data is malformed - show CTA instead of crashing
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-2xl p-6 shadow-sm border border-teal-100 dark:border-teal-800 ${className}`}
            >
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-teal-100 dark:bg-teal-800 rounded-xl flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            Sektör İngilizcesi
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Çalıştığın sektöre özel kelime ve içeriklerle profesyonel İngilizce öğren.
                        </p>
                        <Link
                            href="/sectors"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <Sparkles className="w-4 h-4" />
                            Sektör Seç
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </motion.div>
        );
    }

    const sectorIcon = SECTOR_ICONS[sector.code] || '💼';

    // Extract progress data with fallbacks
    const vocabData = progress?.vocabulary || { learned: 0, total: 0, progress: 0 };
    const contentData = progress?.content || { completed: 0, total: 0, progress: 0 };
    const moduleData = progress?.modules || { completed: 0, total: 0, progress: 0 };
    const totalXP = progress?.totalXP || 0;
    const sectorStreak = progress?.sectorStreak || 0;
    const longestStreak = progress?.longestStreak || 0;
    const sectorLevel = calculateLevel(totalXP);

    // Calculate overall progress
    const overallProgress = Math.round(
        ((contentData.progress || 0) + (vocabData.progress || 0)) / 2
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}
        >
            {/* Header with gradient */}
            <div
                className="p-5 text-white"
                style={{
                    background: `linear-gradient(135deg, ${sector.color || '#14B8A6'} 0%, ${sector.color || '#14B8A6'}dd 100%)`
                }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl">{sectorIcon}</div>
                        <div>
                            <h3 className="font-bold text-lg">{sector.name_tr}</h3>
                            {userSector.job_position && (
                                <p className="text-white/80 text-sm">{userSector.job_position}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-bold text-sm">Seviye {sectorLevel}</span>
                    </div>
                </div>

                {/* XP Progress */}
                <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/80">Sektor XP</span>
                        <span className="font-bold">{totalXP.toLocaleString()} XP</span>
                    </div>
                    <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((totalXP % 500) / 5, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                    {/* Content Progress */}
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <BookOpen className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {contentData.completed}/{contentData.total}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Icerik</div>
                    </div>

                    {/* Vocabulary */}
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <Target className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            {vocabData.learned}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Kelime</div>
                    </div>

                    {/* Streak */}
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                        <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {sectorStreak}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Gun Seri</div>
                    </div>

                    {/* Modules */}
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <GraduationCap className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {moduleData.completed}/{moduleData.total}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Modul</div>
                    </div>
                </div>

                {/* Content Progress Bar */}
                <div className="mb-5">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Genel Ilerleme
                        </span>
                        <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                            %{overallProgress}
                        </span>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${overallProgress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full"
                        />
                    </div>
                </div>

                {/* Streak Info */}
                {longestStreak > 0 && (
                    <div className="mb-5 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span>En uzun seri: <strong className="text-orange-600">{longestStreak} gun</strong></span>
                    </div>
                )}

                {/* Recommendations Preview */}
                {recommendations.length > 0 && (
                    <div className="mb-5">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-teal-500" />
                            Onerilen Icerikler
                        </h4>
                        <div className="space-y-2">
                            {recommendations.slice(0, 2).map((rec) => (
                                <Link
                                    key={rec.id}
                                    href={`/sectors/content/${rec.id}`}
                                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                                >
                                    <div className="w-10 h-10 bg-teal-100 dark:bg-teal-800 rounded-lg flex items-center justify-center">
                                        <PlayCircle className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-teal-600">
                                            {rec.title}
                                        </h5>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="capitalize">{(rec.content_type || '').replace('_', ' ')}</span>
                                            <span>|</span>
                                            <span>{rec.difficulty_level || 'Orta'}</span>
                                            {rec.estimated_time && (
                                                <>
                                                    <span>|</span>
                                                    <span>{rec.estimated_time} dk</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-teal-500 transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <Link
                        href={`/sectors/${sector.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                        <BookOpen className="w-4 h-4" />
                        Iceriklere Git
                    </Link>
                    <Link
                        href="/sectors"
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
                    >
                        Tum Sektorler
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}

export default SectorDashboardCard;
