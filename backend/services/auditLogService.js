/**
 * Audit Log Service
 *
 * Provides a reusable function to record admin actions
 * into the admin_logs table for compliance and traceability.
 */

const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');

/**
 * Record an admin action in the audit log.
 * Fire-and-forget — never throws, never blocks the caller.
 *
 * @param {object} params
 * @param {string} params.adminUserId - UUID of the admin performing the action
 * @param {string} params.adminEmail  - Email of the admin (denormalized for quick lookup)
 * @param {string} params.action      - Action identifier, e.g. 'user.delete', 'plan.update'
 * @param {string} [params.targetType] - Resource type: 'user', 'subscription', 'plan', etc.
 * @param {string} [params.targetId]   - ID of the affected resource
 * @param {object} [params.details]    - Additional context (old/new values, reason)
 * @param {string} [params.ipAddress]  - Client IP address
 * @param {string} [params.userAgent]  - Client User-Agent header
 */
async function logAdminAction({
  adminUserId,
  adminEmail,
  action,
  targetType = null,
  targetId = null,
  details = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const { error } = await supabase
      .from('admin_logs')
      .insert([{
        admin_user_id: adminUserId,
        admin_email: adminEmail,
        action,
        target_type: targetType,
        target_id: targetId,
        details,
        ip_address: ipAddress,
        user_agent: userAgent,
      }]);

    if (error) {
      logger.error('[AUDIT_LOG] Insert failed:', error);
    } else {
      logger.info('[AUDIT_LOG] Recorded', { action, targetType, targetId, adminEmail });
    }
  } catch (err) {
    // Audit logging must never crash the application
    logger.error('[AUDIT_LOG] Unexpected error:', err);
  }
}

/**
 * Extract IP and User-Agent from an Express request object.
 * @param {import('express').Request} req
 * @returns {{ ipAddress: string|null, userAgent: string|null }}
 */
function extractRequestMeta(req) {
  const forwarded = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  return {
    ipAddress: forwarded || req.ip || req.connection?.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

module.exports = {
  logAdminAction,
  extractRequestMeta,
};
