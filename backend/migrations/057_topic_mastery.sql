-- Topic Mastery Tracking
-- Kullanıcıların konu bazlı ilerleme ve ustalık takibi
-- Referans: docs/architecture/ai-enhancement-plan.md (Faz 3)

CREATE TABLE IF NOT EXISTS user_topic_mastery (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    
    -- Progress Tracking
    content_completed INTEGER DEFAULT 0,
    content_total INTEGER DEFAULT 0,
    total_listening_seconds INTEGER DEFAULT 0,
    
    -- Mastery Calculation
    mastery_score INTEGER DEFAULT 0,  -- 0-100
    avg_rating DECIMAL(3,2) DEFAULT 0,
    avg_completion_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Status: not_started, in_progress, completed, mastered
    status VARCHAR(20) DEFAULT 'not_started',
    
    -- Timestamps
    first_interaction_at TIMESTAMP,
    last_interaction_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    PRIMARY KEY (user_id, topic_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_topic_mastery_user ON user_topic_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_status ON user_topic_mastery(user_id, status);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_score ON user_topic_mastery(user_id, mastery_score DESC);

-- RLS (Row Level Security)
ALTER TABLE user_topic_mastery ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_topic_mastery' AND policyname = 'user_topic_mastery_policy'
    ) THEN
        CREATE POLICY user_topic_mastery_policy ON user_topic_mastery
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

COMMENT ON TABLE user_topic_mastery IS 'Kullanıcıların konu bazlı ilerleme ve ustalık takibi';
