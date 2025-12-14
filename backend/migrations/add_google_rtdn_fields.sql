-- Add Google Play RTDN (Real-Time Developer Notifications) fields to subscriptions table
-- This migration adds support for tracking Google Play subscription lifecycle events

-- Add google_subscription_status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'google_subscription_status'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN google_subscription_status VARCHAR(50);
    COMMENT ON COLUMN subscriptions.google_subscription_status IS 'Google Play subscription status: active, canceled, on_hold, grace_period, expired, revoked';
  END IF;
END $$;

-- Add google_auto_renew_status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'google_auto_renew_status'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN google_auto_renew_status BOOLEAN DEFAULT TRUE;
    COMMENT ON COLUMN subscriptions.google_auto_renew_status IS 'Whether Google Play subscription will auto-renew';
  END IF;
END $$;

-- Create index on google_subscription_status for faster filtering
CREATE INDEX IF NOT EXISTS idx_subscriptions_google_status 
ON subscriptions(google_subscription_status) 
WHERE google_subscription_status IS NOT NULL;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions' 
  AND column_name IN ('google_subscription_status', 'google_auto_renew_status')
ORDER BY column_name;
