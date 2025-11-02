-- Check if Google Play columns exist

-- 1. Check subscriptions table - NEW column
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions' 
  AND column_name IN ('google_purchase_token', 'provider')
ORDER BY column_name;

-- 2. Check subscription_plans table - EXISTING columns (should already exist)
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'subscription_plans' 
  AND column_name IN ('apple_product_id', 'google_product_id')
ORDER BY column_name;

-- 3. Check existing indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'subscriptions'
  AND (indexname LIKE '%google%' OR indexname LIKE '%provider%')
ORDER BY indexname;

-- 4. Sample data check (if any Google subscriptions exist)
SELECT 
  id,
  user_id,
  plantype,
  provider,
  google_purchase_token,
  status,
  startdate,
  enddate
FROM subscriptions
WHERE provider = 'google'
ORDER BY created_at DESC
LIMIT 5;
