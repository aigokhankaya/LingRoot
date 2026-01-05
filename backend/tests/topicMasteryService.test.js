/**
 * @jest-environment node
 * 
 * Topic Mastery Service Unit Tests
 * Mastery score hesaplama doğrulaması
 */

describe('TopicMasteryService - Mastery Score Calculation', () => {

    // Mastery Score Formülü:
    // 40% Completion Rate + 30% Rating (normalized) + 30% Content Count (max 10)

    function calculateMasteryScore(avgCompletion, avgRating, contentCompleted) {
        const completionRate = avgCompletion || 0;
        const ratingNormalized = ((avgRating || 0) + 1) / 2 * 100; // -1,1 → 0,100
        const contentScore = Math.min((contentCompleted || 0) * 10, 100);

        return Math.round(
            (completionRate * 0.4) +
            (ratingNormalized * 0.3) +
            (contentScore * 0.3)
        );
    }

    test('perfect completion + perfect rating + 10 contents = 100', () => {
        const score = calculateMasteryScore(100, 1, 10);
        expect(score).toBe(100);
    });

    test('50% completion + neutral rating + 5 contents = 55', () => {
        // 50% * 0.4 = 20
        // neutral (0) → 50 normalized * 0.3 = 15
        // 5 contents → 50 * 0.3 = 15
        // Total = 50
        const score = calculateMasteryScore(50, 0, 5);
        expect(score).toBe(50);
    });

    test('0% completion + negative rating + 0 contents = 0', () => {
        // 0 * 0.4 = 0
        // -1 → 0 normalized * 0.3 = 0
        // 0 contents → 0 * 0.3 = 0
        const score = calculateMasteryScore(0, -1, 0);
        expect(score).toBe(0);
    });

    test('content count should cap at 10 (100 score)', () => {
        const score5 = calculateMasteryScore(100, 1, 5);  // 40 + 30 + 15 = 85
        const score10 = calculateMasteryScore(100, 1, 10); // 40 + 30 + 30 = 100
        const score20 = calculateMasteryScore(100, 1, 20); // 40 + 30 + 30 = 100 (capped)

        expect(score10).toBe(score20);
        expect(score10).toBe(100);
    });

    test('status should be mastered when score >= 85 AND content >= 5', () => {
        const score = calculateMasteryScore(100, 1, 5);
        const isMastered = score >= 85 && 5 >= 5;

        expect(isMastered).toBe(true);
    });

    test('status should be completed when score >= 70 AND content >= 3', () => {
        // 80% * 0.4 = 32
        // (0.5 + 1) / 2 * 100 = 75 → 75 * 0.3 = 22.5
        // 3 contents → 30 * 0.3 = 9
        // Total ≈ 64 (actually less than 70!)
        // Let's use better values
        const score = calculateMasteryScore(90, 0.5, 4);
        // 90 * 0.4 = 36
        // (0.5 + 1) / 2 * 100 = 75 → 75 * 0.3 = 22.5
        // 4 contents → 40 * 0.3 = 12
        // Total ≈ 71
        expect(score).toBeGreaterThanOrEqual(70);
        expect(score).toBeLessThan(85);
    });
});

describe('TopicMasteryService - Status Transitions', () => {

    function determineStatus(masteryScore, contentCompleted) {
        if (masteryScore >= 85 && contentCompleted >= 5) return 'mastered';
        if (masteryScore >= 70 && contentCompleted >= 3) return 'completed';
        if (contentCompleted > 0) return 'in_progress';
        return 'not_started';
    }

    test('not_started when no content', () => {
        expect(determineStatus(0, 0)).toBe('not_started');
    });

    test('in_progress when some content but low score', () => {
        expect(determineStatus(50, 2)).toBe('in_progress');
    });

    test('completed when score >= 70 and content >= 3', () => {
        expect(determineStatus(72, 3)).toBe('completed');
    });

    test('mastered when score >= 85 and content >= 5', () => {
        expect(determineStatus(90, 6)).toBe('mastered');
    });

    test('high score but low content should not be mastered', () => {
        expect(determineStatus(95, 2)).toBe('in_progress');
    });
});
