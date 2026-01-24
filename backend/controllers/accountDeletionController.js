const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');

/**
 * Request account deletion
 * This creates a deletion request that can be processed manually or automatically
 */
exports.requestAccountDeletion = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email adresi gereklidir' 
      });
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      logger.warn(`Account deletion request for non-existent email: ${email}`);
      // Don't reveal if user exists or not for security
      return res.json({ 
        success: true, 
        message: 'Hesap silme talebiniz alındı. İşleme alınacaktır.' 
      });
    }

    // Log the deletion request
    logger.info(`Account deletion request received for user: ${user.id} (${email})`);

    // TODO: You can create a deletion_requests table to track these
    // For now, just log it

    res.json({ 
      success: true, 
      message: 'Hesap silme talebiniz alındı. En kısa sürede işleme alınacaktır.' 
    });

  } catch (error) {
    logger.error(`Error in account deletion request: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Bir hata oluştu. Lütfen tekrar deneyin.' 
    });
  }
};

/**
 * Actually delete user account and all associated data
 * This should be called by admin or automated process
 */
exports.deleteUserAccount = async (userId) => {
  try {
    logger.info(`Starting account deletion for user: ${userId}`);

    // 1. Delete user vocabulary
    const { error: vocabError } = await supabase
      .from('user_vocabulary')
      .delete()
      .eq('user_id', userId);
    
    if (vocabError) {
      logger.error(`Error deleting vocabulary for user ${userId}: ${vocabError.message}`);
    } else {
      logger.info(`Deleted vocabulary for user ${userId}`);
    }

    // 2. Delete conversation messages
    const { error: messagesError } = await supabase
      .from('conversation_messages')
      .delete()
      .eq('user_id', userId);
    
    if (messagesError) {
      logger.error(`Error deleting messages for user ${userId}: ${messagesError.message}`);
    } else {
      logger.info(`Deleted messages for user ${userId}`);
    }

    // 3. Delete user interests
    const { error: interestsError } = await supabase
      .from('user_interests')
      .delete()
      .eq('user_id', userId);
    
    if (interestsError) {
      logger.error(`Error deleting interests for user ${userId}: ${interestsError.message}`);
    } else {
      logger.info(`Deleted interests for user ${userId}`);
    }

    // 4. Delete subscriptions
    const { error: subsError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);
    
    if (subsError) {
      logger.error(`Error deleting subscriptions for user ${userId}: ${subsError.message}`);
    } else {
      logger.info(`Deleted subscriptions for user ${userId}`);
    }

    // 5. Delete user-generated content (if any)
    const { error: contentError } = await supabase
      .from('user_generated_content')
      .delete()
      .eq('user_id', userId);
    
    if (contentError && contentError.code !== 'PGRST116') { // Ignore "table not found" error
      logger.error(`Error deleting content for user ${userId}: ${contentError.message}`);
    } else {
      logger.info(`Deleted content for user ${userId}`);
    }

    // 6. Finally, delete the user
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (userError) {
      logger.error(`Error deleting user ${userId}: ${userError.message}`);
      throw new Error(`Failed to delete user: ${userError.message}`);
    }

    logger.info(`✅ Successfully deleted all data for user: ${userId}`);
    return { success: true, message: 'User account deleted successfully' };

  } catch (error) {
    logger.error(`Fatal error deleting user ${userId}: ${error.message}`);
    throw error;
  }
};

/**
 * Admin endpoint to manually delete a user account
 */
exports.adminDeleteAccount = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID gereklidir' 
      });
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kullanıcı bulunamadı' 
      });
    }

    // Delete the account
    await exports.deleteUserAccount(userId);

    res.json({ 
      success: true, 
      message: `Kullanıcı hesabı silindi: ${user.email}` 
    });

  } catch (error) {
    logger.error(`Error in admin account deletion: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Hesap silinirken bir hata oluştu' 
    });
  }
};
