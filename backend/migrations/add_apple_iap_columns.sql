-- Extend subscriptions table for Apple IAP
-- Safe-guarded with IF NOT EXISTS to support varied schemas in Supabase

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS product_id text,
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id text,
  ADD COLUMN IF NOT EXISTS apple_latest_transaction_id text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS environment text;

-- Indexes to speed up lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_provider ON public.subscriptions(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_subscriptions_original_tx ON public.subscriptions(apple_original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_product_id ON public.subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at);
