-- Migration: Add parametric features to subscription_plans
-- This enables dynamic feature control per plan (homepage features, voice models, etc.)

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS plan_features JSONB DEFAULT '{
  "homepage_features": {
    "text_input": true,
    "youtube": true,
    "file_upload": true,
    "podcast": true,
    "topic_suggestions": true,
    "book": true
  },
  "voice_models": {
    "openai_tts": true,
    "elevenlabs": false,
    "google_tts": true,
    "azure_tts": false
  },
  "sentence_patterns": {
    "enabled": false,
    "max_patterns": 0
  }
}'::jsonb;

-- Create index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_subscription_plans_features ON subscription_plans USING gin(plan_features);

-- Update existing plans with default features
-- Free Trial: Limited features
UPDATE subscription_plans
SET plan_features = '{
  "homepage_features": {
    "text_input": true,
    "youtube": false,
    "file_upload": false,
    "podcast": false,
    "topic_suggestions": true,
    "book": false
  },
  "voice_models": {
    "openai_tts": true,
    "elevenlabs": false,
    "google_tts": false,
    "azure_tts": false
  },
  "sentence_patterns": {
    "enabled": false,
    "max_patterns": 0
  }
}'::jsonb
WHERE name = 'Free Trial' OR is_trial = true;

-- Gold: Most features enabled
UPDATE subscription_plans
SET plan_features = '{
  "homepage_features": {
    "text_input": true,
    "youtube": true,
    "file_upload": true,
    "podcast": true,
    "topic_suggestions": true,
    "book": true
  },
  "voice_models": {
    "openai_tts": true,
    "elevenlabs": false,
    "google_tts": true,
    "azure_tts": false
  },
  "sentence_patterns": {
    "enabled": false,
    "max_patterns": 0
  }
}'::jsonb
WHERE LOWER(name) LIKE '%gold%';

-- Platinum: All features enabled
UPDATE subscription_plans
SET plan_features = '{
  "homepage_features": {
    "text_input": true,
    "youtube": true,
    "file_upload": true,
    "podcast": true,
    "topic_suggestions": true,
    "book": true
  },
  "voice_models": {
    "openai_tts": true,
    "elevenlabs": true,
    "google_tts": true,
    "azure_tts": true
  },
  "sentence_patterns": {
    "enabled": false,
    "max_patterns": 0
  }
}'::jsonb
WHERE LOWER(name) LIKE '%platin%' OR LOWER(name) LIKE '%platinum%';

-- Comment
COMMENT ON COLUMN subscription_plans.plan_features IS 'Parametric features configuration: homepage_features (which input methods are available), voice_models (which TTS providers are available), sentence_patterns (future feature)';
