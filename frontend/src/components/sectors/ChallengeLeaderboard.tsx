'use client';

/**
 * Challenge Leaderboard
 *
 * Challenge sıralamasını gösteren component.
 * Top 10 ve kullanıcının pozisyonu.
 */

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Crown,
    Medal,
    Trophy,
    User,
    Loader2,
    ChevronUp,
    ChevronDown,
    Minus,
    Sparkles
} from 'lucide-react';
import { getChallengeLeaderboard, LeaderboardEntry, ChallengeLeaderboard as LeaderboardData } from '@/lib/api';

interface ChallengeLeaderboardProps {
    sectorId: number;
    challengeId: number;
    targetCount: number;
    limit?: number;
    showUserRank?: boolean;
    compact?: boolean;
    onUserClick?: (userId: number) => void;
}

const RANK_STYLES = {
    1: {
        bg: 'bg-gradient-to-r from-amber-400 to-yellow-500',
        text: 'text-white',
        icon: <Crown className="w-5 h-5" />,
        border: 'border-amber-300',
        glow: 'shadow-lg shadow-amber-200 dark:shadow-amber-900/50'
    },
    2: {
        bg: 'bg-gradient-to-r from-gray-300 to-gray-400',
        text: 'text-white',
        icon: <Medal className="w-5 h-5" />,
        border: 'border-gray-300',
        glow: 'shadow-md'
    },
    3: {
        bg: 'bg-gradient-to-r from-orange-400 to-amber-600',
        text: 'text-white',
        icon: <Trophy className="w-5 h-5" />,
        border: 'border-orange-300',
        glow: 'shadow-md'
    }
};

export function ChallengeLeaderboard({
    sectorId,
    challengeId,
    targetCount,
    limit = 10,
    showUserRank = true,
    compact = false,
    onUserClick
}: ChallengeLeaderboardProps) {
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const response = await getChallengeLeaderboard(sectorId, challengeId, limit);
                if (response.success && response.data) {
                    setData(response.data);
                } else {
                    setError('Leaderboard yüklenemedi');
                }
            } catch (err) {
                setError('Bir hata olustu');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [sectorId, challengeId, limit]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="text-center py-8 text-gray-500">
                {error || 'Veri bulunamadi'}
            </div>
        );
    }

    const { leaderboard, userRank } = data;

    if (compact) {
        return (
            <div className="space-y-2">
                {leaderboard.slice(0, 5).map((entry, index) => (
                    <CompactLeaderboardRow
                        key={entry.user_id}
                        entry={entry}
                        targetCount={targetCount}
                        index={index}
                    />
                ))}

                {userRank && !userRank.isInTop && (
                    <>
                        <div className="text-center text-gray-400 text-xs py-1">...</div>
                        <CompactLeaderboardRow
                            entry={{
                                user_id: 0,
                                username: 'Sen',
                                progress: userRank.progress,
                                rank: userRank.rank
                            }}
                            targetCount={targetCount}
                            isCurrentUser
                        />
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Siralama
                </h3>
            </div>

            {/* Leaderboard */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                <AnimatePresence>
                    {leaderboard.map((entry, index) => (
                        <LeaderboardRow
                            key={entry.user_id}
                            entry={entry}
                            targetCount={targetCount}
                            index={index}
                            onClick={() => onUserClick?.(entry.user_id)}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* User's Position (if not in top) */}
            {showUserRank && userRank && !userRank.isInTop && (
                <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-center text-xs text-gray-500">
                        ...
                    </div>
                    <div className="p-4 bg-teal-50 dark:bg-teal-900/20">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm">
                                {userRank.rank}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-teal-500" />
                                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                                        Sen
                                    </span>
                                </div>
                                <div className="mt-1 h-2 bg-teal-100 dark:bg-teal-900/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-teal-500 rounded-full"
                                        style={{ width: `${(userRank.progress / targetCount) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-teal-600">{userRank.progress}/{targetCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {leaderboard.length === 0 && (
                <div className="p-8 text-center">
                    <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Henüz katilimci yok</p>
                    <p className="text-sm text-gray-400 mt-1">
                        İlk katilan sen ol!
                    </p>
                </div>
            )}
        </div>
    );
}

interface LeaderboardRowProps {
    entry: LeaderboardEntry;
    targetCount: number;
    index: number;
    isCurrentUser?: boolean;
    onClick?: () => void;
}

function LeaderboardRow({ entry, targetCount, index, isCurrentUser, onClick }: LeaderboardRowProps) {
    const rank = entry.rank;
    const rankStyle = RANK_STYLES[rank as keyof typeof RANK_STYLES];
    const progressPercentage = (entry.progress / targetCount) * 100;
    const isCompleted = entry.progress >= targetCount;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                isCurrentUser ? 'bg-teal-50 dark:bg-teal-900/20' : ''
            }`}
            onClick={onClick}
        >
            {/* Rank */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                rankStyle
                    ? `${rankStyle.bg} ${rankStyle.text} ${rankStyle.glow}`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
                {rankStyle ? rankStyle.icon : rank}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {entry.avatar_url ? (
                        <Image
                            src={entry.avatar_url}
                            alt={entry.username}
                            width={24}
                            height={24}
                            className="rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <User className="w-3 h-3 text-gray-400" />
                        </div>
                    )}
                    <span className={`font-medium truncate ${
                        isCurrentUser
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-gray-900 dark:text-white'
                    }`}>
                        {entry.username}
                    </span>
                    {isCompleted && (
                        <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-xs text-green-600">
                            <Sparkles className="w-3 h-3 inline" />
                        </span>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        className={`h-full rounded-full ${
                            isCompleted
                                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                                : rank === 1
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                                : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                        }`}
                    />
                </div>
            </div>

            {/* Progress */}
            <div className="text-right">
                <p className={`font-bold ${
                    isCompleted ? 'text-green-600' : 'text-gray-900 dark:text-white'
                }`}>
                    {entry.progress}
                </p>
                <p className="text-xs text-gray-400">/{targetCount}</p>
            </div>
        </motion.div>
    );
}

function CompactLeaderboardRow({
    entry,
    targetCount,
    index = 0,
    isCurrentUser
}: {
    entry: LeaderboardEntry;
    targetCount: number;
    index?: number;
    isCurrentUser?: boolean;
}) {
    const rank = entry.rank;
    const rankStyle = RANK_STYLES[rank as keyof typeof RANK_STYLES];

    return (
        <div className={`flex items-center gap-3 p-2 rounded-lg ${
            isCurrentUser ? 'bg-teal-50 dark:bg-teal-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
        }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                rankStyle
                    ? `${rankStyle.bg} ${rankStyle.text}`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
            }`}>
                {rank}
            </div>
            <span className={`flex-1 text-sm truncate ${
                isCurrentUser ? 'font-semibold text-teal-600' : 'text-gray-700 dark:text-gray-300'
            }`}>
                {entry.username}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
                {entry.progress}
            </span>
        </div>
    );
}

export default ChallengeLeaderboard;
