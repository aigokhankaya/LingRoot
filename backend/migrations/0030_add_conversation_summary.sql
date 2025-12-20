-- Migration: Add conversation_summary column for long-term memory
-- Purpose: Enable Liro to remember context beyond 15-message limit

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS conversation_summary TEXT;

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS summary_updated_at TIMESTAMP WITH TIME ZONE;

-- Index for faster summary lookups
CREATE INDEX IF NOT EXISTS idx_conversations_summary_updated 
ON conversations(summary_updated_at) 
WHERE conversation_summary IS NOT NULL;

COMMENT ON COLUMN conversations.conversation_summary IS 'AI-generated summary of older messages for long-term memory';
COMMENT ON COLUMN conversations.summary_updated_at IS 'Last time the summary was updated';
