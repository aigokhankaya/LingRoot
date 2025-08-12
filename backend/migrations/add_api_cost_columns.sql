-- Add cost tracking columns to contenthistory

ALTER TABLE contenthistory 
ADD COLUMN IF NOT EXISTS openai_prompt_tokens INTEGER,
ADD COLUMN IF NOT EXISTS openai_completion_tokens INTEGER,
ADD COLUMN IF NOT EXISTS openai_total_tokens INTEGER,
ADD COLUMN IF NOT EXISTS openai_cost_usd NUMERIC(12,6),
ADD COLUMN IF NOT EXISTS tts_characters INTEGER,
ADD COLUMN IF NOT EXISTS tts_category VARCHAR(32),
ADD COLUMN IF NOT EXISTS tts_cost_usd NUMERIC(12,6),
ADD COLUMN IF NOT EXISTS total_cost_usd NUMERIC(12,6);

CREATE INDEX IF NOT EXISTS idx_contenthistory_costs ON contenthistory(total_cost_usd);


