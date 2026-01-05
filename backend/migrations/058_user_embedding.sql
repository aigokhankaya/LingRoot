-- User Insight Embedding
-- Kullanıcı tercihlerinin vektör temsili (1536-dim OpenAI embedding)
-- Referans: docs/architecture/ai-enhancement-plan.md (Faz 4)

-- pgvector extension'ı aktifleştir (Supabase'de genellikle zaten aktif)
CREATE EXTENSION IF NOT EXISTS vector;

-- Users tablosuna embedding kolonu ekle
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS insight_embedding VECTOR(1536);

-- Embedding için index oluştur (cosine similarity için)
CREATE INDEX IF NOT EXISTS idx_users_insight_embedding 
ON users USING ivfflat (insight_embedding vector_cosine_ops)
WITH (lists = 100);

-- Embedding metadata
ALTER TABLE users
ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMP;

-- User content preferences cache (embedding hesaplama için kullanılır)
CREATE TABLE IF NOT EXISTS user_preference_cache (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Aggregated preferences (JSON format)
    aggregated_insights JSONB DEFAULT '{}',
    
    -- Preference summary text (embedding input)
    preference_summary TEXT,
    
    -- Cache metadata
    insight_count INTEGER DEFAULT 0,
    last_updated_at TIMESTAMP DEFAULT NOW(),
    
    -- RLS
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- RLS for preference cache
ALTER TABLE user_preference_cache ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_preference_cache' AND policyname = 'user_preference_cache_policy'
    ) THEN
        CREATE POLICY user_preference_cache_policy ON user_preference_cache
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

COMMENT ON COLUMN users.insight_embedding IS 'OpenAI text-embedding-3-small (1536-dim) vektör temsili';
COMMENT ON TABLE user_preference_cache IS 'Kullanıcı tercih özetleri - embedding hesaplama için cache';
