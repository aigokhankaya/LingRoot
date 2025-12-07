const db = require('../config/db');
const logger = require('../utils/logger');
const { embedText, findSimilar } = require('./embedding');

/**
 * RAG (Retrieval-Augmented Generation) Module
 * Finds similar topics and suggests relevant content
 */

/**
 * Store a topic with its embedding
 * @param {Object} topicData - {title, description, userId}
 * @returns {Promise<Object>} - Created topic
 */
async function storeTopic(topicData) {
  const { title, description, userId, sourceType = 'chat', sourceId = null } = topicData;

  try {
    // Generate embedding
    const combinedText = `${title}\n\n${description}`;
    const embedding = await embedText(combinedText);

    // Store in database
    const query = `
      INSERT INTO topics (title, description, user_id, embedding, source_type, source_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;

    const result = await db.query(query, [
      title,
      description,
      userId,
      JSON.stringify(embedding),
      sourceType,
      sourceId
    ]);

    logger.info('✅ Topic stored with embedding', {
      id: result.rows[0].id,
      title
    });

    return result.rows[0];

  } catch (error) {
    logger.error('Failed to store topic:', error);
    throw error;
  }
}

/**
 * Find similar topics based on query
 * @param {string} query - Search query
 * @param {Object} options - {userId, excludeUserId, limit}
 * @returns {Promise<Array<Object>>} - Similar topics with scores
 */
async function findSimilarTopics(query, options = {}) {
  const { userId, excludeUserId = false, limit = 5 } = options;

  try {
    // Generate query embedding
    const queryEmbedding = await embedText(query);

    // Fetch all topics (or filtered by user)
    let dbQuery = `
      SELECT 
        t.id,
        t.title,
        t.description,
        t.user_id,
        t.embedding,
        t.created_at,
        (COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')) as creator_name
      FROM topics t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (userId && !excludeUserId) {
      dbQuery += ` AND t.user_id = $1`;
      params.push(userId);
    } else if (userId && excludeUserId) {
      dbQuery += ` AND t.user_id != $1`;
      params.push(userId);
    }

    dbQuery += ` ORDER BY t.created_at DESC LIMIT 100`;

    const result = await db.query(dbQuery, params);

    // Parse embeddings and calculate similarity
    const topics = result.rows.map(row => ({
      ...row,
      embedding: JSON.parse(row.embedding),
    }));

    // Find most similar
    const similar = findSimilar(queryEmbedding, topics, limit);

    logger.info('🔍 Found similar topics', {
      query: query.substring(0, 50),
      count: similar.length
    });

    return similar;

  } catch (error) {
    logger.error('Failed to find similar topics:', error);
    throw error;
  }
}

/**
 * Get topic suggestions for user based on conversation
 * @param {string} userId - User ID
 * @param {string} conversationContext - Recent conversation text
 * @returns {Promise<Array<Object>>} - Suggested topics
 */
async function suggestTopicsForUser(userId, conversationContext) {
  try {
    // Find user's previous topics
    const userTopicsQuery = `
      SELECT title, description, created_at
      FROM topics
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const userTopicsResult = await db.query(userTopicsQuery, [userId]);
    const userTopics = userTopicsResult.rows;

    // Find similar topics from other users
    const similarTopics = await findSimilarTopics(conversationContext, {
      userId,
      excludeUserId: true,
      limit: 5,
    });

    // Combine and format suggestions
    const suggestions = {
      yourPreviousTopics: userTopics.map(t => ({
        title: t.title,
        description: t.description,
        type: 'previous',
      })),
      relatedTopics: similarTopics.map(t => ({
        title: t.title,
        description: t.description,
        similarity: t.similarity,
        creatorName: t.creator_name,
        type: 'related',
      })),
    };

    logger.info('💡 Generated topic suggestions', {
      userId,
      previousCount: suggestions.yourPreviousTopics.length,
      relatedCount: suggestions.relatedTopics.length
    });

    return suggestions;

  } catch (error) {
    logger.error('Failed to suggest topics:', error);
    return {
      yourPreviousTopics: [],
      relatedTopics: [],
    };
  }
}

/**
 * Extract and store topic from conversation
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - Extracted topic or null
 */
async function extractAndStoreTopic(conversationId, userId) {
  try {
    // Get conversation messages
    const messagesQuery = `
      SELECT role, content
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `;

    const result = await db.query(messagesQuery, [conversationId]);
    const messages = result.rows;

    if (messages.length < 4) {
      // Not enough context yet
      return null;
    }

    // Use OpenAI to extract topic
    const openaiClient = require('../utils/openaiClient');
    const extracted = await openaiClient.extractSuggestedTopic(messages);

    // Store the topic
    const topic = await storeTopic({
      title: extracted.topic,
      description: extracted.description,
      userId,
    });

    // Update conversation with suggested topic
    await db.query(
      `UPDATE conversations SET suggested_topic = $1 WHERE id = $2`,
      [extracted.topic, conversationId]
    );

    logger.info('✅ Topic extracted and stored', {
      conversationId,
      topic: extracted.topic
    });

    return topic;

  } catch (error) {
    logger.error('Failed to extract and store topic:', error);
    return null;
  }
}

/**
 * Get popular topics (most referenced/used)
 * @param {number} limit - Number of topics to return
 * @returns {Promise<Array<Object>>} - Popular topics
 */
async function getPopularTopics(limit = 10) {
  try {
    const query = `
      SELECT 
        t.id,
        t.title,
        t.description,
        COUNT(c.id) as usage_count,
        (COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')) as creator_name
      FROM topics t
      LEFT JOIN conversations c ON c.suggested_topic = t.title
      LEFT JOIN users u ON t.user_id = u.id
      GROUP BY t.id, t.title, t.description, u.firstname, u.lastname
      ORDER BY usage_count DESC, t.created_at DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);

    logger.info('📊 Retrieved popular topics', { count: result.rows.length });

    return result.rows;

  } catch (error) {
    logger.error('Failed to get popular topics:', error);
    return [];
  }
}

module.exports = {
  storeTopic,
  findSimilarTopics,
  suggestTopicsForUser,
  extractAndStoreTopic,
  getPopularTopics,
};
