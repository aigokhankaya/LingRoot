-- Update user 8a0dfe23-58bc-4280-a480-439118e74b76 to Free Plan

-- 1. Check current subscription
SELECT 
  u.email,
  s.id as subscription_id,
  s.plantype,
  s.stripepriceid,
  s.status,
  s.startdate,
  s.enddate
FROM users u
JOIN subscriptions s ON u.id = s.user_id
WHERE u.id = '8a0dfe23-58bc-4280-a480-439118e74b76'
  AND s.status = 'active';

-- 2. Get Free Trial plan ID
SELECT 
  id,
  name,
  plan_features->'homepage_features' as homepage_features
FROM subscription_plans
WHERE LOWER(name) LIKE '%trial%' OR LOWER(name) LIKE '%free%' OR is_trial = true;

-- 3. Update subscription to Free Plan
UPDATE subscriptions
SET 
  plantype = 'Free Trial',
  stripepriceid = (
    SELECT id::text 
    FROM subscription_plans 
    WHERE LOWER(name) LIKE '%trial%' OR LOWER(name) LIKE '%free%' OR is_trial = true
    LIMIT 1
  ),
  status = 'active',
  startdate = NOW(),
  enddate = NOW() + INTERVAL '365 days',
  audio_creation_count = 0,
  updated_at = NOW()
WHERE user_id = '8a0dfe23-58bc-4280-a480-439118e74b76'
  AND status = 'active';

-- 4. Verify the update
SELECT 
  u.email,
  s.plantype,
  s.stripepriceid,
  sp.name as plan_name,
  sp.plan_features->'homepage_features' as homepage_features,
  s.startdate,
  s.enddate
FROM users u
JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN subscription_plans sp ON s.stripepriceid::uuid = sp.id
WHERE u.id = '8a0dfe23-58bc-4280-a480-439118e74b76'
  AND s.status = 'active';
