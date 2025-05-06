const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const logger = require("../utils/logger"); // Import logger

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
      .from("content_history")
      .select("*", { count: "exact", head: true });

    // Get total subscriptions count
    const { count: subscriptionCount, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true });

    // Get recent users
    const { data: recentUsers, error: recentUsersError } = await supabase
      .from("users")
      .select("id, name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    // Get recent content
    const { data: recentContent, error: recentContentError } = await supabase
      .from("content_history")
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

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;
    logger.info(`Fetching users - Page: ${page}, Limit: ${limit}, Search: '${search}'`);

    let query = supabase
      .from("users")
      .select("id, name, email, role, created_at", { count: "exact" });

    // Add search if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Add pagination
    query = query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    const { data, count, error } = await query;

    if (error) {
      logger.error("Error fetching users from Supabase:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching users",
        error: error.message,
      });
    }

    logger.info(`Successfully fetched ${data.length} users (Total: ${count})`);
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
    logger.error("Server error while fetching users:", error);
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
      .select("id, name, email, role, created_at")
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

    logger.info(`Successfully fetched user ID: ${id}`);
    return res.status(200).json({
      success: true,
      data,
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
    if (name) updateData.name = name;
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

    // Delete user
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
      logger.error(`Error deleting user ID ${id} from Supabase:`, error);
      return res.status(500).json({
        success: false,
        message: "Error deleting user",
        error: error.message,
      });
    }

    logger.info(`User ID ${id} deleted successfully.`);
    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    logger.error(`Server error while deleting user ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting user",
      error: error.message,
    });
  }
};

// Get all content
exports.getAllContent = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;
    logger.info(`Fetching content - Page: ${page}, Limit: ${limit}, Search: '${search}'`);

    let query = supabase
      .from("content_history")
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
      .from("content_history")
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
    const { error } = await supabase.from("content_history").delete().eq("id", id);

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
      .from("subscriptions")
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
      .from("subscriptions")
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

