-- Add Free Trial plan with 3 audio creation limit
-- This plan will be automatically assigned to new users after email verification

INSERT INTO subscription_plans (
  name,
  description,
  price,
  interval,
  features,
  is_active,
  is_trial,
  trial_days,
  monthly_cost_limit_usd,
  openai_token_limit,
  tts_char_limit,
  apple_product_id,
  created_at,
  updated_at
) VALUES (
  'Free Trial',
  'Ücretsiz deneme paketi - 3 ses oluşturma hakkı (her biri 10 dk)',
  0,
  'trial',
  '["TR: 3 ses oluşturma hakkı", "EN: 3 audio creation credits", "TR: Her ses maksimum 10 dakika", "EN: Each audio up to 10 minutes", "TR: Tüm CEFR seviyeleri", "EN: All CEFR levels", "TR: Kelime ekleme", "EN: Vocabulary addition"]'::jsonb,
  true,
  true,
  999, -- Gün limiti yok, kullanım hakkı bazlı
  0, -- Maliyet limiti yok (Free Trial için USD kontrolü yapılmayacak)
  30000, -- OpenAI token limiti (3 x 10 dk için yeterli)
  30000, -- TTS karakter limiti: 3 hak x 10,000 karakter (10 dk) = 30,000 karakter
  NULL, -- Apple product ID yok (ücretsiz)
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Add audio_creation_count column to subscriptions table to track trial usage
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS audio_creation_count INTEGER DEFAULT 0;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_audio_count ON subscriptions(audio_creation_count);

-- Comment explaining the system
COMMENT ON COLUMN subscriptions.audio_creation_count IS 'Tracks number of audio files created under this subscription. Used for Free Trial limit (3 audios).';
