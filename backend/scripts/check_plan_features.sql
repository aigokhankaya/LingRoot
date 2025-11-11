-- Check current plan features for all plans
SELECT 
  id,
  name,
  apple_product_id,
  google_product_id,
  plan_features->'homepage_features' as homepage_features,
  plan_features->'voice_categories' as voice_categories,
  is_active
FROM subscription_plans
ORDER BY 
  CASE 
    WHEN LOWER(name) LIKE '%trial%' THEN 1
    WHEN LOWER(name) LIKE '%gold%' THEN 2
    WHEN LOWER(name) LIKE '%platin%' OR LOWER(name) LIKE '%platinum%' THEN 3
    ELSE 4
  END;
