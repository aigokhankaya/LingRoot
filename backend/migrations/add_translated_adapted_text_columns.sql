-- Migration: Add translated_text and adapted_text columns to contenthistory table
-- Created: 2025-01-20

-- Add new columns to contenthistory table
ALTER TABLE contenthistory 
ADD COLUMN IF NOT EXISTS translated_text TEXT,
ADD COLUMN IF NOT EXISTS adapted_text TEXT;

-- Add comments to describe the columns
COMMENT ON COLUMN contenthistory.translated_text IS 'English translation of the original input text';
COMMENT ON COLUMN contenthistory.adapted_text IS 'CEFR level adapted English text ready for TTS';

-- Create index for faster searches on adapted_text (since it will be displayed in UI)
CREATE INDEX IF NOT EXISTS idx_contenthistory_adapted_text ON contenthistory(adapted_text);

-- Update existing records to have empty translated_text and adapted_text
-- (This is safe since we're adding nullable columns)
UPDATE contenthistory 
SET translated_text = '', adapted_text = '' 
WHERE translated_text IS NULL OR adapted_text IS NULL; 