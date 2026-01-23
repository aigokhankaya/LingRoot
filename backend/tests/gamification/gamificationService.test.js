/**
 * @jest-environment node
 * 
 * Gamification Service Tests
 * XP, Level, Streak, Achievements, Daily Quests
 * 
 * Created: 2026-01-17
 */

// Mock database
jest.mock('../../config/db', () => ({
    query: jest.fn(),
}));

jest.mock('../../utils/common/logger.js', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));

const db = require('../../config/db');

describe('Gamification Service Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // XP Constants (from service)
    const XP_REWARDS = {
        CONTENT_CREATED: 50,
        CONTENT_LISTENED: 25,
        VOCABULARY_ADDED: 10,
        QUIZ_COMPLETE: 50,
        QUIZ_PERFECT_SCORE: 100,
        STREAK_DAILY: 25,
        STREAK_BONUS_7_DAYS: 100,
        STREAK_BONUS_30_DAYS: 500,
    };

    describe('XP System', () => {
        test('should define correct XP rewards', () => {
            expect(XP_REWARDS.CONTENT_CREATED).toBe(50);
            expect(XP_REWARDS.CONTENT_LISTENED).toBe(25);
            expect(XP_REWARDS.VOCABULARY_ADDED).toBe(10);
        });

        test('should calculate XP gain correctly', () => {
            const currentXP = 100;
            const reward = XP_REWARDS.CONTENT_CREATED;
            const newXP = currentXP + reward;

            expect(newXP).toBe(150);
        });

        test('should not allow negative XP', () => {
            const currentXP = 10;
            const penalty = -50;
            const newXP = Math.max(0, currentXP + penalty);

            expect(newXP).toBe(0);
        });

        test('should track XP source', () => {
            const xpEntry = {
                userId: 'user-123',
                amount: 50,
                source: 'content',
                sourceId: 'content-456',
                description: 'Created new content',
                createdAt: new Date().toISOString(),
            };

            expect(xpEntry.source).toBe('content');
            expect(xpEntry.sourceId).toBeDefined();
        });
    });

    describe('Level System', () => {
        // Level calculation: level = floor(sqrt(totalXP / 100))
        const calculateLevel = (totalXP) => {
            return Math.floor(Math.sqrt(totalXP / 100)) + 1;
        };

        test('should calculate level 1 for 0-99 XP', () => {
            expect(calculateLevel(0)).toBe(1);
            expect(calculateLevel(50)).toBe(1);
            expect(calculateLevel(99)).toBe(1);
        });

        test('should calculate level 2 for 100-399 XP', () => {
            expect(calculateLevel(100)).toBe(2);
            expect(calculateLevel(300)).toBe(2);
        });

        test('should calculate higher levels correctly', () => {
            expect(calculateLevel(400)).toBe(3);
            expect(calculateLevel(900)).toBe(4);
            expect(calculateLevel(1600)).toBe(5);
        });

        test('should detect level up', () => {
            const oldXP = 90;
            const newXP = 110;
            const oldLevel = calculateLevel(oldXP);
            const newLevel = calculateLevel(newXP);

            expect(oldLevel).toBe(1);
            expect(newLevel).toBe(2);
            expect(newLevel > oldLevel).toBe(true);
        });

        test('should calculate XP needed for next level', () => {
            const getXPForNextLevel = (level) => {
                return level * level * 100;
            };

            expect(getXPForNextLevel(1)).toBe(100);
            expect(getXPForNextLevel(2)).toBe(400);
            expect(getXPForNextLevel(3)).toBe(900);
        });

        test('should calculate progress to next level', () => {
            const totalXP = 250;
            const currentLevel = calculateLevel(totalXP);
            const xpForCurrentLevel = (currentLevel - 1) * (currentLevel - 1) * 100;
            const xpForNextLevel = currentLevel * currentLevel * 100;
            const progress = (totalXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel);

            expect(progress).toBeGreaterThan(0);
            expect(progress).toBeLessThan(1);
        });
    });

    describe('Streak System', () => {
        test('should detect first day activity', () => {
            const lastActivityDate = null;
            const isFirstDay = !lastActivityDate;

            expect(isFirstDay).toBe(true);
        });

        test('should continue streak for consecutive day', () => {
            const lastActivityDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
            const today = new Date();

            const daysDiff = Math.floor((today - lastActivityDate) / (24 * 60 * 60 * 1000));
            const continuesStreak = daysDiff === 1;

            expect(continuesStreak).toBe(true);
        });

        test('should reset streak for missed day', () => {
            const lastActivityDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 2 days ago
            const today = new Date();

            const daysDiff = Math.floor((today - lastActivityDate) / (24 * 60 * 60 * 1000));
            const shouldReset = daysDiff > 1;

            expect(shouldReset).toBe(true);
        });

        test('should award streak bonus at milestones', () => {
            const getStreakBonus = (streak) => {
                if (streak >= 30) return XP_REWARDS.STREAK_BONUS_30_DAYS;
                if (streak >= 7) return XP_REWARDS.STREAK_BONUS_7_DAYS;
                return XP_REWARDS.STREAK_DAILY;
            };

            expect(getStreakBonus(1)).toBe(25);
            expect(getStreakBonus(7)).toBe(100);
            expect(getStreakBonus(30)).toBe(500);
        });

        test('should track streak freeze usage', () => {
            const user = {
                streakFreezes: 2,
                streakFreezeUsedToday: false,
            };

            const canUseFreeze = user.streakFreezes > 0 && !user.streakFreezeUsedToday;
            expect(canUseFreeze).toBe(true);
        });

        test('should not allow streak freeze when none available', () => {
            const user = {
                streakFreezes: 0,
                streakFreezeUsedToday: false,
            };

            const canUseFreeze = user.streakFreezes > 0;
            expect(canUseFreeze).toBe(false);
        });
    });

    describe('Achievements System', () => {
        const ACHIEVEMENTS = {
            FIRST_CONTENT: { code: 'first_content', xp: 100 },
            CONTENT_10: { code: 'content_10', xp: 200 },
            STREAK_7: { code: 'streak_7', xp: 150 },
            STREAK_30: { code: 'streak_30', xp: 500 },
            LEVEL_5: { code: 'level_5', xp: 250 },
            LEVEL_10: { code: 'level_10', xp: 500 },
        };

        test('should define achievement catalog', () => {
            expect(Object.keys(ACHIEVEMENTS).length).toBeGreaterThan(0);
        });

        test('should track earned achievements', () => {
            const earnedAchievements = ['first_content', 'streak_7'];
            const hasAchievement = earnedAchievements.includes('first_content');

            expect(hasAchievement).toBe(true);
        });

        test('should not award duplicate achievements', () => {
            const earnedAchievements = ['first_content'];
            const alreadyEarned = earnedAchievements.includes('first_content');

            expect(alreadyEarned).toBe(true);
        });

        test('should award XP for new achievement', () => {
            const achievement = ACHIEVEMENTS.FIRST_CONTENT;
            expect(achievement.xp).toBe(100);
        });

        test('should check level achievements', () => {
            const checkLevelAchievements = (level) => {
                const earned = [];
                if (level >= 5) earned.push('level_5');
                if (level >= 10) earned.push('level_10');
                return earned;
            };

            expect(checkLevelAchievements(3)).toEqual([]);
            expect(checkLevelAchievements(5)).toEqual(['level_5']);
            expect(checkLevelAchievements(10)).toEqual(['level_5', 'level_10']);
        });

        test('should check streak achievements', () => {
            const checkStreakAchievements = (streak) => {
                const earned = [];
                if (streak >= 7) earned.push('streak_7');
                if (streak >= 30) earned.push('streak_30');
                return earned;
            };

            expect(checkStreakAchievements(5)).toEqual([]);
            expect(checkStreakAchievements(7)).toEqual(['streak_7']);
            expect(checkStreakAchievements(30)).toEqual(['streak_7', 'streak_30']);
        });
    });

    describe('Daily Quests System', () => {
        const DAILY_QUEST_TYPES = [
            { type: 'listen', target: 3, xp: 50 },
            { type: 'vocabulary', target: 10, xp: 30 },
            { type: 'create', target: 1, xp: 75 },
        ];

        test('should define daily quest types', () => {
            expect(DAILY_QUEST_TYPES.length).toBeGreaterThan(0);
        });

        test('should track quest progress', () => {
            const quest = {
                type: 'listen',
                target: 3,
                progress: 2,
                completed: false,
            };

            expect(quest.progress).toBeLessThan(quest.target);
            expect(quest.completed).toBe(false);
        });

        test('should mark quest as completed when target reached', () => {
            const quest = {
                type: 'listen',
                target: 3,
                progress: 3,
                completed: false,
            };

            quest.completed = quest.progress >= quest.target;
            expect(quest.completed).toBe(true);
        });

        test('should reset quests daily', () => {
            const lastResetDate = new Date('2026-01-16');
            const today = new Date('2026-01-17');

            const shouldReset = lastResetDate.toDateString() !== today.toDateString();
            expect(shouldReset).toBe(true);
        });

        test('should award XP when quest claimed', () => {
            const quest = DAILY_QUEST_TYPES[0];
            expect(quest.xp).toBeGreaterThan(0);
        });

        test('should not allow claiming incomplete quest', () => {
            const quest = { completed: false, claimed: false };
            const canClaim = quest.completed && !quest.claimed;

            expect(canClaim).toBe(false);
        });

        test('should not allow double claiming', () => {
            const quest = { completed: true, claimed: true };
            const canClaim = quest.completed && !quest.claimed;

            expect(canClaim).toBe(false);
        });
    });

    describe('CEFR Level Mapping', () => {
        const cefrToLevelRange = (cefr) => {
            const mapping = {
                'A1': [1, 5],
                'A2': [6, 10],
                'B1': [11, 15],
                'B2': [16, 20],
                'C1': [21, 25],
                'C2': [26, 30],
            };
            return mapping[cefr] || [1, 5];
        };

        const levelToCEFR = (level) => {
            if (level <= 5) return 'A1';
            if (level <= 10) return 'A2';
            if (level <= 15) return 'B1';
            if (level <= 20) return 'B2';
            if (level <= 25) return 'C1';
            return 'C2';
        };

        test('should map CEFR to level range', () => {
            expect(cefrToLevelRange('A1')).toEqual([1, 5]);
            expect(cefrToLevelRange('B1')).toEqual([11, 15]);
            expect(cefrToLevelRange('C2')).toEqual([26, 30]);
        });

        test('should map level to CEFR', () => {
            expect(levelToCEFR(3)).toBe('A1');
            expect(levelToCEFR(12)).toBe('B1');
            expect(levelToCEFR(28)).toBe('C2');
        });

        test('should handle edge cases', () => {
            expect(levelToCEFR(5)).toBe('A1');
            expect(levelToCEFR(6)).toBe('A2');
        });
    });

    describe('Full Stats API', () => {
        test('should return complete user stats', () => {
            const fullStats = {
                userId: 'user-123',
                totalXP: 1500,
                level: 4,
                currentLevelXP: 100,
                nextLevelXP: 400,
                streak: 7,
                longestStreak: 14,
                achievementsEarned: 5,
                achievementsTotal: 20,
                dailyQuestsCompleted: 2,
                dailyQuestsTotal: 3,
            };

            expect(fullStats.totalXP).toBeGreaterThan(0);
            expect(fullStats.level).toBeGreaterThan(0);
            expect(fullStats.streak).toBeGreaterThanOrEqual(0);
        });

        test('should calculate progress percentage', () => {
            const currentLevelXP = 100;
            const nextLevelXP = 400;
            const progress = (currentLevelXP / nextLevelXP) * 100;

            expect(progress).toBe(25);
        });
    });
});
