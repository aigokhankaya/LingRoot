-- Add reminder_settings column to users table in Supabase
-- Run this in Supabase SQL Editor

-- Add the column as JSONB type
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reminder_settings JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.reminder_settings IS 'User notification reminder settings: {wordsPerDay, startTime, endTime, isEnabled}';

-- Optional: Add some sample data for testing
-- UPDATE users 
-- SET reminder_settings = '{"wordsPerDay": 5, "startTime": "09:00", "endTime": "18:00", "isEnabled": true}'::jsonb
-- WHERE reminder_settings IS NULL 
-- AND email = 'your-test-email@domain.com';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'reminder_settings'; 