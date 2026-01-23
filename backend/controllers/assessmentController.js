/**
 * 🎯 Assessment Controller
 * 
 * Handles placement test API endpoints.
 */

const placementTestService = require('../services/placementTestService');
const logger = require('../utils/common/logger.js');

// In-memory session store (for simplicity; use Redis in production)
const sessions = new Map();

/**
 * POST /api/assessment/start
 * Start a new placement test
 */
exports.startTest = async (req, res) => {
    try {
        const userId = req.user.id;

        const session = placementTestService.startTest();
        sessions.set(userId, session);

        const firstQuestion = placementTestService.getNextQuestion(session);

        res.json({
            success: true,
            data: {
                question: firstQuestion,
                progress: 0,
                totalQuestions: session.maxQuestions
            }
        });
    } catch (error) {
        logger.error('[Assessment] Start error:', error);
        res.status(500).json({ success: false, error: 'Test başlatılamadı' });
    }
};

/**
 * POST /api/assessment/answer
 * Submit an answer and get next question
 */
exports.submitAnswer = async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionId, selectedIndex, selectedAnswer } = req.body;

        const session = sessions.get(userId);
        if (!session) {
            return res.status(400).json({ success: false, error: 'Test oturumu bulunamadı' });
        }

        // Pass selectedAnswer (text) to processAnswer
        const result = placementTestService.processAnswer(session, questionId, selectedAnswer);
        const nextQuestion = placementTestService.getNextQuestion(session);

        if (!nextQuestion) {
            // Test complete
            const finalResult = placementTestService.calculateFinalLevel(session);
            await placementTestService.saveResult(userId, finalResult);
            sessions.delete(userId);

            return res.json({
                success: true,
                data: {
                    isComplete: true,
                    answerResult: result,
                    finalResult
                }
            });
        }

        res.json({
            success: true,
            data: {
                isComplete: false,
                answerResult: result,
                nextQuestion,
                progress: session.questionsAsked.length / session.maxQuestions
            }
        });
    } catch (error) {
        logger.error('[Assessment] Answer error:', error);
        res.status(500).json({ success: false, error: 'Cevap gönderilemedi' });
    }
};

/**
 * GET /api/assessment/status
 * Get current test status or last result
 */
exports.getStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const session = sessions.get(userId);

        if (session) {
            return res.json({
                success: true,
                data: {
                    inProgress: true,
                    progress: session.questionsAsked.length / session.maxQuestions
                }
            });
        }

        // TODO: Fetch last result from DB
        res.json({
            success: true,
            data: {
                inProgress: false,
                lastResult: null
            }
        });
    } catch (error) {
        logger.error('[Assessment] Status error:', error);
        res.status(500).json({ success: false, error: 'Durum alınamadı' });
    }
};
