-- Enable ALL homepage features for ALL plans

-- Update ALL plans to show all features
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
}'::jsonb;

-- Verify all plans now have all features
SELECT 
  id,
  name,
  is_trial,
  plan_features->'homepage_features' as homepage_features
FROM subscription_plans
ORDER BY 
  CASE 
    WHEN is_trial = true THEN 1
    WHEN LOWER(name) LIKE '%gold%' THEN 2
    WHEN LOWER(name) LIKE '%platin%' THEN 3
    ELSE 4
  END;

-- Fix ALL users' stripepriceid based on their plantype
-- Free Trial users
UPDATE subscriptions
SET stripepriceid = (
  SELECT id::text 
  FROM subscription_plans 
  WHERE LOWER(name) LIKE '%trial%' OR LOWER(name) LIKE '%free%' OR is_trial = true
  LIMIT 1
)
WHERE status = 'active'
  AND (LOWER(plantype) LIKE '%trial%' OR LOWER(plantype) LIKE '%free%')
  AND (stripepriceid IS NULL OR stripepriceid = 'null' OR stripepriceid = '');

-- Gold users
UPDATE subscriptions
SET stripepriceid = (
  SELECT id::text 
  FROM subscription_plans 
  WHERE LOWER(name) LIKE '%gold%'
  LIMIT 1
)
WHERE status = 'active'
  AND LOWER(plantype) LIKE '%gold%'
  AND (stripepriceid IS NULL OR stripepriceid = 'null' OR stripepriceid = '');

-- Platinum users
UPDATE subscriptions
SET stripepriceid = (
  SELECT id::text 
  FROM subscription_plans 
  WHERE LOWER(name) LIKE '%platin%' OR LOWER(name) LIKE '%platinum%'
  LIMIT 1
)
WHERE status = 'active'
  AND (LOWER(plantype) LIKE '%platin%' OR LOWER(plantype) LIKE '%platinum%')
  AND (stripepriceid IS NULL OR stripepriceid = 'null' OR stripepriceid = '');

-- Verify users are now linked to plans
SELECT 
  u.email,
  s.plantype,
  s.stripepriceid,
  sp.name as plan_name,
  sp.plan_features->'homepage_features' as features
FROM subscriptions s
JOIN users u ON s.user_id = u.id
LEFT JOIN subscription_plans sp ON s.stripepriceid::uuid = sp.id
WHERE s.status = 'active'
ORDER BY s.plantype
LIMIT 20;
