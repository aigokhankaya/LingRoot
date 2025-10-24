-- Verify Free Trial plan after SQL update

-- 1. Check Free Trial plan in database
SELECT 
  id,
  name,
  is_trial,
  plan_features->'homepage_features'->>'youtube' as youtube_value,
  plan_features->'homepage_features' as all_homepage_features
FROM subscription_plans
WHERE LOWER(name) LIKE '%trial%' OR LOWER(name) LIKE '%free%' OR is_trial = true;

-- 2. Check Free Trial users and their stripepriceid
SELECT 
  u.email,
  s.user_id,
  s.plantype,
  s.stripepriceid,
  s.status,
  CASE 
    WHEN s.stripepriceid IS NULL THEN 'NULL'
    WHEN s.stripepriceid = 'null' THEN 'STRING_NULL'
    ELSE 'HAS_VALUE'
  END as stripepriceid_status
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active'
  AND (LOWER(s.plantype) LIKE '%trial%' OR LOWER(s.plantype) LIKE '%free%')
LIMIT 10;

-- 3. Check what features the API would return for Free Trial users
SELECT 
  u.email,
  s.plantype,
  s.stripepriceid,
  sp.name as plan_name,
  sp.plan_features->'homepage_features'->>'youtube' as youtube_from_plan,
  sp.plan_features->'homepage_features' as all_features
FROM subscriptions s
JOIN users u ON s.user_id = u.id
LEFT JOIN subscription_plans sp ON s.stripepriceid::uuid = sp.id
WHERE s.status = 'active'
  AND (LOWER(s.plantype) LIKE '%trial%' OR LOWER(s.plantype) LIKE '%free%')
LIMIT 10;
