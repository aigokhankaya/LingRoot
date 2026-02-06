-- Migration: Add promotion/campaign display columns to subscription_plans
-- Date: 2026-02-05
-- Purpose: Enable admin to set promotional display info per package
-- Note: Actual IAP pricing is managed in App Store Connect / Google Play Console.
--       These columns are for display purposes only.

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS promotion_active BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS promotion_discount_percentage INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS promotion_original_price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS promotion_price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS promotion_start_date TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS promotion_end_date TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS promotion_badge_text TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS promotion_description TEXT DEFAULT NULL;

-- Partial index for efficient lookup of active promotions
CREATE INDEX IF NOT EXISTS idx_subscription_plans_promotion_active
ON subscription_plans (promotion_active, promotion_end_date)
WHERE promotion_active = true;

COMMENT ON COLUMN subscription_plans.promotion_active IS 'Whether promotion is currently enabled (display only)';
COMMENT ON COLUMN subscription_plans.promotion_discount_percentage IS 'Display discount percentage (e.g. 50 for 50%)';
COMMENT ON COLUMN subscription_plans.promotion_original_price IS 'Original price in TRY for display';
COMMENT ON COLUMN subscription_plans.promotion_price IS 'Promotional price in TRY for display';
COMMENT ON COLUMN subscription_plans.promotion_start_date IS 'Campaign start date';
COMMENT ON COLUMN subscription_plans.promotion_end_date IS 'Campaign end date';
COMMENT ON COLUMN subscription_plans.promotion_badge_text IS 'Badge text shown on mobile (e.g. "%50 Indirim!")';
COMMENT ON COLUMN subscription_plans.promotion_description IS 'Optional promotional description text';
