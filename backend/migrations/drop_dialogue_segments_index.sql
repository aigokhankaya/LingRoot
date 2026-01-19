-- Drop the problematic B-tree index on dialogue_segments
-- B-tree indexes have a max row size of 2704 bytes, which large podcasts exceed
-- This column stores JSON data and doesn't need a direct index for queries

DROP INDEX IF EXISTS idx_contenthistory_dialogue_segments;

-- If we ever need to search within dialogue_segments, use a GIN index instead:
-- CREATE INDEX IF NOT EXISTS idx_contenthistory_dialogue_segments_gin 
--   ON contenthistory USING GIN ((dialogue_segments::jsonb));
