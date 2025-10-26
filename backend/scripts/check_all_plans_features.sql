-- Check all plans and their features configuration

SELECT 
  id,
  name,
  apple_product_id,
  google_product_id,
  is_trial,
  is_active,
  CASE 
    WHEN plan_features IS NULL THEN 'NULL'
    WHEN plan_features::text = '{}' THEN 'EMPTY'
    ELSE 'HAS_DATA'
  END as features_status,
  plan_features->'homepage_features' as homepage_features,
  plan_features->'voice_categories' as voice_categories
FROM subscription_plans
ORDER BY 
  CASE 
    WHEN is_trial = true OR LOWER(name) LIKE '%trial%' OR LOWER(name) LIKE '%free%' THEN 1
    WHEN LOWER(name) LIKE '%gold%' THEN 2
    WHEN LOWER(name) LIKE '%platin%' OR LOWER(name) LIKE '%platinum%' THEN 3
    ELSE 4
  END,
  created_at;
