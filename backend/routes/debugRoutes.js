const express = require('express');
const router = express.Router();
const logger = require('../utils/common/logger.js');
const { authenticate } = require('../middleware/auth');
const userProfileAnalyzer = require('../utils/ai/userProfileAnalyzer.js');
const liroPromptGenerator = require('../utils/ai/liroPromptGenerator.js');
const userInsightService = require('../services/userInsightService');

// Debug endpoint: Son TTS isteğinin timing kalitesini göster
let lastTTSDebugInfo = null;

router.post('/tts-debug', (req, res) => {
  lastTTSDebugInfo = req.body;
  logger.info('🔍 TTS Debug Info Received:', lastTTSDebugInfo);
  res.json({ success: true });
});

router.get('/tts-debug', (req, res) => {
  if (!lastTTSDebugInfo) {
    return res.json({ success: false, message: 'No debug info available' });
  }
  res.json({ success: true, data: lastTTSDebugInfo });
});

// 🧠 Debug endpoint: Kullanıcı profili ve Liro prompt'u göster
router.get('/user-profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    logger.info(`🔍 Debugging user profile for: ${userId}`);

    // Profil oluştur
    const userProfile = await userProfileAnalyzer.generateUserProfile(userId);

    // Liro prompt'u oluştur
    const liroPrompt = liroPromptGenerator.generateSystemPrompt(userProfile);

    res.json({
      success: true,
      userId,
      userEmail: req.user.email,
      profile: userProfile,
      generatedPrompt: liroPrompt,
      stats: {
        interests: userProfile.interests?.count || 0,
        conversations: userProfile.conversationHistory?.totalConversations || 0,
        content: userProfile.contentHistory?.totalContent || 0,
        vocabulary: userProfile.vocabularyStats?.totalWords || 0,
        experienceLevel: userProfile.learningProgress?.experienceLevel || 'beginner',
        preferredLevel: userProfile.contentHistory?.preferredLevel || 'B1',
      },
      promptLength: liroPrompt.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to generate debug profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔄 User Insight Backfill: Geçmiş verilerden insight çıkar
router.post('/insights/backfill', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    logger.info(`🔄 Starting insight backfill for user: ${userId}`);

    const report = await userInsightService.analyzeUserHistory(userId);

    res.json({
      success: true,
      message: `Backfill tamamlandı: ${report.extractedInsights.length} yeni insight çıkarıldı`,
      report
    });
  } catch (error) {
    logger.error('Insight backfill failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📊 User Insights: Mevcut insight'ları getir
router.get('/insights', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const insights = await userInsightService.getInsights(userId);
    const stats = await userInsightService.getStats(userId);

    res.json({
      success: true,
      userId,
      insights,
      stats,
      formattedPrompt: userInsightService.formatForPrompt(insights)
    });
  } catch (error) {
    logger.error('Failed to get insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Load test stats endpoint (only active when LOAD_TEST_MODE=true)
if (process.env.LOAD_TEST_MODE === 'true') {
  const loadTestStatsRouter = require('../tests/load/monitoring/stats-endpoint.js');
  router.use('/', loadTestStatsRouter);
  logger.info('[LOAD_TEST] Stats endpoint mounted at /api/debug/load-test-stats');
}

module.exports = router;
