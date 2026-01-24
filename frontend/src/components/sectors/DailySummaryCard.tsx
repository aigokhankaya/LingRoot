'use client';

/**
 * Daily Summary Card
 *
 * Kullanıcının günlük sektör öğrenme özetini gösteren kart.
 * Motivasyon mesajları, bugünkü ilerleme ve sonraki adımlar.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Sun,
    Moon,
    Sunset,
    Target,
    BookOpen,
    Flame,
    ChevronRight,
    CheckCircle,
    Sparkles
} from 'lucide-react';
import { getDailySummary, DailySummary } from '@/lib/api';

interface DailySummaryCardProps {
    sectorId: number;
    sectorName?: string;
    className?: string;
}

export function DailySummaryCard({
    sectorId,
    sectorName,
    className = ''
}: DailySummaryCardProps) {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<DailySummary | null>(null);

    useEffect(() => {
        loadSummary();
    }, [sectorId]);

    const loadSummary = async () => {
        try {
            setLoading(true);
            const response = await getDailySummary(sectorId);

            if (response.success && response.data) {
                setSummary(response.data);
            }
        } catch (error) {
            console.error('Error loading daily summary:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get time-based icon
    const getTimeIcon = () => {
        const hour = new Date().getHours();
        if (hour < 12) return <Sun className="w-6 h-6 text-amber-500" />;
        if (hour < 18) return <Sun className="w-6 h-6 text-orange-500" />;
        return <Moon className="w-6 h-6 text-indigo-500" />;
    };

    // Get time-based gradient
    const getTimeGradient = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20';
        if (hour < 18) return 'from-orange-50 to-rose-50 dark:from-orange-900/20 dark:to-rose-900/20';
        return 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20';
    };

    if (loading) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-20 bg-gray-100 rounded"></div>
                        <div className="h-20 bg-gray-100 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!summary) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-gradient-to-br ${getTimeGradient()} rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}
        >
            {/* Greeting Section */}
            <div className="p-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm">
                        {getTimeIcon()}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {summary.greeting}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {summary.motivational_message}
                        </p>
                    </div>
                </div>

                {/* Today's Stats */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                            <BookOpen className="w-4 h-4" />
                            Bugün Tamamlanan
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {summary.today_stats.content_completed}
                            <span className="text-sm font-normal text-gray-500 ml-1">içerik</span>
                        </div>
                    </div>

                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
                            <Target className="w-4 h-4" />
                            Kelime Tekrarı
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {summary.today_stats.words_reviewed}
                            <span className="text-sm font-normal text-gray-500 ml-1">kelime</span>
                        </div>
                    </div>
                </div>

                {/* Vocabulary Due Reminder */}
                {summary.vocabulary_due > 0 && (
                    <Link
                        href={`/sectors/${sectorId}?tab=vocabulary&mode=review`}
                        className="mt-4 flex items-center gap-3 p-3 bg-amber-100/80 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100 transition-colors"
                    >
                        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white">
                            <Flame className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                {summary.vocabulary_due} kelime tekrar bekliyor
                            </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-amber-600" />
                    </Link>
                )}
            </div>

            {/* Learning Path Preview */}
            {summary.learning_path.length > 0 && (
                <div className="px-6 pb-6">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-500" />
                        Sıradaki Adımlar
                    </h3>

                    <div className="space-y-2">
                        {summary.learning_path.slice(0, 3).map((step, index) => (
                            <Link
                                key={step.id}
                                href={`/sectors/content/${step.id}`}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                                    step.is_next
                                        ? 'bg-teal-100/80 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800'
                                        : 'bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    step.status === 'completed'
                                        ? 'bg-green-100 text-green-600'
                                        : step.is_next
                                            ? 'bg-teal-500 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                }`}>
                                    {step.status === 'completed' ? (
                                        <CheckCircle className="w-4 h-4" />
                                    ) : (
                                        step.step_number
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm font-medium truncate ${
                                        step.status === 'completed'
                                            ? 'text-gray-400 line-through'
                                            : 'text-gray-800 dark:text-gray-200'
                                    }`}>
                                        {step.title}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>{step.module_name}</span>
                                        <span>•</span>
                                        <span>+{step.xp_reward} XP</span>
                                    </div>
                                </div>

                                {step.is_next && (
                                    <span className="px-2 py-1 bg-teal-500 text-white text-xs font-medium rounded-full">
                                        Başla
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Next Best Action */}
            {summary.next_action && summary.next_action.content && (
                <div className="px-6 pb-6">
                    <Link
                        href={`/sectors/content/${summary.next_action.content.id}`}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors"
                    >
                        <Sparkles className="w-5 h-5" />
                        Şimdi Çalışmaya Başla
                    </Link>
                </div>
            )}
        </motion.div>
    );
}

export default DailySummaryCard;
