-- Add SRS (Spaced Repetition System) columns to user_vocabulary
ALTER TABLE user_vocabulary
ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS interval_days REAL DEFAULT 0, -- Days until next review
ADD COLUMN IF NOT EXISTS ease_factor REAL DEFAULT 2.5, -- Standard SM-2 start value
ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'new', -- new, learning, review, mastered
ADD COLUMN IF NOT EXISTS is_learned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'word'; -- word, phrase, idiom

-- Add index for fast retrieval of due cards
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_next_review ON user_vocabulary(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_status ON user_vocabulary(status);
