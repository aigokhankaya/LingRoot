/**
 * 📝 Quiz Controller
 * 
 * Sektör quiz endpoint'leri
 */

const quizService = require('../services/quizService');
const gamificationService = require('../services/gamificationService');
const logger = require('../utils/common/logger.js');

/**
 * Sektör quizlerini getir
 * GET /api/sectors/:sectorId/quizzes
 */
const getQuizzesBySector = async (req, res) => {
    try {
        const { sectorId } = req.params;
        const { level, type } = req.query;

        const quizzes = await quizService.getQuizzesBySector(parseInt(sectorId), {
            cefrLevel: level,
            quizType: type
        });

        res.json({
            success: true,
            data: quizzes
        });
    } catch (error) {
        logger.error('Error in getQuizzesBySector:', error);
        res.status(500).json({
            success: false,
            error: 'Quizler getirilirken bir hata oluştu'
        });
    }
};

/**
 * Quiz detayı getir (kullanıcı için - cevapsız)
 * GET /api/quizzes/:id
 */
const getQuizById = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await quizService.getQuizById(id, false); // Cevapları gizle

        if (!quiz) {
            return res.status(404).json({
                success: false,
                error: 'Quiz bulunamadı'
            });
        }

        res.json({
            success: true,
            data: quiz
        });
    } catch (error) {
        logger.error('Error in getQuizById:', error);
        res.status(500).json({
            success: false,
            error: 'Quiz getirilirken bir hata oluştu'
        });
    }
};

/**
 * Quiz cevaplarını gönder
 * POST /api/quizzes/:id/submit
 * 
 * SRS Entegrasyonu: Yanlış cevaplanan kelimeler otomatik olarak
 * word_reviews tablosuna eklenir (tekrar için planlanır)
 */
const submitQuiz = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { answers, time_taken_seconds } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                error: 'answers array gerekli'
            });
        }

        // Quiz Engine Service'i dahil et
        const quizEngineService = require('../services/quizEngineService');

        const { result, evaluation } = await quizService.submitQuizAnswers(
            userId, id, answers, time_taken_seconds
        );

        // Quiz bilgilerini al (sector_id için)
        const quiz = await quizService.getQuizById(id, false);
        const sectorId = quiz?.sector_id;
        const cefrLevel = quiz?.cefr_level;

        // =====================================================
        // SRS ENTEGRASYONU
        // =====================================================

        // Yanlış cevaplanan kelimeleri SRS'e ekle
        if (evaluation.wrongWords && evaluation.wrongWords.length > 0) {
            try {
                await quizEngineService.syncWrongAnswersToSRS(userId, evaluation.wrongWords, {
                    sectorId,
                    contentId: quiz?.related_content_id
                });
                logger.info(`[QuizController] SRS sync: ${evaluation.wrongWords.length} words for user ${userId}`);
            } catch (srsError) {
                logger.warn('[QuizController] SRS sync failed:', srsError.message);
                // SRS hatası quiz sonucunu etkilememeli
            }
        }

        // =====================================================
        // QUIZ WORD ATTEMPTS KAYDET
        // =====================================================

        try {
            for (const detailedAnswer of evaluation.detailedAnswers) {
                await quizEngineService.recordWordAttempt(userId, {
                    questionId: detailedAnswer.question_id,
                    questionType: detailedAnswer.question_type || 'multiple_choice',
                    word: detailedAnswer.word,
                    isCorrect: detailedAnswer.is_correct,
                    userAnswer: detailedAnswer.selected,
                    correctAnswer: detailedAnswer.correct,
                    responseTime: detailedAnswer.response_time,
                    difficulty: quiz?.difficulty ?
                        { easy: 2, medium: 3, hard: 4 }[quiz.difficulty] || 3 : 3
                }, {
                    quizResultId: result.id,
                    sectorId,
                    contentId: quiz?.related_content_id,
                    cefrLevel
                });
            }
        } catch (recordError) {
            logger.warn('[QuizController] Word attempt recording failed:', recordError.message);
            // Kayıt hatası quiz sonucunu etkilememeli
        }

        // =====================================================
        // XP HESAPLA VE EKLE
        // =====================================================

        let xpEarned = 0;
        if (evaluation.isPassed) {
            // Geçtiyse: base XP + skor bonusu
            xpEarned = 50 + Math.floor(evaluation.scorePercentage / 10) * 5;
            if (evaluation.scorePercentage === 100) {
                xpEarned += 50; // Perfect score bonus
            }
            // Hız bonusu (ortalama 5 saniyeden hızlı cevaplama)
            if (evaluation.avgResponseTime && evaluation.avgResponseTime < 5000) {
                xpEarned += 15;
            }
        } else {
            // Geçemediyse bile katılım XP'si
            xpEarned = 20;
            // Çaba bonusu (%50'nin üzerinde skor)
            if (evaluation.scorePercentage >= 50) {
                xpEarned += 10;
            }
        }

        const xpResult = await gamificationService.addXP(
            userId,
            xpEarned,
            'sector_quiz',
            id,
            `Quiz: ${evaluation.scorePercentage}%`
        );

        // Daily quest güncelle
        await gamificationService.updateDailyQuestProgress(userId, 'complete_quiz', 1);

        // =====================================================
        // ACHIEVEMENT KONTROLÜ
        // =====================================================

        const userStats = await quizService.getUserQuizStats(userId);
        const earnedAchievements = await gamificationService.checkQuizAchievements(
            userId,
            userStats.totalQuizzes,
            evaluation.scorePercentage === 100
        );

        // Streak achievement kontrolü
        if (evaluation.performance?.streakBroken >= 5) {
            const streakAchievements = await checkQuizStreakAchievements(
                userId,
                evaluation.performance.streakBroken
            );
            earnedAchievements.push(...streakAchievements);
        }

        res.json({
            success: true,
            data: {
                result: {
                    id: result.id,
                    score: result.score,
                    scorePercentage: result.score_percentage,
                    correctCount: result.correct_count,
                    wrongCount: result.wrong_count,
                    totalQuestions: result.total_questions,
                    isPassed: result.is_passed,
                    attemptNumber: result.attempt_number,
                    avgResponseTime: evaluation.avgResponseTime
                },
                evaluation: {
                    passingScore: evaluation.passingScore,
                    detailedAnswers: evaluation.detailedAnswers,
                    performance: evaluation.performance
                },
                xp: {
                    earned: xpEarned,
                    ...xpResult
                },
                earnedAchievements,
                // SRS bilgisi
                srsSync: {
                    wordsSynced: evaluation.wrongWords?.length || 0,
                    wordsToReview: evaluation.wrongWords || []
                }
            }
        });
    } catch (error) {
        logger.error('Error in submitQuiz:', error);
        res.status(500).json({
            success: false,
            error: 'Quiz gönderilirken bir hata oluştu'
        });
    }
};

/**
 * Quiz streak achievement kontrolü
 */
async function checkQuizStreakAchievements(userId, streak) {
    const earned = [];
    const milestones = { 5: 'QUIZ_STREAK_5', 10: 'QUIZ_STREAK_10', 25: 'QUIZ_STREAK_25' };

    for (const [threshold, code] of Object.entries(milestones)) {
        if (streak >= parseInt(threshold)) {
            try {
                const achievement = await gamificationService.awardAchievement(userId, code);
                if (achievement) earned.push(achievement);
            } catch (e) {
                // Achievement zaten kazanılmış olabilir
            }
        }
    }

    return earned;
}

/**
 * Kullanıcı quiz sonuçları
 * GET /api/quizzes/results
 */
const getUserQuizResults = async (req, res) => {
    try {
        const userId = req.user.id;
        const { quiz_id } = req.query;

        const results = await quizService.getUserQuizResults(userId, quiz_id);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        logger.error('Error in getUserQuizResults:', error);
        res.status(500).json({
            success: false,
            error: 'Sonuçlar getirilirken bir hata oluştu'
        });
    }
};

/**
 * Kullanıcı quiz istatistikleri
 * GET /api/quizzes/stats
 */
const getUserQuizStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sector_id } = req.query;

        const stats = await quizService.getUserQuizStats(userId, sector_id);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error in getUserQuizStats:', error);
        res.status(500).json({
            success: false,
            error: 'İstatistikler getirilirken bir hata oluştu'
        });
    }
};

// ========================================
// ADMIN ENDPOINTS
// ========================================

/**
 * Quiz oluştur (Admin)
 * POST /api/admin/sectors/:sectorId/quizzes
 */
const createQuiz = async (req, res) => {
    try {
        const { sectorId } = req.params;
        const userId = req.user.id;

        const quizData = {
            ...req.body,
            sector_id: parseInt(sectorId),
            created_by: userId
        };

        if (!quizData.title || !quizData.quiz_type || !quizData.questions) {
            return res.status(400).json({
                success: false,
                error: 'title, quiz_type ve questions gerekli'
            });
        }

        const quiz = await quizService.createQuiz(quizData);

        res.status(201).json({
            success: true,
            data: quiz,
            message: 'Quiz oluşturuldu'
        });
    } catch (error) {
        logger.error('Error in createQuiz:', error);
        res.status(500).json({
            success: false,
            error: 'Quiz oluşturulurken bir hata oluştu'
        });
    }
};

/**
 * Quiz güncelle (Admin)
 * PUT /api/admin/quizzes/:id
 */
const updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const quiz = await quizService.updateQuiz(id, updateData);

        if (!quiz) {
            return res.status(404).json({
                success: false,
                error: 'Quiz bulunamadı'
            });
        }

        res.json({
            success: true,
            data: quiz,
            message: 'Quiz güncellendi'
        });
    } catch (error) {
        logger.error('Error in updateQuiz:', error);
        res.status(500).json({
            success: false,
            error: 'Quiz güncellenirken bir hata oluştu'
        });
    }
};

/**
 * Quiz sil (Admin)
 * DELETE /api/admin/quizzes/:id
 */
const deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;

        await quizService.deleteQuiz(id);

        res.json({
            success: true,
            message: 'Quiz silindi'
        });
    } catch (error) {
        logger.error('Error in deleteQuiz:', error);
        res.status(500).json({
            success: false,
            error: 'Quiz silinirken bir hata oluştu'
        });
    }
};

// ========================================
// YENİ ENDPOINT'LER (Quiz Engine)
// ========================================

/**
 * Zorlanılan kelimeleri getir
 * GET /api/quizzes/struggling-words
 */
const getStrugglingWords = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20 } = req.query;

        const quizEngineService = require('../services/quizEngineService');
        const words = await quizEngineService.getStrugglingWords(userId, parseInt(limit));

        res.json({
            success: true,
            data: {
                words,
                total: words.length
            }
        });
    } catch (error) {
        logger.error('Error in getStrugglingWords:', error);
        res.status(500).json({
            success: false,
            error: 'Zorlanılan kelimeler getirilirken hata oluştu'
        });
    }
};

/**
 * Kullanıcı zorluk profili getir
 * GET /api/quizzes/difficulty-profile
 */
const getDifficultyProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const quizEngineService = require('../services/quizEngineService');
        const profile = await quizEngineService.getUserDifficultyProfile(userId);
        const recommendedDifficulty = await quizEngineService.calculateRecommendedDifficulty(userId);

        res.json({
            success: true,
            data: {
                profile: profile || {
                    vocabulary_accuracy: 0.5,
                    grammar_accuracy: 0.5,
                    total_questions_answered: 0
                },
                recommendedDifficulty,
                difficultyLabels: {
                    1: 'Çok Kolay',
                    2: 'Kolay',
                    3: 'Orta',
                    4: 'Zor',
                    5: 'Çok Zor'
                }
            }
        });
    } catch (error) {
        logger.error('Error in getDifficultyProfile:', error);
        res.status(500).json({
            success: false,
            error: 'Zorluk profili getirilirken hata oluştu'
        });
    }
};

/**
 * Dinamik quiz üret
 * POST /api/quizzes/generate
 * 
 * Body:
 * - contentId: İçerik ID (opsiyonel)
 * - sectorId: Sektör ID (opsiyonel)
 * - count: Soru sayısı (varsayılan: 5)
 * - types: Soru tipleri array (varsayılan: ['multiple_choice', 'cloze'])
 * - difficulty: Zorluk seviyesi (1-5, opsiyonel - otomatik hesaplanır)
 * - includeSRSWords: SRS kelimelerini dahil et (varsayılan: true)
 */
const generateQuiz = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            contentId,
            sectorId,
            count = 5,
            types = ['multiple_choice', 'cloze'],
            difficulty,
            includeSRSWords = true
        } = req.body;

        const quizEngineService = require('../services/quizEngineService');

        // İçerik ID yoksa ve sektör ID varsa, sektörden rastgele içerik seç
        let targetContentId = contentId;
        if (!targetContentId && sectorId) {
            const db = require('../config/db');
            const contentResult = await db.query(`
                SELECT id FROM sector_content 
                WHERE sector_id = $1 AND status = 'published'
                ORDER BY RANDOM() 
                LIMIT 1
            `, [sectorId]);

            if (contentResult.rows.length > 0) {
                targetContentId = contentResult.rows[0].id;
            }
        }

        const result = await quizEngineService.generateContextualQuiz(
            targetContentId,
            userId,
            {
                count: parseInt(count),
                types,
                difficulty: difficulty ? parseInt(difficulty) : null,
                includeSRSWords
            }
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Quiz oluşturulamadı'
            });
        }

        res.json({
            success: true,
            data: {
                questions: result.questions,
                metadata: result.metadata,
                // Quiz session oluştur (opsiyonel - tracking için)
                sessionInfo: {
                    contentId: targetContentId,
                    sectorId,
                    questionCount: result.questions.length,
                    estimatedTime: result.questions.length * 30 // ~30 saniye/soru
                }
            }
        });
    } catch (error) {
        logger.error('Error in generateQuiz:', error);
        res.status(500).json({
            success: false,
            error: 'Quiz oluşturulurken hata oluştu'
        });
    }
};

module.exports = {
    // User endpoints
    getQuizzesBySector,
    getQuizById,
    submitQuiz,
    getUserQuizResults,
    getUserQuizStats,
    // New quiz engine endpoints
    getStrugglingWords,
    getDifficultyProfile,
    generateQuiz,
    // Admin endpoints
    createQuiz,
    updateQuiz,
    deleteQuiz
};
