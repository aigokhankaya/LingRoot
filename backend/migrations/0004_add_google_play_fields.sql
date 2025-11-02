-- Add Google Play IAP fields to subscriptions table
-- This migration adds support for Google Play In-App Purchases

-- Add google_purchase_token column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'google_purchase_token'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN google_purchase_token TEXT;
    COMMENT ON COLUMN subscriptions.google_purchase_token IS 'Google Play purchase token for verification';
  END IF;
END $$;

-- Create index on google_purchase_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_google_purchase_token 
ON subscriptions(google_purchase_token) 
WHERE google_purchase_token IS NOT NULL;

-- Create index on provider for faster filtering
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider 
ON subscriptions(provider);

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions' 
  AND column_name IN ('google_purchase_token', 'provider')
ORDER BY column_name;
