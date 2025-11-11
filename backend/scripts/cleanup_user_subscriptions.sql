-- Clean up user 8a0dfe23-58bc-4280-a480-439118e74b76 subscriptions
-- Keep only Free Trial, delete all others

-- 1. Check all subscriptions for this user
SELECT 
  id,
  plantype,
  status,
  stripepriceid,
  stripesubscriptionid,
  created_at,
  startdate,
  enddate
FROM subscriptions
WHERE user_id = '8a0dfe23-58bc-4280-a480-439118e74b76'
ORDER BY created_at DESC;

-- 2. Keep only the oldest Free Trial subscription, delete all others
WITH oldest_free_trial AS (
  SELECT id
  FROM subscriptions
  WHERE user_id = '8a0dfe23-58bc-4280-a480-439118e74b76'
    AND (LOWER(plantype) LIKE '%trial%' OR LOWER(plantype) LIKE '%free%')
  ORDER BY created_at ASC
  LIMIT 1
)
DELETE FROM subscriptions
WHERE user_id = '8a0dfe23-58bc-4280-a480-439118e74b76'
  AND id NOT IN (SELECT id FROM oldest_free_trial);

-- 3. Update the remaining Free Trial subscription to ensure it has all required fields
UPDATE subscriptions
SET 
  plantype = 'Free Trial',
  stripepriceid = (
    SELECT id::text 
    FROM subscription_plans 
    WHERE LOWER(name) LIKE '%trial%' OR LOWER(name) LIKE '%free%' OR is_trial = true
    LIMIT 1
  ),
  stripesubscriptionid = COALESCE(stripesubscriptionid, 'free_trial_' || user_id),
  status = 'active',
  startdate = COALESCE(startdate, NOW()),
  enddate = COALESCE(enddate, NOW() + INTERVAL '365 days'),
  audio_creation_count = 0,
  updated_at = NOW()
WHERE user_id = '8a0dfe23-58bc-4280-a480-439118e74b76';

-- 4. Verify - should only have 1 Free Trial subscription
SELECT 
  u.email,
  s.id,
  s.plantype,
  s.stripepriceid,
  s.stripesubscriptionid,
  sp.name as plan_name,
  sp.plan_features->'homepage_features' as homepage_features,
  s.status,
  s.startdate,
  s.enddate
FROM users u
JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN subscription_plans sp ON s.stripepriceid::uuid = sp.id
WHERE u.id = '8a0dfe23-58bc-4280-a480-439118e74b76'
ORDER BY s.created_at DESC;
