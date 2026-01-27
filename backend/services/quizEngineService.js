/**
 * 🎮 Quiz Engine Service
 * 
 * LingRoot Quiz Motoru
 * Çoklu soru tipi değerlendirme, adaptif zorluk ve SRS entegrasyonu
 * 
 * Desteklenen Soru Tipleri:
 * - multiple_choice: Çoktan seçmeli
 * - cloze: Boşluk doldurma (fill-in-the-blank)
 * - matching: Eşleştirme
 * - ordering: Kelime/cümle sıralama
 * - error_correction: Hata düzeltme
 * 
 * @author LingRoot Team
 * @version 1.0.0
 * @date 2026-01-23
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');

// ============================================
// SORU TİPLERİ ENUM
// ============================================
const QUESTION_TYPES = {
    MULTIPLE_CHOICE: 'multiple_choice',
    CLOZE: 'cloze',
    MATCHING: 'matching',
    ORDERING: 'ordering',
    ERROR_CORRECTION: 'error_correction',
    DICTATION: 'dictation',
    TRUE_FALSE: 'true_false'
};

// ============================================
// XP ÖDÜL MATRİSİ
// ============================================
const QUESTION_XP_REWARDS = {
    [QUESTION_TYPES.MULTIPLE_CHOICE]: { base: 5, perfect: 8 },
    [QUESTION_TYPES.CLOZE]: { base: 8, perfect: 12 },
    [QUESTION_TYPES.MATCHING]: { base: 10, perfect: 15 },
    [QUESTION_TYPES.ORDERING]: { base: 12, perfect: 18 },
    [QUESTION_TYPES.ERROR_CORRECTION]: { base: 15, perfect: 22 },
    [QUESTION_TYPES.DICTATION]: { base: 20, perfect: 30 },
    [QUESTION_TYPES.TRUE_FALSE]: { base: 3, perfect: 5 }
};

// ============================================
// ZORLUK SEVİYELERİ
// ============================================
const DIFFICULTY_LEVELS = {
    VERY_EASY: 1,
    EASY: 2,
    MEDIUM: 3,
    HARD: 4,
    VERY_HARD: 5
};

class QuizEngineService {

    constructor() {
        this.questionTypes = QUESTION_TYPES;
        this.xpRewards = QUESTION_XP_REWARDS;
        this.difficultyLevels = DIFFICULTY_LEVELS;
    }

    // ============================================
    // ANA DEĞERLENDİRME MOTORU
    // ============================================

    /**
     * Tek bir soruyu değerlendir
     * @param {Object} question - Soru objesi
     * @param {any} userAnswer - Kullanıcı cevabı
     * @returns {Object} - { isCorrect, score, feedback, explanation }
     */
    evaluateAnswer(question, userAnswer) {
        try {
            const type = question.type || QUESTION_TYPES.MULTIPLE_CHOICE;

            switch (type) {
                case QUESTION_TYPES.MULTIPLE_CHOICE:
                    return this.evaluateMultipleChoice(question, userAnswer);

                case QUESTION_TYPES.CLOZE:
                    return this.evaluateCloze(question, userAnswer);

                case QUESTION_TYPES.MATCHING:
                    return this.evaluateMatching(question, userAnswer);

                case QUESTION_TYPES.ORDERING:
                    return this.evaluateOrdering(question, userAnswer);

                case QUESTION_TYPES.ERROR_CORRECTION:
                    return this.evaluateErrorCorrection(question, userAnswer);

                case QUESTION_TYPES.TRUE_FALSE:
                    return this.evaluateTrueFalse(question, userAnswer);

                case QUESTION_TYPES.DICTATION:
                    return this.evaluateDictation(question, userAnswer);

                default:
                    logger.warn(`[QuizEngine] Unknown question type: ${type}`);
                    return this.evaluateMultipleChoice(question, userAnswer);
            }
        } catch (error) {
            logger.error('[QuizEngine] evaluateAnswer error:', error);
            return {
                isCorrect: false,
                score: 0,
                feedback: 'Değerlendirme sırasında bir hata oluştu',
                explanation: null,
                error: error.message
            };
        }
    }

    /**
     * Birden fazla soruyu değerlendir
     * @param {Array} questions - Soru listesi
     * @param {Array} userAnswers - Kullanıcı cevapları [{ questionId, answer }]
     * @returns {Object} - Detaylı değerlendirme sonucu
     */
    evaluateMultipleAnswers(questions, userAnswers) {
        const results = [];
        let totalScore = 0;
        let maxScore = 0;
        let correctCount = 0;
        let wrongCount = 0;
        let totalResponseTime = 0;

        for (const question of questions) {
            const userAnswerObj = userAnswers.find(
                a => a.question_id === question.id || a.questionId === question.id
            );

            const userAnswer = userAnswerObj?.selected ?? userAnswerObj?.answer ?? null;
            const responseTime = userAnswerObj?.responseTime ?? userAnswerObj?.response_time ?? null;

            const evaluation = this.evaluateAnswer(question, userAnswer);
            const points = question.points || 10;

            const earnedPoints = evaluation.isCorrect ? points : 0;
            totalScore += earnedPoints;
            maxScore += points;

            if (evaluation.isCorrect) {
                correctCount++;
            } else {
                wrongCount++;
            }

            if (responseTime) {
                totalResponseTime += responseTime;
            }

            results.push({
                questionId: question.id,
                questionType: question.type || QUESTION_TYPES.MULTIPLE_CHOICE,
                word: question.word || question.target_word || null,
                userAnswer: userAnswer,
                correctAnswer: question.correct ?? question.correctAnswer ?? question.answer,
                isCorrect: evaluation.isCorrect,
                partialScore: evaluation.partialScore || null,
                pointsEarned: earnedPoints,
                maxPoints: points,
                feedback: evaluation.feedback,
                explanation: question.explanation || evaluation.explanation,
                responseTime: responseTime,
                hints: evaluation.hints || null
            });
        }

        const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        const avgResponseTime = questions.length > 0 ? Math.round(totalResponseTime / questions.length) : 0;

        return {
            score: totalScore,
            maxScore,
            scorePercentage,
            correctCount,
            wrongCount,
            totalQuestions: questions.length,
            avgResponseTime,
            detailedAnswers: results,
            // Performans metrikleri
            performance: {
                accuracy: questions.length > 0 ? correctCount / questions.length : 0,
                speed: avgResponseTime,
                streakBroken: this._findLongestStreak(results),
                hardestMissed: this._findHardestMissed(results, questions)
            }
        };
    }

    // ============================================
    // SORU TİPİ DEĞERLENDİRİCİLER
    // ============================================

    /**
     * Multiple Choice değerlendirmesi
     * @param {Object} question - { correct: number|string, options: [] }
     * @param {number|string} userAnswer - Seçilen şık (index veya değer)
     */
    evaluateMultipleChoice(question, userAnswer) {
        const correct = question.correct;

        // Null/undefined kontrolü
        if (userAnswer === null || userAnswer === undefined) {
            return {
                isCorrect: false,
                score: 0,
                feedback: 'Bu soruyu cevaplamadınız.',
                explanation: question.explanation
            };
        }

        // İndeks karşılaştırması (sayı)
        if (typeof correct === 'number') {
            const isCorrect = parseInt(userAnswer) === correct;
            return {
                isCorrect,
                score: isCorrect ? 1 : 0,
                feedback: isCorrect ? 'Doğru!' : 'Yanlış cevap.',
                explanation: question.explanation
            };
        }

        // String karşılaştırması
        const normalizedUser = String(userAnswer).trim().toLowerCase();
        const normalizedCorrect = String(correct).trim().toLowerCase();
        const isCorrect = normalizedUser === normalizedCorrect;

        return {
            isCorrect,
            score: isCorrect ? 1 : 0,
            feedback: isCorrect ? 'Doğru!' : 'Yanlış cevap.',
            explanation: question.explanation
        };
    }

    /**
     * Cloze (Fill-in-the-blank) değerlendirmesi
     * @param {Object} question - { correct: string|string[], acceptAlternatives: string[] }
     * @param {string} userAnswer - Kullanıcının yazdığı cevap
     */
    evaluateCloze(question, userAnswer) {
        if (!userAnswer || typeof userAnswer !== 'string') {
            return {
                isCorrect: false,
                score: 0,
                feedback: 'Lütfen boşluğu doldurun.',
                explanation: question.explanation
            };
        }

        const normalizedUser = userAnswer.trim().toLowerCase();

        // Doğru cevaplar listesi
        let correctAnswers = [];
        if (Array.isArray(question.correct)) {
            correctAnswers = question.correct.map(a => a.toLowerCase().trim());
        } else {
            correctAnswers = [String(question.correct).toLowerCase().trim()];
        }

        // Alternatif cevaplar
        if (question.acceptAlternatives && Array.isArray(question.acceptAlternatives)) {
            correctAnswers.push(...question.acceptAlternatives.map(a => a.toLowerCase().trim()));
        }

        // Tam eşleşme kontrolü
        if (correctAnswers.includes(normalizedUser)) {
            return {
                isCorrect: true,
                score: 1,
                feedback: 'Mükemmel! Doğru kelimeyi buldunuz.',
                explanation: question.explanation
            };
        }

        // Yakın eşleşme kontrolü (typo toleransı)
        for (const correct of correctAnswers) {
            const similarity = this._calculateSimilarity(normalizedUser, correct);
            if (similarity >= 0.85) {
                return {
                    isCorrect: true,
                    partialScore: similarity,
                    score: 0.8,
                    feedback: `Doğru! (Küçük yazım hatası: "${correct}")`,
                    explanation: question.explanation,
                    hints: [`Doğru yazımı: ${correct}`]
                };
            }
        }

        // Yanlış cevap
        return {
            isCorrect: false,
            score: 0,
            feedback: 'Yanlış cevap.',
            explanation: question.explanation,
            hints: [`Doğru cevap: ${correctAnswers[0]}`]
        };
    }

    /**
     * Matching (Eşleştirme) değerlendirmesi
     * @param {Object} question - { pairs: [{left, right}] }
     * @param {Array} userAnswer - Kullanıcının eşleştirmeleri [{leftIndex, rightIndex}]
     */
    evaluateMatching(question, userAnswer) {
        if (!userAnswer || !Array.isArray(userAnswer)) {
            return {
                isCorrect: false,
                score: 0,
                feedback: 'Eşleştirme yapılmadı.',
                explanation: question.explanation
            };
        }

        const pairs = question.pairs || [];
        if (pairs.length === 0) {
            return {
                isCorrect: false,
                score: 0,
                feedback: 'Soru formatı hatalı.',
                error: 'No pairs defined'
            };
        }

        let correctMatches = 0;
        const totalPairs = pairs.length;
        const feedback = [];

        // Her eşleştirmeyi kontrol et
        // pairs varsayılan olarak sıralı: pairs[0].left -> pairs[0].right
        for (let i = 0; i < pairs.length; i++) {
            const userMatch = userAnswer.find(
                m => m.leftIndex === i || m.left === i || m.leftId === pairs[i].id
            );

            if (userMatch) {
                const userRightIndex = userMatch.rightIndex ?? userMatch.right ?? userMatch.rightId;

                // Doğru eşleştirme kontrolü:
                // 1. correctMapping varsa onu kullan
                // 2. Yoksa, varsayılan olarak leftIndex === rightIndex olmalı
                const expectedRightIndex = question.correctMapping
                    ? question.correctMapping[i]
                    : i;

                if (userRightIndex === expectedRightIndex) {
                    correctMatches++;
                } else {
                    feedback.push(`"${pairs[i].left}" yanlış eşleştirildi.`);
                }
            } else {
                feedback.push(`"${pairs[i].left}" eşleştirilmedi.`);
            }
        }

        const accuracy = totalPairs > 0 ? correctMatches / totalPairs : 0;
        const isCorrect = correctMatches === totalPairs;

        return {
            isCorrect,
            partialScore: accuracy,
            score: accuracy,
            correctMatches,
            totalPairs,
            feedback: isCorrect
                ? 'Tüm eşleştirmeler doğru!'
                : `${correctMatches}/${totalPairs} eşleştirme doğru.`,
            details: feedback,
            explanation: question.explanation
        };
    }

    /**
     * Ordering (Sıralama) değerlendirmesi
     * @param {Object} question - { correctOrder: number[], words: string[] }
     * @param {Array} userAnswer - Kullanıcının sıralaması [wordIndex, ...]
     */
    evaluateOrdering(question, userAnswer) {
        if (!userAnswer || !Array.isArray(userAnswer)) {
            return {
                isCorrect: false,
                score: 0,
                feedback: 'Sıralama yapılmadı.',
                explanation: question.explanation
            };
        }

        const correctOrder = question.correctOrder || question.correct || [];
        const words = question.words || question.options || [];

        if (correctOrder.length === 0) {
            return {
                isCorrect: false,
                score: 0,
                feedback: 'Soru formatı hatalı.',
                error: 'No correct order defined'
            };
        }

        // Tamamen doğru mu kontrolü
        const isExactMatch = JSON.stringify(userAnswer) === JSON.stringify(correctOrder);

        if (isExactMatch) {
            return {
                isCorrect: true,
                score: 1,
                feedback: 'Mükemmel! Sıralama tamamen doğru.',
                explanation: question.explanation
            };
        }

        // Kısmi doğruluk hesapla (Longest Common Subsequence benzeri)
        let correctPositions = 0;
        for (let i = 0; i < correctOrder.length; i++) {
            if (userAnswer[i] === correctOrder[i]) {
                correctPositions++;
            }
        }

        // Adjacency kontrolü (yan yana doğru olanlar)
        let correctAdjacencies = 0;
        for (let i = 0; i < correctOrder.length - 1; i++) {
            const userIdx = userAnswer.indexOf(correctOrder[i]);
            const nextUserIdx = userAnswer.indexOf(correctOrder[i + 1]);
            if (userIdx !== -1 && nextUserIdx !== -1 && nextUserIdx === userIdx + 1) {
                correctAdjacencies++;
            }
        }

        const totalElements = correctOrder.length;
        const positionAccuracy = correctPositions / totalElements;
        const adjacencyAccuracy = totalElements > 1 ? correctAdjacencies / (totalElements - 1) : 0;

        // Kombinasyon skoru
        const combinedScore = (positionAccuracy * 0.6) + (adjacencyAccuracy * 0.4);

        // Doğru cümleyi oluştur
        const correctSentence = correctOrder.map(idx => words[idx]).join(' ');

        return {
            isCorrect: false,
            partialScore: combinedScore,
            score: combinedScore,
            correctPositions,
            totalElements,
            feedback: `${correctPositions}/${totalElements} kelime doğru pozisyonda.`,
            hints: [`Doğru sıralama: "${correctSentence}"`],
            explanation: question.explanation
        };
    }

    /**
     * Error Correction değerlendirmesi
     * @param {Object} question - { sentence, errorWord, correctWord, errorPosition }
     * @param {Object} userAnswer - { position, correction }
     */
    evaluateErrorCorrection(question, userAnswer) {
        if (!userAnswer || typeof userAnswer !== 'object') {
            return {
                isCorrect: false,
                score: 0,
                feedback: 'Hata belirtilmedi.',
                explanation: question.explanation
            };
        }

        const { position: userPosition, correction: userCorrection } = userAnswer;
        const correctPosition = question.errorPosition;
        const correctWord = question.correctWord;

        // Pozisyon doğru mu?
        const positionCorrect = userPosition === correctPosition;

        // Düzeltme doğru mu?
        const normalizedUserCorrection = String(userCorrection || '').trim().toLowerCase();
        const normalizedCorrectWord = String(correctWord || '').trim().toLowerCase();
        const correctionCorrect = normalizedUserCorrection === normalizedCorrectWord;

        // Her iki kontrol de doğru
        if (positionCorrect && correctionCorrect) {
            return {
                isCorrect: true,
                score: 1,
                feedback: 'Mükemmel! Hem hatayı buldunuz hem de doğru düzelttiniz.',
                explanation: question.explanation
            };
        }

        // Sadece pozisyon doğru
        if (positionCorrect && !correctionCorrect) {
            return {
                isCorrect: false,
                partialScore: 0.5,
                score: 0.5,
                feedback: 'Hatayı buldunuz ama düzeltme yanlış.',
                hints: [`Doğru düzeltme: "${correctWord}"`],
                explanation: question.explanation
            };
        }

        // Her ikisi de yanlış
        return {
            isCorrect: false,
            score: 0,
            feedback: 'Hatayı bulamadınız.',
            hints: [
                `Hatalı kelime pozisyonu: ${correctPosition + 1}`,
                `Hatalı kelime: "${question.errorWord}"`,
                `Doğru kelime: "${correctWord}"`
            ],
            explanation: question.explanation
        };
    }

    /**
     * True/False değerlendirmesi
     * @param {Object} question - { correct: boolean }
     * @param {boolean} userAnswer
     */
    evaluateTrueFalse(question, userAnswer) {
        const correct = question.correct;
        const isCorrect = Boolean(userAnswer) === Boolean(correct);

        return {
            isCorrect,
            score: isCorrect ? 1 : 0,
            feedback: isCorrect ? 'Doğru!' : 'Yanlış cevap.',
            explanation: question.explanation
        };
    }

    /**
     * Dictation değerlendirmesi (yazarak dinleme)
     * @param {Object} question - { transcript: string }
     * @param {string} userAnswer - Kullanıcının yazdığı metin
     */
    evaluateDictation(question, userAnswer) {
        if (!userAnswer || typeof userAnswer !== 'string') {
            return {
                isCorrect: false,
                score: 0,
                feedback: 'Metin yazılmadı.',
                explanation: question.explanation
            };
        }

        const transcript = question.transcript || question.correct || '';
        const normalizedTranscript = this._normalizeText(transcript);
        const normalizedUser = this._normalizeText(userAnswer);

        // Kelime bazlı karşılaştırma
        const transcriptWords = normalizedTranscript.split(/\s+/);
        const userWords = normalizedUser.split(/\s+/);

        let correctWords = 0;
        const mistakes = [];

        for (let i = 0; i < transcriptWords.length; i++) {
            if (userWords[i] === transcriptWords[i]) {
                correctWords++;
            } else if (userWords[i]) {
                // Yakın eşleşme kontrolü
                const similarity = this._calculateSimilarity(userWords[i], transcriptWords[i]);
                if (similarity >= 0.8) {
                    correctWords += 0.5;
                    mistakes.push({
                        position: i,
                        expected: transcriptWords[i],
                        got: userWords[i],
                        type: 'typo'
                    });
                } else {
                    mistakes.push({
                        position: i,
                        expected: transcriptWords[i],
                        got: userWords[i],
                        type: 'wrong'
                    });
                }
            } else {
                mistakes.push({
                    position: i,
                    expected: transcriptWords[i],
                    got: null,
                    type: 'missing'
                });
            }
        }

        // Fazladan yazılan kelimeler
        if (userWords.length > transcriptWords.length) {
            for (let i = transcriptWords.length; i < userWords.length; i++) {
                mistakes.push({
                    position: i,
                    expected: null,
                    got: userWords[i],
                    type: 'extra'
                });
            }
        }

        const accuracy = transcriptWords.length > 0 ? correctWords / transcriptWords.length : 0;
        const isCorrect = accuracy >= 0.95;

        return {
            isCorrect,
            partialScore: accuracy,
            score: accuracy,
            correctWords: Math.floor(correctWords),
            totalWords: transcriptWords.length,
            mistakes,
            feedback: isCorrect
                ? 'Harika! Neredeyse mükemmel.'
                : `${Math.floor(correctWords)}/${transcriptWords.length} kelime doğru.`,
            explanation: question.explanation
        };
    }

    // ============================================
    // SRS ENTEGRASYONU
    // ============================================

    /**
     * Yanlış cevap verilen kelimeleri SRS sistemine ekle
     * @param {string} userId
     * @param {Array} wrongWords - Yanlış cevaplanan kelimeler
     * @param {Object} options - { sectorId, contentId }
     */
    async syncWrongAnswersToSRS(userId, wrongWords, options = {}) {
        if (!wrongWords || wrongWords.length === 0) {
            return { synced: 0 };
        }

        const { sectorId, contentId } = options;
        let syncedCount = 0;

        try {
            for (const word of wrongWords) {
                if (!word || typeof word !== 'string') continue;

                const normalizedWord = word.trim().toLowerCase();

                // word_reviews tablosuna ekle veya güncelle
                await db.query(`
                    INSERT INTO word_reviews (user_id, word, interval_days, ease_factor, next_review_date)
                    VALUES ($1, $2, 1, 2.5, CURRENT_DATE)
                    ON CONFLICT (user_id, word) 
                    DO UPDATE SET 
                        interval_days = GREATEST(1, word_reviews.interval_days - 1),
                        next_review_date = CURRENT_DATE,
                        last_reviewed_at = NOW()
                `, [userId, normalizedWord]);

                // Quiz word attempts tablosunda sync işaretİ
                await db.query(`
                    UPDATE quiz_word_attempts
                    SET synced_to_srs = TRUE, synced_at = NOW()
                    WHERE user_id = $1 AND word = $2 AND synced_to_srs = FALSE
                `, [userId, normalizedWord]);

                syncedCount++;
            }

            logger.info(`[QuizEngine] SRS sync: ${syncedCount} words synced for user ${userId}`);

            return { synced: syncedCount };
        } catch (error) {
            logger.error('[QuizEngine] SRS sync error:', error);
            return { synced: syncedCount, error: error.message };
        }
    }

    /**
     * Quiz cevabını kaydet
     * @param {string} userId
     * @param {Object} answer - Değerlendirilmiş cevap
     * @param {Object} metadata - { quizResultId, sectorId, contentId, cefrLevel }
     */
    async recordWordAttempt(userId, answer, metadata = {}) {
        try {
            const { quizResultId, sectorId, contentId, cefrLevel } = metadata;

            await db.query(`
                INSERT INTO quiz_word_attempts (
                    user_id, word, quiz_result_id, question_id, question_type,
                    difficulty, was_correct, user_answer, correct_answer,
                    response_time_ms, source_content_id, sector_id, cefr_level
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                userId,
                answer.word || null,
                quizResultId || null,
                answer.questionId,
                answer.questionType,
                answer.difficulty || 3,
                answer.isCorrect,
                JSON.stringify(answer.userAnswer),
                JSON.stringify(answer.correctAnswer),
                answer.responseTime || null,
                contentId || null,
                sectorId || null,
                cefrLevel || null
            ]);

            return { success: true };
        } catch (error) {
            logger.error('[QuizEngine] recordWordAttempt error:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // ADAPTİF ZORLUK
    // ============================================

    /**
     * Kullanıcı profili getir veya oluştur
     * @param {string} userId
     */
    async getUserDifficultyProfile(userId) {
        try {
            let result = await db.query(`
                SELECT * FROM user_quiz_difficulty_profile WHERE user_id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                await db.query(`
                    INSERT INTO user_quiz_difficulty_profile (user_id)
                    VALUES ($1)
                    ON CONFLICT DO NOTHING
                `, [userId]);

                result = await db.query(`
                    SELECT * FROM user_quiz_difficulty_profile WHERE user_id = $1
                `, [userId]);
            }

            return result.rows[0];
        } catch (error) {
            logger.error('[QuizEngine] getUserDifficultyProfile error:', error);
            return null;
        }
    }

    /**
     * Kullanıcıya önerilen zorluk seviyesini hesapla
     * @param {string} userId
     * @param {string} questionType
     */
    async calculateRecommendedDifficulty(userId, questionType = null) {
        try {
            const profile = await this.getUserDifficultyProfile(userId);
            if (!profile) return DIFFICULTY_LEVELS.MEDIUM;

            let accuracy;

            if (questionType) {
                const accuracyField = {
                    [QUESTION_TYPES.MULTIPLE_CHOICE]: 'mc_accuracy',
                    [QUESTION_TYPES.CLOZE]: 'cloze_accuracy',
                    [QUESTION_TYPES.MATCHING]: 'matching_accuracy',
                    [QUESTION_TYPES.ORDERING]: 'ordering_accuracy'
                }[questionType];

                accuracy = profile[accuracyField] || profile.vocabulary_accuracy || 0.5;
            } else {
                accuracy = profile.vocabulary_accuracy || 0.5;
            }

            // Accuracy -> Difficulty mapping
            // Yüksek accuracy = daha zor sorular
            // Düşük accuracy = daha kolay sorular
            // 0.5 varsayılan accuracy için MEDIUM (3) dönmeli
            if (accuracy >= 0.85) return DIFFICULTY_LEVELS.VERY_HARD;
            if (accuracy >= 0.70) return DIFFICULTY_LEVELS.HARD;
            if (accuracy >= 0.45) return DIFFICULTY_LEVELS.MEDIUM;  // 0.5 burada
            if (accuracy >= 0.30) return DIFFICULTY_LEVELS.EASY;
            return DIFFICULTY_LEVELS.VERY_EASY;
        } catch (error) {
            logger.error('[QuizEngine] calculateRecommendedDifficulty error:', error);
            return DIFFICULTY_LEVELS.MEDIUM;
        }
    }

    /**
     * Zorlanılan kelimeleri getir
     * @param {string} userId
     * @param {number} limit
     */
    async getStrugglingWords(userId, limit = 20) {
        try {
            const result = await db.query(`
                SELECT * FROM get_struggling_words($1, $2)
            `, [userId, limit]);

            return result.rows;
        } catch (error) {
            logger.error('[QuizEngine] getStrugglingWords error:', error);
            return [];
        }
    }

    // ============================================
    // DİNAMİK SORU ÜRETİMİ
    // ============================================

    /**
     * İçerik bazlı quiz oluştur
     * @param {string} contentId - İlgili içerik ID
     * @param {string} userId - Kullanıcı ID
     * @param {Object} options - { count, types, difficulty, includeSRSWords }
     */
    async generateContextualQuiz(contentId, userId, options = {}) {
        const {
            count = 5,
            types = [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.CLOZE],
            difficulty = null,
            includeSRSWords = true
        } = options;

        try {
            // Kullanıcı zorluğunu hesapla
            const recommendedDifficulty = difficulty ||
                await this.calculateRecommendedDifficulty(userId);

            // İçerikteki kelimeleri al
            const contentWords = await this._getContentWords(contentId);

            // SRS'ten tekrar edilmesi gereken kelimeleri al
            let srsWords = [];
            if (includeSRSWords) {
                srsWords = await this._getDueSRSWords(userId, 3);
            }

            // Zorlanılan kelimeleri al
            const strugglingWords = await this.getStrugglingWords(userId, 2);

            // 🏢 Sektör kelimelerini al (kullanıcının birincil sektöründen)
            let sectorWords = [];
            try {
                const sectorService = require('./sectorService');
                const primarySector = await sectorService.getUserPrimarySector(userId);
                if (primarySector) {
                    const sectorVocab = await sectorService.getSectorVocabulary(primarySector.id, { limit: 5 });
                    sectorWords = (sectorVocab.items || []).map(v => ({
                        word: v.word,
                        meaning: v.definition_tr || v.definition_en,
                        priority: 1.5 // Sektör kelimeleri orta öncelik
                    }));
                }
            } catch (err) {
                logger.debug('[QuizEngine] Sector vocabulary fetch skipped:', err.message);
            }

            // Kelime havuzunu birleştir (ağırlıklı)
            const wordPool = [
                ...srsWords.map(w => ({ ...w, priority: 3 })),
                ...strugglingWords.map(w => ({ word: w.word, priority: 2 })),
                ...sectorWords, // 🏢 Sektör kelimeleri
                ...contentWords.map(w => ({ ...w, priority: 1 }))
            ];

            // Benzersiz kelimeler
            const uniqueWords = this._getUniqueWordsByPriority(wordPool, count * 2);

            // Soruları oluştur
            const questions = [];
            const usedTypes = new Set();

            for (let i = 0; i < count && i < uniqueWords.length; i++) {
                const word = uniqueWords[i];

                // Soru tipini seç (çeşitlilik için)
                let questionType;
                if (usedTypes.size < types.length) {
                    questionType = types.find(t => !usedTypes.has(t)) || types[0];
                } else {
                    questionType = types[Math.floor(Math.random() * types.length)];
                }
                usedTypes.add(questionType);

                const question = await this._generateQuestionForWord(
                    word,
                    questionType,
                    recommendedDifficulty
                );

                if (question) {
                    questions.push({
                        id: i + 1,
                        ...question,
                        difficulty: recommendedDifficulty,
                        points: this._calculatePoints(questionType, recommendedDifficulty)
                    });
                }
            }

            return {
                success: true,
                questions,
                metadata: {
                    contentId,
                    recommendedDifficulty,
                    totalQuestions: questions.length,
                    includedTypes: [...usedTypes]
                }
            };
        } catch (error) {
            logger.error('[QuizEngine] generateContextualQuiz error:', error);
            return {
                success: false,
                questions: [],
                error: error.message
            };
        }
    }

    // ============================================
    // YARDIMCI METODLAR
    // ============================================

    /**
     * Levenshtein distance ile benzerlik hesapla
     */
    _calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;

        const len1 = str1.length;
        const len2 = str2.length;

        const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));

        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        const distance = matrix[len1][len2];
        const maxLen = Math.max(len1, len2);
        return maxLen > 0 ? (maxLen - distance) / maxLen : 1;
    }

    /**
     * Metni normalize et (noktalama, boşluk vb. temizle)
     */
    _normalizeText(text) {
        if (!text) return '';
        return text
            .trim()
            .toLowerCase()
            .replace(/[.,!?;:'"]/g, '')
            .replace(/\s+/g, ' ');
    }

    /**
     * En uzun doğru seriyi bul
     */
    _findLongestStreak(results) {
        let maxStreak = 0;
        let currentStreak = 0;

        for (const result of results) {
            if (result.isCorrect) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        }

        return maxStreak;
    }

    /**
     * En zor yanlış soruyu bul
     */
    _findHardestMissed(results, questions) {
        const missed = results.filter(r => !r.isCorrect);
        if (missed.length === 0) return null;

        // Zorluk puanına göre sırala
        const withDifficulty = missed.map(m => {
            const q = questions.find(q => q.id === m.questionId);
            return { ...m, difficulty: q?.difficulty || 3 };
        });

        withDifficulty.sort((a, b) => b.difficulty - a.difficulty);
        return withDifficulty[0]?.word || null;
    }

    /**
     * İçerikteki kelimeleri getir
     */
    async _getContentWords(contentId) {
        try {
            // Önce sector_content tablosundan dene
            const sectorResult = await db.query(`
                SELECT vocabulary FROM sector_content WHERE id = $1
            `, [contentId]);

            if (sectorResult.rows.length > 0 && sectorResult.rows[0].vocabulary) {
                return sectorResult.rows[0].vocabulary;
            }

            // Sonra contents tablosundan dene
            const contentResult = await db.query(`
                SELECT key_vocabulary, highlighted_words FROM contents WHERE id = $1
            `, [contentId]);

            if (contentResult.rows.length > 0) {
                const content = contentResult.rows[0];
                const words = [];

                if (content.key_vocabulary) {
                    words.push(...(Array.isArray(content.key_vocabulary)
                        ? content.key_vocabulary
                        : [content.key_vocabulary]));
                }

                if (content.highlighted_words) {
                    words.push(...(Array.isArray(content.highlighted_words)
                        ? content.highlighted_words.map(w => w.word || w)
                        : []));
                }

                return words.map(w => typeof w === 'string' ? { word: w } : w);
            }

            return [];
        } catch (error) {
            logger.warn('[QuizEngine] _getContentWords error:', error.message);
            return [];
        }
    }

    /**
     * Tekrar edilmesi gereken SRS kelimelerini al
     */
    async _getDueSRSWords(userId, limit = 3) {
        try {
            const result = await db.query(`
                SELECT word, interval_days, streak_correct
                FROM word_reviews
                WHERE user_id = $1 AND next_review_date <= CURRENT_DATE
                ORDER BY next_review_date ASC
                LIMIT $2
            `, [userId, limit]);

            return result.rows;
        } catch (error) {
            logger.warn('[QuizEngine] _getDueSRSWords error:', error.message);
            return [];
        }
    }

    /**
     * Önceliğe göre benzersiz kelimeler seç
     */
    _getUniqueWordsByPriority(wordPool, limit) {
        const seen = new Set();
        const result = [];

        // Öncelik sırasına göre sırala
        wordPool.sort((a, b) => b.priority - a.priority);

        for (const item of wordPool) {
            const word = item.word?.toLowerCase?.() || String(item).toLowerCase();
            if (!seen.has(word) && word.length > 2) {
                seen.add(word);
                result.push(item);
                if (result.length >= limit) break;
            }
        }

        return result;
    }

    /**
     * Kelime için soru oluştur
     */
    async _generateQuestionForWord(wordData, questionType, difficulty) {
        const word = wordData.word || wordData;

        try {
            // Kelime detaylarını al (eğer varsa)
            const wordDetails = await this._getWordDetails(word);

            switch (questionType) {
                case QUESTION_TYPES.MULTIPLE_CHOICE:
                    return this._generateMCQuestion(word, wordDetails, difficulty);

                case QUESTION_TYPES.CLOZE:
                    return this._generateClozeQuestion(word, wordDetails, difficulty);

                case QUESTION_TYPES.MATCHING:
                    // Matching tek kelime için uygun değil, MC'ye düş
                    return this._generateMCQuestion(word, wordDetails, difficulty);

                default:
                    return this._generateMCQuestion(word, wordDetails, difficulty);
            }
        } catch (error) {
            logger.warn(`[QuizEngine] _generateQuestionForWord error for "${word}":`, error.message);
            return null;
        }
    }

    /**
     * Kelime detaylarını veritabanından al
     */
    async _getWordDetails(word) {
        try {
            // Önce vocabulary tablosundan
            const vocabResult = await db.query(`
                SELECT word, meaning, meaning_tr, example_sentences, part_of_speech, cefr_level
                FROM vocabulary
                WHERE LOWER(word) = LOWER($1)
                LIMIT 1
            `, [word]);

            if (vocabResult.rows.length > 0) {
                return vocabResult.rows[0];
            }

            // Sonra sector_vocabulary tablosundan
            const sectorResult = await db.query(`
                SELECT term as word, definition as meaning, 
                       definition_tr as meaning_tr, example_sentences
                FROM sector_vocabulary
                WHERE LOWER(term) = LOWER($1)
                LIMIT 1
            `, [word]);

            if (sectorResult.rows.length > 0) {
                return sectorResult.rows[0];
            }

            return { word };
        } catch (error) {
            return { word };
        }
    }

    /**
     * Multiple Choice sorusu oluştur
     */
    _generateMCQuestion(word, details, difficulty) {
        const meaning = details.meaning_tr || details.meaning;

        if (!meaning) {
            return null;
        }

        // Doğru cevap
        const correctAnswer = meaning;

        // Yanlış seçenekler oluştur (placeholder - gerçek implementasyonda distractors DB'den alınmalı)
        const distractors = this._generateDistractors(word, meaning, 3);

        // Seçenekleri karıştır
        const options = this._shuffleArray([correctAnswer, ...distractors]);
        const correctIndex = options.indexOf(correctAnswer);

        return {
            type: QUESTION_TYPES.MULTIPLE_CHOICE,
            word: word,
            question: `"${word}" kelimesinin anlamı nedir?`,
            question_en: `What is the meaning of "${word}"?`,
            options,
            correct: correctIndex,
            explanation: {
                tr: details.example_sentences?.[0] || `${word}: ${meaning}`,
                en: details.example_sentences?.[1] || null
            }
        };
    }

    /**
     * Cloze sorusu oluştur
     */
    _generateClozeQuestion(word, details, difficulty) {
        const exampleSentences = details.example_sentences || [];

        if (exampleSentences.length === 0) {
            // Örnek cümle yoksa basit bir şablon kullan
            return {
                type: QUESTION_TYPES.CLOZE,
                word: word,
                question: `Boşluğu doldurun: "The _____ is important for success."`,
                sentence_template: `The _____ is important for success.`,
                correct: word,
                acceptAlternatives: [],
                explanation: {
                    tr: details.meaning_tr || details.meaning,
                    en: null
                }
            };
        }

        // Örnek cümleden boşluklu soru oluştur
        const sentence = exampleSentences[0];
        const clozePattern = new RegExp(`\\b${word}\\b`, 'gi');
        const clozeSentence = sentence.replace(clozePattern, '_____');

        return {
            type: QUESTION_TYPES.CLOZE,
            word: word,
            question: `Boşluğu doldurun: "${clozeSentence}"`,
            sentence_template: clozeSentence,
            correct: word,
            acceptAlternatives: [],
            explanation: {
                tr: details.meaning_tr || details.meaning,
                en: sentence
            }
        };
    }

    /**
     * Distractor (yanlış seçenek) oluştur
     */
    _generateDistractors(word, correctMeaning, count) {
        // Placeholder distractors - gerçek implementasyonda:
        // 1. Aynı kategoriden benzer kelimeler
        // 2. Fonetik olarak benzer kelimeler
        // 3. Random yanlış anlamlar
        const placeholderDistractors = [
            'önemli olmak',
            'hızlıca hareket etmek',
            'dikkatli davranmak',
            'sessiz kalmak',
            'değişiklik yapmak',
            'açıklama yapmak'
        ];

        // Doğru cevabı filtrele ve karıştır
        const filtered = placeholderDistractors.filter(
            d => d.toLowerCase() !== correctMeaning?.toLowerCase()
        );

        return this._shuffleArray(filtered).slice(0, count);
    }

    /**
     * Dizini karıştır (Fisher-Yates)
     */
    _shuffleArray(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * Soru tipi ve zorluğa göre puan hesapla
     */
    _calculatePoints(questionType, difficulty) {
        const basePoints = this.xpRewards[questionType]?.base || 5;
        const difficultyMultiplier = 1 + ((difficulty - 3) * 0.2);
        return Math.round(basePoints * difficultyMultiplier);
    }
}

// Singleton instance
module.exports = new QuizEngineService();
