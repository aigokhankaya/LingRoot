/**
 * @jest-environment node
 */

const { getInitialFreeTrialEndDate } = require('../utils/subscription/freeTrial.js');

describe('free trial end date calculation', () => {
    test('adds exactly one calendar month for standard dates', () => {
        const result = getInitialFreeTrialEndDate('2026-04-29T10:15:00.000Z');
        expect(result).toBe('2026-05-29T10:15:00.000Z');
    });

    test('clamps to the last day of the next month when needed', () => {
        const result = getInitialFreeTrialEndDate('2026-01-31T08:00:00.000Z');
        expect(result).toBe('2026-02-28T08:00:00.000Z');
    });

    test('preserves leap year dates correctly', () => {
        const result = getInitialFreeTrialEndDate('2028-01-31T08:00:00.000Z');
        expect(result).toBe('2028-02-29T08:00:00.000Z');
    });
});
