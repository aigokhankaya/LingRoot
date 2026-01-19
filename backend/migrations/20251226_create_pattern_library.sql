-- Migration: Create pattern_library table for generic pattern lookup
-- Description: Stores idioms, proverbs, and sentence patterns in multiple languages (en, tr)
-- Allows text-based search instead of OpenAI extraction

CREATE TABLE IF NOT EXISTS pattern_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lang TEXT NOT NULL DEFAULT 'en', -- 'en' or 'tr'
    type TEXT NOT NULL, -- 'idiom', 'proverb', 'pattern'
    text TEXT NOT NULL,
    translation TEXT, -- Target language equivalent (e.g. if lang='en', this is TR translation)
    explanation TEXT, -- Description for learners
    level TEXT, -- CEFR level (A1, A2, B1, B2, C1, C2) or NULL
    category TEXT, -- e.g. 'greeting', 'social', 'business', 'grammar'
    example_text TEXT,
    example_translation TEXT,
    source TEXT, -- 'tdk', 'github', 'user'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast text search (case insensitive lookup)
CREATE INDEX IF NOT EXISTS idx_pattern_library_text ON pattern_library(lang, text);
CREATE INDEX IF NOT EXISTS idx_pattern_library_type ON pattern_library(type);
CREATE INDEX IF NOT EXISTS idx_pattern_library_level ON pattern_library(level);

-- Add comment
COMMENT ON TABLE pattern_library IS 'Multilingual library of idioms, proverbs, and sentence patterns for local lookup';
