// backend/utils/topic/topicPathHelper.js
// Helper functions for topic hierarchy path operations

const { supabase } = require('../storage/supabaseClient.js');
const logger = require('../common/logger.js');

/**
 * Get the full path from root to the specified topic
 * Returns an array of topic objects from root (depth=0) to the current topic
 *
 * @param {string} topicId - The topic ID to get path for
 * @param {string} userId - The user ID for authorization
 * @returns {Promise<Array<{id: string, title: string, description: string, level: string, parent_id: string, depth: number}>>}
 */
async function getTopicPathInternal(topicId, userId) {
  const path = [];
  let currentId = topicId;

  // Safety limit to prevent infinite loops
  const maxDepth = 20;
  let iterations = 0;

  while (currentId && iterations < maxDepth) {
    iterations++;

    const { data: topic, error } = await supabase
      .from('topics')
      .select('id, title, description, level, parent_id, depth')
      .eq('id', currentId)
      .eq('user_id', userId)
      .single();

    if (error || !topic) {
      if (error && error.code !== 'PGRST116') {
        logger.error(`[TOPIC PATH] Error fetching topic ${currentId}:`, error.message);
      }
      break;
    }

    // Add to beginning of path (root will be first)
    path.unshift(topic);
    currentId = topic.parent_id;
  }

  if (iterations >= maxDepth) {
    logger.warn(`[TOPIC PATH] Max depth reached for topic ${topicId}, possible circular reference`);
  }

  return path;
}

/**
 * Format topic path as a human-readable hierarchy string
 * Example: "Formula 1 2024 Sezonu > Takım İletişiminin Rolü > Takım Çalışmasında İletişim"
 *
 * @param {Array<{title: string}>} topicPath - Array of topic objects with title
 * @returns {string} Formatted hierarchy string
 */
function formatTopicHierarchy(topicPath) {
  if (!topicPath || topicPath.length === 0) {
    return '';
  }
  return topicPath.map(t => t.title).join(' > ');
}

/**
 * Get root topic from a topic path
 *
 * @param {Array<Object>} topicPath - Array of topic objects
 * @returns {Object|null} Root topic object or null
 */
function getRootTopic(topicPath) {
  if (!topicPath || topicPath.length === 0) {
    return null;
  }
  return topicPath[0];
}

/**
 * Get parent topic from a topic path (one level up)
 *
 * @param {Array<Object>} topicPath - Array of topic objects
 * @returns {Object|null} Parent topic object or null
 */
function getParentTopic(topicPath) {
  if (!topicPath || topicPath.length < 2) {
    return null;
  }
  return topicPath[topicPath.length - 2];
}

module.exports = {
  getTopicPathInternal,
  formatTopicHierarchy,
  getRootTopic,
  getParentTopic
};
