const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');
const userProfileAnalyzer = require('../utils/userProfileAnalyzer');
const liroPromptGenerator = require('../utils/liroPromptGenerator');

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

module.exports = router;
