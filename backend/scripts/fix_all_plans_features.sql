-- Fix all plans to have correct plan_features configuration

-- Update Free Trial plans
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
}'::jsonb
WHERE LOWER(name) LIKE '%trial%' OR LOWER(name) LIKE '%free%' OR is_trial = true;

-- Update Gold plans
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
  "voice_categories": {
    "standard": true,
    "wavenet": true,
    "neural2": true,
    "studio": false,
    "chirp3d": false
  },
  "sentence_patterns": {
    "enabled": false,
    "max_patterns": 0
  }
}'::jsonb
WHERE LOWER(name) LIKE '%gold%';

-- Update Platinum plans
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
  "voice_categories": {
    "standard": true,
    "wavenet": true,
    "neural2": true,
    "studio": true,
    "chirp3d": true
  },
  "sentence_patterns": {
    "enabled": false,
    "max_patterns": 0
  }
}'::jsonb
WHERE LOWER(name) LIKE '%platin%' OR LOWER(name) LIKE '%platinum%';

-- Verify all plans
SELECT 
  id,
  name,
  is_trial,
  plan_features->'homepage_features' as homepage_features,
  plan_features->'voice_categories' as voice_categories
FROM subscription_plans
ORDER BY 
  CASE 
    WHEN is_trial = true THEN 1
    WHEN LOWER(name) LIKE '%gold%' THEN 2
    WHEN LOWER(name) LIKE '%platin%' THEN 3
    ELSE 4
  END;
