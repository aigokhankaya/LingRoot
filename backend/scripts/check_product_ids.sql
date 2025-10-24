-- Check all subscription plans with their product IDs
SELECT 
  id,
  name,
  price,
  is_active,
  apple_product_id,
  google_product_id,
  created_at
FROM subscription_plans
WHERE is_active = true
ORDER BY price ASC;
