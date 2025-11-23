const db = require('../config/db');
const logger = require('../utils/logger');
const claudeClient = require('../utils/claudeClient');
const openaiClient = require('../utils/openaiClient');
const userProfileAnalyzer = require('../utils/userProfileAnalyzer');
const liroPromptGenerator = require('../utils/liroPromptGenerator');
const { supabase } = require('../utils/supabaseClient');
const { calculateOpenAiCost } = require('../utils/costTracker');
// Temporarily disabled - requires topics table migration
// const { suggestTopicsForUser, extractAndStoreTopic } = require('../lib/rag');

/**
 * Get all AI conversations for a user
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        id,
        user_id,
        subject as title,
        created_at,
        updated_at
      FROM conversations
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT 50
    `;
    
    const result = await db.query(query, [userId]);
    
    res.json({
      success: true,
      conversations: result.rows
    });
  } catch (error) {
    logger.error('Error fetching AI conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Konuşmalar getirilemedi'
    });
  }
};

/**
 * Create a new AI conversation
 */
const createConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Başlık gereklidir'
      });
    }
    
    const query = `
      INSERT INTO conversations (user_id, subject)
      VALUES ($1, $2)
      RETURNING id, user_id, subject as title, created_at, updated_at
    `;
    
    const result = await db.query(query, [userId, title.trim()]);
    
    res.json({
      success: true,
      conversation: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating AI conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Konuşma oluşturulamadı'
    });
  }
};

/**
 * Get messages for a conversation
 */
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    
    // Verify conversation belongs to user
    const convCheck = await db.query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    
    if (convCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Konuşma bulunamadı'
      });
    }
    
    const query = `
      SELECT 
        id,
        conversation_id,
        CASE 
          WHEN sender_type = 'admin' THEN 'assistant'
          ELSE sender_type
        END as role,
        content,
        created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `;
    
    const result = await db.query(query, [conversationId]);
    
    res.json({
      success: true,
      messages: result.rows
    });
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Mesajlar getirilemedi'
    });
  }
};

/**
 * Send a message and get AI response (OpenAI with smart prompting)
 */
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mesaj içeriği gereklidir'
      });
    }
    
    // Verify conversation belongs to user
    const convCheck = await db.query(
      'SELECT id, subject as title FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    
    if (convCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Konuşma bulunamadı'
      });
    }
    
    // Get conversation history
    const historyResult = await db.query(
      `SELECT 
         CASE 
           WHEN sender_type = 'admin' THEN 'assistant'
           ELSE sender_type
         END as role,
         content 
       FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC 
       LIMIT 50`,
      [conversationId]
    );
    
    // Build message history
    const messageHistory = historyResult.rows;
    
    // Add current user message
    messageHistory.push({
      role: 'user',
      content: content.trim()
    });
    
    // Save user message
    const userMessageResult = await db.query(
      `INSERT INTO messages (conversation_id, sender_id, sender_type, content)
       VALUES ($1, $2, 'user', $3)
       RETURNING id, conversation_id, 'user' as role, content, created_at`,
      [conversationId, userId, content.trim()]
    );
    
    // 🧠 Generate comprehensive user profile for Liro
    logger.info('🧠 Generating user profile for Liro...');
    const userProfile = await userProfileAnalyzer.generateUserProfile(userId);
    
    // 🎯 Generate personalized Liro system prompt
    const liroSystemPrompt = liroPromptGenerator.generateSystemPrompt(userProfile);
    logger.debug('📝 Liro prompt generated:', { 
      username: userProfile.basicInfo?.username,
      interests: userProfile.interests?.count,
      experienceLevel: userProfile.learningProgress?.experienceLevel
    });
    
    // Get AI response with Liro's personalized prompting
    let assistantContent;
    let openaiUsage = null;
    const openaiModel = openaiClient.chatModel || process.env.OPENAI_CHAT_MODEL || 'gpt-4o';
    try {
      const response = await openaiClient.generateChatCompletion(messageHistory, {
        systemPrompt: liroSystemPrompt,
        temperature: 0.8,
      });
      assistantContent = response.content;
      openaiUsage = response.usage || null;
    } catch (openaiError) {
      logger.error('OpenAI API error:', openaiError);
      // Fallback to alternative AI provider if OpenAI fails
      try {
        assistantContent = await claudeClient.generateResponse(messageHistory, {
          systemPrompt: liroSystemPrompt,
        });
      } catch (claudeError) {
        logger.error('Both AI providers failed:', claudeError);
        return res.status(500).json({
          success: false,
          message: 'AI yanıtı alınamadı. Lütfen daha sonra tekrar deneyin.'
        });
      }
    }
    
    // Save assistant message (sender_id as user for now, sender_type as admin indicates AI)
    const assistantMessageResult = await db.query(
      `INSERT INTO messages (conversation_id, sender_id, sender_type, content)
       VALUES ($1, $2, 'admin', $3)
       RETURNING id, conversation_id, 'assistant' as role, content, created_at`,
      [conversationId, userId, assistantContent]
    );
    
    // Update conversation's updated_at
    await db.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId]
    );
    
    // Cost tracking: log OpenAI usage for Liro Chat into contenthistory (no TTS)
    try {
      if (openaiUsage && userId) {
        const cost = calculateOpenAiCost(openaiUsage, openaiModel);
        const promptTokens = openaiUsage.prompt_tokens || 0;
        const completionTokens = openaiUsage.completion_tokens || 0;
        const totalTokens = openaiUsage.total_tokens || (promptTokens + completionTokens);
        const insertData = {
          user_id: userId,
          level: userProfile?.learningProgress?.experienceLevel || 'B1',
          mp3_url: null,
          input: content.trim(),
          translated_text: null,
          adapted_text: assistantContent,
          input_type: 'chat',
          created_at: new Date().toISOString(),
          words: null,
          timepoints: null,
          openai_prompt_tokens: promptTokens,
          openai_completion_tokens: completionTokens,
          openai_total_tokens: totalTokens,
          openai_cost_usd: cost.totalCostUsd || 0,
          tts_characters: 0,
          tts_category: null,
          tts_cost_usd: 0,
          total_cost_usd: cost.totalCostUsd || 0,
          tts_provider: null,
          tts_voice_name: null,
          audio_duration_seconds: null,
          entry_source: 'liro_chat',
        };
        
        const { data: chData, error: chError } = await supabase
          .from('contenthistory')
          .insert(insertData)
          .select();
        
        if (chError) {
          logger.error('💰 [LIRO COST] Failed to insert contenthistory record for chat:', chError);
        } else {
          logger.info('💰 [LIRO COST] Logged Liro Chat usage to contenthistory:', { id: chData?.[0]?.id, tokens: totalTokens, costUsd: cost.totalCostUsd });
        }
      }
    } catch (costError) {
      logger.error('💰 [LIRO COST] Unexpected error while logging chat cost:', costError);
    }
    
    // Extract and store topic if conversation is mature enough (background task)
    // Temporarily disabled - requires topics table migration
    // if (messageHistory.length >= 6) {
    //   extractAndStoreTopic(conversationId, userId).catch(err => {
    //     logger.error('Background topic extraction failed:', err);
    //   });
    // }
    
    res.json({
      success: true,
      userMessage: userMessageResult.rows[0],
      assistantMessage: assistantMessageResult.rows[0]
    });
    
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Mesaj gönderilemedi'
    });
  }
};

/**
 * 🧠 Get user context for smart prompting
 * @deprecated - Now using userProfileAnalyzer.generateUserProfile() and liroPromptGenerator
 * 
 * This function is kept for backwards compatibility but is no longer used.
 * The new system provides comprehensive user profiling through:
 * - userProfileAnalyzer.generateUserProfile(userId)
 * - liroPromptGenerator.generateSystemPrompt(userProfile)
 */
async function getUserContext(userId) {
  logger.warn('⚠️ getUserContext is deprecated. Use userProfileAnalyzer instead.');
  return {
    previousTopics: [],
    interests: [],
    userLevel: 'B1',
  };
}

/**
 * Delete a conversation
 */
const deleteConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    
    const result = await db.query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id',
      [conversationId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Konuşma bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Konuşma silindi'
    });
  } catch (error) {
    logger.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Konuşma silinemedi'
    });
  }
};

/**
 * Get topic suggestions for user
 */
const getTopicSuggestions = async (req, res) => {
  try {
    // Temporarily return empty array - requires topics table migration
    // TODO: Re-enable after running topics migration
    
    res.json({
      success: true,
      suggestions: []
    });
    
    // Original code (commented out):
    // const userId = req.user.id;
    // const { conversationId } = req.params;
    // let conversationContext = '';
    // if (conversationId) {
    //   const messagesResult = await db.query(
    //     `SELECT content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 5`,
    //     [conversationId]
    //   );
    //   conversationContext = messagesResult.rows.map(r => r.content).join('\n');
    // }
    // const suggestions = await suggestTopicsForUser(userId, conversationContext);
    
  } catch (error) {
    logger.error('Error getting topic suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Öneriler getirilemedi'
    });
  }
};

/**
 * Get popular topics
 */
const getPopularTopics = async (req, res) => {
  try {
    // Temporarily return empty array - requires topics table migration
    // TODO: Re-enable after running topics migration
    
    logger.info('📊 Retrieved popular topics');
    res.json({
      success: true,
      topics: []
    });
    
    // Original code (commented out):
    // const { getPopularTopics: getPopular } = require('../lib/rag');
    // const limit = parseInt(req.query.limit) || 10;
    // const topics = await getPopular(limit);
    
  } catch (error) {
    logger.error('Error getting popular topics:', error);
    res.status(500).json({
      success: false,
      message: 'Popüler konular getirilemedi'
    });
  }
};

module.exports = {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  deleteConversation,
  getTopicSuggestions,
  getPopularTopics,
};
