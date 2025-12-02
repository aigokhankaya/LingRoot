-- Migration: Add target_duration_minutes column to contenthistory table
-- This allows users to select desired content duration when generating audio
-- Duration options: 1.5, 5, 10, 15 minutes (with ±15% tolerance)

-- Add column to contenthistory
ALTER TABLE contenthistory
ADD COLUMN IF NOT EXISTS target_duration_minutes DECIMAL(4,1);

-- Add comment
COMMENT ON COLUMN contenthistory.target_duration_minutes IS 'User-selected target duration in minutes (1.5, 5, 10, 15)';

-- Add column to topic_contents if not exists
ALTER TABLE topic_contents
ADD COLUMN IF NOT EXISTS target_duration_minutes DECIMAL(4,1);

COMMENT ON COLUMN topic_contents.target_duration_minutes IS 'User-selected target duration in minutes (1.5, 5, 10, 15)';

-- Optional: Add index for analytics
CREATE INDEX IF NOT EXISTS idx_contenthistory_target_duration ON contenthistory(target_duration_minutes);
