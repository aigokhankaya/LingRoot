-- Add Google Play product id mapping to subscription_plans
ALTER TABLE IF EXISTS public.subscription_plans
  ADD COLUMN IF NOT EXISTS google_product_id text;

CREATE INDEX IF NOT EXISTS idx_subscription_plans_google_product_id ON public.subscription_plans(google_product_id);

-- Prefill Google Play product IDs for Gold and Platinum
UPDATE public.subscription_plans 
SET google_product_id = 'com.nsyzk.lingrootmobile.gold.monthly' 
WHERE lower(name) LIKE '%gold%' AND google_product_id IS NULL;

UPDATE public.subscription_plans 
SET google_product_id = 'com.nsyzk.lingrootmobile.platinum.monthly' 
WHERE lower(name) LIKE '%platin%' AND google_product_id IS NULL;
