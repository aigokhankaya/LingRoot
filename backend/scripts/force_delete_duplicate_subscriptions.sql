-- Force delete all subscriptions for user 8a0dfe23-58bc-4280-a480-439118e74b76
-- Then create only 1 Free Trial subscription

-- 1. Check current subscriptions
SELECT 
  id,
  plantype,
  status,
  created_at
FROM subscriptions
WHERE user_id = '8a0dfe23-58bc-4280-a480-439118e74b76'
ORDER BY created_at ASC;

-- 2. Delete ALL subscriptions for this user
DELETE FROM subscriptions
WHERE user_id = '8a0dfe23-58bc-4280-a480-439118e74b76';

-- 3. Create a single new Free Trial subscription
INSERT INTO subscriptions (
  user_id,
  plantype,
  stripepriceid,
  stripesubscriptionid,
  status,
  startdate,
  enddate,
  audio_creation_count,
  created_at,
  updated_at
)
SELECT 
  '8a0dfe23-58bc-4280-a480-439118e74b76',
  'Free Trial',
  sp.id::text,
  'free_trial_8a0dfe23-58bc-4280-a480-439118e74b76',
  'active',
  NOW(),
  NOW() + INTERVAL '365 days',
  0,
  NOW(),
  NOW()
FROM subscription_plans sp
WHERE LOWER(sp.name) LIKE '%trial%' OR LOWER(sp.name) LIKE '%free%' OR sp.is_trial = true
LIMIT 1;

-- 4. Verify - should only have 1 subscription
SELECT 
  u.email,
  s.id,
  s.plantype,
  s.stripepriceid,
  s.stripesubscriptionid,
  sp.name as plan_name,
  s.status,
  s.created_at
FROM users u
JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN subscription_plans sp ON s.stripepriceid::uuid = sp.id
WHERE u.id = '8a0dfe23-58bc-4280-a480-439118e74b76';
