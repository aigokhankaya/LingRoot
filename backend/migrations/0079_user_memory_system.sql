-- =====================================================
-- Migration: 0079_user_memory_system.sql
-- Description: Kullanıcı uzun dönem hafıza sistemi
-- Date: 2026-01-25
-- =====================================================

-- Kullanıcı uzun dönem hafıza tablosu
CREATE TABLE IF NOT EXISTS user_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memory_type VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    content TEXT NOT NULL,
    importance INTEGER DEFAULT 50 CHECK (importance >= 0 AND importance <= 100),
    first_mentioned_at TIMESTAMPTZ DEFAULT NOW(),
    last_referenced_at TIMESTAMPTZ DEFAULT NOW(),
    mention_count INTEGER DEFAULT 1,
    source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_user_memory_user_active ON user_memory(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_memory_user_type ON user_memory(user_id, memory_type) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_memory_importance ON user_memory(user_id, importance DESC) WHERE is_active = TRUE;

-- RLS
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories" ON user_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memories" ON user_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memories" ON user_memory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memories" ON user_memory FOR DELETE USING (auth.uid() = user_id);

-- Trigger
CREATE OR REPLACE FUNCTION update_user_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_memory_updated_at
    BEFORE UPDATE ON user_memory
    FOR EACH ROW
    EXECUTE FUNCTION update_user_memory_updated_at();

-- View
CREATE OR REPLACE VIEW user_memory_stats AS
SELECT
    user_id,
    COUNT(*) as total_memories,
    COUNT(*) FILTER (WHERE memory_type = 'fact') as fact_count,
    COUNT(*) FILTER (WHERE memory_type = 'preference') as preference_count,
    COUNT(*) FILTER (WHERE memory_type = 'relationship') as relationship_count,
    COUNT(*) FILTER (WHERE memory_type = 'event') as event_count,
    COUNT(*) FILTER (WHERE memory_type = 'milestone') as milestone_count,
    AVG(importance) as avg_importance,
    MAX(last_referenced_at) as last_memory_used,
    MIN(first_mentioned_at) as oldest_memory
FROM user_memory
WHERE is_active = TRUE
GROUP BY user_id;
