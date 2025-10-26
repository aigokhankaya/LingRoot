-- Fix Platinum/Platin plan features to enable all homepage features
-- This ensures file_upload and book features are visible in mobile app

-- Update all Platinum/Platin plans
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
WHERE LOWER(name) LIKE '%platin%' 
   OR LOWER(name) LIKE '%platinum%'
   OR apple_product_id LIKE '%platin%';

-- Verify the update
SELECT 
  id,
  name,
  apple_product_id,
  plan_features->'homepage_features' as homepage_features,
  plan_features->'voice_categories' as voice_categories
FROM subscription_plans
WHERE LOWER(name) LIKE '%platin%' 
   OR LOWER(name) LIKE '%platinum%'
   OR apple_product_id LIKE '%platin%';
