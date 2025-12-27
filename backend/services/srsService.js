/**
 * 🧠 SRS Service (Spaced Repetition System)
 * 
 * Implements a modified SuperMemo-2 (SM-2) algorithm to schedule vocabulary reviews.
 * Optimizes retention by scheduling reviews just before the user is likely to forget.
 */

const db = require('../config/db');
const logger = require('../utils/logger');

class SrsService {
    /**
     * Calculate new SRS parameters based on user rating
     * 
     * Ratings:
     * 0: Again (Forgot completely) - Reset interval
     * 1: Hard (Remembered with difficulty) - Short interval
     * 2: Good (Remembered perfectly) - Standard increase
     * 3: Easy (Too easy) - Large increase
     * 
     * @param {Object} currentParams - { interval, easeFactor, streak }
     * @param {number} rating - 0 to 3
     */
    calculateNextReview(currentParams, rating) {
        let { interval, easeFactor, streak } = currentParams;

        // Defaults
        interval = interval || 0;
        easeFactor = easeFactor || 2.5;
        streak = streak || 0;

        let nextInterval;
        let nextEase = easeFactor;
        let nextStreak = streak;

        if (rating < 2) {
            // Failed or Hard (Reset logic)
            nextStreak = 0;
            nextInterval = 1; // 1 Day
            // Decrease ease factor slightly for hard items
            nextEase = Math.max(1.3, easeFactor - 0.15);
        } else {
            // Correct (Good/Easy)
            nextStreak = streak + 1;

            if (nextStreak === 1) {
                nextInterval = 1;
            } else if (nextStreak === 2) {
                nextInterval = 6;
            } else {
                nextInterval = Math.round(interval * easeFactor);
            }

            // Ease Factor adjustment (SM-2 formula)
            // EF' = EF + (0.1 - (3-q) * (0.08 + (3-q) * 0.02))
            // Here we map 0-3 rating to SM-2's 0-5 scale roughly
            // Our 2 (Good) -> SM-2 4
            // Our 3 (Easy) -> SM-2 5

            const q = rating === 3 ? 5 : 4;
            nextEase = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

            // Allow extra boost for "Easy"
            if (rating === 3) {
                nextEase += 0.15;
            }
        }

        if (nextEase < 1.3) nextEase = 1.3;

        // Calculate Next Date
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + nextInterval);

        return {
            interval: nextInterval,
            easeFactor: nextEase,
            streak: nextStreak,
            nextReviewAt: nextDate,
            status: nextStreak > 5 ? 'mastered' : (nextStreak > 0 ? 'review' : 'learning')
        };
    }

    /**
     * Process a review for a user word
     */
    async processReview(userId, wordId, rating) {
        try {
            // Get current word data
            const res = await db.query(
                `SELECT * FROM user_vocabulary WHERE user_id = $1 AND id = $2`,
                [userId, wordId]
            );

            if (res.rows.length === 0) {
                throw new Error('Word not found');
            }

            const word = res.rows[0];

            const currentParams = {
                interval: word.interval_days,
                easeFactor: word.ease_factor,
                streak: word.streak
            };

            const result = this.calculateNextReview(currentParams, rating);

            // Update DB
            await db.query(
                `UPDATE user_vocabulary 
                 SET 
                    next_review_at = $1,
                    last_reviewed_at = NOW(),
                    interval_days = $2,
                    ease_factor = $3,
                    streak = $4,
                    review_count = review_count + 1,
                    status = $5,
                    is_learned = $6
                 WHERE id = $7`,
                [
                    result.nextReviewAt,
                    result.interval,
                    result.easeFactor,
                    result.streak,
                    result.status,
                    result.streak > 3, // is_learned if streak > 3
                    wordId
                ]
            );

            return { success: true, ...result };

        } catch (error) {
            logger.error('[SRS Service] Process review error:', error);
            throw error;
        }
    }

    /**
     * Get words due for review
     * @param {string} userId - User ID
     * @param {number} limit - Max items to return
     */
    async getDueWords(userId, limit = 20) {
        console.log('[SRS] getDueWords called with userId:', userId, 'limit:', limit);
        // Get user vocabulary joined with word details
        const res = await db.query(
            `SELECT uv.*, v.word, v.original_word, v.definition, v.example_sentence, 
                    v.example_sentence_turkish, v.level, v.meanings
             FROM user_vocabulary uv
             JOIN vocabulary v ON uv.word_id = v.id
             WHERE uv.user_id = $1 
             ORDER BY uv.created_at DESC NULLS LAST
             LIMIT $2`,
            [userId, limit]
        );
        console.log('[SRS] getDueWords returned', res.rows.length, 'words');
        return res.rows;
    }
}

module.exports = new SrsService();
