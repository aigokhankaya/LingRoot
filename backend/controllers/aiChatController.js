const db = require('../config/db');
const logger = require('../utils/logger');
const claudeClient = require('../utils/claudeClient');
const openaiClient = require('../utils/openaiClient');
const { suggestTopicsForUser, extractAndStoreTopic } = require('../lib/rag');

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
        title,
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
      INSERT INTO conversations (user_id, title)
      VALUES ($1, $2)
      RETURNING *
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
        role,
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
      'SELECT id, title FROM conversations WHERE id = $1 AND user_id = $2',
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
      `SELECT role, content FROM messages 
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
      `INSERT INTO messages (conversation_id, role, content)
       VALUES ($1, 'user', $2)
       RETURNING *`,
      [conversationId, content.trim()]
    );
    
    // Get user context for smart prompting
    const userContext = await getUserContext(userId);
    
    // Get AI response with context-aware prompting
    let assistantContent;
    try {
      const response = await openaiClient.generateChatCompletion(messageHistory, {
        systemPrompt: openaiClient.getSystemPrompt(userContext),
        temperature: 0.8,
      });
      assistantContent = response.content;
    } catch (openaiError) {
      logger.error('OpenAI API error:', openaiError);
      // Fallback to Claude if OpenAI fails
      try {
        assistantContent = await claudeClient.generateResponse(messageHistory);
      } catch (claudeError) {
        logger.error('Both AI providers failed:', claudeError);
        return res.status(500).json({
          success: false,
          message: 'AI yanıtı alınamadı. Lütfen daha sonra tekrar deneyin.'
        });
      }
    }
    
    // Save assistant message
    const assistantMessageResult = await db.query(
      `INSERT INTO messages (conversation_id, role, content)
       VALUES ($1, 'assistant', $2)
       RETURNING *`,
      [conversationId, assistantContent]
    );
    
    // Update conversation's updated_at
    await db.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId]
    );
    
    // Extract and store topic if conversation is mature enough (background task)
    if (messageHistory.length >= 6) {
      extractAndStoreTopic(conversationId, userId).catch(err => {
        logger.error('Background topic extraction failed:', err);
      });
    }
    
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
 * Get user context for smart prompting
 */
async function getUserContext(userId) {
  try {
    // Get user's previous topics
    const topicsResult = await db.query(
      `SELECT title FROM topics WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );
    
    const previousTopics = topicsResult.rows.map(r => r.title);
    
    // Get user interests (if exists in your system)
    // const interestsResult = await db.query(...);
    
    return {
      previousTopics,
      // interests: [...],
      // userLevel: 'B1', // if you store this
    };
  } catch (error) {
    logger.error('Failed to get user context:', error);
    return {};
  }
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
    const userId = req.user.id;
    const { conversationId } = req.params;
    
    // Get recent conversation context
    let conversationContext = '';
    if (conversationId) {
      const messagesResult = await db.query(
        `SELECT content FROM messages 
         WHERE conversation_id = $1 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [conversationId]
      );
      conversationContext = messagesResult.rows.map(r => r.content).join('\n');
    }
    
    // Get suggestions
    const suggestions = await suggestTopicsForUser(userId, conversationContext);
    
    res.json({
      success: true,
      suggestions
    });
    
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
    const { getPopularTopics: getPopular } = require('../lib/rag');
    const limit = parseInt(req.query.limit) || 10;
    
    const topics = await getPopular(limit);
    
    res.json({
      success: true,
      topics
    });
    
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
