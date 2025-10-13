-- Check user's subscription with plan features
SELECT 
  u.id as user_id,
  u.email,
  s.id as subscription_id,
  s.plantype,
  s.status,
  s.stripepriceid as plan_id,
  sp.name as plan_name,
  sp.plan_features
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON s.stripepriceid = sp.id
WHERE u.email = 'enersyuzak@hotmail.com'
ORDER BY s.created_at DESC
LIMIT 1;
