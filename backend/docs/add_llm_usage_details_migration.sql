-- Migration: Add llm_usage_details column to contenthistory table
-- This column stores detailed LLM usage breakdown per prompt for cost analytics
-- Format: JSON array of {prompt_name, model, prompt_tokens, completion_tokens, total_tokens}

-- Add the column if it doesn't exist
ALTER TABLE contenthistory 
ADD COLUMN IF NOT EXISTS llm_usage_details JSONB;

-- Add comment for documentation
COMMENT ON COLUMN contenthistory.llm_usage_details IS 'JSON array containing detailed LLM usage per prompt: [{prompt_name, model, prompt_tokens, completion_tokens, total_tokens}]';

-- Create index for better query performance on JSON data (optional)
CREATE INDEX IF NOT EXISTS idx_contenthistory_llm_usage_details ON contenthistory USING GIN (llm_usage_details);
