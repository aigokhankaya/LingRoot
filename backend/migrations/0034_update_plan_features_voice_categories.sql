-- Migration: Update plan_features to use voice_categories instead of voice_models
-- Voice categories: standard, wavenet, neural2, studio, chirp3d

-- Update the default structure for new plans
ALTER TABLE subscription_plans
ALTER COLUMN plan_features SET DEFAULT '{
  "homepage_features": {
    "text_input": true,
    "youtube": true,
    "file_upload": true,
    "podcast": true,
    "topic_suggestions": true,
    "book": true
  },
  "voice_categories": {
    "standard": true,
    "wavenet": false,
    "neural2": false,
    "studio": false,
    "chirp3d": false
  },
  "sentence_patterns": {
    "enabled": false,
    "max_patterns": 0
  }
}'::jsonb;

-- Update Free Trial plans
UPDATE subscription_plans
SET plan_features = jsonb_set(
  plan_features - 'voice_models',
  '{voice_categories}',
  '{
    "standard": true,
    "wavenet": false,
    "neural2": false,
    "studio": false,
    "chirp3d": false
  }'::jsonb
)
WHERE name = 'Free Trial' OR is_trial = true;

-- Update Gold plans
UPDATE subscription_plans
SET plan_features = jsonb_set(
  plan_features - 'voice_models',
  '{voice_categories}',
  '{
    "standard": true,
    "wavenet": true,
    "neural2": true,
    "studio": false,
    "chirp3d": false
  }'::jsonb
)
WHERE LOWER(name) LIKE '%gold%';

-- Update Platinum plans
UPDATE subscription_plans
SET plan_features = jsonb_set(
  plan_features - 'voice_models',
  '{voice_categories}',
  '{
    "standard": true,
    "wavenet": true,
    "neural2": true,
    "studio": true,
    "chirp3d": true
  }'::jsonb
)
WHERE LOWER(name) LIKE '%platin%' OR LOWER(name) LIKE '%platinum%';

-- Update comment
COMMENT ON COLUMN subscription_plans.plan_features IS 'Parametric features configuration: homepage_features (which input methods are available), voice_categories (which voice quality tiers are available: standard, wavenet, neural2, studio, chirp3d), sentence_patterns (future feature)';
