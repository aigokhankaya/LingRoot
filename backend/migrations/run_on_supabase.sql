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

-- ============================================
-- TOPIC HIERARCHY SYSTEM
-- Çok katmanlı konu ağacı sistemi
-- Tarih: 2025-11-20
-- ============================================

-- 1) Topics tablosu (Ana ve tüm alt konular)
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT DEFAULT 'A1' CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  depth INTEGER DEFAULT 0 CHECK (depth >= 0),
  order_index INTEGER DEFAULT 0,
  is_manual BOOLEAN DEFAULT false,
  keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2) Topic Contents tablosu (Her konudan üretilen sesli içerikler)
CREATE TABLE IF NOT EXISTS topic_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  mp3_url TEXT,
  vtt_url TEXT,
  text_content TEXT,
  translated_text TEXT,
  adapted_text TEXT,
  level TEXT,
  voice_model TEXT,
  speaking_rate FLOAT,
  duration_seconds INTEGER,
  words TEXT[],
  timepoints JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- listened_at kolonunu ekle
ALTER TABLE topic_contents
  ADD COLUMN IF NOT EXISTS listened_at TIMESTAMP WITH TIME ZONE;

-- 3) Performance Index'ler
CREATE INDEX IF NOT EXISTS idx_topics_user_id ON topics(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_parent_id ON topics(parent_id);
CREATE INDEX IF NOT EXISTS idx_topics_depth ON topics(depth);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topic_contents_topic_id ON topic_contents(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_contents_created_at ON topic_contents(created_at DESC);

-- 4) Updated_at otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS topics_updated_at_trigger ON topics;
CREATE TRIGGER topics_updated_at_trigger
  BEFORE UPDATE ON topics
  FOR EACH ROW
  EXECUTE FUNCTION update_topics_updated_at();

-- 5) Recursive query için yardımcı view
DROP VIEW IF EXISTS topic_tree_view;
CREATE OR REPLACE VIEW topic_tree_view AS
WITH RECURSIVE topic_hierarchy AS (
  SELECT 
    t.*,
    t.title as path,
    0 as tree_level
  FROM topics t
  WHERE t.parent_id IS NULL
  
  UNION ALL
  
  SELECT 
    t.*,
    th.path || ' > ' || t.title,
    th.tree_level + 1 as tree_level
  FROM topics t
  INNER JOIN topic_hierarchy th ON t.parent_id = th.id
)
SELECT * FROM topic_hierarchy;

-- 6) Row Level Security (RLS) Policies
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_contents ENABLE ROW LEVEL SECURITY;

-- Mevcut policy'leri temizle
DROP POLICY IF EXISTS topics_user_policy ON topics;
DROP POLICY IF EXISTS topic_contents_user_policy ON topic_contents;

-- Kullanıcı sadece kendi konularını görebilir
CREATE POLICY topics_user_policy ON topics
  FOR ALL
  USING (auth.uid() = user_id);

-- Kullanıcı sadece kendi içeriklerini görebilir
CREATE POLICY topic_contents_user_policy ON topic_contents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM topics 
      WHERE topics.id = topic_contents.topic_id 
      AND topics.user_id = auth.uid()
    )
  );

-- 7) Tablo açıklamaları
COMMENT ON TABLE topics IS 'Kullanıcıların oluşturduğu çok katmanlı konu hiyerarşisi';
COMMENT ON TABLE topic_contents IS 'Konulardan üretilen TTS içerikleri';
COMMENT ON COLUMN topics.parent_id IS 'NULL ise ana konu, değer varsa alt konu';
COMMENT ON COLUMN topics.depth IS '0=ana konu, 1=alt konu, 2=detay alt konu, vb.';
COMMENT ON COLUMN topics.order_index IS 'Aynı seviyedeki konuların sıralaması';
COMMENT ON COLUMN topic_contents.listened_at IS 'Kullanıcının bu ses içeriğini dinlediği zaman';

-- ============================================
-- DOĞRULAMA SORGUSU
-- ============================================

-- Topic tabloları oluşturuldu mu kontrol et
SELECT 
  'topics' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'topics'
UNION ALL
SELECT 
  'topic_contents' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'topic_contents';

-- Index'leri kontrol et
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('topics', 'topic_contents')
ORDER BY tablename, indexname;
