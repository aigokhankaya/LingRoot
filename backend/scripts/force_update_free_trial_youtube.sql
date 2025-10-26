-- Force update Free Trial plan to enable YouTube

-- 1. Check current state
SELECT 
  id,
  name,
  is_trial,
  plan_features
FROM subscription_plans
WHERE LOWER(name) LIKE '%trial%' OR LOWER(name) LIKE '%free%' OR is_trial = true;

-- 2. Force update with complete plan_features object
UPDATE subscription_plans
SET plan_features = '{
  "homepage_features": {
    "text_input": true,
    "youtube": true,
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

-- 3. Verify the update
SELECT 
  id,
  name,
  plan_features->'homepage_features'->>'youtube' as youtube_enabled,
  plan_features->'homepage_features' as all_homepage_features
FROM subscription_plans
WHERE LOWER(name) LIKE '%trial%' OR LOWER(name) LIKE '%free%' OR is_trial = true;

-- 4. Check user subscriptions
SELECT 
  u.email,
  s.plantype,
  s.stripepriceid,
  sp.name as plan_name,
  sp.plan_features->'homepage_features'->>'youtube' as youtube_enabled
FROM subscriptions s
JOIN users u ON s.user_id = u.id
LEFT JOIN subscription_plans sp ON s.stripepriceid::uuid = sp.id
WHERE s.status = 'active'
  AND (LOWER(s.plantype) LIKE '%trial%' OR LOWER(s.plantype) LIKE '%free%')
LIMIT 5;
