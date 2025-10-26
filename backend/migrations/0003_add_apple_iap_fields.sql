-- Add Apple IAP fields to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS apple_transaction_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS apple_original_transaction_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS apple_receipt_data TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_apple_transaction_id ON subscriptions(apple_transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_apple_original_transaction_id ON subscriptions(apple_original_transaction_id);

-- Add current_period_start if not exists
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP;
