const { supabase } = require("../utils/supabaseClient");
require("dotenv").config();
const logger = require("../utils/logger"); // Import logger
const { checkLimits } = require('../utils/usageLimiter');

// Supabase client provided by shared utility

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    logger.info("Fetching dashboard stats");
    // Get total users count
    const { count: userCount, error: userError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    // Get total content count
    const { count: contentCount, error: contentError } = await supabase
      .from("Content_history")
      .select("*", { count: "exact", head: true });

    // Get total subscriptions count
    const { count: subscriptionCount, error: subscriptionError } = await supabase
      .from("Subscriptions")
      .select("*", { count: "exact", head: true });

    // Get recent users
    const { data: recentUsers, error: recentUsersError } = await supabase
      .from("users")
      .select("id, name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    // Get recent content
    const { data: recentContent, error: recentContentError } = await supabase
      .from("Content_history")
      .select("id, input, input_type, level, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(5);

    if (userError || contentError || subscriptionError || recentUsersError || recentContentError) {
      const error = userError || contentError || subscriptionError || recentUsersError || recentContentError;
      logger.error("Error fetching dashboard stats from Supabase:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching dashboard stats",
      });
    }

    logger.info("Successfully fetched dashboard stats");
    return res.status(200).json({
      success: true,
      data: {
        counts: {
          users: userCount || 0,
          content: contentCount || 0,
          subscriptions: subscriptionCount || 0,
        },
        recent: {
          users: recentUsers || [],
          content: recentContent || [],
        },
      },
    });
  } catch (error) {
    logger.error("Server error while fetching dashboard stats:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching dashboard stats",
      error: error.message,
    });
  }
};

// Get login history for a specific user (ADMIN)
exports.getUserLoginHistoryAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    logger.info(`[ADMIN LOGIN] Fetching login history for user: ${id} (page=${page}, limit=${limit})`);

    const rangeFrom = (parseInt(page) - 1) * parseInt(limit);
    const rangeTo = rangeFrom + parseInt(limit) - 1;

    // Attempt to read from a conventional table name `login_history`
    // If the table is missing or any error occurs, return an empty list gracefully
    const { data, count, error } = await supabase
      .from('login_history')
      .select('*', { count: 'exact' })
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeTo);

    if (error) {
      // Common cases: table not found or permission error in early stage
      logger.warn('[ADMIN LOGIN] Falling back to empty list due to error querying login_history:', error);
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: 0,
        },
      });
    }

    const transformed = (data || []).map((row) => {
      const created = row.created_at || row.timestamp || row.createdAt || null;
      return {
        id: row.id || row.log_id || row.event_id,
        userId: row.user_id || row.userid || row.userId,
        ip: row.ip || row.ip_address || row.ipAddress || null,
        userAgent: row.user_agent || row.userAgent || row.ua || null,
        success: typeof row.success === 'boolean' ? row.success : (typeof row.ok === 'boolean' ? row.ok : true),
        message: row.message || row.reason || null,
        created_at: created,
        timestamp: created,
        location: row.location || null,
      };
    });

    logger.info(`[ADMIN LOGIN] Found ${transformed.length} records (total=${count || transformed.length}) for user ${id}`);

    return res.status(200).json({
      success: true,
      data: transformed,
      pagination: {
        total: count || transformed.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: count ? Math.ceil(count / parseInt(limit)) : (transformed.length > 0 ? 1 : 0),
      },
    });
  } catch (error) {
    logger.error('[ADMIN LOGIN] Server error while fetching user login history:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Removed testAllGoogleTtsVoices per request

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "" } = req.query;
    logger.info(`[ADMIN USERS] Fetching users - Page: ${page}, Limit: ${limit}, Search: '${search}'`);

    // First try to get users from the users table (our custom table)
    let query = supabase
      .from('users')
      .select('id, firstname, lastname, email, role, created_at, phonenumber, isverified, updated_at');

    // Add search if provided
    if (search) {
      query = query.or(`firstname.ilike.%${search}%,lastname.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Add pagination and ordering
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    const { data: users, error: usersError, count } = await query;

    if (usersError) {
      logger.error("[ADMIN USERS] Error fetching users from users table:", usersError);
      return res.status(500).json({
        success: false,
        message: "Error fetching users from database",
        error: usersError.message,
      });
    }

    logger.info(`[ADMIN USERS] Found ${users?.length || 0} users in users table`);

    // Transform users data to match frontend format
    const transformedUsers = (users || []).map(user => ({
      id: user.id,
      name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'N/A',
      email: user.email,
      status: user.isverified ? 'aktif' : 'pasif',
      package: 'Ücretsiz', // Default package, can be enhanced later
      registrationDate: new Date(user.created_at).toLocaleDateString('tr-TR'),
      lastLogin: user.updated_at ? new Date(user.updated_at).toLocaleDateString('tr-TR') : 'Hiç',
      role: user.role || 'user',
      phone: user.phonenumber
    }));

    logger.info(`[ADMIN USERS] Successfully transformed ${transformedUsers.length} users`);
    
    return res.status(200).json({
      success: true,
      users: transformedUsers,
      total: transformedUsers.length
    });
  } catch (error) {
    logger.error("[ADMIN USERS] Server error while fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching users",
      error: error.message,
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Fetching user by ID: ${id}`);

    const { data, error } = await supabase
      .from("users")
      .select("id, firstname, lastname, email, role, created_at, updated_at, phonenumber, isverified")
      .eq("id", id)
      .single();

    if (error) {
      logger.warn(`User not found or error fetching user ID ${id}:`, error);
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: error.message,
      });
    }

    // Fetch active subscription info
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, plantype, status, start_date, end_date, created_at')
      .eq('user_id', id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      logger.warn(`Error fetching subscription for user ID ${id}:`, subError);
    }

    // Add subscription info to response
    const userData = {
      ...data,
      currentSubscription: subscription || null
    };

    logger.info(`Successfully fetched user ID: ${id} with subscription info`);
    return res.status(200).json({
      success: true,
      data: userData,
    });
  } catch (error) {
    logger.error(`Server error while fetching user ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching user",
      error: error.message,
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    logger.info(`Attempting to update user ID: ${id}`);

    // Validate input
    if (!name && !email && !role) {
      logger.warn(`Update attempt for user ID ${id} failed: No fields provided.`);
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update",
      });
    }

    // Create update object with only provided fields
    const updateData = {};
    if (name) updateData.firstname = name.split(' ')[0];
    if (name) updateData.lastname = name.split(' ')[1];
    if (email) updateData.email = email;
    if (role) updateData.role = role;

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      logger.error(`Error updating user ID ${id} in Supabase:`, error);
      return res.status(500).json({
        success: false,
        message: "Error updating user",
        error: error.message,
      });
    }

    if (!data || data.length === 0) {
      logger.warn(`Update failed: User ID ${id} not found.`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    logger.info(`User ID ${id} updated successfully.`);
    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: data[0],
    });
  } catch (error) {
    logger.error(`Server error while updating user ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating user",
      error: error.message,
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Attempting to delete user ID: ${id}`);

    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("id", id)
      .single();

    if (checkError || !existingUser) {
      logger.warn(`Delete failed: User ID ${id} not found.`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Count user's audio/content records first
    const { count: audioCount, error: countErr } = await supabase
      .from('contenthistory')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    if (countErr) {
      logger.error(`Error counting contenthistory for user ID ${id}:`, countErr);
      return res.status(500).json({ success: false, message: 'Error counting user\'s audio records', error: countErr.message });
    }

    // Then delete user's audio/content records
    logger.info(`Deleting contenthistory records for user ID: ${id}`);
    const { error: contentDeleteError } = await supabase
      .from('contenthistory')
      .delete()
      .eq('user_id', id);

    if (contentDeleteError) {
      logger.error(`Error deleting contenthistory for user ID ${id}:`, contentDeleteError);
      return res.status(500).json({
        success: false,
        message: "Error deleting user's audio records",
        error: contentDeleteError.message,
      });
    }

    // Delete user after content cleanup
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
      logger.error(`Error deleting user ID ${id} from Supabase:`, error);
      return res.status(500).json({
        success: false,
        message: "Error deleting user",
        error: error.message,
      });
    }

    logger.info(`User ID ${id} deleted successfully. Deleted audio count: ${audioCount || 0}`);
    return res.status(200).json({ success: true, message: 'User deleted successfully', deletedAudioCount: audioCount || 0 });
  } catch (error) {
    logger.error(`Server error while deleting user ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting user",
      error: error.message,
    });
  }
};

// Bulk delete users
exports.deleteUsersBulk = async (req, res) => {
  try {
    const { ids } = req.body || {};
    logger.info(`[ADMIN USERS] Attempting bulk delete. Count: ${Array.isArray(ids) ? ids.length : 0}`);

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No user IDs provided",
      });
    }

    // Verify all users exist (optional, can be removed for performance)
    const { data: existing, error: existErr } = await supabase
      .from("users")
      .select("id")
      .in("id", ids);

    if (existErr) {
      logger.error("[ADMIN USERS] Error checking existing users for bulk delete:", existErr);
      return res.status(500).json({ success: false, message: "Error verifying users", error: existErr.message });
    }

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "No matching users found" });
    }

    // Count audio/content records for all users first
    const { count: audioCount, error: audioCountErr } = await supabase
      .from('contenthistory')
      .select('*', { count: 'exact', head: true })
      .in('user_id', ids);

    if (audioCountErr) {
      logger.error("[ADMIN USERS] Error counting contenthistory for bulk delete:", audioCountErr);
      return res.status(500).json({ success: false, message: "Error counting users' audio records", error: audioCountErr.message });
    }

    // Delete audio/content records for all users first
    logger.info(`[ADMIN USERS] Deleting contenthistory for ${ids.length} users`);
    const { error: contentBulkErr } = await supabase
      .from('contenthistory')
      .delete()
      .in('user_id', ids);

    if (contentBulkErr) {
      logger.error("[ADMIN USERS] Error bulk deleting contenthistory:", contentBulkErr);
      return res.status(500).json({ success: false, message: "Error deleting users' audio records", error: contentBulkErr.message });
    }

    // Then delete users
    const { error: deleteErr } = await supabase
      .from("users")
      .delete()
      .in("id", ids);

    if (deleteErr) {
      logger.error("[ADMIN USERS] Error bulk deleting users:", deleteErr);
      return res.status(500).json({ success: false, message: "Error deleting users", error: deleteErr.message });
    }

    logger.info(`[ADMIN USERS] Bulk delete successful for ${ids.length} users. Deleted audio count: ${audioCount || 0}`);
    return res.status(200).json({ success: true, message: "Users deleted successfully", deletedAudioCount: audioCount || 0 });
  } catch (error) {
    logger.error("[ADMIN USERS] Server error during bulk delete:", error);
    return res.status(500).json({ success: false, message: "Server error while deleting users", error: error.message });
  }
};

// Get all content
exports.getAllContent = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;
    logger.info(`Fetching content - Page: ${page}, Limit: ${limit}, Search: '${search}'`);

    let query = supabase
      .from("Content_history")
      .select("id, input, input_type, level, created_at, user_id", { count: "exact" });

    // Add search if provided
    if (search) {
      query = query.or(`input.ilike.%${search}%,level.ilike.%${search}%`);
    }

    // Add pagination
    query = query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    const { data, count, error } = await query;

    if (error) {
      logger.error("Error fetching content from Supabase:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching content",
        error: error.message,
      });
    }

    logger.info(`Successfully fetched ${data.length} content items (Total: ${count})`);
    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error("Server error while fetching content:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching content",
      error: error.message,
    });
  }
};

// Delete content
exports.deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Attempting to delete content ID: ${id}`);

    // Check if content exists
    const { data: existingContent, error: checkError } = await supabase
      .from("Content_history")
      .select("id")
      .eq("id", id)
      .single();

    if (checkError || !existingContent) {
      logger.warn(`Delete failed: Content ID ${id} not found.`);
      return res.status(404).json({
        success: false,
        message: "Content not found",
      });
    }

    // Delete content
    const { error } = await supabase.from("Content_history").delete().eq("id", id);

    if (error) {
      logger.error(`Error deleting content ID ${id} from Supabase:`, error);
      return res.status(500).json({
        success: false,
        message: "Error deleting content",
        error: error.message,
      });
    }

    logger.info(`Content ID ${id} deleted successfully.`);
    return res.status(200).json({
      success: true,
      message: "Content deleted successfully",
    });
  } catch (error) {
    logger.error(`Server error while deleting content ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting content",
      error: error.message,
    });
  }
};

// Get all subscriptions
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    logger.info(`Fetching subscriptions - Page: ${page}, Limit: ${limit}`);

    const { data, count, error } = await supabase
      .from("Subscriptions")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching subscriptions from Supabase:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching subscriptions",
        error: error.message,
      });
    }

    logger.info(`Successfully fetched ${data.length} subscriptions (Total: ${count})`);
    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error("Server error while fetching subscriptions:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching subscriptions",
      error: error.message,
    });
  }
};

// Update subscription
exports.updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    logger.info(`Attempting to update subscription ID: ${id} to status: ${status}`);

    // Validate input
    if (!status) {
      logger.warn(`Update attempt for subscription ID ${id} failed: No status provided.`);
      return res.status(400).json({
        success: false,
        message: "Please provide status",
      });
    }

    const { data, error } = await supabase
      .from("Subscriptions")
      .update({ status })
      .eq("id", id)
      .select();

    if (error) {
      logger.error(`Error updating subscription ID ${id} in Supabase:`, error);
      return res.status(500).json({
        success: false,
        message: "Error updating subscription",
        error: error.message,
      });
    }

    if (!data || data.length === 0) {
      logger.warn(`Update failed: Subscription ID ${id} not found.`);
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    logger.info(`Subscription ID ${id} updated successfully to status: ${status}.`);
    return res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
      data: data[0],
    });
  } catch (error) {
    logger.error(`Server error while updating subscription ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating subscription",
      error: error.message,
    });
  }
};

// TTS Provider ayarını getir
exports.getTtsProviderSetting = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'tts_provider')
      .single();
    if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
      logger.error('Error fetching tts_provider from settings:', error);
      return res.status(500).json({ success: false, message: 'Error fetching tts_provider' });
    }
    return res.json({ success: true, tts_provider: data ? data.value : 'amazon' }); // default: amazon
  } catch (err) {
    logger.error('Server error while fetching tts_provider:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// TTS Provider ayarını güncelle
exports.setTtsProviderSetting = async (req, res) => {
  try {
    const { tts_provider } = req.body;
    if (!['amazon', 'google'].includes(tts_provider)) {
      return res.status(400).json({ success: false, message: 'Invalid tts_provider value' });
    }
    // Upsert
    const { error } = await supabase
      .from('settings')
      .upsert([{ key: 'tts_provider', value: tts_provider }], { onConflict: ['key'] });
    if (error) {
      logger.error('Error updating tts_provider in settings:', error);
      return res.status(500).json({ success: false, message: 'Error updating tts_provider' });
    }
    return res.json({ success: true, tts_provider });
  } catch (err) {
    logger.error('Server error while updating tts_provider:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get audio (TTS) history for a specific user (ADMIN)
exports.getUserAudioHistoryAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, search = '' } = req.query;

    logger.info(`[ADMIN AUDIO] Fetching audio history for user: ${id} (page=${page}, limit=${limit}, search='${search}')`);

    const rangeFrom = (parseInt(page) - 1) * parseInt(limit);
    const rangeTo = rangeFrom + parseInt(limit) - 1;

    let query = supabase
      .from('contenthistory')
      .select(
        `id, user_id, input, input_type, level, mp3_url, translated_text, adapted_text, created_at, words, timepoints,
         openai_prompt_tokens, openai_completion_tokens, openai_total_tokens, openai_cost_usd,
         tts_characters, tts_category, tts_cost_usd, total_cost_usd`,
        { count: 'exact' }
      )
      .eq('user_id', id)
      .not('mp3_url', 'is', null);

    if (search) {
      query = query.or(`input.ilike.%${search}%,translated_text.ilike.%${search}%,adapted_text.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(rangeFrom, rangeTo);

    const { data, error, count } = await query;

    if (error) {
      logger.error('[ADMIN AUDIO] Error fetching contenthistory:', error);
      return res.status(500).json({ success: false, message: 'Error fetching user audio history' });
    }

    // Deduplicate primarily by mp3_url, fallback by id
    const seenMp3 = new Set();
    const seenId = new Set();
    const unique = (data || []).filter((row) => {
      if (!row) return false;
      const key = row.mp3_url || row.id;
      if (key && !seenMp3.has(key)) {
        seenMp3.add(key);
        if (row.id) seenId.add(row.id);
        return true;
      }
      if (row.id && !seenId.has(row.id)) {
        seenId.add(row.id);
        return true;
      }
      return false;
    });

    // Derive counts to present in columns without heavy payload on client
    const transformed = unique.map((row) => {
      let wordsCount = null;
      let timepointsCount = null;
      try {
        if (typeof row.words === 'string') {
          const parsed = JSON.parse(row.words);
          wordsCount = Array.isArray(parsed) ? parsed.length : null;
        }
      } catch {}
      try {
        if (typeof row.timepoints === 'string') {
          const parsed = JSON.parse(row.timepoints);
          timepointsCount = Array.isArray(parsed) ? parsed.length : null;
        }
      } catch {}
      return {
        ...row,
        words_count: wordsCount,
        timepoints_count: timepointsCount,
      };
    });

    logger.info(`[ADMIN AUDIO] Found ${transformed.length} unique records (total=${count || transformed.length}) for user ${id}`);

    return res.status(200).json({
      success: true,
      data: transformed,
      pagination: {
        total: count || transformed.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: count ? Math.ceil(count / parseInt(limit)) : 1,
      },
    });
  } catch (error) {
    logger.error('[ADMIN AUDIO] Server error while fetching user audio history:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single contenthistory record (ADMIN)
exports.getContentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('contenthistory')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    return res.json({ success: true, data });
  } catch (e) {
    logger.error('Error fetching content by id:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get usage summary for a specific user (ADMIN)
exports.getUserUsageSummaryAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`[ADMIN USAGE] Fetching usage summary for user: ${id}`);
    const state = await checkLimits(id);
    // Mirror subscriptionController.getUsageSummary shape
    if (!state || !state.hasPlan) {
      return res.json({ 
        success: true, 
        data: { 
          hasPlan: false,
          isExpired: state?.isExpired || false,
          expiredAt: state?.expiredAt,
          message: state?.message
        } 
      });
    }
    return res.json({
      success: true,
      data: {
        hasPlan: true,
        subscription: state.subscription,
        periodStart: state.periodStart,
        usage: state.usage,
        limits: state.limits,
        exceeded: state.exceeded,
        isExceeded: state.isExceeded,
      },
    });
  } catch (e) {
    logger.error('[ADMIN USAGE] Error:', e);
    return res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};

// Assign plan to user (ADMIN)
exports.assignPlanToUser = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { planId } = req.body;

    if (!userId || !planId) {
      return res.status(400).json({ success: false, message: 'userId ve planId gereklidir' });
    }

    logger.info(`[ADMIN] Assigning plan ${planId} to user ${userId}`);

    // Verify plan exists and is active
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      logger.error('[ADMIN] Plan not found or inactive:', planError);
      return res.status(404).json({ success: false, message: 'Plan bulunamadı veya aktif değil' });
    }

    // Create or update subscription for user
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + (plan.interval === 'yearly' ? 12 : 1));

    const subscriptionData = {
      user_id: userId,
      plantype: plan.name,
      status: 'active',
      startdate: now.toISOString(),
      enddate: endDate.toISOString(),
      stripesubscriptionid: `admin_assigned_${Date.now()}`,
      stripepriceid: plan.id,
      cancelatperiodend: false,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // Check if user already has a subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let result;
    if (existingSub) {
      // Update existing subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('id', existingSub.id)
        .select()
        .single();
      result = { data, error };
    } else {
      // Create new subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([subscriptionData])
        .select()
        .single();
      result = { data, error };
    }

    if (result.error) {
      logger.error('[ADMIN] Error assigning plan:', result.error);
      return res.status(500).json({ success: false, message: 'Paket ataması başarısız', error: result.error.message });
    }

    logger.info(`[ADMIN] Successfully assigned plan ${planId} to user ${userId}`);
    return res.json({ success: true, message: 'Paket başarıyla atandı', data: result.data });
  } catch (e) {
    logger.error('[ADMIN] Error in assignPlanToUser:', e);
    return res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};

