-- Migration: Add notes column to user_vocabulary table
-- Date: 2025-12-27
-- Description: Backend controller tries to insert into notes column but it doesn't exist

-- Add notes column to user_vocabulary if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_vocabulary' AND column_name = 'notes'
    ) THEN
        ALTER TABLE user_vocabulary ADD COLUMN notes JSONB;
        RAISE NOTICE 'Added notes column to user_vocabulary';
    ELSE
        RAISE NOTICE 'notes column already exists in user_vocabulary';
    END IF;
END $$;
