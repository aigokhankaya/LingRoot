// Content History Service
// Extracted from contentController.js - handles business logic for content history operations

const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');

/**
 * Helper function to parse JSON strings safely
 */
function tryParseJson(value) {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!(trimmed.startsWith('[') || trimmed.startsWith('{'))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/**
 * Validate UUID format
 */
function isValidUUID(userId) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(userId);
}

/**
 * Get content history for a user with pagination
 * @param {string} userId - User ID (must be valid UUID)
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 50)
 * @returns {Object} - { data, page, limit, total, hasMore }
 */
async function getContentHistory(userId, page = 1, limit = 50) {
  try {
    // Validate user ID
    if (!isValidUUID(userId)) {
      logger.warn(`Invalid user ID in getContentHistory: ${userId}.`);
      throw new Error('Invalid user id');
    }

    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('contenthistory')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching content history:', error);
      throw error;
    }

    // Normalize JSON fields
    const normalized = (data || []).map(row => ({
      ...row,
      words: tryParseJson(row.words),
      timepoints: tryParseJson(row.timepoints),
      dialogue_segments: tryParseJson(row.dialogue_segments),
    }));

    return {
      data: normalized,
      page,
      limit,
      total: count || 0,
      hasMore: offset + limit < (count || 0),
    };
  } catch (error) {
    logger.error('Service error in getContentHistory:', error);
    throw error;
  }
}

/**
 * Get content count and total duration for a user
 * @param {string} userId - User ID
 * @returns {Object} - { count, total_duration_seconds }
 */
async function getContentCount(userId) {
  try {
    // Get count
    const { count, error: countError } = await supabase
      .from('contenthistory')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      logger.error('Error fetching content count:', countError);
      throw countError;
    }

    // Get total duration using pre-computed duration_seconds column
    let totalDurationSeconds = 0;
    try {
      const { data: durationRows, error: durError } = await supabase
        .from('contenthistory')
        .select('duration_seconds')
        .eq('user_id', userId)
        .gt('duration_seconds', 0);

      if (!durError && durationRows) {
        totalDurationSeconds = durationRows.reduce((sum, row) => sum + (row.duration_seconds || 0), 0);
      }
    } catch (durErr) {
      logger.warn('Error calculating total duration:', durErr);
    }

    // Fallback: if pre-computed duration is 0, calculate from timepoints JSON
    if (totalDurationSeconds === 0) {
      try {
        const { data: tpRows } = await supabase
          .from('contenthistory')
          .select('timepoints')
          .eq('user_id', userId)
          .not('timepoints', 'is', null);

        if (tpRows) {
          totalDurationSeconds = tpRows.reduce((sum, row) => {
            try {
              const tps = typeof row.timepoints === 'string'
                ? JSON.parse(row.timepoints)
                : (row.timepoints || []);
              if (Array.isArray(tps) && tps.length > 0) {
                const last = tps[tps.length - 1];
                const endTime = last?.endTimeSeconds || last?.timeSeconds || 0;
                return sum + (endTime > 0 ? Math.round(endTime) : 0);
              }
            } catch { /* malformed JSON, skip */ }
            return sum;
          }, 0);
        }
      } catch (fallbackErr) {
        logger.warn('Timepoints fallback calculation failed:', fallbackErr);
      }
    }

    return {
      count: count || 0,
      total_duration_seconds: Math.round(totalDurationSeconds)
    };
  } catch (error) {
    logger.error('Service error in getContentCount:', error);
    throw error;
  }
}

/**
 * Get a single content item by ID
 * @param {string} contentId - Content ID
 * @param {string} userId - User ID
 * @returns {Object} - Content data with normalized JSON fields
 */
async function getContentById(contentId, userId) {
  try {
    logger.info(`Fetching content by ID: ${contentId} for user ID: ${userId}`);

    const { data, error } = await supabase
      .from('contenthistory')
      .select("*")
      .eq("id", contentId)
      .eq("user_id", userId)
      .single();

    if (error) {
      logger.warn(`Content ID ${contentId} not found or Supabase query error for user ID ${userId}:`, error);
      throw new Error('Content not found');
    }

    logger.info(`Successfully fetched content ID: ${contentId} for user ID: ${userId}`);

    // Normalize JSON fields
    const normalized = {
      ...data,
      words: tryParseJson(data.words),
      timepoints: tryParseJson(data.timepoints),
      dialogue_segments: tryParseJson(data.dialogue_segments),
    };

    return normalized;
  } catch (error) {
    logger.error(`Service error fetching content ID ${contentId} for user ID ${userId}:`, error);
    throw error;
  }
}

/**
 * Delete a content item
 * @param {string} contentId - Content ID to delete
 * @param {string} userId - User ID (for ownership verification)
 * @returns {boolean} - True if deleted successfully
 */
async function deleteContent(contentId, userId) {
  try {
    logger.info(`Attempting to delete content ID: ${contentId} for user ID: ${userId}`);

    // First verify that the content belongs to the user
    const { data: existingData, error: fetchError } = await supabase
      .from('contenthistory')
      .select("id")
      .eq("id", contentId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !existingData) {
      logger.warn(`Delete failed: Content ID ${contentId} not found or not owned by user ID ${userId}.`, fetchError);
      throw new Error('Content not found or access denied');
    }

    // Delete the content
    logger.info(`Deleting content ID: ${contentId} from database for user ID: ${userId}`);
    const { error: deleteError } = await supabase
      .from('contenthistory')
      .delete()
      .eq("id", contentId)
      .eq("user_id", userId);

    if (deleteError) {
      logger.error(`Supabase delete error for content ID ${contentId}, user ID ${userId}:`, deleteError);
      throw new Error('Failed to delete content');
    }

    logger.info(`Content ID ${contentId} deleted successfully for user ID: ${userId}`);
    return true;
  } catch (error) {
    logger.error(`Service error deleting content ID ${contentId} for user ID ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  getContentHistory,
  getContentCount,
  getContentById,
  deleteContent,
};
