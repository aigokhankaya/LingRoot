-- Debug: Check if Free Trial plan features are saved correctly

-- 1. Find Free Trial plan and check its features
SELECT 
  id,
  name,
  is_trial,
  plan_features,
  plan_features->'homepage_features' as homepage_features,
  plan_features->'homepage_features'->>'youtube' as youtube_value
FROM subscription_plans
WHERE LOWER(name) LIKE '%trial%' OR LOWER(name) LIKE '%free%' OR is_trial = true;

-- 2. Check which user is using Free Trial
SELECT 
  u.email,
  s.plantype,
  s.stripepriceid,
  s.status
FROM users u
JOIN subscriptions s ON u.id = s.user_id
WHERE s.status = 'active'
  AND (LOWER(s.plantype) LIKE '%trial%' OR LOWER(s.plantype) LIKE '%free%');

-- 3. Check if stripepriceid is set correctly for Free Trial users
SELECT 
  u.email,
  s.plantype,
  s.stripepriceid,
  sp.name as plan_name,
  sp.plan_features->'homepage_features' as plan_homepage_features
FROM users u
JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN subscription_plans sp ON s.stripepriceid::uuid = sp.id
WHERE s.status = 'active'
  AND (LOWER(s.plantype) LIKE '%trial%' OR LOWER(s.plantype) LIKE '%free%')
LIMIT 5;
