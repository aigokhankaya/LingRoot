-- Add is_test_user column to users table
-- This column determines if a user should use test environment when global test mode is enabled

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_test_user ON users(is_test_user);

-- Add comment for documentation
COMMENT ON COLUMN users.is_test_user IS 'When true and global environment is set to TEST, this user will connect to test backend in mobile app';
