-- Add email verification columns to users table
-- Safe to run multiple times: only adds columns if they don't exist
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verification_token text,
  ADD COLUMN IF NOT EXISTS verification_expires timestamptz;
