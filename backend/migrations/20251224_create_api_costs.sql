-- Create api_costs table for centralized API cost tracking
-- This table tracks ALL API usage: OpenAI, Google TTS, Amazon Polly, etc.

CREATE TABLE IF NOT EXISTS api_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- What triggered this cost
    feature TEXT NOT NULL,              -- e.g., 'topic_subtopics', 'podcast_creation', 'chat_lori', 'standard_tts'
    
    -- Provider details
    provider TEXT NOT NULL,             -- e.g., 'openai', 'google_tts', 'aws_polly'
    model TEXT,                         -- e.g., 'gpt-4o-mini', 'en-US-Neural2-A', 'Joanna'
    
    -- Usage metrics
    input_quantity INTEGER DEFAULT 0,   -- tokens for OpenAI, characters for TTS
    output_quantity INTEGER DEFAULT 0,  -- completion tokens for OpenAI, 0 for TTS
    
    -- Cost
    cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
    
    -- Additional context
    metadata JSONB,                     -- e.g., { "topic_id": "...", "content_id": "..." }
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_api_costs_user_id ON api_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_costs_created_at ON api_costs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_costs_feature ON api_costs(feature);
CREATE INDEX IF NOT EXISTS idx_api_costs_provider ON api_costs(provider);
CREATE INDEX IF NOT EXISTS idx_api_costs_user_created ON api_costs(user_id, created_at DESC);

-- Comment
COMMENT ON TABLE api_costs IS 'Centralized tracking of all external API costs (OpenAI, Google TTS, AWS Polly, etc.)';
