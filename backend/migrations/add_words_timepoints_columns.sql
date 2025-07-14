-- Add words and timepoints columns to contenthistory table
-- These columns will store the real timing data for word highlighting

ALTER TABLE contenthistory 
ADD COLUMN IF NOT EXISTS words TEXT,
ADD COLUMN IF NOT EXISTS timepoints TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contenthistory_words ON contenthistory(words);
CREATE INDEX IF NOT EXISTS idx_contenthistory_timepoints ON contenthistory(timepoints);

-- Add comments to describe the columns
COMMENT ON COLUMN contenthistory.words IS 'JSON array of words for TTS audio';
COMMENT ON COLUMN contenthistory.timepoints IS 'JSON array of timepoints for word highlighting';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contenthistory' 
AND column_name IN ('words', 'timepoints'); 