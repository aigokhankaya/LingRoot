-- Fix timepoints index issue
-- The timepoints column contains large JSON data that exceeds PostgreSQL btree maximum size
-- Since timepoints is only used for data retrieval (not search), the index is not needed

-- Drop the problematic timepoints index
DROP INDEX IF EXISTS idx_contenthistory_timepoints;

-- The words index can be kept since it's typically smaller,
-- but if it also causes issues, it can be dropped with:
-- DROP INDEX IF EXISTS idx_contenthistory_words;

-- Add comment explaining why we removed the index
COMMENT ON COLUMN contenthistory.timepoints IS 'JSON array of timepoints for word highlighting - no index needed (data too large for btree)'; 