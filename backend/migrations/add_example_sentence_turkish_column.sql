-- Migration: Add example_sentence_turkish column to user_vocabulary table
-- This column will store the Turkish translation of the example sentence

-- Add the example_sentence_turkish column
ALTER TABLE user_vocabulary 
ADD COLUMN example_sentence_turkish TEXT;

-- Add comment to the column for documentation
COMMENT ON COLUMN user_vocabulary.example_sentence_turkish IS 'Turkish translation of the example sentence';

-- Create index for better search performance if needed
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_example_sentence_turkish 
ON user_vocabulary USING gin(to_tsvector('turkish', example_sentence_turkish)); 