-- =====================================================
-- Migration: 0078_personalized_recommendations.sql
-- Description: Kişiselleştirilmiş içerik önerileri tablosu
-- Date: 2026-01-25
-- =====================================================

-- Kullanıcıya özel içerik önerileri tablosu
-- Günlük olarak hesaplanır ve cache'lenir
CREATE TABLE IF NOT EXISTS user_content_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Öneri kategorisi
    category VARCHAR(50) NOT NULL,  -- continue_listening, based_on_interests, sector_recommended, vocabulary_focus, level_appropriate, similar_users, trending, new_content

    -- İçerik bilgisi
    content_type VARCHAR(50) NOT NULL,  -- topic, podcast, sector_content, vocabulary, quiz, book_chapter
    content_id VARCHAR(100),            -- topic_id, content_id vb.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    target_url TEXT NOT NULL,           -- Yönlendirilecek URL

    -- Meta bilgiler
    cefr_level VARCHAR(5),              -- A1, A2, B1, B2, C1, C2
    duration_minutes INTEGER,           -- Tahmini süre
    difficulty_score DECIMAL(3,2),      -- 0-1 arası zorluk

    -- Öneri sebebi ve skoru
    reason TEXT NOT NULL,               -- Kullanıcıya gösterilecek açıklama
    reason_key VARCHAR(50),             -- i18n key for translation
    score DECIMAL(5,2) NOT NULL,        -- Öneri skoru (0-100)
    rank INTEGER NOT NULL,              -- Kategori içi sıralama

    -- Kaynak veriler (debug/analiz için)
    source_data JSONB DEFAULT '{}',     -- Öneriyi oluşturan veriler

    -- Durum
    is_dismissed BOOLEAN DEFAULT FALSE, -- Kullanıcı kapadı mı?
    is_clicked BOOLEAN DEFAULT FALSE,   -- Tıklandı mı?
    is_completed BOOLEAN DEFAULT FALSE, -- Tamamlandı mı?

    -- Zaman damgaları
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON user_content_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_category ON user_content_recommendations(user_id, category);
CREATE INDEX IF NOT EXISTS idx_recommendations_expires ON user_content_recommendations(expires_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_active ON user_content_recommendations(user_id, is_dismissed, expires_at);

-- Benzersizlik: Aynı kullanıcıya aynı içerik birden fazla önerilmemeli
CREATE UNIQUE INDEX IF NOT EXISTS idx_recommendations_unique
ON user_content_recommendations(user_id, content_type, content_id)
WHERE content_id IS NOT NULL;

-- Öneri geçmişi tablosu (analiz için)
CREATE TABLE IF NOT EXISTS recommendation_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommendation_id UUID REFERENCES user_content_recommendations(id) ON DELETE SET NULL,

    -- Etkileşim tipi
    interaction_type VARCHAR(30) NOT NULL, -- view, click, dismiss, complete, skip

    -- Bağlam
    category VARCHAR(50),
    content_type VARCHAR(50),
    content_id VARCHAR(100),

    -- Zaman
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_user ON recommendation_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_date ON recommendation_interactions(created_at);

-- Öneri hesaplama durumu tablosu
CREATE TABLE IF NOT EXISTS recommendation_generation_status (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_generated_at TIMESTAMP WITH TIME ZONE,
    generation_count INTEGER DEFAULT 0,
    last_error TEXT,
    next_generation_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_status_next ON recommendation_generation_status(next_generation_at);

-- Yardımcı fonksiyon: Süresi dolan önerileri temizle
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_content_recommendations
    WHERE expires_at < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE user_content_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_generation_status ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi önerilerini görebilir
CREATE POLICY "Users can view own recommendations" ON user_content_recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations" ON user_content_recommendations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own interactions" ON recommendation_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON recommendation_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service account için (cron job)
CREATE POLICY "Service can manage all recommendations" ON user_content_recommendations
    FOR ALL USING (true);

CREATE POLICY "Service can manage generation status" ON recommendation_generation_status
    FOR ALL USING (true);

-- Tablo yorumları
COMMENT ON TABLE user_content_recommendations IS 'Kullanıcıya özel hesaplanmış içerik önerileri. Günlük olarak güncellenir.';
COMMENT ON COLUMN user_content_recommendations.category IS 'Öneri kategorisi: continue_listening, based_on_interests, sector_recommended, vocabulary_focus, level_appropriate, similar_users, trending, new_content';
COMMENT ON COLUMN user_content_recommendations.score IS 'Öneri skoru 0-100 arası, yüksek=daha alakalı';
COMMENT ON COLUMN user_content_recommendations.reason IS 'Kullanıcıya gösterilecek öneri sebebi açıklaması';

-- Rollback:
-- DROP TABLE IF EXISTS recommendation_generation_status;
-- DROP TABLE IF EXISTS recommendation_interactions;
-- DROP TABLE IF EXISTS user_content_recommendations;
-- DROP FUNCTION IF EXISTS cleanup_expired_recommendations();
