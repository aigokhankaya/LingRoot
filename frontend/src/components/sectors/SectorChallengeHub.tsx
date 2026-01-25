'use client';

/**
 * Sector Challenge Hub
 *
 * Tüm sektör challenge'larını gösteren ve yöneten ana hub.
 * Aktif challenge'lar, geçmiş başarılar ve istatistikler.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Target,
    Medal,
    Crown,
    X,
    Loader2,
    ChevronRight,
    Sparkles,
    Flame,
    Users,
    TrendingUp,
    Award,
    Calendar
} from 'lucide-react';
import {
    getSectorChallenges,
    getChallengeStats,
    SectorChallenge,
    ChallengeStats
} from '@/lib/api';
import SectorChallengeCard from './SectorChallengeCard';
import ChallengeLeaderboard from './ChallengeLeaderboard';

interface SectorChallengeHubProps {
    sectorId: number;
    sectorName: string;
    sectorIcon?: string;
    sectorColor?: string;
    onClose?: () => void;
}

type TabType = 'active' | 'completed' | 'stats';

export function SectorChallengeHub({
    sectorId,
    sectorName,
    sectorIcon = '💼',
    sectorColor = '#14B8A6',
    onClose
}: SectorChallengeHubProps) {
    const [activeTab, setActiveTab] = useState<TabType>('active');
    const [challenges, setChallenges] = useState<SectorChallenge[]>([]);
    const [stats, setStats] = useState<ChallengeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedChallenge, setSelectedChallenge] = useState<SectorChallenge | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [challengesRes, statsRes] = await Promise.all([
                    getSectorChallenges(sectorId, true),
                    getChallengeStats(sectorId)
                ]);

                if (challengesRes.success && challengesRes.data) {
                    setChallenges(challengesRes.data);
                }
                if (statsRes.success && statsRes.data) {
                    setStats(statsRes.data);
                }
            } catch (error) {
                console.error('Error fetching challenge data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [sectorId]);

    const activeChallenges = challenges.filter(c => !c.user_completed);
    const completedChallenges = challenges.filter(c => c.user_completed);

    const handleJoin = (challengeId: number) => {
        setChallenges(prev =>
            prev.map(c =>
                c.id === challengeId ? { ...c, user_joined: true } : c
            )
        );
    };

    const handleViewDetails = (challengeId: number) => {
        const challenge = challenges.find(c => c.id === challengeId);
        if (challenge) {
            setSelectedChallenge(challenge);
        }
    };

    // Challenge detail view
    if (selectedChallenge) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Back button */}
                    <button
                        onClick={() => setSelectedChallenge(null)}
                        className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        <ChevronRight className="w-5 h-5 rotate-180" />
                        <span>Geri</span>
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Challenge Card */}
                        <SectorChallengeCard
                            challenge={selectedChallenge}
                            sectorId={sectorId}
                            onJoin={handleJoin}
                        />

                        {/* Leaderboard */}
                        <ChallengeLeaderboard
                            sectorId={sectorId}
                            challengeId={selectedChallenge.id}
                            targetCount={selectedChallenge.target_count}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                    <div
                        className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center text-4xl"
                        style={{ backgroundColor: `${sectorColor}20` }}
                    >
                        <Trophy className="w-10 h-10" style={{ color: sectorColor }} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Challenge'lar
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {sectorName} challenge'larına katıl ve ödüller kazan
                    </p>
                </div>

                {/* Stats Summary */}
                {stats && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                    >
                        <StatCard
                            icon={<Trophy className="w-5 h-5" />}
                            label="Tamamlanan"
                            value={stats.total_completed}
                            color="text-green-500"
                            bgColor="bg-green-50 dark:bg-green-900/20"
                        />
                        <StatCard
                            icon={<Sparkles className="w-5 h-5" />}
                            label="Kazanılan XP"
                            value={stats.total_xp_earned}
                            color="text-amber-500"
                            bgColor="bg-amber-50 dark:bg-amber-900/20"
                        />
                        <StatCard
                            icon={<Medal className="w-5 h-5" />}
                            label="En İyi Sıra"
                            value={stats.best_rank > 0 ? `#${stats.best_rank}` : '-'}
                            color="text-purple-500"
                            bgColor="bg-purple-50 dark:bg-purple-900/20"
                        />
                        <StatCard
                            icon={<TrendingUp className="w-5 h-5" />}
                            label="Kazanma Oranı"
                            value={`${Math.round(stats.win_rate)}%`}
                            color="text-blue-500"
                            bgColor="bg-blue-50 dark:bg-blue-900/20"
                        />
                    </motion.div>
                )}
            </div>

            {/* Tabs */}
            <div className="max-w-4xl mx-auto mb-6">
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    <TabButton
                        active={activeTab === 'active'}
                        onClick={() => setActiveTab('active')}
                        icon={<Target className="w-4 h-4" />}
                        label="Aktif"
                        count={activeChallenges.length}
                    />
                    <TabButton
                        active={activeTab === 'completed'}
                        onClick={() => setActiveTab('completed')}
                        icon={<Award className="w-4 h-4" />}
                        label="Tamamlanan"
                        count={completedChallenges.length}
                    />
                    <TabButton
                        active={activeTab === 'stats'}
                        onClick={() => setActiveTab('stats')}
                        icon={<TrendingUp className="w-4 h-4" />}
                        label="İstatistikler"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {activeTab === 'active' && (
                            <motion.div
                                key="active"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                {activeChallenges.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {activeChallenges.map(challenge => (
                                            <SectorChallengeCard
                                                key={challenge.id}
                                                challenge={challenge}
                                                sectorId={sectorId}
                                                onJoin={handleJoin}
                                                onViewDetails={handleViewDetails}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={<Target className="w-16 h-16" />}
                                        title="Aktif challenge yok"
                                        description="Yeni challenge'lar yakında eklenecek!"
                                    />
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'completed' && (
                            <motion.div
                                key="completed"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                {completedChallenges.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {completedChallenges.map(challenge => (
                                            <SectorChallengeCard
                                                key={challenge.id}
                                                challenge={challenge}
                                                sectorId={sectorId}
                                                onViewDetails={handleViewDetails}
                                                compact
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={<Trophy className="w-16 h-16" />}
                                        title="Henüz tamamlanan challenge yok"
                                        description="İlk challenge'ını tamamla ve buraya gelsin!"
                                    />
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'stats' && stats && (
                            <motion.div
                                key="stats"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                {/* Detailed Stats */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-blue-500" />
                                        Detaylı İstatistikler
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            <p className="text-sm text-gray-500 mb-1">Toplam Katılım</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {stats.total_joined}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            <p className="text-sm text-gray-500 mb-1">Tamamlama Oranı</p>
                                            <p className="text-2xl font-bold text-green-600">
                                                {stats.total_joined > 0
                                                    ? Math.round((stats.total_completed / stats.total_joined) * 100)
                                                    : 0}%
                                            </p>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            <p className="text-sm text-gray-500 mb-1">Aktif Challenge</p>
                                            <p className="text-2xl font-bold text-teal-600">
                                                {stats.active_challenges}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            <p className="text-sm text-gray-500 mb-1">En İyi Sıralama</p>
                                            <p className="text-2xl font-bold text-purple-600">
                                                {stats.best_rank > 0 ? `#${stats.best_rank}` : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* XP Earned Chart Placeholder */}
                                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                                            <Sparkles className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="text-white/80 text-sm">Challenge'lardan Kazanılan</p>
                                            <p className="text-3xl font-bold">+{stats.total_xp_earned} XP</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Tips */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                                    <h4 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                        <Flame className="w-5 h-5 text-orange-500" />
                                        Challenge İpuçları
                                    </h4>
                                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                        <li className="flex items-start gap-2">
                                            <span className="text-teal-500">•</span>
                                            Her hafta yeni challenge'lar eklenir
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500">•</span>
                                            Top 3'e girerek ekstra XP kazan
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-amber-500">•</span>
                                            Zor challenge'lar daha fazla XP verir
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500">•</span>
                                            Challenge'ları erken tamamla, sıralamada yüksel!
                                        </li>
                                    </ul>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Weekly Challenge Banner */}
            <div className="max-w-4xl mx-auto mt-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl p-6 text-white"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                            <Calendar className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1">Haftalık Challenge</h3>
                            <p className="text-white/80 text-sm">
                                Her Pazartesi yeni challenge'lar başlar
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-white/70">Sonraki güncelleme</p>
                            <p className="font-bold">Pazartesi</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
    bgColor: string;
}

function StatCard({ icon, label, value, color, bgColor }: StatCardProps) {
    return (
        <div className={`p-4 rounded-xl ${bgColor}`}>
            <div className={`mb-2 ${color}`}>{icon}</div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
        </div>
    );
}

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    count?: number;
}

function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
                active
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
            {icon}
            <span>{label}</span>
            {count !== undefined && count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-teal-100 text-teal-600' : 'bg-gray-200 dark:bg-gray-600 text-gray-500'
                }`}>
                    {count}
                </span>
            )}
        </button>
    );
}

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

function EmptyState({ icon, title, description }: EmptyStateProps) {
    return (
        <div className="text-center py-16">
            <div className="text-gray-300 dark:text-gray-600 mb-4 flex justify-center">
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {title}
            </h3>
            <p className="text-gray-500">{description}</p>
        </div>
    );
}

export default SectorChallengeHub;
