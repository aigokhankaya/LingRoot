-- Migration: Add CEFR level columns and word meanings structure to vocabulary
-- This migration prepares the vocabulary table for multi-level word handling

-- 1) Add min_level and max_level for words that span multiple CEFR levels
ALTER TABLE vocabulary
ADD COLUMN IF NOT EXISTS min_level VARCHAR(10),
ADD COLUMN IF NOT EXISTS max_level VARCHAR(10),
ADD COLUMN IF NOT EXISTS frequency_rank INTEGER, -- 1 = most common, higher = less common
ADD COLUMN IF NOT EXISTS is_core BOOLEAN DEFAULT FALSE; -- True for Oxford 3000/5000 words

-- 2) Populate min/max level from existing level column
UPDATE vocabulary 
SET min_level = level, max_level = level 
WHERE level IS NOT NULL AND min_level IS NULL;

-- 3) Add index for CEFR level filtering
CREATE INDEX IF NOT EXISTS idx_vocabulary_min_level ON vocabulary(min_level);
CREATE INDEX IF NOT EXISTS idx_vocabulary_is_core ON vocabulary(is_core);
CREATE INDEX IF NOT EXISTS idx_vocabulary_frequency ON vocabulary(frequency_rank);

-- 4) Update meanings JSONB structure documentation
-- The meanings column should follow this structure:
-- [
--   {
--     "sense_id": 1,
--     "definition_en": "English definition",
--     "definition_tr": "Türkçe tanım",
--     "level": "B1",
--     "part_of_speech": "noun",
--     "example": "Example sentence",
--     "example_tr": "Örnek cümle çevirisi"
--   },
--   ...
-- ]

COMMENT ON COLUMN vocabulary.meanings IS 'JSON array of word senses, each with level, definition, examples';
COMMENT ON COLUMN vocabulary.min_level IS 'Lowest CEFR level where this word appears (A1-C2)';
COMMENT ON COLUMN vocabulary.max_level IS 'Highest CEFR level for advanced meanings (A1-C2)';
COMMENT ON COLUMN vocabulary.frequency_rank IS 'Word frequency rank (1=most common)';
COMMENT ON COLUMN vocabulary.is_core IS 'True if word is in Oxford 3000/5000 core vocabulary';
