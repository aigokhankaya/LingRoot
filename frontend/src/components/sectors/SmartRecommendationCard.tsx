'use client';

/**
 * Smart Recommendation Card
 *
 * Kişiselleştirilmiş içerik önerileri gösteren akıllı kart.
 * Kullanıcının seviyesi, tercihleri ve ilerlemesine göre önerir.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    BookOpen,
    MessageSquare,
    Mic,
    FileText,
    ChevronRight,
    Clock,
    Zap,
    Target,
    RefreshCw,
    Play
} from 'lucide-react';
import {
    getPersonalizedRecommendations,
    getNextBestContent,
    ContentRecommendation,
    NextBestContent
} from '@/lib/api';

interface SmartRecommendationCardProps {
    sectorId: number;
    sectorName?: string;
    showNextBest?: boolean;
    maxRecommendations?: number;
    className?: string;
}

// Content type icons
const TYPE_ICONS: Record<string, React.ReactNode> = {
    sector_article: <FileText className="w-5 h-5" />,
    vocabulary_focus: <Target className="w-5 h-5" />,
    business_roleplay: <MessageSquare className="w-5 h-5" />,
    sector_podcast: <Mic className="w-5 h-5" />,
    quiz: <Zap className="w-5 h-5" />,
};

// Content type colors
const TYPE_COLORS: Record<string, string> = {
    sector_article: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    vocabulary_focus: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    business_roleplay: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
    sector_podcast: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    quiz: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
};

// Content type labels
const TYPE_LABELS: Record<string, string> = {
    sector_article: 'Makale',
    vocabulary_focus: 'Kelime',
    business_roleplay: 'Roleplay',
    sector_podcast: 'Podcast',
    quiz: 'Quiz',
};

export function SmartRecommendationCard({
    sectorId,
    sectorName,
    showNextBest = true,
    maxRecommendations = 3,
    className = ''
}: SmartRecommendationCardProps) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [nextBest, setNextBest] = useState<NextBestContent | null>(null);
    const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);

    useEffect(() => {
        loadRecommendations();
    }, [sectorId]);

    const loadRecommendations = async () => {
        try {
            setLoading(true);

            // Load recommendations
            const recsRes = await getPersonalizedRecommendations(sectorId, maxRecommendations);
            if (recsRes.success && recsRes.data) {
                setRecommendations(Array.isArray(recsRes.data) ? recsRes.data : []);
            }

            // Load next best content if enabled
            if (showNextBest) {
                const nextBestRes = await getNextBestContent(sectorId);
                if (nextBestRes.success && nextBestRes.data) {
                    setNextBest(nextBestRes.data);
                }
            }
        } catch (error) {
            console.error('Error loading recommendations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadRecommendations();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-24 bg-gray-200 rounded mb-4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-gray-100 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}
        >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-teal-500" />
                        Senin İçin Öneriler
                    </h3>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Next Best Action */}
            {showNextBest && nextBest && (
                <div className="p-5 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400 mb-3">
                        <Zap className="w-4 h-4" />
                        ŞİMDİ ÇALIŞ
                    </div>

                    {nextBest.type === 'continue' && nextBest.content && (
                        <Link
                            href={`/sectors/content/${nextBest.content.id}`}
                            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${TYPE_COLORS[nextBest.content.content_type] || 'bg-gray-100'}`}>
                                {TYPE_ICONS[nextBest.content.content_type] || <BookOpen className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-teal-600">
                                    {nextBest.content.title}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {nextBest.reason}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-xs font-medium rounded-full">
                                    Devam Et
                                </span>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-teal-500" />
                            </div>
                        </Link>
                    )}

                    {nextBest.type === 'vocabulary_review' && nextBest.words && (
                        <Link
                            href={`/sectors/${sectorId}?tab=vocabulary&mode=review`}
                            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                                <Target className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-teal-600">
                                    Kelime Tekrarı
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {nextBest.reason}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-medium rounded-full">
                                    {nextBest.words.length} kelime
                                </span>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-teal-500" />
                            </div>
                        </Link>
                    )}

                    {nextBest.type === 'new_content' && nextBest.content && (
                        <Link
                            href={`/sectors/content/${nextBest.content.id}`}
                            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${TYPE_COLORS[nextBest.content.content_type] || 'bg-gray-100'}`}>
                                {TYPE_ICONS[nextBest.content.content_type] || <BookOpen className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-teal-600">
                                    {nextBest.content.title}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {nextBest.reason}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Play className="w-5 h-5 text-teal-500" />
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-teal-500" />
                            </div>
                        </Link>
                    )}
                </div>
            )}

            {/* Recommendations List */}
            <div className="p-5">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                    Diğer Öneriler
                </h4>

                <AnimatePresence mode="popLayout">
                    <div className="space-y-3">
                        {recommendations.map((rec, index) => (
                            <motion.div
                                key={rec.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link
                                    href={`/sectors/content/${rec.id}`}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${TYPE_COLORS[rec.content_type] || 'bg-gray-100'}`}>
                                        {TYPE_ICONS[rec.content_type] || <BookOpen className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-teal-600">
                                            {rec.title}
                                        </h5>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>{TYPE_LABELS[rec.content_type] || rec.content_type}</span>
                                            <span>•</span>
                                            <span>{rec.cefr_level}</span>
                                            {rec.estimated_time && (
                                                <>
                                                    <span>•</span>
                                                    <Clock className="w-3 h-3" />
                                                    <span>{rec.estimated_time} dk</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                                            +{rec.xp_reward} XP
                                        </span>
                                        <span className="text-[10px] text-gray-400 italic">
                                            {rec.recommendation_reason}
                                        </span>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </AnimatePresence>

                {recommendations.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Henüz öneri yok</p>
                    </div>
                )}
            </div>

            {/* View All Link */}
            <div className="px-5 pb-5">
                <Link
                    href={`/sectors/${sectorId}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors"
                >
                    Tüm İçerikleri Gör
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
        </motion.div>
    );
}

export default SmartRecommendationCard;
