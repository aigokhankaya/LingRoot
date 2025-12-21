-- Add dialogue_segments column to contenthistory table
-- Stores JSON array of dialogue segments for dialogue-line highlighting

ALTER TABLE contenthistory
ADD COLUMN IF NOT EXISTS dialogue_segments TEXT;

CREATE INDEX IF NOT EXISTS idx_contenthistory_dialogue_segments ON contenthistory(dialogue_segments);

COMMENT ON COLUMN contenthistory.dialogue_segments IS 'JSON array of dialogue segments for dialogue highlighting';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contenthistory'
AND column_name IN ('dialogue_segments');
