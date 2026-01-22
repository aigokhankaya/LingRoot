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

        const { result, evaluation } = await quizService.submitQuizAnswers(
            userId, id, answers, time_taken_seconds
        );

        // XP hesapla ve ekle
        let xpEarned = 0;
        if (evaluation.isPassed) {
            // Geçtiyse: base XP + bonus
            xpEarned = 50 + Math.floor(evaluation.scorePercentage / 10) * 5;
            if (evaluation.scorePercentage === 100) {
                xpEarned += 50; // Perfect score bonus
            }
        } else {
            // Geçemediyse bile katılım XP'si
            xpEarned = 20;
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

        // Quiz achievement kontrolü
        const userStats = await quizService.getUserQuizStats(userId);
        const earnedAchievements = await gamificationService.checkQuizAchievements(
            userId,
            userStats.totalQuizzes,
            evaluation.scorePercentage === 100
        );

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
                    attemptNumber: result.attempt_number
                },
                evaluation: {
                    passingScore: evaluation.passingScore,
                    detailedAnswers: evaluation.detailedAnswers // Açıklamalarla birlikte
                },
                xp: {
                    earned: xpEarned,
                    ...xpResult
                },
                earnedAchievements
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

module.exports = {
    // User endpoints
    getQuizzesBySector,
    getQuizById,
    submitQuiz,
    getUserQuizResults,
    getUserQuizStats,
    // Admin endpoints
    createQuiz,
    updateQuiz,
    deleteQuiz
};
