-- Add additional columns used by the cost analytics dashboard

ALTER TABLE contenthistory 
ADD COLUMN IF NOT EXISTS tts_provider VARCHAR(32),
ADD COLUMN IF NOT EXISTS tts_voice_name TEXT,
ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS entry_source VARCHAR(64);

-- Helpful indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_contenthistory_tts_provider ON contenthistory(tts_provider);
CREATE INDEX IF NOT EXISTS idx_contenthistory_entry_source ON contenthistory(entry_source);
CREATE INDEX IF NOT EXISTS idx_contenthistory_created_at ON contenthistory(created_at);
