-- Assign Free Trial to specific user: mobile.androdi.tr@gmail.com
-- This script will:
-- 1. Find the user by email
-- 2. Get the Free Trial plan ID
-- 3. Create or update their subscription to Free Trial

-- First, let's check if user exists and get their ID
DO $$
DECLARE
  v_user_id UUID;
  v_plan_id UUID;
  v_existing_sub_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'mobile.androdi.tr@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: mobile.androdi.tr@gmail.com';
  END IF;

  RAISE NOTICE 'Found user ID: %', v_user_id;

  -- Get Free Trial plan ID
  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE name = 'Free Trial' AND is_active = true;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Free Trial plan not found';
  END IF;

  RAISE NOTICE 'Found Free Trial plan ID: %', v_plan_id;

  -- Check if user already has a subscription
  SELECT id INTO v_existing_sub_id
  FROM subscriptions
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_sub_id IS NOT NULL THEN
    -- Update existing subscription
    RAISE NOTICE 'Updating existing subscription ID: %', v_existing_sub_id;
    
    UPDATE subscriptions
    SET
      plan_id = v_plan_id,
      status = 'active',
      audio_creation_count = 0, -- Reset audio count
      current_period_start = NOW(),
      current_period_end = NOW() + INTERVAL '1 year', -- Süresiz (1 yıl)
      updated_at = NOW()
    WHERE id = v_existing_sub_id;

    RAISE NOTICE 'Subscription updated successfully';
  ELSE
    -- Create new subscription
    RAISE NOTICE 'Creating new subscription for user';
    
    INSERT INTO subscriptions (
      user_id,
      plan_id,
      status,
      audio_creation_count,
      current_period_start,
      current_period_end,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_plan_id,
      'active',
      0, -- Start with 0 audio count
      NOW(),
      NOW() + INTERVAL '1 year', -- Süresiz (1 yıl)
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Subscription created successfully';
  END IF;

  -- Show final result
  RAISE NOTICE '✅ Free Trial assigned successfully to mobile.androdi.tr@gmail.com';
  RAISE NOTICE 'User has 3 audio creation credits (10 minutes each)';
END $$;

-- Verify the subscription
SELECT 
  u.email,
  u.full_name,
  sp.name as plan_name,
  s.status,
  s.audio_creation_count,
  s.current_period_start,
  s.current_period_end
FROM subscriptions s
JOIN users u ON u.id = s.user_id
JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE u.email = 'mobile.androdi.tr@gmail.com'
ORDER BY s.created_at DESC
LIMIT 1;
