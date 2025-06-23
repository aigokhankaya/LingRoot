-- Fix user_vocabulary table: Change user_id to UUID to match users table
-- users table has UUID ids, so we need to match that

-- Drop the existing table
DROP TABLE IF EXISTS user_vocabulary;

-- Recreate the table with UUID user_id to match users table
CREATE TABLE user_vocabulary (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    word VARCHAR(255) NOT NULL,
    original_word VARCHAR(255),
    definition TEXT,
    example_sentence TEXT,
    notes TEXT,
    level VARCHAR(10),
    is_learned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints - reference users(id) which is UUID
    CONSTRAINT fk_user_vocabulary_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_word UNIQUE (user_id, word)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_user_id ON user_vocabulary(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_word ON user_vocabulary(word);
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_created_at ON user_vocabulary(created_at);
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_is_learned ON user_vocabulary(is_learned); 