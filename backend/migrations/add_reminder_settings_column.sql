-- Add reminder_settings column to users table
-- This will store JSON data for user's notification preferences

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reminder_settings JSONB DEFAULT NULL;

-- Add index for better performance when querying reminder settings
CREATE INDEX IF NOT EXISTS idx_users_reminder_settings 
ON users USING GIN (reminder_settings);

-- Add comment to document the column
COMMENT ON COLUMN users.reminder_settings IS 'User notification reminder settings stored as JSON: {wordsPerDay, startTime, endTime, isEnabled}';

-- Optional: Add sample data for existing users (default settings)
-- UPDATE users 
-- SET reminder_settings = '{"wordsPerDay": 5, "startTime": "09:00", "endTime": "18:00", "isEnabled": true}'::jsonb
-- WHERE reminder_settings IS NULL; 