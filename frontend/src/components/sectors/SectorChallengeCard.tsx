'use client';

/**
 * Sector Challenge Card
 *
 * Tek bir sektör challenge'ını gösteren kart.
 * Katılma, ilerleme ve leaderboard önizlemesi.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Users,
    Clock,
    Target,
    ChevronRight,
    Zap,
    Medal,
    Crown,
    Check,
    Loader2,
    Flame
} from 'lucide-react';
import { SectorChallenge, joinChallenge } from '@/lib/api';

interface SectorChallengeCardProps {
    challenge: SectorChallenge;
    sectorId: number;
    onJoin?: (challengeId: number) => void;
    onViewDetails?: (challengeId: number) => void;
    compact?: boolean;
}

const DIFFICULTY_CONFIG = {
    easy: {
        label: 'Kolay',
        color: 'text-green-600',
        bg: 'bg-green-100 dark:bg-green-900/30',
        border: 'border-green-200 dark:border-green-800'
    },
    medium: {
        label: 'Orta',
        color: 'text-amber-600',
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        border: 'border-amber-200 dark:border-amber-800'
    },
    hard: {
        label: 'Zor',
        color: 'text-red-600',
        bg: 'bg-red-100 dark:bg-red-900/30',
        border: 'border-red-200 dark:border-red-800'
    }
};

const CHALLENGE_TYPE_ICONS: Record<string, React.ReactNode> = {
    vocabulary_master: <Target className="w-5 h-5" />,
    content_champion: <Trophy className="w-5 h-5" />,
    roleplay_expert: <Medal className="w-5 h-5" />,
    speed_learner: <Zap className="w-5 h-5" />,
    streak_warrior: <Flame className="w-5 h-5" />,
    default: <Trophy className="w-5 h-5" />
};

export function SectorChallengeCard({
    challenge,
    sectorId,
    onJoin,
    onViewDetails,
    compact = false
}: SectorChallengeCardProps) {
    const [isJoining, setIsJoining] = useState(false);
    const [hasJoined, setHasJoined] = useState(challenge.user_joined || false);
    const [progress, setProgress] = useState(challenge.user_progress || 0);

    const difficultyConfig = DIFFICULTY_CONFIG[challenge.difficulty] || DIFFICULTY_CONFIG.medium;
    const icon = CHALLENGE_TYPE_ICONS[challenge.challenge_type] || CHALLENGE_TYPE_ICONS.default;

    // Kalan süre hesapla
    const endDate = new Date(challenge.ends_at);
    const now = new Date();
    const hoursRemaining = Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
    const daysRemaining = Math.floor(hoursRemaining / 24);

    const progressPercentage = Math.min(100, (progress / challenge.target_count) * 100);
    const isCompleted = challenge.user_completed || progress >= challenge.target_count;

    const handleJoin = async () => {
        if (hasJoined || isJoining) return;

        setIsJoining(true);
        try {
            const response = await joinChallenge(sectorId, challenge.id);
            if (response.success) {
                setHasJoined(true);
                onJoin?.(challenge.id);
            }
        } catch (error) {
            console.error('Error joining challenge:', error);
        } finally {
            setIsJoining(false);
        }
    };

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border ${difficultyConfig.border} ${difficultyConfig.bg} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => onViewDetails?.(challenge.id)}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${difficultyConfig.color} bg-white dark:bg-gray-800`}>
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                            {challenge.title_tr}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{progress}/{challenge.target_count}</span>
                            <span>•</span>
                            <span className="text-amber-600">+{challenge.xp_reward} XP</span>
                        </div>
                    </div>
                    {isCompleted ? (
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                    ) : (
                        <div className="text-xs text-gray-400">
                            {daysRemaining > 0 ? `${daysRemaining}g` : `${hoursRemaining}s`}
                        </div>
                    )}
                </div>

                {/* Compact Progress Bar */}
                {hasJoined && !isCompleted && (
                    <div className="mt-3 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
                        />
                    </div>
                )}
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative p-6 rounded-2xl border-2 ${difficultyConfig.border} bg-white dark:bg-gray-800 overflow-hidden`}
        >
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <Trophy className="w-full h-full" />
            </div>

            {/* Completed Badge */}
            <AnimatePresence>
                {isCompleted && (
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg"
                    >
                        <Check className="w-6 h-6 text-white" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${difficultyConfig.bg} ${difficultyConfig.color}`}>
                    {icon}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyConfig.bg} ${difficultyConfig.color}`}>
                            {difficultyConfig.label}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {challenge.title_tr}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {challenge.description_tr}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <Target className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {challenge.target_count}
                    </p>
                    <p className="text-xs text-gray-500">Hedef</p>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <Zap className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                    <p className="text-lg font-bold text-amber-600">
                        +{challenge.xp_reward}
                    </p>
                    <p className="text-xs text-gray-500">XP</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <Users className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {challenge.participant_count || 0}
                    </p>
                    <p className="text-xs text-gray-500">Katilimci</p>
                </div>
            </div>

            {/* Progress (if joined) */}
            {hasJoined && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            İlerleme
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {progress}/{challenge.target_count}
                        </span>
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                                isCompleted
                                    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                                    : 'bg-gradient-to-r from-teal-500 to-cyan-500'
                            }`}
                        />
                    </div>
                </div>
            )}

            {/* Time Remaining */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <Clock className="w-4 h-4" />
                <span>
                    {daysRemaining > 0
                        ? `${daysRemaining} gün ${hoursRemaining % 24} saat kaldı`
                        : `${hoursRemaining} saat kaldı`}
                </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                {!hasJoined ? (
                    <button
                        onClick={handleJoin}
                        disabled={isJoining}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-shadow disabled:opacity-50"
                    >
                        {isJoining ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Trophy className="w-5 h-5" />
                                <span>Katil</span>
                            </>
                        )}
                    </button>
                ) : isCompleted ? (
                    <div className="flex-1 py-3 px-4 bg-green-100 dark:bg-green-900/30 text-green-600 font-semibold rounded-xl flex items-center justify-center gap-2">
                        <Crown className="w-5 h-5" />
                        <span>Tamamlandi!</span>
                    </div>
                ) : (
                    <button
                        onClick={() => onViewDetails?.(challenge.id)}
                        className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        <span>Devam Et</span>
                        <ChevronRight className="w-5 h-5" />
                    </button>
                )}

                <button
                    onClick={() => onViewDetails?.(challenge.id)}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                    <Users className="w-5 h-5 text-gray-400" />
                </button>
            </div>
        </motion.div>
    );
}

export default SectorChallengeCard;
