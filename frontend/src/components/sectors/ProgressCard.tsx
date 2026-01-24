'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, BookOpen, TrendingUp, Flame } from 'lucide-react';

interface ProgressCardProps {
    completed: number;
    total: number;
    inProgress: number;
    streak?: number;
    className?: string;
}

export function ProgressCard({ completed, total, inProgress, streak = 0, className = '' }: ProgressCardProps) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const notStarted = total - completed - inProgress;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-500" />
                    İlerleme Durumu
                </h3>
                {streak > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{streak} gün</span>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Tamamlanan</span>
                    <span className="text-sm font-bold text-teal-600 dark:text-teal-400">{percentage}%</span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full"
                    />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">{completed}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Tamamlandı</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                    <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                    <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{inProgress}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Devam Eden</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <BookOpen className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-600 dark:text-gray-300">{notStarted}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Başlanmadı</div>
                </div>
            </div>
        </motion.div>
    );
}

interface MiniProgressProps {
    completed: number;
    total: number;
    size?: 'sm' | 'md';
}

export function MiniProgress({ completed, total, size = 'sm' }: MiniProgressProps) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const barHeight = size === 'sm' ? 'h-1.5' : 'h-2';

    return (
        <div className="w-full">
            <div className={`${barHeight} bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden`}>
                <div
                    className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {size === 'md' && (
                <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-400">{completed}/{total}</span>
                    <span className="text-xs font-medium text-teal-500">{percentage}%</span>
                </div>
            )}
        </div>
    );
}

interface CompletionBadgeProps {
    status: 'not_started' | 'in_progress' | 'completed';
}

export function CompletionBadge({ status }: CompletionBadgeProps) {
    const config = {
        not_started: {
            bg: 'bg-gray-100 dark:bg-gray-700',
            text: 'text-gray-500 dark:text-gray-400',
            label: 'Başlanmadı'
        },
        in_progress: {
            bg: 'bg-yellow-100 dark:bg-yellow-900/30',
            text: 'text-yellow-600 dark:text-yellow-400',
            label: 'Devam Ediyor'
        },
        completed: {
            bg: 'bg-green-100 dark:bg-green-900/30',
            text: 'text-green-600 dark:text-green-400',
            label: 'Tamamlandı'
        }
    };

    const { bg, text, label } = config[status] || config.not_started;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
            {status === 'completed' && <CheckCircle className="w-3 h-3" />}
            {label}
        </span>
    );
}
