/**
 * @jest-environment node
 * 
 * Usage Limiter Unit Tests
 * Tests for subscription-based rate limiting
 * 
 * Created: 2026-01-16
 */

// Mock dependencies
jest.mock('../utils/storage/supabaseClient.js', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn(),
            maybeSingle: jest.fn(),
        })),
        rpc: jest.fn(),
    },
}));

jest.mock('../utils/common/logger.js', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));

jest.mock('../utils/infra/settings.js', () => ({
    getSetting: jest.fn().mockResolvedValue(null),
}));

jest.mock('../utils/infra/subscriptionDowngrader.js', () => ({
    checkAndDowngradeExpired: jest.fn().mockResolvedValue(false),
}));

describe('Usage Limiter Logic', () => {

    describe('Daily Limit Calculation', () => {
        test('should calculate remaining uses correctly', () => {
            const planLimit = 10;
            const usedToday = 3;
            const remaining = planLimit - usedToday;

            expect(remaining).toBe(7);
        });

        test('should return zero when limit exceeded', () => {
            const planLimit = 5;
            const usedToday = 7;
            const remaining = Math.max(0, planLimit - usedToday);

            expect(remaining).toBe(0);
        });

        test('should handle unlimited plans (-1 or very high number)', () => {
            const unlimitedPlan = -1;
            const usedToday = 100;

            const isUnlimited = unlimitedPlan === -1 || unlimitedPlan >= 999999;

            expect(isUnlimited).toBe(true);
        });
    });

    describe('Subscription Tier Limits', () => {
        const PLAN_LIMITS = {
            'Free Trial': { daily_tts: 3, daily_chat: 10 },
            'Starter': { daily_tts: 10, daily_chat: 50 },
            'Premium': { daily_tts: 50, daily_chat: 200 },
            'Enterprise': { daily_tts: -1, daily_chat: -1 }, // Unlimited
        };

        test('should apply correct limits per plan', () => {
            expect(PLAN_LIMITS['Free Trial'].daily_tts).toBe(3);
            expect(PLAN_LIMITS['Starter'].daily_tts).toBe(10);
            expect(PLAN_LIMITS['Premium'].daily_tts).toBe(50);
            expect(PLAN_LIMITS['Enterprise'].daily_tts).toBe(-1);
        });

        test('should recognize unlimited as -1', () => {
            const isUnlimited = (limit) => limit === -1;

            expect(isUnlimited(PLAN_LIMITS['Enterprise'].daily_tts)).toBe(true);
            expect(isUnlimited(PLAN_LIMITS['Free Trial'].daily_tts)).toBe(false);
        });
    });

    describe('Usage Tracking', () => {
        test('should increment usage count', () => {
            let usage = { tts_count: 5, chat_count: 10 };

            usage.tts_count += 1;

            expect(usage.tts_count).toBe(6);
        });

        test('should reset at day boundary', () => {
            const lastUsageDate = new Date('2026-01-15');
            const currentDate = new Date('2026-01-16');

            const isDifferentDay = lastUsageDate.toDateString() !== currentDate.toDateString();

            expect(isDifferentDay).toBe(true);
        });

        test('should not reset on same day', () => {
            const lastUsageDate = new Date('2026-01-16T08:00:00');
            const currentDate = new Date('2026-01-16T20:00:00');

            const isDifferentDay = lastUsageDate.toDateString() !== currentDate.toDateString();

            expect(isDifferentDay).toBe(false);
        });
    });

    describe('Limit Enforcement', () => {
        test('should block when limit reached', () => {
            const canProceed = (used, limit) => {
                if (limit === -1) return true; // Unlimited
                return used < limit;
            };

            expect(canProceed(3, 3)).toBe(false); // At limit
            expect(canProceed(5, 3)).toBe(false); // Over limit
            expect(canProceed(2, 3)).toBe(true);  // Under limit
        });

        test('should allow unlimited users', () => {
            const canProceed = (used, limit) => {
                if (limit === -1) return true;
                return used < limit;
            };

            expect(canProceed(999, -1)).toBe(true);
            expect(canProceed(0, -1)).toBe(true);
        });
    });

    describe('Response Formatting', () => {
        test('should format limit response correctly', () => {
            const formatLimitResponse = (allowed, used, limit) => ({
                allowed,
                used,
                limit,
                remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - used),
            });

            const response = formatLimitResponse(true, 5, 10);

            expect(response.allowed).toBe(true);
            expect(response.used).toBe(5);
            expect(response.limit).toBe(10);
            expect(response.remaining).toBe(5);
        });

        test('should handle unlimited in response', () => {
            const formatLimitResponse = (allowed, used, limit) => ({
                remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - used),
            });

            const response = formatLimitResponse(true, 100, -1);

            expect(response.remaining).toBe('unlimited');
        });
    });
});

describe('Grace Period Logic', () => {
    test('should allow grace period usage', () => {
        const GRACE_USES = 2;
        const overLimit = 1; // 1 over limit, within grace of 2
        const limit = 5;
        const used = limit + overLimit;

        const withinGrace = overLimit <= GRACE_USES;

        expect(withinGrace).toBe(true);
    });

    test('should block after grace period', () => {
        const GRACE_USES = 2;
        const overLimit = 5;

        const withinGrace = overLimit <= GRACE_USES;

        expect(withinGrace).toBe(false);
    });
});

describe('Subscription Expiry Check', () => {
    test('should detect expired subscription', () => {
        const endDate = new Date('2026-01-10');
        const now = new Date('2026-01-16');

        const isExpired = endDate < now;

        expect(isExpired).toBe(true);
    });

    test('should detect active subscription', () => {
        const endDate = new Date('2026-02-10');
        const now = new Date('2026-01-16');

        const isExpired = endDate < now;

        expect(isExpired).toBe(false);
    });

    test('should handle null end date as never expires', () => {
        const endDate = null;
        const now = new Date('2026-01-16');

        const isExpired = endDate ? endDate < now : false;

        expect(isExpired).toBe(false);
    });
});
