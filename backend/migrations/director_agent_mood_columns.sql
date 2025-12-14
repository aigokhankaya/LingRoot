-- Add mood tracking columns for Director Agent integration

-- 1. Topics table: Add mood_tag
ALTER TABLE topics ADD COLUMN IF NOT EXISTS mood_tag VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_topics_mood ON topics(mood_tag);

-- 2. ContentHistory table: Add detected_mood
ALTER TABLE contenthistory ADD COLUMN IF NOT EXISTS detected_mood VARCHAR(50);

-- 3. Conversations table: Add current_mood
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS current_mood VARCHAR(50);
