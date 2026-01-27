'use client';

/**
 * Sector Achievement Hub
 *
 * Tüm sektör achievement'larını gösteren hub.
 * Kategoriler, filtreler, ilerleme özeti.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    X,
    Loader2,
    Star,
    Sparkles,
    Gamepad2,
    Swords,
    Theater,
    Headphones,
    GraduationCap,
    Flame,
    Filter,
    ChevronRight
} from 'lucide-react';
import SectorAchievementCard, { Achievement } from './SectorAchievementCard';

interface SectorAchievementHubProps {
    sectorId?: number;
    onClose?: () => void;
}

type CategoryType = 'all' | 'game' | 'challenge' | 'roleplay' | 'podcast' | 'mastery' | 'special';
type FilterType = 'all' | 'earned' | 'unearned';

const CATEGORIES: { id: CategoryType; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Tümü', icon: <Trophy className="w-4 h-4" /> },
    { id: 'game', label: 'Oyun', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'challenge', label: 'Challenge', icon: <Swords className="w-4 h-4" /> },
    { id: 'roleplay', label: 'Roleplay', icon: <Theater className="w-4 h-4" /> },
    { id: 'podcast', label: 'Podcast', icon: <Headphones className="w-4 h-4" /> },
    { id: 'mastery', label: 'Ustalık', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'special', label: 'Özel', icon: <Flame className="w-4 h-4" /> }
];

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'common'];

export function SectorAchievementHub({ sectorId, onClose }: SectorAchievementHubProps) {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

    useEffect(() => {
        fetchAchievements();
    }, [sectorId]);

    const fetchAchievements = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('lingroot_token');
            const url = sectorId
                ? `/api/gamification/achievements?sectorId=${sectorId}`
                : '/api/gamification/achievements';

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success && data.data) {
                setAchievements(data.data);
            }
        } catch (error) {
            console.error('Error fetching achievements:', error);
        } finally {
            setLoading(false);
        }
    };

    // Stats
    const earnedCount = achievements.filter(a => a.is_earned).length;
    const totalCount = achievements.length;
    const earnedXP = achievements.filter(a => a.is_earned).reduce((sum, a) => sum + a.xp_reward, 0);

    // Rarity counts
    const rarityCounts = {
        legendary: achievements.filter(a => a.rarity === 'legendary' && a.is_earned).length,
        epic: achievements.filter(a => a.rarity === 'epic' && a.is_earned).length,
        rare: achievements.filter(a => a.rarity === 'rare' && a.is_earned).length,
        common: achievements.filter(a => a.rarity === 'common' && a.is_earned).length
    };

    // Filtered achievements
    const filteredAchievements = achievements
        .filter(a => {
            if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
            if (filter === 'earned' && !a.is_earned) return false;
            if (filter === 'unearned' && a.is_earned) return false;
            return true;
        })
        .sort((a, b) => {
            // Earned first, then by rarity
            if (a.is_earned !== b.is_earned) return a.is_earned ? -1 : 1;
            return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
        });

    // Recent achievements
    const recentAchievements = achievements
        .filter(a => a.is_earned && a.earned_at)
        .sort((a, b) => new Date(b.earned_at!).getTime() - new Date(a.earned_at!).getTime())
        .slice(0, 3);

    const handleAchievementClick = (achievement: Achievement) => {
        setSelectedAchievement(achievement);
    };

    // Achievement Detail Modal
    if (selectedAchievement) {
        return (
            <AchievementDetailModal
                achievement={selectedAchievement}
                onClose={() => setSelectedAchievement(null)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
            {/* Header */}
            <div className="max-w-5xl mx-auto mb-8">
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
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                        <Trophy className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Başarımlar
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Kazandığın başarımları keşfet
                    </p>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        icon={<Trophy className="w-5 h-5" />}
                        label="Kazanılan"
                        value={`${earnedCount}/${totalCount}`}
                        color="text-green-500"
                        bgColor="bg-green-50 dark:bg-green-900/20"
                    />
                    <StatCard
                        icon={<Sparkles className="w-5 h-5" />}
                        label="XP Kazanıldı"
                        value={`+${earnedXP}`}
                        color="text-amber-500"
                        bgColor="bg-amber-50 dark:bg-amber-900/20"
                    />
                    <StatCard
                        icon={<Star className="w-5 h-5" />}
                        label="Efsanevi"
                        value={rarityCounts.legendary}
                        color="text-orange-500"
                        bgColor="bg-orange-50 dark:bg-orange-900/20"
                    />
                    <StatCard
                        icon={<Flame className="w-5 h-5" />}
                        label="Epik"
                        value={rarityCounts.epic}
                        color="text-purple-500"
                        bgColor="bg-purple-50 dark:bg-purple-900/20"
                    />
                </div>

                {/* Recent Achievements */}
                {recentAchievements.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            Son Kazanılanlar
                        </h3>
                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {recentAchievements.map(achievement => (
                                <motion.div
                                    key={achievement.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex-shrink-0 w-48"
                                >
                                    <SectorAchievementCard
                                        achievement={achievement}
                                        onClick={handleAchievementClick}
                                        compact
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Categories */}
            <div className="max-w-5xl mx-auto mb-6">
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {CATEGORIES.map(category => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                                selectedCategory === category.id
                                    ? 'bg-teal-500 text-white shadow-lg'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {category.icon}
                            {category.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filter */}
            <div className="max-w-5xl mx-auto mb-6">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        {[
                            { id: 'all' as FilterType, label: 'Tümü' },
                            { id: 'earned' as FilterType, label: 'Kazanılan' },
                            { id: 'unearned' as FilterType, label: 'Kazanılmayan' }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                    filter === f.id
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Achievements Grid */}
            <div className="max-w-5xl mx-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                    </div>
                ) : filteredAchievements.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {filteredAchievements.map((achievement, index) => (
                                <motion.div
                                    key={achievement.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <SectorAchievementCard
                                        achievement={achievement}
                                        onClick={handleAchievementClick}
                                        showProgress
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Başarım bulunamadı
                        </h3>
                        <p className="text-gray-500">
                            Bu kategoride henüz başarım yok
                        </p>
                    </div>
                )}
            </div>

            {/* Tips */}
            <div className="max-w-5xl mx-auto mt-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500" />
                        Başarım İpuçları
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li className="flex items-start gap-2">
                            <span className="text-amber-500">•</span>
                            Efsanevi başarımlar en fazla XP verir
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-purple-500">•</span>
                            Challenge'larda 1. olarak Şampiyon rozetini kazan
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            Tüm oyun modlarını deneyerek çeşitli başarımlar aç
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500">•</span>
                            Günün farklı saatlerinde çalışarak özel başarımlar kazan
                        </li>
                    </ul>
                </div>
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

interface AchievementDetailModalProps {
    achievement: Achievement;
    onClose: () => void;
}

function AchievementDetailModal({ achievement, onClose }: AchievementDetailModalProps) {
    const RARITY_CONFIG = {
        common: { label: 'Yaygın', gradient: 'from-gray-400 to-gray-500', color: 'text-gray-500' },
        rare: { label: 'Nadir', gradient: 'from-blue-400 to-blue-600', color: 'text-blue-500' },
        epic: { label: 'Epik', gradient: 'from-purple-400 to-purple-600', color: 'text-purple-500' },
        legendary: { label: 'Efsanevi', gradient: 'from-amber-400 to-orange-500', color: 'text-amber-500' }
    };

    const config = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl overflow-hidden"
            >
                {/* Header */}
                <div className={`relative bg-gradient-to-br ${config.gradient} p-8 text-center text-white`}>
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                        className="w-24 h-24 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center text-5xl"
                    >
                        {achievement.icon_emoji}
                    </motion.div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold mb-2">{achievement.title_tr}</h2>

                    {/* Rarity */}
                    <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                        {config.label}
                    </span>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                        {achievement.description_tr}
                    </p>

                    {/* XP Reward */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-6 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            <span className="text-2xl font-bold text-amber-600">+{achievement.xp_reward} XP</span>
                        </div>
                        <p className="text-sm text-gray-500">Bu başarımdan kazanılan XP</p>
                    </div>

                    {/* Earned Status */}
                    {achievement.is_earned ? (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-green-600">
                                <Trophy className="w-5 h-5" />
                                <span className="font-semibold">Kazanıldı!</span>
                            </div>
                            {achievement.earned_at && (
                                <p className="text-sm text-gray-500 mt-1">
                                    {new Date(achievement.earned_at).toLocaleDateString('tr-TR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                            <p className="text-gray-500">Henüz kazanılmadı</p>
                            {achievement.progress !== undefined && achievement.target && (
                                <div className="mt-3">
                                    <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full bg-gradient-to-r ${config.gradient}`}
                                            style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {achievement.progress}/{achievement.target}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6">
                    <button
                        onClick={onClose}
                        className={`w-full py-3 bg-gradient-to-r ${config.gradient} text-white font-semibold rounded-xl`}
                    >
                        Tamam
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default SectorAchievementHub;
