-- Migration: Create table for storing extracted daily usage patterns from CEFR texts
-- Description: Persists OpenAI-generated phrase patterns for auditing and reuse

CREATE TABLE IF NOT EXISTS daily_usage_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    topic TEXT,
    level TEXT NOT NULL,
    request_id UUID,
    pattern_count INTEGER DEFAULT 0,
    patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_response TEXT,
    adapted_text_length INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_patterns_user ON daily_usage_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_usage_patterns_created_at ON daily_usage_patterns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_usage_patterns_level ON daily_usage_patterns(level);

COMMENT ON TABLE daily_usage_patterns IS 'Stores OpenAI-extracted daily usage patterns from CEFR-adapted narrations';
COMMENT ON COLUMN daily_usage_patterns.patterns IS 'JSON array of extracted phrase objects (pattern, translations, metadata)';
