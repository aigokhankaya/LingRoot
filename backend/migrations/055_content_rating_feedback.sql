-- Content Rating System
-- Kullanıcıların içerikleri beğenmesi/beğenmemesi için tablo

CREATE TABLE IF NOT EXISTS content_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL,
    content_type VARCHAR(50) NOT NULL,  -- 'contenthistory', 'topic_content', 'chapter_audio'
    rating INTEGER NOT NULL CHECK (rating IN (1, -1)),  -- 1 = beğendi, -1 = beğenmedi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, content_id, content_type)
);

-- İndeksler
CREATE INDEX idx_content_ratings_user ON content_ratings(user_id);
CREATE INDEX idx_content_ratings_content ON content_ratings(content_id, content_type);
CREATE INDEX idx_content_ratings_created ON content_ratings(created_at DESC);

-- Content Feedback System
-- Detaylı geri bildirim için tablo

CREATE TABLE IF NOT EXISTS content_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    feedback_type VARCHAR(50) NOT NULL,  -- 'too_easy', 'too_hard', 'boring', 'factual_error', 'too_long', 'too_short', 'other'
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler
CREATE INDEX idx_content_feedback_user ON content_feedback(user_id);
CREATE INDEX idx_content_feedback_type ON content_feedback(feedback_type);
CREATE INDEX idx_content_feedback_content ON content_feedback(content_id, content_type);
