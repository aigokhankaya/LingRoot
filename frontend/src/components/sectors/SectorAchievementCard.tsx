'use client';

/**
 * Sector Achievement Card
 *
 * Tek bir achievement'ı gösteren kart.
 * Kazanılmış/kazanılmamış durumları, rarity renkleri.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, Sparkles } from 'lucide-react';

export interface Achievement {
    id: number;
    code: string;
    title_tr: string;
    title_en?: string;
    description_tr: string;
    description_en?: string;
    icon_emoji: string;
    xp_reward: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    category?: string;
    is_earned: boolean;
    earned_at?: string;
    progress?: number;
    target?: number;
}

interface SectorAchievementCardProps {
    achievement: Achievement;
    onClick?: (achievement: Achievement) => void;
    showProgress?: boolean;
    compact?: boolean;
}

const RARITY_CONFIG = {
    common: {
        label: 'Yaygın',
        color: 'text-gray-500',
        bg: 'bg-gray-100 dark:bg-gray-700',
        border: 'border-gray-300 dark:border-gray-600',
        glow: '',
        gradient: 'from-gray-400 to-gray-500'
    },
    rare: {
        label: 'Nadir',
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        border: 'border-blue-300 dark:border-blue-700',
        glow: 'shadow-blue-200 dark:shadow-blue-900/50',
        gradient: 'from-blue-400 to-blue-600'
    },
    epic: {
        label: 'Epik',
        color: 'text-purple-500',
        bg: 'bg-purple-50 dark:bg-purple-900/30',
        border: 'border-purple-300 dark:border-purple-700',
        glow: 'shadow-purple-200 dark:shadow-purple-900/50',
        gradient: 'from-purple-400 to-purple-600'
    },
    legendary: {
        label: 'Efsanevi',
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-900/30',
        border: 'border-amber-300 dark:border-amber-700',
        glow: 'shadow-amber-200 dark:shadow-amber-900/50',
        gradient: 'from-amber-400 to-orange-500'
    }
};

const CATEGORY_LABELS: Record<string, string> = {
    game: 'Oyun',
    challenge: 'Challenge',
    roleplay: 'Roleplay',
    podcast: 'Podcast',
    mastery: 'Ustalık',
    special: 'Özel'
};

export function SectorAchievementCard({
    achievement,
    onClick,
    showProgress = false,
    compact = false
}: SectorAchievementCardProps) {
    const rarityConfig = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common;
    const isEarned = achievement.is_earned;
    const progressPercentage = achievement.progress && achievement.target
        ? Math.min(100, (achievement.progress / achievement.target) * 100)
        : 0;

    if (compact) {
        return (
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onClick?.(achievement)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    isEarned
                        ? `${rarityConfig.bg} border ${rarityConfig.border}`
                        : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 opacity-60'
                }`}
            >
                {/* Icon */}
                <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                    isEarned ? rarityConfig.bg : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                    {isEarned ? (
                        achievement.icon_emoji
                    ) : (
                        <Lock className="w-5 h-5 text-gray-400" />
                    )}
                    {isEarned && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm truncate ${
                        isEarned ? 'text-gray-900 dark:text-white' : 'text-gray-500'
                    }`}>
                        {achievement.title_tr}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                        {achievement.description_tr}
                    </p>
                </div>

                {/* XP */}
                <div className={`text-sm font-bold ${rarityConfig.color}`}>
                    +{achievement.xp_reward}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onClick?.(achievement)}
            className={`relative p-5 rounded-2xl cursor-pointer transition-all overflow-hidden ${
                isEarned
                    ? `${rarityConfig.bg} border-2 ${rarityConfig.border} ${rarityConfig.glow} shadow-lg`
                    : 'bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700'
            }`}
        >
            {/* Legendary glow effect */}
            {isEarned && achievement.rarity === 'legendary' && (
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-500/20 animate-pulse" />
            )}

            {/* Category Badge */}
            {achievement.category && (
                <div className="absolute top-3 right-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isEarned ? rarityConfig.bg : 'bg-gray-100 dark:bg-gray-700'
                    } ${rarityConfig.color}`}>
                        {CATEGORY_LABELS[achievement.category] || achievement.category}
                    </span>
                </div>
            )}

            {/* Icon */}
            <div className="relative mb-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${
                    isEarned
                        ? `bg-gradient-to-br ${rarityConfig.gradient} shadow-lg`
                        : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                    {isEarned ? (
                        <span className="drop-shadow-md">{achievement.icon_emoji}</span>
                    ) : (
                        <Lock className="w-7 h-7 text-gray-400" />
                    )}
                </div>

                {/* Earned checkmark */}
                {isEarned && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
                    >
                        <Check className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                )}
            </div>

            {/* Title */}
            <h3 className={`font-bold text-lg mb-1 ${
                isEarned ? 'text-gray-900 dark:text-white' : 'text-gray-400'
            }`}>
                {achievement.title_tr}
            </h3>

            {/* Description */}
            <p className={`text-sm mb-3 ${
                isEarned ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400'
            }`}>
                {achievement.description_tr}
            </p>

            {/* Progress Bar (if applicable) */}
            {showProgress && !isEarned && achievement.progress !== undefined && achievement.target && (
                <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>İlerleme</span>
                        <span>{achievement.progress}/{achievement.target}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r ${rarityConfig.gradient} rounded-full transition-all`}
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
                {/* Rarity Badge */}
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${rarityConfig.bg} ${rarityConfig.color}`}>
                    {rarityConfig.label}
                </span>

                {/* XP Reward */}
                <div className="flex items-center gap-1">
                    <Sparkles className={`w-4 h-4 ${rarityConfig.color}`} />
                    <span className={`font-bold ${rarityConfig.color}`}>
                        +{achievement.xp_reward} XP
                    </span>
                </div>
            </div>

            {/* Earned Date */}
            {isEarned && achievement.earned_at && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-400">
                        Kazanıldı: {new Date(achievement.earned_at).toLocaleDateString('tr-TR')}
                    </p>
                </div>
            )}
        </motion.div>
    );
}

export default SectorAchievementCard;
