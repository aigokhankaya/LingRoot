-- Add Google Play product IDs to subscription plans
-- Based on your information:
-- Gold plan: com.nsyzk.lingrootmobile.gold.monthly
-- Platinum plan: com.nsyzk.lingroot.platinum.monthly

-- 1. Check current plans
SELECT 
  id,
  name,
  apple_product_id,
  google_product_id
FROM subscription_plans
WHERE is_active = true
  AND (LOWER(name) LIKE '%gold%' OR LOWER(name) LIKE '%platin%' OR LOWER(name) LIKE '%platinum%');

-- 2. Update Gold plan with Google Play product ID
UPDATE subscription_plans
SET google_product_id = 'com.nsyzk.lingrootmobile.gold.monthly',
    updated_at = NOW()
WHERE LOWER(name) LIKE '%gold%'
  AND is_active = true;

-- 3. Update Platinum plan with Google Play product ID
UPDATE subscription_plans
SET google_product_id = 'com.nsyzk.lingroot.platinum.monthly',
    updated_at = NOW()
WHERE (LOWER(name) LIKE '%platin%' OR LOWER(name) LIKE '%platinum%')
  AND is_active = true;

-- 4. Verify the updates
SELECT 
  id,
  name,
  apple_product_id,
  google_product_id,
  updated_at
FROM subscription_plans
WHERE is_active = true
  AND (LOWER(name) LIKE '%gold%' OR LOWER(name) LIKE '%platin%' OR LOWER(name) LIKE '%platinum%');
