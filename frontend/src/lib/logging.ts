/**
 * Frontend Audit Logging
 *
 * Calls the backend POST /api/admin/audit-logs endpoint
 * to record admin actions into the admin_logs table.
 */

const TOKEN_KEY = 'lingroot_token';

function getBaseUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5001';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://lingloops-backend.onrender.com';
}

// Define AuditLog type matching the schema
export interface AuditLog {
  id: string;
  admin_user_id?: string;
  admin_email?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Record an admin action in the audit log.
 * Fire-and-forget — never throws, never blocks the UI.
 *
 * @example
 * logAdminAction('user.delete', {
 *   targetType: 'user',
 *   targetId: userId,
 *   details: { reason: 'User requested account deletion' },
 * });
 */
export async function logAdminAction(
  action: string,
  options: {
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    fetch(`${getBaseUrl()}/api/admin/audit-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action,
        targetType: options.targetType,
        targetId: options.targetId,
        details: options.details,
      }),
    }).catch(() => {
      // silent — audit logging must not break the UI
    });
  } catch {
    // silent
  }
}

/**
 * Fetch admin audit logs from the backend.
 *
 * @param params - Optional filters (page, limit, action, targetType, etc.)
 * @returns Array of AuditLog entries with pagination metadata.
 */
export async function fetchAdminLogs(params?: {
  page?: number;
  limit?: number;
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ data: AuditLog[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
  try {
    if (typeof window === 'undefined') {
      return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    }

    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.action) query.set('action', params.action);
    if (params?.targetType) query.set('targetType', params.targetType);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);

    const res = await fetch(`${getBaseUrl()}/api/admin/audit-logs?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    return {
      data: json.data || [],
      pagination: json.pagination || { total: 0, page: 1, limit: 50, totalPages: 0 },
    };
  } catch {
    return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
  }
}
