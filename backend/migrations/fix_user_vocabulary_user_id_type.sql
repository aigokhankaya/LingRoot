-- Fix user_vocabulary table: Change user_id from UUID to INTEGER
-- This script fixes the data type mismatch

-- First, drop the existing foreign key constraint
ALTER TABLE user_vocabulary DROP CONSTRAINT IF EXISTS fk_user_vocabulary_user_id;

-- Drop the table and recreate it with correct types
DROP TABLE IF EXISTS user_vocabulary;

-- Recreate the table with INTEGER user_id
CREATE TABLE user_vocabulary (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    word VARCHAR(255) NOT NULL,
    original_word VARCHAR(255),
    definition TEXT,
    example_sentence TEXT,
    notes TEXT,
    level VARCHAR(10),
    is_learned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_user_vocabulary_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_word UNIQUE (user_id, word)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_user_id ON user_vocabulary(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_word ON user_vocabulary(word);
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_created_at ON user_vocabulary(created_at);
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_is_learned ON user_vocabulary(is_learned); 