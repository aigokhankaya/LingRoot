/**
 * Audit Log Controller
 *
 * Admin-only endpoints to query the admin_logs table.
 * Writing is handled by auditLogService (called from other controllers).
 */

const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');
const { logAdminAction, extractRequestMeta } = require('../services/auditLogService.js');

/**
 * POST /api/admin/audit-logs
 * Record an admin action from the frontend.
 * Admin identity is extracted from the JWT (req.user).
 */
exports.createAuditLog = async (req, res) => {
  try {
    const { action, targetType, targetId, details } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, message: 'action is required' });
    }

    const { ipAddress, userAgent } = extractRequestMeta(req);

    await logAdminAction({
      adminUserId: req.user?.id,
      adminEmail: req.user?.email,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      details: details || null,
      ipAddress,
      userAgent,
    });

    return res.json({ success: true, message: 'Audit log recorded' });
  } catch (err) {
    logger.error('[AUDIT_LOG] createAuditLog error:', err);
    return res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

/**
 * GET /api/admin/audit-logs
 * List audit logs with pagination and optional filters.
 *
 * Query params:
 *   page     - Page number (default 1)
 *   limit    - Items per page (default 50, max 200)
 *   action   - Filter by action (e.g. 'user.delete')
 *   targetType - Filter by target_type
 *   adminUserId - Filter by admin_user_id
 *   startDate - Filter logs after this date (ISO string)
 *   endDate   - Filter logs before this date (ISO string)
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      targetType,
      adminUserId,
      startDate,
      endDate,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('admin_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (action) query = query.eq('action', action);
    if (targetType) query = query.eq('target_type', targetType);
    if (adminUserId) query = query.eq('admin_user_id', adminUserId);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, count, error } = await query;

    if (error) {
      logger.error('[AUDIT_LOG] Query failed:', error);
      return res.status(500).json({ success: false, message: 'Audit log sorgusu başarısız' });
    }

    return res.json({
      success: true,
      data,
      pagination: {
        total: count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (err) {
    logger.error('[AUDIT_LOG] getAuditLogs error:', err);
    return res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};

/**
 * GET /api/admin/audit-logs/actions
 * Get distinct action types for filter dropdowns.
 */
exports.getAuditLogActions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admin_logs')
      .select('action')
      .limit(500);

    if (error) {
      logger.error('[AUDIT_LOG] Actions query failed:', error);
      return res.status(500).json({ success: false, message: 'Sorgu başarısız' });
    }

    // Deduplicate actions
    const actions = [...new Set((data || []).map(r => r.action))].sort();

    return res.json({ success: true, data: actions });
  } catch (err) {
    logger.error('[AUDIT_LOG] getAuditLogActions error:', err);
    return res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
};
