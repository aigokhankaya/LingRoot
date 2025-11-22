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
  is_manual BOOLEAN DEFAULT false, -- Manuel mi yoksa AI ile mi oluşturuldu
  keywords TEXT[], -- Alt konu önerileri için anahtar kelimeler
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

CREATE TRIGGER topics_updated_at_trigger
  BEFORE UPDATE ON topics
  FOR EACH ROW
  EXECUTE FUNCTION update_topics_updated_at();

-- 5) Recursive query için yardımcı view (Konu ağacını çekmek için)
CREATE OR REPLACE VIEW topic_tree_view AS
WITH RECURSIVE topic_hierarchy AS (
  -- Ana konular (parent_id NULL olanlar)
  SELECT 
    t.*,
    t.title as path,
    0 as tree_level
  FROM topics t
  WHERE t.parent_id IS NULL
  
  UNION ALL
  
  -- Alt konular (recursive)
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

-- 7) Örnek veri (development için)
-- COMMENT: Production'da bu satırları kaldır
/*
INSERT INTO topics (user_id, title, description, level, depth) VALUES
  ('YOUR_USER_ID', 'Osmanlı Devleti', 'Osmanlı İmparatorluğunun tarihi', 'A1', 0);
*/

COMMENT ON TABLE topics IS 'Kullanıcıların oluşturduğu çok katmanlı konu hiyerarşisi';
COMMENT ON TABLE topic_contents IS 'Konulardan üretilen TTS içerikleri';
COMMENT ON COLUMN topics.parent_id IS 'NULL ise ana konu, değer varsa alt konu';
COMMENT ON COLUMN topics.depth IS '0=ana konu, 1=alt konu, 2=detay alt konu, vb.';
COMMENT ON COLUMN topics.order_index IS 'Aynı seviyedeki konuların sıralaması';
