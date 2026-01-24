-- Migration: Add processing_duration_ms column to contenthistory
-- Purpose: Track how long it takes to generate audio content
-- Date: 2025-12-26

-- Add processing duration column (in milliseconds)
ALTER TABLE contenthistory
ADD COLUMN IF NOT EXISTS processing_duration_ms INTEGER DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN contenthistory.processing_duration_ms IS 'Time taken to generate audio in milliseconds, from request start to completion';

-- Optional: Add index for performance analytics queries
-- CREATE INDEX IF NOT EXISTS idx_contenthistory_processing_duration ON contenthistory(processing_duration_ms) WHERE processing_duration_ms IS NOT NULL;
