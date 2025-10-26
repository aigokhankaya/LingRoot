-- Test: Add YouTube to Free Trial plan

-- 1. Check current Free Trial plan features
SELECT 
  id,
  name,
  plan_features->'homepage_features' as homepage_features
FROM subscription_plans
WHERE LOWER(name) LIKE '%trial%' OR LOWER(name) LIKE '%free%' OR is_trial = true;

-- 2. Update Free Trial to include YouTube
UPDATE subscription_plans
SET plan_features = jsonb_set(
  COALESCE(plan_features, '{}'::jsonb),
  '{homepage_features,youtube}',
  'true'::jsonb
)
WHERE LOWER(name) LIKE '%trial%' OR LOWER(name) LIKE '%free%' OR is_trial = true;

-- 3. Verify the change
SELECT 
  id,
  name,
  plan_features->'homepage_features' as homepage_features
FROM subscription_plans
WHERE LOWER(name) LIKE '%trial%' OR LOWER(name) LIKE '%free%' OR is_trial = true;

-- 4. Check user's subscription (mobile.android.tr@gmail.com is on Free Trial?)
SELECT 
  u.email,
  s.plantype,
  s.stripepriceid,
  sp.name as plan_name,
  sp.plan_features->'homepage_features' as features
FROM users u
JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN subscription_plans sp ON s.stripepriceid::uuid = sp.id
WHERE u.email = 'mobile.android.tr@gmail.com'
  AND s.status = 'active';
