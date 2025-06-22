-- Fix adapted_text index issue
-- The current index exceeds PostgreSQL btree maximum size

-- Drop the problematic index
DROP INDEX IF EXISTS idx_contenthistory_adapted_text;

-- Create a partial index on adapted_text with limited length
-- This will index only the first 100 characters for search purposes
CREATE INDEX IF NOT EXISTS idx_contenthistory_adapted_text_partial 
ON contenthistory (LEFT(adapted_text, 100)); 