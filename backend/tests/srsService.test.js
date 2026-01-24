/**
 * @jest-environment node
 * 
 * SRS Service Unit Tests
 * SM-2 Algorithm doğrulaması
 */

const SrsService = require('../services/srsService');

describe('SrsService', () => {

    describe('calculateNextReview (SM-2 Algorithm)', () => {

        test('quality < 3 should reset repetitions and set interval to 1', () => {
            const result = SrsService.calculateNextReview(2, {
                interval: 10,
                repetitions: 5,
                easeFactor: 2.5
            });

            expect(result.repetitions).toBe(0);
            expect(result.interval).toBe(1);
        });

        test('first correct answer (quality >= 3) should set interval to 1', () => {
            const result = SrsService.calculateNextReview(4, {
                interval: 0,
                repetitions: 0,
                easeFactor: 2.5
            });

            expect(result.interval).toBe(1);
            expect(result.repetitions).toBe(1);
        });

        test('second correct answer should set interval to 6', () => {
            const result = SrsService.calculateNextReview(4, {
                interval: 1,
                repetitions: 1,
                easeFactor: 2.5
            });

            expect(result.interval).toBe(6);
            expect(result.repetitions).toBe(2);
        });

        test('subsequent correct answers should use easeFactor multiplier', () => {
            const result = SrsService.calculateNextReview(4, {
                interval: 6,
                repetitions: 2,
                easeFactor: 2.5
            });

            expect(result.interval).toBe(15); // 6 * 2.5 = 15
            expect(result.repetitions).toBe(3);
        });

        test('easeFactor should not go below 1.3', () => {
            // quality = 0 gives maximum negative adjustment
            const result = SrsService.calculateNextReview(0, {
                interval: 1,
                repetitions: 0,
                easeFactor: 1.5
            });

            expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
        });

        test('quality 5 should increase easeFactor', () => {
            const result = SrsService.calculateNextReview(5, {
                interval: 1,
                repetitions: 1,
                easeFactor: 2.5
            });

            expect(result.easeFactor).toBeGreaterThan(2.5);
        });

        test('quality 3 should slightly decrease easeFactor', () => {
            const result = SrsService.calculateNextReview(3, {
                interval: 1,
                repetitions: 1,
                easeFactor: 2.5
            });

            expect(result.easeFactor).toBeLessThan(2.5);
        });

        test('should return nextReviewDate as Date object', () => {
            const result = SrsService.calculateNextReview(4, {});

            expect(result.nextReviewDate).toBeInstanceOf(Date);
            expect(result.nextReviewDate.getTime()).toBeGreaterThan(Date.now());
        });

        test('default values should be used when previousData is empty', () => {
            const result = SrsService.calculateNextReview(4, {});

            expect(result.interval).toBe(1);
            expect(result.repetitions).toBe(1);
            expect(result.easeFactor).toBeCloseTo(2.5, 1);
        });
    });
});
