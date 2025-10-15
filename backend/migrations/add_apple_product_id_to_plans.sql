-- Add Apple product id mapping to subscription_plans
ALTER TABLE IF EXISTS public.subscription_plans
  ADD COLUMN IF NOT EXISTS apple_product_id text;

CREATE INDEX IF NOT EXISTS idx_subscription_plans_apple_product_id ON public.subscription_plans(apple_product_id);

-- Optional: if you already use names 'Gold' and 'Platinum', prefill mappings here.
-- UPDATE public.subscription_plans SET apple_product_id = 'com.lingroot.premium.monthly' WHERE lower(name) = 'gold' AND apple_product_id IS NULL;
-- UPDATE public.subscription_plans SET apple_product_id = 'com.lingroot.premium.monthly.platin' WHERE lower(name) = 'platinum' AND apple_product_id IS NULL;
