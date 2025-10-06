-- Update existing "Free Plan" to proper "Free Trial" with usage-based limits
-- This converts the time-based trial to usage-based (3 audio creation credits)

UPDATE subscription_plans
SET
  name = 'Free Trial',
  description = 'Ücretsiz deneme paketi - 3 ses oluşturma hakkı (her biri 10 dk)',
  price = 0,
  interval = 'monthly',
  features = '["TR: 3 ses oluşturma hakkı", "EN: 3 audio creation credits", "TR: Her ses maksimum 10 dakika", "EN: Each audio up to 10 minutes", "TR: Tüm CEFR seviyeleri", "EN: All CEFR levels", "TR: Kelime ekleme", "EN: Vocabulary addition"]'::jsonb,
  is_active = true,
  is_trial = true,
  trial_days = 999, -- Gün limiti yok, kullanım hakkı bazlı
  monthly_cost_limit_usd = 0, -- Maliyet limiti yok (Free Trial için USD kontrolü yapılmayacak)
  openai_token_limit = 30000, -- OpenAI token limiti (3 x 10 dk için yeterli)
  tts_char_limit = 30000, -- TTS karakter limiti: 3 hak x 10,000 karakter (10 dk) = 30,000 karakter
  apple_product_id = NULL, -- Apple product ID yok (ücretsiz)
  updated_at = NOW()
WHERE id = '88b38204-e22b-45b8-8043-4b8013462186'; -- Mevcut Free Plan ID

-- Add audio_creation_count column to subscriptions table to track trial usage
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS audio_creation_count INTEGER DEFAULT 0;

-- Update existing Free Plan subscriptions to reset their audio counter
UPDATE subscriptions
SET 
  audio_creation_count = 0,
  status = 'active', -- 'trialing' yerine 'active' (kullanım hakkı bazlı)
  current_period_end = NOW() + INTERVAL '1 year', -- Süresiz (1 yıl)
  updated_at = NOW()
WHERE plan_id = '88b38204-e22b-45b8-8043-4b8013462186'
  AND status IN ('active', 'trialing');

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_audio_count ON subscriptions(audio_creation_count);

-- Comment explaining the system
COMMENT ON COLUMN subscriptions.audio_creation_count IS 'Tracks number of audio files created under this subscription. Used for Free Trial limit (3 audios).';
