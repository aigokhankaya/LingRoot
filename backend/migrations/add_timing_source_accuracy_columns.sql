-- Add timing source metadata columns to contenthistory
-- Used to distinguish MFA, Groq Whisper, and fallback timing generation paths

ALTER TABLE contenthistory
ADD COLUMN IF NOT EXISTS timing_source VARCHAR(64),
ADD COLUMN IF NOT EXISTS timing_accuracy VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_contenthistory_timing_source
ON contenthistory(timing_source);

COMMENT ON COLUMN contenthistory.timing_source IS 'Timing provider used for word highlighting, e.g. MFA, GROQ_WHISPER, TTS';
COMMENT ON COLUMN contenthistory.timing_accuracy IS 'Timing quality classification, e.g. forced_alignment_word_timestamp, asr_word_timestamp, estimated_word_timing';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contenthistory'
AND column_name IN ('timing_source', 'timing_accuracy');
