/**
 * 📝 Quiz Service
 * 
 * Sektör quizleri için business logic
 */

const db = require('../config/db');
const logger = require('../utils/common/logger.js');

class QuizService {

    // ========================================
    // QUIZ YÖNETİMİ
    // ========================================

    /**
     * Sektör quizlerini getir
     */
    async getQuizzesBySector(sectorId, options = {}) {
        const { cefrLevel = null, quizType = null, activeOnly = true } = options;

        let query = `
            SELECT q.*, s.name_tr as sector_name
            FROM sector_quizzes q
            JOIN sectors s ON q.sector_id = s.id
            WHERE q.sector_id = $1
        `;
        const params = [sectorId];
        let paramCount = 2;

        if (activeOnly) {
            query += ` AND q.is_active = true`;
        }

        if (cefrLevel) {
            query += ` AND q.cefr_level = $${paramCount}`;
            params.push(cefrLevel);
            paramCount++;
        }

        if (quizType) {
            query += ` AND q.quiz_type = $${paramCount}`;
            params.push(quizType);
        }

        query += ` ORDER BY q.created_at DESC`;

        try {
            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            logger.error('Error fetching quizzes:', error);
            throw error;
        }
    }

    /**
     * Quiz detayı getir (sorularla birlikte)
     */
    async getQuizById(quizId, includeAnswers = false) {
        try {
            const result = await db.query(`
                SELECT q.*, s.name_tr as sector_name, s.code as sector_code
                FROM sector_quizzes q
                JOIN sectors s ON q.sector_id = s.id
                WHERE q.id = $1
            `, [quizId]);

            if (result.rows.length === 0) return null;

            const quiz = result.rows[0];

            // Cevapları gizle (kullanıcı için)
            if (!includeAnswers && quiz.questions) {
                quiz.questions = quiz.questions.map(q => ({
                    id: q.id,
                    type: q.type,
                    question: q.question,
                    options: q.options,
                    points: q.points
                    // correct ve explanation gizli
                }));
            }

            return quiz;
        } catch (error) {
            logger.error('Error fetching quiz:', error);
            throw error;
        }
    }

    /**
     * Quiz oluştur
     */
    async createQuiz(quizData) {
        const {
            sector_id, title, title_tr, description, quiz_type, cefr_level,
            difficulty, time_limit_seconds, passing_score, questions,
            related_content_id, created_by
        } = quizData;

        // Max score hesapla
        const maxScore = questions.reduce((sum, q) => sum + (q.points || 10), 0);

        try {
            const result = await db.query(`
                INSERT INTO sector_quizzes (
                    sector_id, title, title_tr, description, quiz_type, cefr_level,
                    difficulty, time_limit_seconds, passing_score, questions,
                    max_score, related_content_id, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `, [
                sector_id, title, title_tr, description, quiz_type, cefr_level,
                difficulty || 'medium', time_limit_seconds, passing_score || 70,
                JSON.stringify(questions), maxScore, related_content_id, created_by
            ]);

            logger.info(`Quiz created: ${title}`);
            return result.rows[0];
        } catch (error) {
            logger.error('Error creating quiz:', error);
            throw error;
        }
    }

    /**
     * Quiz güncelle
     */
    async updateQuiz(quizId, updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = [
            'title', 'title_tr', 'description', 'quiz_type', 'cefr_level',
            'difficulty', 'time_limit_seconds', 'passing_score', 'questions',
            'is_active', 'related_content_id'
        ];

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key) && value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                if (key === 'questions') {
                    values.push(JSON.stringify(value));
                } else {
                    values.push(value);
                }
                paramCount++;
            }
        }

        // Recalculate max_score if questions changed
        if (updateData.questions) {
            const maxScore = updateData.questions.reduce((sum, q) => sum + (q.points || 10), 0);
            fields.push(`max_score = $${paramCount}`);
            values.push(maxScore);
            paramCount++;
        }

        if (fields.length === 0) {
            throw new Error('No valid fields to update');
        }

        fields.push(`updated_at = NOW()`);
        values.push(quizId);

        try {
            const result = await db.query(`
                UPDATE sector_quizzes 
                SET ${fields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `, values);

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating quiz:', error);
            throw error;
        }
    }

    /**
     * Quiz sil
     */
    async deleteQuiz(quizId) {
        try {
            await db.query('DELETE FROM sector_quizzes WHERE id = $1', [quizId]);
            return true;
        } catch (error) {
            logger.error('Error deleting quiz:', error);
            throw error;
        }
    }

    // ========================================
    // QUIZ ÇÖZME & SONUÇLAR
    // ========================================

    /**
     * Quiz cevaplarını değerlendir ve sonuç kaydet
     */
    async submitQuizAnswers(userId, quizId, answers, timeTakenSeconds = null) {
        try {
            // Quiz'i al (cevaplarla birlikte)
            const quiz = await this.getQuizById(quizId, true);
            if (!quiz) {
                throw new Error('Quiz bulunamadı');
            }

            // Cevapları değerlendir
            const evaluation = this.evaluateAnswers(quiz.questions, answers);

            // Geçme durumu
            const passingScore = quiz.passing_score || 70;
            const isPassed = evaluation.scorePercentage >= passingScore;

            // Attempt number
            const attemptResult = await db.query(`
                SELECT COUNT(*) as count FROM user_quiz_results
                WHERE user_id = $1 AND quiz_id = $2
            `, [userId, quizId]);
            const attemptNumber = parseInt(attemptResult.rows[0].count) + 1;

            // Sonucu kaydet
            const result = await db.query(`
                INSERT INTO user_quiz_results (
                    user_id, quiz_id, score, score_percentage,
                    correct_count, wrong_count, total_questions,
                    time_taken_seconds, answers, is_passed, attempt_number
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `, [
                userId, quizId, evaluation.score, evaluation.scorePercentage,
                evaluation.correctCount, evaluation.wrongCount, evaluation.totalQuestions,
                timeTakenSeconds, JSON.stringify(evaluation.detailedAnswers),
                isPassed, attemptNumber
            ]);

            logger.info(`Quiz submitted: user=${userId}, quiz=${quizId}, score=${evaluation.scorePercentage}%`);

            return {
                result: result.rows[0],
                evaluation: {
                    ...evaluation,
                    isPassed,
                    passingScore,
                    attemptNumber
                }
            };
        } catch (error) {
            logger.error('Error submitting quiz:', error);
            throw error;
        }
    }

    /**
     * Cevapları değerlendir
     * Quiz Engine Service'i kullanarak çoklu soru tiplerini destekler
     * Backward compatible: Eski format (sadece MC) hala çalışır
     */
    evaluateAnswers(questions, userAnswers) {
        // Yeni Quiz Engine Service'i kullan
        const quizEngine = require('./quizEngineService');

        // userAnswers formatını normalize et
        const normalizedAnswers = userAnswers.map(a => ({
            question_id: a.question_id,
            questionId: a.question_id,
            answer: a.selected ?? a.answer,
            selected: a.selected,
            responseTime: a.response_time ?? a.responseTime
        }));

        // Quiz Engine ile değerlendir
        const engineResult = quizEngine.evaluateMultipleAnswers(questions, normalizedAnswers);

        // Eski format ile uyumlu response dön
        const detailedAnswers = engineResult.detailedAnswers.map(a => ({
            question_id: a.questionId,
            question_type: a.questionType,
            word: a.word,
            selected: a.userAnswer,
            correct: a.correctAnswer,
            is_correct: a.isCorrect,
            points_earned: a.pointsEarned,
            max_points: a.maxPoints,
            explanation: a.explanation,
            feedback: a.feedback,
            partial_score: a.partialScore,
            response_time: a.responseTime
        }));

        return {
            score: engineResult.score,
            maxScore: engineResult.maxScore,
            scorePercentage: engineResult.scorePercentage,
            correctCount: engineResult.correctCount,
            wrongCount: engineResult.wrongCount,
            totalQuestions: engineResult.totalQuestions,
            avgResponseTime: engineResult.avgResponseTime,
            detailedAnswers,
            // Yeni alanlar
            performance: engineResult.performance,
            // Yanlış cevaplanan kelimeler (SRS sync için)
            wrongWords: detailedAnswers
                .filter(a => !a.is_correct && a.word)
                .map(a => a.word)
        };
    }

    /**
     * Kullanıcı quiz sonuçlarını getir
     */
    async getUserQuizResults(userId, quizId = null) {
        let query = `
            SELECT 
                r.*,
                q.title as quiz_title,
                q.quiz_type,
                q.cefr_level,
                s.name_tr as sector_name
            FROM user_quiz_results r
            JOIN sector_quizzes q ON r.quiz_id = q.id
            JOIN sectors s ON q.sector_id = s.id
            WHERE r.user_id = $1
        `;
        const params = [userId];

        if (quizId) {
            query += ` AND r.quiz_id = $2`;
            params.push(quizId);
        }

        query += ` ORDER BY r.completed_at DESC`;

        try {
            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            logger.error('Error fetching quiz results:', error);
            throw error;
        }
    }

    /**
     * Kullanıcının quiz istatistikleri
     */
    async getUserQuizStats(userId, sectorId = null) {
        let query = `
            SELECT 
                COUNT(*) as total_quizzes,
                COUNT(*) FILTER (WHERE is_passed = true) as passed_count,
                AVG(score_percentage) as avg_score,
                MAX(score_percentage) as best_score,
                SUM(correct_count) as total_correct,
                SUM(wrong_count) as total_wrong
            FROM user_quiz_results r
            JOIN sector_quizzes q ON r.quiz_id = q.id
            WHERE r.user_id = $1
        `;
        const params = [userId];

        if (sectorId) {
            query += ` AND q.sector_id = $2`;
            params.push(sectorId);
        }

        try {
            const result = await db.query(query, params);
            const stats = result.rows[0];

            return {
                totalQuizzes: parseInt(stats.total_quizzes) || 0,
                passedCount: parseInt(stats.passed_count) || 0,
                avgScore: parseFloat(stats.avg_score) || 0,
                bestScore: parseFloat(stats.best_score) || 0,
                totalCorrect: parseInt(stats.total_correct) || 0,
                totalWrong: parseInt(stats.total_wrong) || 0,
                passRate: stats.total_quizzes > 0
                    ? Math.round((stats.passed_count / stats.total_quizzes) * 100)
                    : 0
            };
        } catch (error) {
            logger.error('Error fetching quiz stats:', error);
            throw error;
        }
    }
}

module.exports = new QuizService();
