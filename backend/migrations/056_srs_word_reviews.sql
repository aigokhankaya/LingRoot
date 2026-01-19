-- SRS Word Reviews tablosu (SM-2 algoritması için)
-- Gamification-strategy.md referans alınmıştır

CREATE TABLE IF NOT EXISTS word_reviews (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    word_translation VARCHAR(200),
    context_sentence TEXT,
    source_content_id UUID,
    
    -- SM-2 Algorithm fields
    next_review_date DATE DEFAULT CURRENT_DATE,
    interval_days INTEGER DEFAULT 1,
    ease_factor DECIMAL(5,2) DEFAULT 2.5,
    repetition_count INTEGER DEFAULT 0,
    streak_correct INTEGER DEFAULT 0,
    
    -- Tracking
    total_reviews INTEGER DEFAULT 0,
    correct_reviews INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, word)
    
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_word_reviews_user_next ON word_reviews(user_id, next_review_date);
-- Standart index (Partial index CURRENT_DATE ile kullanılamaz)
CREATE INDEX IF NOT EXISTS idx_word_reviews_next_date ON word_reviews(next_review_date);

-- RLS (Row Level Security)
ALTER TABLE word_reviews ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'word_reviews' AND policyname = 'word_reviews_user_policy'
    ) THEN
        CREATE POLICY word_reviews_user_policy ON word_reviews
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

COMMENT ON TABLE word_reviews IS 'SM-2 Spaced Repetition algoritması için kelime tekrar takibi';
