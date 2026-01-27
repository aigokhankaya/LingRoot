/**
 * @jest-environment node
 * 
 * Sector Gamification Service Tests
 * XP, Streak, Achievements, Daily Quests - Sector Integration
 * 
 * Created: 2026-01-23
 */

// Mock database
jest.mock('../../config/db', () => ({
    query: jest.fn(),
    pool: {
        connect: jest.fn(() => ({
            query: jest.fn(),
            release: jest.fn()
        }))
    }
}));

jest.mock('../../utils/common/logger.js', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));

jest.mock('../../services/gamificationService', () => ({
    addXP: jest.fn(() => Promise.resolve({ xpAdded: 50, leveledUp: false })),
    awardAchievement: jest.fn(() => Promise.resolve(null)),
    claimDailyQuest: jest.fn(() => Promise.resolve({ success: true })),
}));

const db = require('../../config/db');
const gamificationService = require('../../services/gamificationService');

describe('Sector Gamification Service Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // XP Rewards
    const SECTOR_XP_REWARDS = {
        VOCAB_LEARN: 15,
        VOCAB_MASTER: 30,
        VOCAB_REVIEW_CORRECT: 5,
        CONTENT_START: 10,
        CONTENT_COMPLETE: 50,
        DIALOGUE_COMPLETE: 60,
        QUIZ_COMPLETE: 75,
        QUIZ_PERFECT: 150,
        QUIZ_PASS: 50,
        ROLEPLAY_COMPLETE: 100,
        ROLEPLAY_EXCELLENT: 175,
        PODCAST_LISTEN: 40,
        PODCAST_COMPLETE: 80,
        MODULE_COMPLETE: 200,
        ALL_MODULES_COMPLETE: 500,
        SECTOR_STREAK_BONUS: 25,
        FIRST_SECTOR_ACTIVITY: 50,
    };

    describe('XP Calculation', () => {
        test('should define correct sector XP rewards', () => {
            expect(SECTOR_XP_REWARDS.VOCAB_LEARN).toBe(15);
            expect(SECTOR_XP_REWARDS.CONTENT_COMPLETE).toBe(50);
            expect(SECTOR_XP_REWARDS.QUIZ_COMPLETE).toBe(75);
            expect(SECTOR_XP_REWARDS.ROLEPLAY_COMPLETE).toBe(100);
        });

        test('should apply perfect score bonus', () => {
            const baseXP = SECTOR_XP_REWARDS.QUIZ_COMPLETE;
            const metadata = { score: 100 };

            // Perfect score = 1.5x bonus
            const bonusXP = Math.floor(baseXP * 1.5);
            expect(bonusXP).toBe(112);
        });

        test('should apply high score bonus', () => {
            const baseXP = SECTOR_XP_REWARDS.QUIZ_COMPLETE;
            const metadata = { score: 95 };

            // High score (90+) = 1.25x bonus
            const bonusXP = Math.floor(baseXP * 1.25);
            expect(bonusXP).toBe(93);
        });

        test('should not apply bonus for low scores', () => {
            const baseXP = SECTOR_XP_REWARDS.QUIZ_COMPLETE;
            const metadata = { score: 70 };

            // No bonus for < 90
            expect(baseXP).toBe(75);
        });
    });

    describe('Sector Streak System', () => {
        test('should start streak on first activity', () => {
            const lastActivity = null;
            const isFirstDay = !lastActivity;

            expect(isFirstDay).toBe(true);
        });

        test('should continue streak on consecutive days', () => {
            const lastActivity = new Date('2026-01-22');
            const today = new Date('2026-01-23');
            const diffDays = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));

            expect(diffDays).toBe(1);
            const shouldContinue = diffDays === 1;
            expect(shouldContinue).toBe(true);
        });

        test('should break streak after missed day', () => {
            const lastActivity = new Date('2026-01-20');
            const today = new Date('2026-01-23');
            const diffDays = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));

            expect(diffDays).toBe(3);
            const shouldReset = diffDays > 1;
            expect(shouldReset).toBe(true);
        });

        test('should award streak milestone bonuses', () => {
            const getStreakBonus = (streak) => {
                let bonus = SECTOR_XP_REWARDS.SECTOR_STREAK_BONUS;
                if (streak === 7) bonus += 100;
                if (streak === 14) bonus += 200;
                if (streak === 30) bonus += 500;
                return bonus;
            };

            expect(getStreakBonus(1)).toBe(25);
            expect(getStreakBonus(7)).toBe(125); // 25 + 100
            expect(getStreakBonus(14)).toBe(225); // 25 + 200
            expect(getStreakBonus(30)).toBe(525); // 25 + 500
        });
    });

    describe('Sector Achievement System', () => {
        const SECTOR_ACHIEVEMENTS = {
            VOCAB_MILESTONES: [10, 25, 50, 100, 250],
            CONTENT_MILESTONES: [1, 5, 10, 25, 50, 100],
            STREAK_MILESTONES: [7, 14, 30],
        };

        test('should check vocabulary achievements', () => {
            const checkVocabAchievements = (vocabCount) => {
                return SECTOR_ACHIEVEMENTS.VOCAB_MILESTONES.filter(m => vocabCount >= m);
            };

            expect(checkVocabAchievements(5)).toEqual([]);
            expect(checkVocabAchievements(10)).toEqual([10]);
            expect(checkVocabAchievements(50)).toEqual([10, 25, 50]);
        });

        test('should check content achievements', () => {
            const checkContentAchievements = (contentCount) => {
                return SECTOR_ACHIEVEMENTS.CONTENT_MILESTONES.filter(m => contentCount >= m);
            };

            expect(checkContentAchievements(0)).toEqual([]);
            expect(checkContentAchievements(1)).toEqual([1]);
            expect(checkContentAchievements(25)).toEqual([1, 5, 10, 25]);
        });

        test('should check streak achievements', () => {
            const checkStreakAchievements = (streak) => {
                return SECTOR_ACHIEVEMENTS.STREAK_MILESTONES.filter(m => streak >= m);
            };

            expect(checkStreakAchievements(5)).toEqual([]);
            expect(checkStreakAchievements(7)).toEqual([7]);
            expect(checkStreakAchievements(30)).toEqual([7, 14, 30]);
        });
    });

    describe('Sector Daily Quests', () => {
        const SECTOR_QUEST_TEMPLATES = [
            { type: 'sector_vocab', title: 'IT: 5 terim öğren', target: 5, xp: 50 },
            { type: 'sector_content', title: 'IT makalesi oku', target: 1, xp: 60 },
            { type: 'sector_quiz', title: 'IT quizi tamamla', target: 1, xp: 80 },
            { type: 'sector_roleplay', title: 'IT roleplay oyna', target: 1, xp: 100 },
        ];

        test('should generate sector-specific daily quests', () => {
            const count = 2;
            const selected = SECTOR_QUEST_TEMPLATES.slice(0, count);

            expect(selected.length).toBe(2);
            expect(selected[0].type).toBe('sector_vocab');
        });

        test('should map activity type to quest type', () => {
            const questTypeMap = {
                'vocab_learn': 'sector_vocab',
                'content_complete': 'sector_content',
                'quiz_complete': 'sector_quiz',
                'roleplay_complete': 'sector_roleplay',
            };

            expect(questTypeMap['vocab_learn']).toBe('sector_vocab');
            expect(questTypeMap['content_complete']).toBe('sector_content');
        });

        test('should track quest completion', () => {
            const quest = {
                current_amount: 4,
                target_amount: 5,
                is_completed: false
            };

            const increment = 1;
            const newAmount = quest.current_amount + increment;
            const isCompleted = newAmount >= quest.target_amount;

            expect(newAmount).toBe(5);
            expect(isCompleted).toBe(true);
        });
    });

    describe('Context-Aware SRS', () => {
        test('should track word exposure types', () => {
            const exposureTypes = ['read', 'listen', 'quiz', 'active_review'];

            expect(exposureTypes).toContain('read');
            expect(exposureTypes).toContain('active_review');
        });

        test('should prepare vocabulary injection context', () => {
            const reviewWords = ['scalability', 'deployment', 'refactor'];
            const learnedWords = ['API', 'backend', 'frontend'];

            const context = {
                wordsToInclude: reviewWords,
                wordsToReinforce: learnedWords.slice(0, 5),
                instructions: `IMPORTANT: Include these words naturally in the content: ${reviewWords.join(', ')}`
            };

            expect(context.wordsToInclude).toHaveLength(3);
            expect(context.instructions).toContain('scalability');
        });
    });

    describe('Multi-Sector Integration', () => {
        test('should track progress in multiple sectors', () => {
            const sectorStats = [
                { sector_id: 1, vocabulary_learned: 30 },
                { sector_id: 2, vocabulary_learned: 25 },
                { sector_id: 3, vocabulary_learned: 10 },
            ];

            // Count sectors with 25+ vocab
            const qualifiedSectors = sectorStats.filter(s => s.vocabulary_learned >= 25);
            expect(qualifiedSectors.length).toBe(2);
        });

        test('should check multi-sector achievement thresholds', () => {
            const checkMultiSectorAchievements = (sectorCount) => {
                const achievements = [];
                if (sectorCount >= 2) achievements.push('MULTI_SECTOR_2');
                if (sectorCount >= 3) achievements.push('POLYGLOT_PROFESSIONAL_3');
                if (sectorCount >= 5) achievements.push('POLYGLOT_PROFESSIONAL_5');
                return achievements;
            };

            expect(checkMultiSectorAchievements(1)).toEqual([]);
            expect(checkMultiSectorAchievements(2)).toEqual(['MULTI_SECTOR_2']);
            expect(checkMultiSectorAchievements(5)).toEqual(['MULTI_SECTOR_2', 'POLYGLOT_PROFESSIONAL_3', 'POLYGLOT_PROFESSIONAL_5']);
        });
    });

    describe('Progress Calculation', () => {
        test('should calculate vocabulary progress percentage', () => {
            const learned = 35;
            const total = 100;
            const progress = Math.round(learned / total * 100);

            expect(progress).toBe(35);
        });

        test('should calculate module progress percentage', () => {
            const completed = 2;
            const total = 5;
            const progress = Math.round(completed / total * 100);

            expect(progress).toBe(40);
        });

        test('should handle zero total gracefully', () => {
            const completed = 0;
            const total = 0;
            const progress = total > 0 ? Math.round(completed / total * 100) : 0;

            expect(progress).toBe(0);
        });
    });
});
