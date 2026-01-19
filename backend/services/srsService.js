const pool = require('../config/db');
const logger = require('../utils/logger');
const { withRetry, withGracefulDegradation } = require('../utils/retryUtils');

class SrsService {
    /**
     * SM-2 Algoritması ile bir sonraki tekrar zamanını hesaplar
     * @param {number} quality - Kullanıcının verdiği puan (0-5)
     * @param {object} previousData - Önceki review verileri { interval, repetitions, easeFactor }
     */
    calculateNextReview(quality, previousData = {}) {
        let {
            interval = 0,
            repetitions = 0,
            easeFactor = 2.5
        } = previousData;

        // Quality < 3 ise (yanlış/hatırlamadı) döngüyü sıfırla
        if (quality < 3) {
            repetitions = 0;
            interval = 1; // Ertesi gün tekrar sor
        } else {
            // Doğru bildi
            if (repetitions === 0) {
                interval = 1;
            } else if (repetitions === 1) {
                interval = 6;
            } else {
                interval = Math.round(interval * easeFactor);
            }
            repetitions++;
        }

        // Ease Factor güncellemesi (SM-2 formülü)
        // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

        // Ease Factor minimum 1.3 olmalı
        if (easeFactor < 1.3) easeFactor = 1.3;

        return {
            interval,
            repetitions,
            easeFactor,
            nextReviewDate: new Date(Date.now() + interval * 24 * 60 * 60 * 1000)
        };
    }

    /**
     * Günü gelen kelimeleri getir
     */
    async getDueWords(userId, limit = 20) {
        try {
            const query = `
              SELECT * 
              FROM word_reviews 
              WHERE user_id = $1 
                AND next_review_date <= CURRENT_DATE
              ORDER BY next_review_date ASC
              LIMIT $2
            `;
            const result = await pool.query(query, [userId, limit]);
            return result.rows;
        } catch (error) {
            logger.error('[SRS] getDueWords error:', error);
            return [];
        }
    }

    /**
     * Kelimeyi gözden geçir (update or insert)
     */
    async reviewWord(userId, word, wordTranslation, quality, definition = '', contextSentence = '', sourceContentId = null) {
        try {
            // Input validation
            if (!word || typeof word !== 'string') {
                throw new Error('Invalid word parameter');
            }
            const sanitizedWord = word.toLowerCase().trim().slice(0, 100); // Max 100 chars

            // 1. Mevcut kaydı bul
            const existingWordQuery = `SELECT * FROM word_reviews WHERE user_id = $1 AND word = $2`;
            const existingResult = await pool.query(existingWordQuery, [userId, sanitizedWord]);
            const existingData = existingResult.rows[0];

            // 2. SM-2 Calculation
            const prevData = existingData ? {
                interval: existingData.interval_days,
                repetitions: existingData.repetition_count,
                easeFactor: parseFloat(existingData.ease_factor)
            } : {};

            const calculation = this.calculateNextReview(quality, prevData);

            // 3. Update or Insert Logic
            if (existingData) {
                // Update
                const updateQuery = `
            UPDATE word_reviews
            SET 
              next_review_date = $3,
              interval_days = $4,
              ease_factor = $5,
              repetition_count = $6,
              streak_correct = CASE WHEN $7 >= 3 THEN streak_correct + 1 ELSE 0 END,
              total_reviews = total_reviews + 1,
              correct_reviews = correct_reviews + (CASE WHEN $7 >= 3 THEN 1 ELSE 0 END),
              last_reviewed_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING *
          `;

                const values = [
                    existingData.id,
                    userId,
                    calculation.nextReviewDate,
                    calculation.interval,
                    calculation.easeFactor,
                    calculation.repetitions,
                    quality
                ];

                const res = await pool.query(updateQuery, values);
                return res.rows[0];

            } else {
                // Insert (İlk defa review ediliyor)
                const insertQuery = `
            INSERT INTO word_reviews (
              user_id, word, word_translation, context_sentence, source_content_id,
              next_review_date, interval_days, ease_factor, repetition_count, streak_correct,
              total_reviews, correct_reviews, last_reviewed_at
            ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10,
              1, $11, NOW()
            )
            RETURNING *
          `;

                const values = [
                    userId, sanitizedWord, wordTranslation, contextSentence, sourceContentId,
                    calculation.nextReviewDate,
                    calculation.interval,
                    calculation.easeFactor,
                    calculation.repetitions,
                    quality >= 3 ? 1 : 0, // streak_correct
                    quality >= 3 ? 1 : 0 // correct_reviews
                ];

                const res = await pool.query(insertQuery, values);
                return res.rows[0];
            }
        } catch (error) {
            logger.error('[SRS] reviewWord error:', error);
            throw error;
        }
    }

    /**
     * İstatistikleri getir
     */
    async getStats(userId) {
        try {
            const query = `
              SELECT 
                COUNT(*) as total_words,
                SUM(CASE WHEN next_review_date <= CURRENT_DATE THEN 1 ELSE 0 END) as due_today,
                AVG(streak_correct) as avg_streak,
                AVG(ease_factor) as avg_mastery
              FROM word_reviews
              WHERE user_id = $1
            `;
            const res = await pool.query(query, [userId]);
            return res.rows[0];
        } catch (error) {
            logger.error('[SRS] getStats error:', error);
            return { total_words: 0, due_today: 0, avg_streak: 0, avg_mastery: 2.5 };
        }
    }
}

module.exports = new SrsService();
