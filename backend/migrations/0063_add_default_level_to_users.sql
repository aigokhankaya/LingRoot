-- Migration: Add default_level and cefr_level columns to users table
-- default_level: Content difficulty preference
-- cefr_level: Vocabulary proficiency level (from placement test)

ALTER TABLE users
ADD COLUMN IF NOT EXISTS default_level VARCHAR(10) DEFAULT 'B1';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS cefr_level VARCHAR(10) DEFAULT 'B1';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS vocabulary_size_estimate INTEGER DEFAULT 2500;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS placement_test_at TIMESTAMP WITH TIME ZONE;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_default_level ON users(default_level);
CREATE INDEX IF NOT EXISTS idx_users_cefr_level ON users(cefr_level);

-- Update comments
COMMENT ON COLUMN users.default_level IS 'User preferred content difficulty level (A1-C2)';
COMMENT ON COLUMN users.cefr_level IS 'User vocabulary/language proficiency level from placement test (A1-C2)';
