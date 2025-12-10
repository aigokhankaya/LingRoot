-- Create vocabulary table to store unique words shared across users
CREATE TABLE IF NOT EXISTS vocabulary (
    id SERIAL PRIMARY KEY,
    word VARCHAR(255) NOT NULL,
    original_word VARCHAR(255),
    definition TEXT,
    example_sentence TEXT,
    example_sentence_turkish TEXT,
    level VARCHAR(10),
    meanings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_vocabulary_word UNIQUE (word)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_vocabulary_word ON vocabulary(word);
CREATE INDEX IF NOT EXISTS idx_vocabulary_created_at ON vocabulary(created_at DESC);
