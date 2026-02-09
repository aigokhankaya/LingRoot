/**
 * 🎮 Gamification Hook
 * 
 * XP, Level, Streak ve Achievement verilerini yönetir.
 * Animasyonlu kutlamaları tetikler.
 */

import { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface GamificationStats {
    level: number;
    totalXP: number;
    currentLevelXP: number;
    xpForNextLevel: number;
    levelProgress: number;
    streak: number;
    longestStreak: number;
    freezeBalance: number;
    archetype: string | null;
    onboardingCompleted: boolean;
    achievementProgress: string;
    recentAchievements: Achievement[];
    dailyQuests: DailyQuest[];
    dailyQuestsCompleted: number;
}

export interface Achievement {
    id: number;
    code: string;
    title_tr: string;
    description_tr: string;
    icon_emoji: string;
    xp_reward: number;
    rarity: string;
    is_earned: boolean;
    earned_at?: string;
}

export interface DailyQuest {
    id: string;
    task_type: string;
    task_title: string;
    description?: string;  // Görevin nasıl tamamlanacağına dair açıklama
    target_amount: number;
    current_amount: number;
    xp_reward: number;
    is_completed: boolean;
    is_claimed: boolean;
    parent_quest_node_id?: number;
}

export interface XPResult {
    xpAdded: number;
    totalXP: number;
    currentLevel: number;
    leveledUp: boolean;
    levelsGained: number;
    earnedAchievements: Achievement[];
}

// Konfeti efektleri
const fireCelebration = (type: 'levelUp' | 'achievement' | 'streak' | 'quest') => {
    const colors = {
        levelUp: ['#FFD700', '#FFA500', '#FF6347'],
        achievement: ['#9333EA', '#7C3AED', '#6366F1'],
        streak: ['#F97316', '#EF4444', '#DC2626'],
        quest: ['#10B981', '#059669', '#047857']
    };

    // Ana patlama
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: colors[type]
    });

    // Yan patlamalar
    setTimeout(() => {
        confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors[type]
        });
        confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors[type]
        });
    }, 200);
};

// Ses efektleri
const playSound = (type: 'xp' | 'levelUp' | 'achievement') => {
    try {
        const sounds = {
            xp: '/sounds/xp-gain.mp3',
            levelUp: '/sounds/level-up.mp3',
            achievement: '/sounds/achievement.mp3'
        };

        const audio = new Audio(sounds[type]);
        audio.volume = 0.3;
        audio.play().catch(() => { }); // Ses çalamasa bile hata verme
    } catch (e) {
        // Ses yok, sorun değil
    }
};

export function useGamification() {
    const [stats, setStats] = useState<GamificationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Level up modal state
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [levelUpData, setLevelUpData] = useState<{ oldLevel: number; newLevel: number } | null>(null);

    // Achievement modal state
    const [showAchievement, setShowAchievement] = useState(false);
    const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);

    // Token helper
    const getToken = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('lingroot_token');
        }
        return null;
    };

    // Stats yükle
    const fetchStats = useCallback(async () => {
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/gamification/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Stats alınamadı');

            const data = await response.json();
            if (data.success) {
                setStats(data.data);

                // Backend-localStorage senkronizasyonu (single source of truth)
                if (data.data?.onboardingCompleted === true) {
                    localStorage.setItem('onboarding_completed', 'true');
                } else {
                    localStorage.removeItem('onboarding_completed');
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // İlk yükleme
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Streak check-in
    const checkIn = useCallback(async () => {
        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE}/api/gamification/streak/checkin`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                await fetchStats();

                // Streak bonusu varsa kutla
                if (data.data.streakBonus > 0) {
                    fireCelebration('streak');
                    playSound('xp');
                }
            }
        } catch (err) {
            console.error('Check-in failed:', err);
        }
    }, [fetchStats]);

    // XP ekle ve animasyonları tetikle
    const addXP = useCallback(async (amount: number, source: string, sourceId?: string): Promise<XPResult | null> => {
        const token = getToken();
        if (!token) return null;

        try {
            const response = await fetch(`${API_BASE}/api/gamification/xp`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount, source, sourceId })
            });

            const data = await response.json();
            if (data.success) {
                const result: XPResult = data.data;

                // XP sesi
                playSound('xp');

                // Level atladıysa
                if (result.leveledUp) {
                    setLevelUpData({
                        oldLevel: result.currentLevel - result.levelsGained,
                        newLevel: result.currentLevel
                    });
                    setShowLevelUp(true);
                    fireCelebration('levelUp');
                    playSound('levelUp');
                }

                // Achievement kazandıysa
                if (result.earnedAchievements?.length > 0) {
                    setNewAchievement(result.earnedAchievements[0]);
                    setShowAchievement(true);
                    fireCelebration('achievement');
                    playSound('achievement');
                }

                await fetchStats();
                return result;
            }
        } catch (err) {
            console.error('XP add failed:', err);
        }
        return null;
    }, [fetchStats]);

    // Quest tamamla
    const completeQuest = useCallback(async (nodeId: number, score?: number) => {
        const token = getToken();
        if (!token) return null;

        try {
            const response = await fetch(`${API_BASE}/api/gamification/quests/${nodeId}/complete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ score })
            });

            const data = await response.json();
            if (data.success) {
                fireCelebration('quest');
                await fetchStats();
                return data.data;
            }
        } catch (err) {
            console.error('Quest complete failed:', err);
        }
        return null;
    }, [fetchStats]);

    // Günlük görev ödülü al
    const claimDailyQuest = useCallback(async (questId: string) => {
        const token = getToken();
        if (!token) return null;

        try {
            const response = await fetch(`${API_BASE}/api/gamification/daily-quests/${questId}/claim`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                fireCelebration('quest');
                playSound('xp');
                await fetchStats();
                return data;
            }
        } catch (err) {
            console.error('Claim quest failed:', err);
        }
        return null;
    }, [fetchStats]);

    // Modal kapatma
    const closeLevelUp = () => {
        setShowLevelUp(false);
        setLevelUpData(null);
    };

    const closeAchievement = () => {
        setShowAchievement(false);
        setNewAchievement(null);
    };

    return {
        stats,
        loading,
        error,

        // Actions
        fetchStats,
        checkIn,
        addXP,
        completeQuest,
        claimDailyQuest,

        // Celebration modals
        showLevelUp,
        levelUpData,
        closeLevelUp,
        showAchievement,
        newAchievement,
        closeAchievement,

        // Utilities
        fireCelebration,
        playSound
    };
}

// Level'i CEFR'e çevir
export function levelToCEFR(level: number): string {
    if (level <= 10) return 'A1';
    if (level <= 25) return 'A2';
    if (level <= 45) return 'B1';
    if (level <= 65) return 'B2';
    if (level <= 85) return 'C1';
    return 'C2';
}

// Rarity renklerini al
export function getRarityColor(rarity: string): string {
    const colors: Record<string, string> = {
        common: '#9CA3AF',
        rare: '#3B82F6',
        epic: '#8B5CF6',
        legendary: '#F59E0B'
    };
    return colors[rarity] || colors.common;
}
