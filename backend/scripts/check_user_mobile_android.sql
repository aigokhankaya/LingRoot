-- Check mobile.android.tr@gmail.com user's subscription and plan features

-- 1. Get user info
SELECT 
  id,
  email,
  firstname,
  lastname,
  created_at
FROM users
WHERE email = 'mobile.android.tr@gmail.com';

-- 2. Get user's active subscription
SELECT 
  s.id as subscription_id,
  s.user_id,
  s.plantype,
  s.status,
  s.stripepriceid as plan_id,
  s.startdate,
  s.enddate,
  s.created_at
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE u.email = 'mobile.android.tr@gmail.com'
  AND s.status = 'active'
ORDER BY s.created_at DESC;

-- 3. Get plan details with features
SELECT 
  sp.id,
  sp.name,
  sp.apple_product_id,
  sp.google_product_id,
  sp.plan_features,
  sp.plan_features->'homepage_features' as homepage_features,
  sp.plan_features->'voice_categories' as voice_categories,
  sp.is_active
FROM subscription_plans sp
JOIN subscriptions s ON sp.id::text = s.stripepriceid
JOIN users u ON s.user_id = u.id
WHERE u.email = 'mobile.android.tr@gmail.com'
  AND s.status = 'active';

-- 4. Check if plan_features is NULL or empty
SELECT 
  sp.id,
  sp.name,
  CASE 
    WHEN sp.plan_features IS NULL THEN 'NULL'
    WHEN sp.plan_features::text = '{}' THEN 'EMPTY'
    ELSE 'HAS_DATA'
  END as features_status,
  sp.plan_features
FROM subscription_plans sp
WHERE LOWER(sp.name) LIKE '%platin%' OR LOWER(sp.name) LIKE '%platinum%';
