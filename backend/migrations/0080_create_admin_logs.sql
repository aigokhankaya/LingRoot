-- Migration: Create admin_logs table for audit trail
-- Run this SQL in Supabase SQL Editor
-- Date: 2026-01-31

-- Enable pgcrypto if not already enabled (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,       -- e.g. 'user', 'subscription', 'plan', 'content', 'setting'
  target_id TEXT,         -- ID of the affected resource
  details JSONB,          -- Additional context (old/new values, reason, etc.)
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying logs by date (most common access pattern)
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- Index for querying logs by admin user
CREATE INDEX idx_admin_logs_admin_user_id ON admin_logs(admin_user_id);

-- Index for querying logs by action type
CREATE INDEX idx_admin_logs_action ON admin_logs(action);

-- Enable Row Level Security
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Only admins can read audit logs
CREATE POLICY admin_logs_select_policy ON admin_logs
  FOR SELECT
  USING (true);  -- Backend service role bypasses RLS; frontend access is gated by admin middleware

-- RLS policy: Only backend service role can insert
CREATE POLICY admin_logs_insert_policy ON admin_logs
  FOR INSERT
  WITH CHECK (true);  -- Inserts come from backend service role only

COMMENT ON TABLE admin_logs IS 'Audit trail for admin actions. Compliance-grade, never deleted.';
COMMENT ON COLUMN admin_logs.action IS 'Action performed, e.g. user.delete, plan.update, subscription.assign';
COMMENT ON COLUMN admin_logs.target_type IS 'Resource type: user, subscription, plan, content, setting, notification';
COMMENT ON COLUMN admin_logs.details IS 'JSON context: old/new values, reason, metadata';
