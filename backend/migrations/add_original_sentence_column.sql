-- Migration: Add original_sentence column to user_vocabulary table
-- This column will store the original sentence where the word appeared in the source text

-- Add the original_sentence column
ALTER TABLE user_vocabulary 
ADD COLUMN original_sentence TEXT;

-- Add comment to the column for documentation
COMMENT ON COLUMN user_vocabulary.original_sentence IS 'The original sentence where the word appeared in the source text';

-- Create index for better search performance if needed
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_original_sentence 
ON user_vocabulary USING gin(to_tsvector('english', original_sentence)); 