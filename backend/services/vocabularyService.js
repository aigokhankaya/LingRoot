/**
 * 📚 Vocabulary Service
 * 
 * Kelime öğrenme, SRS (Spaced Repetition) ve Vocabulary Injection yönetimi.
 * SM-2 algoritması ile akıllı tekrar sistemi.
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');
const gamificationService = require('./gamificationService');

// SM-2 Algoritması parametreleri
const SM2_DEFAULTS = {
    MIN_EASE_FACTOR: 1.3,
    DEFAULT_EASE_FACTOR: 2.5,
    INTERVALS: [1, 3, 7, 14, 30, 60] // Başlangıç aralıkları (gün)
};

class VocabularyService {
    constructor() {
        this.sm2Defaults = SM2_DEFAULTS;
    }

    // ============================================
    // WORD COLLECTION
    // ============================================

    /**
     * Kelimeyi kullanıcının listesine ekle
     * @param {string} userId 
     * @param {string} word 
     * @param {Object} options - { definition, example, sourceContentId, cefrLevel }
     */
    async addWord(userId, word, options = {}) {
        const { definition, example, sourceContentId, cefrLevel } = options;

        try {
            // word_mastery tablosuna ekle
            await db.query(`
                INSERT INTO word_mastery (user_id, word, cefr_level, status, encountered_at)
                VALUES ($1, $2, $3, 'learning', NOW())
                ON CONFLICT (user_id, word) 
                DO UPDATE SET 
                    status = CASE WHEN word_mastery.status = 'known' THEN 'known' ELSE 'learning' END,
                    last_seen_at = NOW(),
                    encounter_count = word_mastery.encounter_count + 1
            `, [userId, word.toLowerCase(), cefrLevel || 'B1']);

            // word_reviews tablosuna SRS için ekle
            await db.query(`
                INSERT INTO word_reviews (user_id, word, definition, example_sentence, source_content_id, next_review_date)
                VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
                ON CONFLICT (user_id, word) DO NOTHING
            `, [userId, word.toLowerCase(), definition, example, sourceContentId]);

            // XP ver
            await gamificationService.addXP(userId, gamificationService.xpRewards.WORD_LEARNED, 'word', word, `Kelime eklendi: ${word}`);

            // Daily quest güncelle
            await gamificationService.updateDailyQuestProgress(userId, 'learn_words', 1);

            logger.info(`[Vocabulary] User ${userId} added word: ${word}`);

            return { success: true, word };

        } catch (error) {
            logger.error('[Vocabulary] addWord failed:', error);
            throw error;
        }
    }

    /**
     * Kelimeyi "biliyorum" olarak işaretle
     */
    async markAsKnown(userId, word) {
        await db.query(`
            UPDATE word_mastery 
            SET status = 'known', confidence_score = 100
            WHERE user_id = $1 AND word = $2
        `, [userId, word.toLowerCase()]);

        // SRS'den kaldır
        await db.query(`
            DELETE FROM word_reviews 
            WHERE user_id = $1 AND word = $2
        `, [userId, word.toLowerCase()]);

        // XP ver
        await gamificationService.addXP(userId, gamificationService.xpRewards.WORD_MASTERED, 'word_mastered', word, `Kelime ustalığı: ${word}`);

        return { success: true };
    }

    /**
     * Kelimeyi "öğrenmek istiyorum" listesine ekle (Discovery Quiz'den)
     */
    async addToWantToLearn(userId, word, cefrLevel = null) {
        await db.query(`
            INSERT INTO word_mastery (user_id, word, cefr_level, status)
            VALUES ($1, $2, $3, 'want_to_learn')
            ON CONFLICT (user_id, word) 
            DO UPDATE SET status = 'want_to_learn'
        `, [userId, word.toLowerCase(), cefrLevel]);

        return { success: true };
    }

    // ============================================
    // SPACED REPETITION (SM-2)
    // ============================================

    /**
     * Bugün tekrar edilecek kelimeleri getir
     */
    async getDueReviews(userId, limit = 20) {
        const result = await db.query(`
            SELECT * FROM word_reviews 
            WHERE user_id = $1 AND next_review_date <= CURRENT_DATE
            ORDER BY next_review_date ASC, streak_correct ASC
            LIMIT $2
        `, [userId, limit]);

        return result.rows;
    }

    /**
     * Kelime tekrarı sonucu kaydet (SM-2 algoritması)
     * @param {string} userId 
     * @param {string} word 
     * @param {number} quality - 0-5 arası değerlendirme (0=tamamen unutuldu, 5=mükemmel)
     */
    async recordReview(userId, word, quality) {
        try {
            // Mevcut durumu al
            const current = await db.query(
                'SELECT * FROM word_reviews WHERE user_id = $1 AND word = $2',
                [userId, word.toLowerCase()]
            );

            if (current.rows.length === 0) {
                throw new Error('Word not found in reviews');
            }

            const review = current.rows[0];
            let { interval_days, ease_factor, streak_correct, repetition_count } = review;

            // SM-2 Algoritması
            if (quality >= 3) {
                // Doğru cevap
                if (repetition_count === 0) {
                    interval_days = 1;
                } else if (repetition_count === 1) {
                    interval_days = 6;
                } else {
                    interval_days = Math.round(interval_days * ease_factor);
                }
                repetition_count++;
                streak_correct++;
            } else {
                // Yanlış cevap - başa dön
                repetition_count = 0;
                interval_days = 1;
                streak_correct = 0;
            }

            // Ease factor güncelle
            ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
            ease_factor = Math.max(SM2_DEFAULTS.MIN_EASE_FACTOR, ease_factor);

            // Güncelle
            const nextReview = new Date();
            nextReview.setDate(nextReview.getDate() + interval_days);

            await db.query(`
                UPDATE word_reviews 
                SET 
                    interval_days = $3,
                    ease_factor = $4,
                    repetition_count = $5,
                    streak_correct = $6,
                    next_review_date = $7,
                    last_reviewed_at = NOW()
                WHERE user_id = $1 AND word = $2
            `, [userId, word.toLowerCase(), interval_days, ease_factor, repetition_count, streak_correct, nextReview]);

            // XP ver
            if (quality >= 3) {
                await gamificationService.addXP(userId, gamificationService.xpRewards.WORD_REVIEW_CORRECT, 'word_review', word);
            }

            // Confidence güncelle
            const newConfidence = Math.min(100, streak_correct * 20);
            await db.query(`
                UPDATE word_mastery 
                SET confidence_score = $3, last_seen_at = NOW()
                WHERE user_id = $1 AND word = $2
            `, [userId, word.toLowerCase(), newConfidence]);

            logger.info(`[Vocabulary] Review recorded: ${word} (Q:${quality}, I:${interval_days}d)`);

            return {
                success: true,
                nextReviewDate: nextReview,
                intervalDays: interval_days,
                isCorrect: quality >= 3
            };

        } catch (error) {
            logger.error('[Vocabulary] recordReview failed:', error);
            throw error;
        }
    }

    // ============================================
    // VOCABULARY INJECTION
    // ============================================

    /**
     * İçerik oluşturmak için hedef kelimeleri getir
     * Öncelik: want_to_learn > learning (due for review) > learning (random)
     */
    async getTargetWordsForContent(userId, count = 5) {
        // 1. Want to learn kelimeleri
        const wantToLearn = await db.query(`
            SELECT word FROM word_mastery 
            WHERE user_id = $1 AND status = 'want_to_learn'
            ORDER BY discovered_at DESC
            LIMIT $2
        `, [userId, Math.ceil(count / 2)]);

        // 2. Tekrar edilmesi gereken kelimeler
        const dueForReview = await db.query(`
            SELECT word FROM word_reviews 
            WHERE user_id = $1 AND next_review_date <= CURRENT_DATE + INTERVAL '3 days'
            ORDER BY next_review_date ASC
            LIMIT $2
        `, [userId, count - wantToLearn.rows.length]);

        const targetWords = [
            ...wantToLearn.rows.map(r => r.word),
            ...dueForReview.rows.map(r => r.word)
        ];

        // 3. Eğer hala az ise, öğrenmedeki rastgele kelimeler
        if (targetWords.length < count) {
            const remaining = await db.query(`
                SELECT word FROM word_mastery 
                WHERE user_id = $1 AND status = 'learning' AND word NOT IN (${targetWords.map((_, i) => `$${i + 2}`).join(',') || "''"})
                ORDER BY RANDOM()
                LIMIT $${targetWords.length + 2}
            `, [userId, ...targetWords, count - targetWords.length]);

            targetWords.push(...remaining.rows.map(r => r.word));
        }

        return targetWords;
    }

    /**
     * İçerik görüntülendiğinde kelime encounter'ları kaydet
     */
    async recordWordEncounters(userId, words) {
        for (const word of words) {
            await db.query(`
                UPDATE word_mastery 
                SET encounter_count = encounter_count + 1, last_seen_at = NOW()
                WHERE user_id = $1 AND word = $2
            `, [userId, word.toLowerCase()]);
        }
    }

    // ============================================
    // VOCABULARY MATRIX
    // ============================================

    /**
     * Kullanıcının kelime matrisini getir
     */
    async getVocabularyMatrix(userId) {
        const stats = await db.query(`
            SELECT 
                status,
                COUNT(*) as count,
                AVG(confidence_score) as avg_confidence
            FROM word_mastery
            WHERE user_id = $1
            GROUP BY status
        `, [userId]);

        const matrix = {
            known: { count: 0, avgConfidence: 0 },
            learning: { count: 0, avgConfidence: 0 },
            want_to_learn: { count: 0, avgConfidence: 0 },
            unknown: { count: 0, avgConfidence: 0 }
        };

        for (const row of stats.rows) {
            if (matrix[row.status]) {
                matrix[row.status] = {
                    count: parseInt(row.count),
                    avgConfidence: parseFloat(row.avg_confidence) || 0
                };
            }
        }

        // Due for review count
        const dueCount = await db.query(`
            SELECT COUNT(*) as count FROM word_reviews 
            WHERE user_id = $1 AND next_review_date <= CURRENT_DATE
        `, [userId]);

        matrix.dueForReview = parseInt(dueCount.rows[0].count);

        return matrix;
    }

    /**
     * Kullanıcının kelime listesini getir
     */
    async getUserWords(userId, status = null, limit = 50, offset = 0) {
        let query = `
            SELECT 
                wm.*,
                wr.next_review_date,
                wr.streak_correct,
                wr.interval_days
            FROM word_mastery wm
            LEFT JOIN word_reviews wr ON wm.user_id = wr.user_id AND wm.word = wr.word
            WHERE wm.user_id = $1
        `;
        const params = [userId];

        if (status) {
            query += ` AND wm.status = $2`;
            params.push(status);
        }

        query += ` ORDER BY wm.last_seen_at DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        return result.rows;
    }

    // ============================================
    // DISCOVERY QUIZ
    // ============================================

    /**
     * Keşif quiz'i için kelime çiftleri oluştur
     * Kullanıcının seviyesine uygun, henüz görmediği kelimelerden
     */
    async generateDiscoveryQuiz(userId, count = 5) {
        // Kullanıcının seviyesini al
        const userResult = await db.query(
            'SELECT cefr_level FROM users WHERE id = $1',
            [userId]
        );
        const userLevel = userResult.rows[0]?.cefr_level || 'B1';

        // Bu seviyede bilmediği kelimeler (word_mastery'de olmayan)
        // NOT: Gerçek uygulamada CEFR word lists veritabanı gerekir
        // Şimdilik örnek kelimeler
        const sampleWords = this.getSampleWordsForLevel(userLevel);

        // Kullanıcının zaten bildiği kelimeleri çıkar
        const knownResult = await db.query(
            'SELECT word FROM word_mastery WHERE user_id = $1',
            [userId]
        );
        const knownWords = new Set(knownResult.rows.map(r => r.word));

        const unknownWords = sampleWords.filter(w => !knownWords.has(w.word));

        // Rastgele seç ve çiftler oluştur
        const shuffled = unknownWords.sort(() => Math.random() - 0.5);
        const quiz = [];

        for (let i = 0; i < Math.min(count, Math.floor(shuffled.length / 2)); i++) {
            quiz.push({
                question: `Hangisini öğrenmek istersin?`,
                options: [
                    { word: shuffled[i * 2].word, definition: shuffled[i * 2].definition },
                    { word: shuffled[i * 2 + 1].word, definition: shuffled[i * 2 + 1].definition }
                ]
            });
        }

        return quiz;
    }

    /**
     * Seviyeye göre örnek kelimeler (gerçek uygulamada veritabanından gelecek)
     */
    getSampleWordsForLevel(level) {
        const wordLists = {
            'A1': [
                { word: 'beautiful', definition: 'güzel' },
                { word: 'interesting', definition: 'ilginç' },
                { word: 'important', definition: 'önemli' },
            ],
            'A2': [
                { word: 'actually', definition: 'aslında' },
                { word: 'probably', definition: 'muhtemelen' },
                { word: 'experience', definition: 'deneyim' },
            ],
            'B1': [
                { word: 'sustainable', definition: 'sürdürülebilir' },
                { word: 'innovative', definition: 'yenilikçi' },
                { word: 'collaboration', definition: 'işbirliği' },
                { word: 'perspective', definition: 'bakış açısı' },
                { word: 'significant', definition: 'önemli, anlamlı' },
                { word: 'phenomenon', definition: 'olgu, fenomen' },
            ],
            'B2': [
                { word: 'paradigm', definition: 'paradigma' },
                { word: 'serendipity', definition: 'tesadüfi keşif' },
                { word: 'eloquent', definition: 'güzel konuşan' },
                { word: 'resilient', definition: 'dayanıklı' },
                { word: 'ambiguous', definition: 'belirsiz' },
                { word: 'pragmatic', definition: 'pragmatik, pratik' },
            ],
            'C1': [
                { word: 'ubiquitous', definition: 'her yerde bulunan' },
                { word: 'ephemeral', definition: 'geçici, kısa ömürlü' },
                { word: 'juxtaposition', definition: 'yan yana koyma' },
                { word: 'idiosyncratic', definition: 'kendine özgü' },
            ],
            'C2': [
                { word: 'ineffable', definition: 'tarif edilemez' },
                { word: 'sycophant', definition: 'dalkavuk' },
                { word: 'perspicacious', definition: 'keskin zekalı' },
            ]
        };

        return wordLists[level] || wordLists['B1'];
    }
}

module.exports = new VocabularyService();
