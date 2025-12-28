-- Migration: Add GIN index for fast full-text search on pattern_library
-- This is required because the table has 700k+ records

-- Create GIN index for English text search
CREATE INDEX IF NOT EXISTS idx_pattern_library_text_gin 
ON pattern_library USING gin(to_tsvector('english', text));

-- Create GIN index for Turkish translation search  
CREATE INDEX IF NOT EXISTS idx_pattern_library_translation_gin
ON pattern_library USING gin(to_tsvector('simple', COALESCE(translation, '')));

-- Add regular B-tree index on type for faster filtering
CREATE INDEX IF NOT EXISTS idx_pattern_library_type_btree
ON pattern_library(type);

-- Add compound index for lang + type
CREATE INDEX IF NOT EXISTS idx_pattern_library_lang_type
ON pattern_library(lang, type);

-- Comment
COMMENT ON INDEX idx_pattern_library_text_gin IS 'GIN index for fast full-text search on text column';
