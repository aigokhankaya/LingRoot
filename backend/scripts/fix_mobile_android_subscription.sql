-- Fix mobile.android.tr@gmail.com subscription - link to correct Platin plan

-- 1. Find the Platin plan ID
SELECT id, name, apple_product_id 
FROM subscription_plans 
WHERE LOWER(name) LIKE '%platin%';

-- 2. Check current subscription
SELECT 
  id,
  user_id,
  plantype,
  stripepriceid,
  status,
  startdate,
  enddate
FROM subscriptions
WHERE user_id = (SELECT id FROM users WHERE email = 'mobile.android.tr@gmail.com')
  AND status = 'active';

-- 3. Update subscription with correct plan ID
-- IMPORTANT: Replace 'PLATIN_PLAN_ID_HERE' with actual plan ID from query #1
UPDATE subscriptions
SET stripepriceid = (
  SELECT id::text 
  FROM subscription_plans 
  WHERE LOWER(name) LIKE '%platin%' 
  LIMIT 1
)
WHERE user_id = (SELECT id FROM users WHERE email = 'mobile.android.tr@gmail.com')
  AND status = 'active'
  AND plantype = 'Platin Plan';

-- 4. Verify the fix
SELECT 
  s.id,
  s.plantype,
  s.stripepriceid,
  sp.name as plan_name,
  sp.plan_features->'homepage_features' as homepage_features
FROM subscriptions s
LEFT JOIN subscription_plans sp ON s.stripepriceid::uuid = sp.id
WHERE s.user_id = (SELECT id FROM users WHERE email = 'mobile.android.tr@gmail.com')
  AND s.status = 'active';
