-- =====================================================
-- Migration: 0080_recommendation_interactions.sql
-- Description: Proaktif öneri etkileşimlerini takip eden tablo
-- Date: 2026-01-25
-- =====================================================

-- Öneri etkileşimleri tablosu
CREATE TABLE IF NOT EXISTS recommendation_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    trigger_type VARCHAR(50) NOT NULL,
    recommendation_data JSONB DEFAULT '{}'::jsonb,
    accepted BOOLEAN,
    selected_format VARCHAR(50),
    shown_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_recommendation_user ON recommendation_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_trigger ON recommendation_interactions(trigger_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_shown ON recommendation_interactions(shown_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_accepted ON recommendation_interactions(user_id, accepted) WHERE accepted IS NOT NULL;

-- RLS
ALTER TABLE recommendation_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendation interactions" ON recommendation_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommendation interactions" ON recommendation_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendation interactions" ON recommendation_interactions
    FOR UPDATE USING (auth.uid() = user_id);

-- Analytics view - öneri kabul oranları
CREATE OR REPLACE VIEW recommendation_analytics AS
SELECT
    trigger_type,
    COUNT(*) as total_shown,
    COUNT(*) FILTER (WHERE accepted = true) as accepted_count,
    COUNT(*) FILTER (WHERE accepted = false) as dismissed_count,
    COUNT(*) FILTER (WHERE accepted IS NULL) as no_response_count,
    ROUND(
        COUNT(*) FILTER (WHERE accepted = true)::numeric /
        NULLIF(COUNT(*) FILTER (WHERE accepted IS NOT NULL), 0)::numeric * 100,
        1
    ) as acceptance_rate,
    AVG(EXTRACT(EPOCH FROM (responded_at - shown_at))) as avg_response_time_seconds
FROM recommendation_interactions
WHERE shown_at > NOW() - INTERVAL '30 days'
GROUP BY trigger_type;

-- Comment
COMMENT ON TABLE recommendation_interactions IS 'Tracks proactive content recommendations shown to users during chat';
