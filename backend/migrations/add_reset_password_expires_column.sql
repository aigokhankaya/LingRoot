-- Migration: Add resetPasswordExpires column to users table
-- Date: 2024-01-20

-- Check if column exists before adding
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'resetPasswordExpires'
    ) THEN
        ALTER TABLE users ADD COLUMN "resetPasswordExpires" TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Column resetPasswordExpires added successfully';
    ELSE
        RAISE NOTICE 'Column resetPasswordExpires already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('resetPasswordToken', 'resetPasswordExpires'); 