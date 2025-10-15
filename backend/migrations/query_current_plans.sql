-- Query to view current subscription plans and their limits
SELECT 
  id,
  name,
  description,
  price,
  interval,
  is_active,
  is_trial,
  trial_days,
  -- Limitler
  monthly_cost_limit_usd,
  openai_token_limit,
  tts_char_limit,
  -- Apple IAP
  apple_product_id,
  -- Özellikler
  features,
  -- Tarihler
  created_at,
  updated_at
FROM subscription_plans
WHERE is_active = true
ORDER BY 
  CASE 
    WHEN name = 'Free Trial' THEN 1
    WHEN name = 'Gold' THEN 2
    WHEN name = 'Platinum' THEN 3
    ELSE 4
  END;

-- Aktif kullanıcı aboneliklerini görmek için:
-- SELECT 
--   s.id,
--   s.user_id,
--   u.email,
--   u.full_name,
--   sp.name as plan_name,
--   s.status,
--   s.audio_creation_count,
--   s.current_period_start,
--   s.current_period_end
-- FROM subscriptions s
-- JOIN users u ON u.id = s.user_id
-- JOIN subscription_plans sp ON sp.id = s.plan_id
-- WHERE s.status = 'active'
-- ORDER BY s.created_at DESC
-- LIMIT 20;
