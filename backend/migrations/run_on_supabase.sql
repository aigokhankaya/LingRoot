-- ============================================
-- SUPABASE SQL EDITOR'DA ÇALIŞTIR
-- ============================================
-- Bu script Free Trial sistemini kurar ve mobile.android.tr@gmail.com kullanıcısına atar

-- 1. audio_creation_count kolonunu ekle (eğer yoksa)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS audio_creation_count INTEGER DEFAULT 0;

-- 2. Index ekle
CREATE INDEX IF NOT EXISTS idx_subscriptions_audio_count ON subscriptions(audio_creation_count);

-- 3. Kolon açıklaması ekle
COMMENT ON COLUMN subscriptions.audio_creation_count IS 'Tracks number of audio files created under this subscription. Used for Free Trial limit (3 audios).';

-- 4. Free Trial planını kontrol et ve güncelle
UPDATE subscription_plans
SET
  name = 'Free Trial',
  description = 'Ücretsiz deneme paketi - 3 ses oluşturma hakkı (her biri 10 dk)',
  price = 0,
  interval = 'monthly',
  features = '["TR: 3 ses oluşturma hakkı", "EN: 3 audio creation credits", "TR: Her ses maksimum 10 dakika", "EN: Each audio up to 10 minutes", "TR: Tüm CEFR seviyeleri", "EN: All CEFR levels", "TR: Kelime ekleme", "EN: Vocabulary addition"]'::jsonb,
  is_active = true,
  is_trial = true,
  trial_days = 999,
  monthly_cost_limit_usd = 0,
  openai_token_limit = 30000,
  tts_char_limit = 30000,
  apple_product_id = NULL,
  updated_at = NOW()
WHERE id = '88b38204-e22b-45b8-8043-4b8013462186';

-- 5. mobile.android.tr@gmail.com kullanıcısına Free Trial ata
DO $$
DECLARE
  v_user_id UUID;
  v_existing_sub_id UUID;
BEGIN
  -- Kullanıcı ID'sini al
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'mobile.android.tr@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: mobile.android.tr@gmail.com';
  END IF;

  RAISE NOTICE 'Found user ID: %', v_user_id;

  -- Mevcut aboneliği kontrol et
  SELECT id INTO v_existing_sub_id
  FROM subscriptions
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_sub_id IS NOT NULL THEN
    -- Mevcut aboneliği güncelle
    RAISE NOTICE 'Updating existing subscription ID: %', v_existing_sub_id;
    
    UPDATE subscriptions
    SET
      plantype = 'Free Trial',
      status = 'active',
      audio_creation_count = 0,
      startdate = NOW(),
      enddate = NOW() + INTERVAL '1 year',
      updated_at = NOW()
    WHERE id = v_existing_sub_id;

    RAISE NOTICE '✅ Subscription updated successfully';
  ELSE
    -- Yeni abonelik oluştur
    RAISE NOTICE 'Creating new subscription for user';
    
    INSERT INTO subscriptions (
      user_id,
      plantype,
      status,
      audio_creation_count,
      startdate,
      enddate,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      'Free Trial',
      'active',
      0,
      NOW(),
      NOW() + INTERVAL '1 year',
      NOW(),
      NOW()
    );

    RAISE NOTICE '✅ Subscription created successfully';
  END IF;

  RAISE NOTICE '🎉 Free Trial assigned to mobile.android.tr@gmail.com';
END $$;

-- 6. Sonucu doğrula
SELECT 
  u.email,
  u.firstname,
  u.lastname,
  s.plantype,
  s.status,
  s.audio_creation_count,
  s.startdate,
  s.enddate
FROM subscriptions s
JOIN users u ON u.id = s.user_id
WHERE u.email = 'mobile.android.tr@gmail.com'
ORDER BY s.created_at DESC
LIMIT 1;
