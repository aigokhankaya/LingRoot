const { supabase, bucketName } = require('../utils/storage/supabaseClient.js');
require("dotenv").config();
const logger = require('../utils/common/logger.js'); // Import logger
const { checkLimits } = require('../utils/infra/usageLimiter.js');

// Supabase client provided by shared utility

// Cost analytics dashboard - aggregated usage & cost view (ADMIN)
exports.getCostDashboard = async (req, res) => {
  try {
    const { from, to } = req.query;

    // Date range: default last 30 days
    const now = new Date();
    const toDate = to ? new Date(String(to)) : now;
    const fromDate = from ? new Date(String(from)) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const fromIso = fromDate.toISOString();
    const toIso = toDate.toISOString();

    logger.info(`[ADMIN COST] Fetching cost dashboard from ${fromIso} to ${toIso}`);

    // 1) Overview: totals for whole range
    const { data: overviewRows, error: overviewError } = await supabase
      .from('contenthistory')
      .select('user_id, audio_duration_seconds, openai_cost_usd, tts_cost_usd, total_cost_usd')
      .gte('created_at', fromIso)
      .lt('created_at', toIso);

    if (overviewError) {
      logger.error('[ADMIN COST] Overview query failed:', overviewError);
      return res.status(500).json({ success: false, message: 'Error fetching cost overview' });
    }

    let totalAudioSeconds = 0;
    let totalOpenAiCost = 0;
    let totalTtsCost = 0;
    let totalCost = 0;
    const userIdsSet = new Set();

    (overviewRows || []).forEach(row => {
      if (!row) return;
      if (row.user_id) userIdsSet.add(row.user_id);
      totalAudioSeconds += Number(row.audio_duration_seconds || 0);
      totalOpenAiCost += Number(row.openai_cost_usd || 0);
      totalTtsCost += Number(row.tts_cost_usd || 0);
      totalCost += Number(row.total_cost_usd || 0);
    });

    const totalAudioMinutes = totalAudioSeconds / 60;
    const activeUsers = userIdsSet.size;

    const overview = {
      from: fromIso,
      to: toIso,
      total_cost_usd: Number(totalCost.toFixed(4)),
      tts_cost_usd: Number(totalTtsCost.toFixed(4)),
      openai_cost_usd: Number(totalOpenAiCost.toFixed(4)),
      total_audio_minutes: Number(totalAudioMinutes.toFixed(2)),
      active_users: activeUsers,
      avg_cost_per_user: activeUsers > 0 ? Number((totalCost / activeUsers).toFixed(4)) : 0,
    };

    // 2) By user: aggregate per user_id
    const userAggMap = new Map();
    (overviewRows || []).forEach(row => {
      if (!row || !row.user_id) return;
      const key = row.user_id;
      const current = userAggMap.get(key) || {
        user_id: key,
        audio_seconds: 0,
        openai_cost_usd: 0,
        tts_cost_usd: 0,
        total_cost_usd: 0,
      };
      current.audio_seconds += Number(row.audio_duration_seconds || 0);
      current.openai_cost_usd += Number(row.openai_cost_usd || 0);
      current.tts_cost_usd += Number(row.tts_cost_usd || 0);
      current.total_cost_usd += Number(row.total_cost_usd || 0);
      userAggMap.set(key, current);
    });

    const byUser = Array.from(userAggMap.values()).map(u => ({
      user_id: u.user_id,
      audio_minutes: Number((u.audio_seconds / 60).toFixed(2)),
      openai_cost_usd: Number(u.openai_cost_usd.toFixed(4)),
      tts_cost_usd: Number(u.tts_cost_usd.toFixed(4)),
      total_cost_usd: Number(u.total_cost_usd.toFixed(4)),
    }));

    // En pahalı kullanıcıları öne almak için sıralayalım
    byUser.sort((a, b) => b.total_cost_usd - a.total_cost_usd);

    // 3) By provider & category
    const { data: providerRows, error: providerError } = await supabase
      .from('contenthistory')
      .select('tts_provider, tts_category, tts_characters, tts_cost_usd, audio_duration_seconds')
      .gte('created_at', fromIso)
      .lt('created_at', toIso);

    if (providerError) {
      logger.error('[ADMIN COST] Provider/category query failed:', providerError);
      return res.status(500).json({ success: false, message: 'Error fetching provider cost breakdown' });
    }

    const providerMap = new Map();
    (providerRows || []).forEach(row => {
      if (!row) return;
      const key = `${row.tts_provider || 'unknown'}__${row.tts_category || 'unknown'}`;
      const current = providerMap.get(key) || {
        tts_provider: row.tts_provider || 'unknown',
        tts_category: row.tts_category || 'unknown',
        tts_characters: 0,
        tts_cost_usd: 0,
        audio_seconds: 0,
      };
      current.tts_characters += Number(row.tts_characters || 0);
      current.tts_cost_usd += Number(row.tts_cost_usd || 0);
      current.audio_seconds += Number(row.audio_duration_seconds || 0);
      providerMap.set(key, current);
    });

    const byProviderCategory = Array.from(providerMap.values()).map(p => ({
      tts_provider: p.tts_provider,
      tts_category: p.tts_category,
      tts_characters: p.tts_characters,
      tts_cost_usd: Number(p.tts_cost_usd.toFixed(4)),
      audio_minutes: Number((p.audio_seconds / 60).toFixed(2)),
    }));

    // 4) By entry_source (client section / usage source)
    const { data: sourceRows, error: sourceError } = await supabase
      .from('contenthistory')
      .select('entry_source, openai_cost_usd, tts_cost_usd, total_cost_usd, audio_duration_seconds')
      .gte('created_at', fromIso)
      .lt('created_at', toIso);

    if (sourceError) {
      logger.error('[ADMIN COST] Entry source query failed:', sourceError);
      return res.status(500).json({ success: false, message: 'Error fetching source cost breakdown' });
    }

    const sourceMap = new Map();
    (sourceRows || []).forEach(row => {
      if (!row) return;
      const key = row.entry_source || 'unknown';
      const current = sourceMap.get(key) || {
        entry_source: key,
        openai_cost_usd: 0,
        tts_cost_usd: 0,
        total_cost_usd: 0,
        audio_seconds: 0,
      };
      current.openai_cost_usd += Number(row.openai_cost_usd || 0);
      current.tts_cost_usd += Number(row.tts_cost_usd || 0);
      current.total_cost_usd += Number(row.total_cost_usd || 0);
      current.audio_seconds += Number(row.audio_duration_seconds || 0);
      sourceMap.set(key, current);
    });

    const byEntrySource = Array.from(sourceMap.values()).map(s => ({
      entry_source: s.entry_source,
      openai_cost_usd: Number(s.openai_cost_usd.toFixed(4)),
      tts_cost_usd: Number(s.tts_cost_usd.toFixed(4)),
      total_cost_usd: Number(s.total_cost_usd.toFixed(4)),
      audio_minutes: Number((s.audio_seconds / 60).toFixed(2)),
    }));

    // 5) Raw items list for per-operation tracking (limited for performance)
    const { data: itemRows, error: itemError } = await supabase
      .from('contenthistory')
      .select('id, created_at, entry_source, input_type, audio_duration_seconds, openai_cost_usd, tts_cost_usd, total_cost_usd, tts_provider, tts_category, tts_voice_name, llm_usage_details, openai_prompt_tokens, openai_completion_tokens, openai_total_tokens')
      .gte('created_at', fromIso)
      .lt('created_at', toIso)
      .order('created_at', { ascending: false })
      .limit(200);

    if (itemError) {
      logger.error('[ADMIN COST] Items query failed:', itemError);
      return res.status(500).json({ success: false, message: 'Error fetching cost items' });
    }

    const defaultLlmModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';

    const items = (itemRows || []).map(row => {
      // Parse llm_usage_details if it exists
      let llmUsageDetails = null;
      if (row.llm_usage_details) {
        try {
          llmUsageDetails = typeof row.llm_usage_details === 'string'
            ? JSON.parse(row.llm_usage_details)
            : row.llm_usage_details;
        } catch (e) {
          logger.warn(`[ADMIN COST] Failed to parse llm_usage_details for item ${row.id}`);
        }
      }

      // Determine effective LLM model for the operation:
      // - If there is exactly one usage record, use that record's model
      // - If there are multiple records but all share the same model, use that model
      // - Otherwise, fall back to the default model
      let effectiveModel = null;
      const hasLlmCost = row.openai_cost_usd && Number(row.openai_cost_usd) > 0;
      if (hasLlmCost) {
        if (Array.isArray(llmUsageDetails) && llmUsageDetails.length === 1 && llmUsageDetails[0]?.model) {
          effectiveModel = llmUsageDetails[0].model;
        } else if (Array.isArray(llmUsageDetails) && llmUsageDetails.length > 1) {
          const uniqueModels = [...new Set(llmUsageDetails
            .map(d => d && d.model)
            .filter(Boolean))];
          if (uniqueModels.length === 1) {
            effectiveModel = uniqueModels[0];
          }
        }

        if (!effectiveModel) {
          effectiveModel = defaultLlmModel;
        }
      }

      return {
        id: row.id,
        created_at: row.created_at,
        entry_source: row.entry_source || row.input_type || 'unknown',
        input_type: row.input_type || null,
        audio_minutes: row.audio_duration_seconds ? Number((Number(row.audio_duration_seconds) / 60).toFixed(2)) : null,
        // LLM side (currently OpenAI-only in this flow)
        llm_service: hasLlmCost ? 'openai' : null,
        llm_model: hasLlmCost ? effectiveModel : null,
        llm_cost_usd: row.openai_cost_usd != null ? Number(Number(row.openai_cost_usd).toFixed(6)) : 0,
        // Token details
        openai_prompt_tokens: row.openai_prompt_tokens || 0,
        openai_completion_tokens: row.openai_completion_tokens || 0,
        openai_total_tokens: row.openai_total_tokens || 0,
        // TTS side
        tts_provider: row.tts_provider || null,
        tts_category: row.tts_category || null,
        tts_voice_name: row.tts_voice_name || null,
        tts_cost_usd: row.tts_cost_usd != null ? Number(Number(row.tts_cost_usd).toFixed(6)) : 0,
        total_cost_usd: row.total_cost_usd != null ? Number(Number(row.total_cost_usd).toFixed(6)) : null,
        // Detailed LLM usage breakdown per prompt
        llm_usage_details: llmUsageDetails,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        overview,
        by_user: byUser,
        by_provider_category: byProviderCategory,
        by_entry_source: byEntrySource,
        items,
      },
    });
  } catch (error) {
    logger.error('[ADMIN COST] getCostDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Server error while fetching cost dashboard', error: error.message });
  }
};

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

    // Fetch active subscriptions for all users
    const userIds = (users || []).map(u => u.id);
    let subscriptionsMap = {};

    if (userIds.length > 0) {
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, plantype, status, enddate')
        .in('user_id', userIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (subError) {
        logger.warn('[ADMIN USERS] Error fetching subscriptions:', subError);
      } else {
        // Create a map of user_id to their active subscription
        (subscriptions || []).forEach(sub => {
          if (!subscriptionsMap[sub.user_id]) {
            subscriptionsMap[sub.user_id] = sub;
          }
        });
      }
    }

    // Transform users data to match frontend format with real subscription data
    const transformedUsers = (users || []).map(user => {
      const activeSub = subscriptionsMap[user.id];
      let packageName = 'Ücretsiz'; // Default

      if (activeSub && activeSub.plantype) {
        packageName = activeSub.plantype;
      }

      return {
        id: user.id,
        name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'N/A',
        email: user.email,
        status: user.isverified ? 'aktif' : 'pasif',
        package: packageName,
        registrationDate: new Date(user.created_at).toLocaleDateString('tr-TR'),
        lastLogin: user.updated_at ? new Date(user.updated_at).toLocaleDateString('tr-TR') : 'Hiç',
        role: user.role || 'user',
        phone: user.phonenumber
      };
    });

    logger.info(`[ADMIN USERS] Successfully transformed ${transformedUsers.length} users with subscription data`);

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

    // Use pool to get is_test_user field (not available in Supabase schema yet)
    const pool = require('../config/db');
    const result = await pool.query(
      'SELECT id, firstname, lastname, email, role, created_at, updated_at, phonenumber, isverified, is_test_user FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      logger.warn(`User not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const data = result.rows[0];

    // Fetch active subscription info
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, plantype, status, startdate, enddate, created_at')
      .eq('user_id', id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      logger.warn(`Error fetching subscription for user ID ${id}:`, subError);
    }

    // Add subscription info to response (normalize field names for frontend)
    const userData = {
      ...data,
      currentSubscription: subscription ? {
        ...subscription,
        start_date: subscription.startdate,
        end_date: subscription.enddate
      } : null
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

// Update user test status
exports.updateUserTestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isTestUser } = req.body;
    logger.info(`Attempting to update test status for user ID: ${id} to ${isTestUser}`);

    // Validate input
    if (typeof isTestUser !== 'boolean') {
      logger.warn(`Update test status failed for user ID ${id}: Invalid isTestUser value.`);
      return res.status(400).json({
        success: false,
        message: "isTestUser must be a boolean value",
      });
    }

    // Update using pool (direct PostgreSQL query)
    const pool = require('../config/db');
    const result = await pool.query(
      'UPDATE users SET is_test_user = $1 WHERE id = $2 RETURNING id, email, is_test_user',
      [isTestUser, id]
    );

    if (result.rows.length === 0) {
      logger.warn(`Update test status failed: User ID ${id} not found.`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    logger.info(`User ID ${id} test status updated successfully to ${isTestUser}.`);
    return res.status(200).json({
      success: true,
      message: "User test status updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    logger.error(`Server error while updating test status for user ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating user test status",
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
    if (!['amazon', 'google', 'azure'].includes(tts_provider)) {
      return res.status(400).json({ success: false, message: 'Invalid tts_provider value. Must be: amazon, google, or azure' });
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
         tts_characters, tts_category, tts_cost_usd, total_cost_usd, processing_duration_ms`,
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
      } catch { }
      try {
        if (typeof row.timepoints === 'string') {
          const parsed = JSON.parse(row.timepoints);
          timepointsCount = Array.isArray(parsed) ? parsed.length : null;
        }
      } catch { }
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
        plan: state.plan,
        plantype: state.plan?.name,
        periodStart: state.periodStart,
        usage: state.usage,
        limits: state.limits,
        exceeded: state.exceeded,
        isExceeded: state.isExceeded,
        // Free Trial özel alanları
        isFreeTrialExhausted: state.isFreeTrialExhausted || false,
        audioCreationCount: state.audioCreationCount,
        maxAudioCount: state.maxAudioCount,
        remainingAudioCount: state.remainingAudioCount,
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

// Update environment setting (ADMIN)
exports.updateEnvironment = async (req, res) => {
  try {
    const { environment } = req.body;

    // Validate environment value
    if (!environment || !['production', 'test'].includes(environment)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid environment. Must be "production" or "test"'
      });
    }

    logger.info(`[ADMIN] Updating environment to: ${environment}`);

    // Update or insert environment setting
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'environment', value: environment }, { onConflict: 'key' });

    if (error) {
      logger.error('[ADMIN] Error updating environment:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update environment setting'
      });
    }

    logger.info(`[ADMIN] Successfully updated environment to: ${environment}`);
    return res.json({
      success: true,
      message: `Environment updated to ${environment}`,
      data: { environment }
    });
  } catch (e) {
    logger.error('[ADMIN] Error in updateEnvironment:', e);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: e.message
    });
  }
};

// Get payment environment setting (ADMIN)
exports.getPaymentEnvironment = async (req, res) => {
  try {
    logger.info('[ADMIN] Fetching payment environment setting');

    const { data: setting, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'payment_environment')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error('[ADMIN] Error fetching payment environment:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payment environment setting'
      });
    }

    const paymentEnvironment = setting?.value || 'production';

    logger.info(`[ADMIN] Payment environment: ${paymentEnvironment}`);
    return res.json({
      success: true,
      data: { paymentEnvironment }
    });
  } catch (e) {
    logger.error('[ADMIN] Error in getPaymentEnvironment:', e);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: e.message
    });
  }
};

// Update payment environment setting (ADMIN)
exports.updatePaymentEnvironment = async (req, res) => {
  try {
    const { paymentEnvironment } = req.body;

    // Validate payment environment value
    if (!paymentEnvironment || !['production', 'test'].includes(paymentEnvironment)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment environment. Must be "production" or "test"'
      });
    }

    logger.info(`[ADMIN] Updating payment environment to: ${paymentEnvironment}`);

    // Update or insert payment environment setting
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'payment_environment', value: paymentEnvironment }, { onConflict: 'key' });

    if (error) {
      logger.error('[ADMIN] Error updating payment environment:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update payment environment setting'
      });
    }

    logger.info(`[ADMIN] Successfully updated payment environment to: ${paymentEnvironment}`);
    return res.json({
      success: true,
      message: `Payment environment updated to ${paymentEnvironment}`,
      data: { paymentEnvironment }
    });
  } catch (e) {
    logger.error('[ADMIN] Error in updatePaymentEnvironment:', e);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: e.message
    });
  }
};

// Delete audio files from storage and database (ADMIN)
exports.deleteAudioFiles = async (req, res) => {
  try {
    const { audioIds } = req.body;

    if (!Array.isArray(audioIds) || audioIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No audio IDs provided'
      });
    }

    logger.info(`[ADMIN AUDIO DELETE] Attempting to delete ${audioIds.length} audio files`);

    // Get audio records with mp3_url
    const { data: audioRecords, error: fetchError } = await supabase
      .from('contenthistory')
      .select('id, mp3_url, user_id')
      .in('id', audioIds);

    if (fetchError) {
      logger.error('[ADMIN AUDIO DELETE] Error fetching audio records:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Error fetching audio records',
        error: fetchError.message
      });
    }

    if (!audioRecords || audioRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No audio records found'
      });
    }

    // Extract storage paths from mp3_url
    const storagePaths = [];
    const vttPaths = [];

    for (const record of audioRecords) {
      if (record.mp3_url) {
        try {
          // Extract path from URL
          // Example URL: https://xxx.supabase.co/storage/v1/object/public/audio/audio/user123/file.mp3
          const url = new URL(record.mp3_url);
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)/);

          if (pathMatch && pathMatch[1]) {
            const storagePath = pathMatch[1];
            storagePaths.push(storagePath);

            // Also add VTT file path (replace .mp3 with .vtt)
            const vttPath = storagePath.replace(/\.mp3$/, '.vtt');
            vttPaths.push(vttPath);

            logger.info(`[ADMIN AUDIO DELETE] Extracted paths - MP3: ${storagePath}, VTT: ${vttPath}`);
          }
        } catch (e) {
          logger.warn(`[ADMIN AUDIO DELETE] Could not parse URL: ${record.mp3_url}`, e);
        }
      }
    }

    // Delete files from Supabase Storage
    let deletedFromStorage = 0;
    if (storagePaths.length > 0 && bucketName) {
      try {
        // Delete MP3 files
        const { error: mp3DeleteError } = await supabase.storage
          .from(bucketName)
          .remove(storagePaths);

        if (mp3DeleteError) {
          logger.error('[ADMIN AUDIO DELETE] Error deleting MP3 files from storage:', mp3DeleteError);
        } else {
          deletedFromStorage += storagePaths.length;
          logger.info(`[ADMIN AUDIO DELETE] Deleted ${storagePaths.length} MP3 files from storage`);
        }

        // Delete VTT files (ignore errors as they might not exist)
        const { error: vttDeleteError } = await supabase.storage
          .from(bucketName)
          .remove(vttPaths);

        if (vttDeleteError) {
          logger.warn('[ADMIN AUDIO DELETE] Some VTT files could not be deleted (might not exist):', vttDeleteError);
        } else {
          logger.info(`[ADMIN AUDIO DELETE] Deleted ${vttPaths.length} VTT files from storage`);
        }
      } catch (storageError) {
        logger.error('[ADMIN AUDIO DELETE] Exception during storage deletion:', storageError);
      }
    }

    // Delete records from contenthistory table
    const { error: dbDeleteError } = await supabase
      .from('contenthistory')
      .delete()
      .in('id', audioIds);

    if (dbDeleteError) {
      logger.error('[ADMIN AUDIO DELETE] Error deleting from contenthistory:', dbDeleteError);
      return res.status(500).json({
        success: false,
        message: 'Error deleting audio records from database',
        error: dbDeleteError.message
      });
    }

    logger.info(`[ADMIN AUDIO DELETE] Successfully deleted ${audioIds.length} records from database and ${deletedFromStorage} files from storage`);

    return res.json({
      success: true,
      message: `Successfully deleted ${audioIds.length} audio records`,
      deletedCount: audioIds.length,
      deletedFromStorage: deletedFromStorage
    });

  } catch (error) {
    logger.error('[ADMIN AUDIO DELETE] Server error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting audio files',
      error: error.message
    });
  }
};

// Downgrade expired subscriptions to Free Trial
exports.downgradeExpiredSubscriptions = async (req, res) => {
  try {
    logger.info('[ADMIN] Manual trigger: downgrading expired subscriptions to Free Trial');

    const { downgradeAllExpiredSubscriptions } = require('../utils/infra/subscriptionDowngrader.js');
    const result = await downgradeAllExpiredSubscriptions();

    if (result.error) {
      logger.error('[ADMIN] Downgrade failed:', result.error);
      return res.status(500).json({
        success: false,
        message: result.error,
      });
    }

    logger.info(`[ADMIN] Downgrade completed. Processed: ${result.processed}, Succeeded: ${result.succeeded}, Failed: ${result.failed}`);

    return res.status(200).json({
      success: true,
      message: `Süresi dolmuş ${result.processed} abonelik işlendi. Başarılı: ${result.succeeded}, Başarısız: ${result.failed}`,
      data: result,
    });
  } catch (error) {
    logger.error('[ADMIN] Server error during subscription downgrade:', error);
    return res.status(500).json({
      success: false,
      message: 'Abonelikleri düşürürken sunucu hatası oluştu',
      error: error.message,
    });
  }
};
