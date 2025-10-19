const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const logger = require("../utils/logger");
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Delete user account and all associated data
 * Required by Apple App Store Review Guidelines 5.1.1(v)
 */
exports.deleteAccount = async (req, res) => {
  const requestId = uuidv4();
  
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    logger.info(`[ACCOUNT] Account deletion requested for user ${userId}`);

    // Step 1: Get user details for logging
    const { data: user } = await supabase
      .from('users')
      .select('email, firstname, lastname')
      .eq('id', userId)
      .single();

    logger.info(`[ACCOUNT] Deleting account for user: ${user?.email}`);

    // Step 2: Delete user's subscriptions
    const { error: subsError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);

    if (subsError) {
      logger.error(`[ACCOUNT] Error deleting subscriptions for user ${userId}:`, subsError);
    }

    // Step 3: Delete user's content/audio history
    const { error: contentError } = await supabase
      .from('user_content')
      .delete()
      .eq('user_id', userId);

    if (contentError) {
      logger.error(`[ACCOUNT] Error deleting content for user ${userId}:`, contentError);
    }

    // Step 4: Delete user's vocabulary
    const { error: vocabError } = await supabase
      .from('vocabulary')
      .delete()
      .eq('user_id', userId);

    if (vocabError) {
      logger.error(`[ACCOUNT] Error deleting vocabulary for user ${userId}:`, vocabError);
    }

    // Step 5: Delete user's interests
    const { error: interestsError } = await supabase
      .from('user_interests')
      .delete()
      .eq('user_id', userId);

    if (interestsError) {
      logger.error(`[ACCOUNT] Error deleting interests for user ${userId}:`, interestsError);
    }

    // Step 6: Delete user's chat conversations and messages
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId);

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id);
      
      // Delete messages
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversationIds);

      if (messagesError) {
        logger.error(`[ACCOUNT] Error deleting messages for user ${userId}:`, messagesError);
      }

      // Delete conversations
      const { error: convError } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', userId);

      if (convError) {
        logger.error(`[ACCOUNT] Error deleting conversations for user ${userId}:`, convError);
      }
    }

    // Step 7: Delete refresh tokens
    const { error: tokensError } = await supabase
      .from('refresh_tokens')
      .delete()
      .eq('user_id', userId);

    if (tokensError) {
      logger.error(`[ACCOUNT] Error deleting tokens for user ${userId}:`, tokensError);
    }

    // Step 8: Finally, delete the user account
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (userError) {
      logger.error(`[ACCOUNT] Error deleting user ${userId}:`, userError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete account. Please contact support.'
      });
    }

    logger.info(`[ACCOUNT] Successfully deleted account for user ${userId} (${user?.email})`);

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    logger.error(`[ACCOUNT] Server error during account deletion:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error during account deletion',
      error: error.message
    });
  }
};

/**
 * Get account deletion information
 * Provides information about what data will be deleted
 */
exports.getAccountDeletionInfo = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Count user's data
    const { count: contentCount } = await supabase
      .from('user_content')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: vocabCount } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    return res.status(200).json({
      success: true,
      data: {
        contentCount: contentCount || 0,
        vocabularyCount: vocabCount || 0,
        hasActiveSubscription: !!subscription,
        subscriptionEndsAt: subscription?.current_period_end || null
      }
    });

  } catch (error) {
    logger.error(`[ACCOUNT] Error getting deletion info:`, error);
    return res.status(500).json({
      success: false,
      message: 'Error getting account information'
    });
  }
};
