-- Migration: Convert user_vocabulary into a pivot table and introduce shared vocabulary table

-- 1) Add new columns to user_vocabulary for pivot structure
ALTER TABLE user_vocabulary
    ADD COLUMN IF NOT EXISTS word_id INTEGER,
    ADD COLUMN IF NOT EXISTS translated_sentence TEXT;

-- 2) Populate vocabulary table from existing user_vocabulary data
--    Each distinct word (case-insensitive) becomes a single row in vocabulary
INSERT INTO vocabulary (
    word,
    original_word,
    definition,
    example_sentence,
    example_sentence_turkish,
    level,
    meanings,
    created_at,
    updated_at
)
SELECT
    LOWER(word) AS word,
    MIN(original_word) AS original_word,
    MIN(definition) AS definition,
    MIN(example_sentence) AS example_sentence,
    MIN(example_sentence_turkish) AS example_sentence_turkish,
    MIN(level) AS level,
    jsonb_build_array(
        jsonb_strip_nulls(
            jsonb_build_object(
                'definition', MIN(definition),
                'example_sentence', MIN(example_sentence),
                'example_sentence_turkish', MIN(example_sentence_turkish),
                'level', MIN(level)
            )
        )
    ) AS meanings,
    MIN(created_at) AS created_at,
    MAX(updated_at) AS updated_at
FROM user_vocabulary
GROUP BY LOWER(word)
ON CONFLICT (word) DO NOTHING;

-- 3) Link existing user_vocabulary rows to vocabulary via word_id
UPDATE user_vocabulary uv
SET word_id = v.id
FROM vocabulary v
WHERE v.word = LOWER(uv.word)
  AND uv.word_id IS NULL;

-- 4) Ensure word_id is not null
ALTER TABLE user_vocabulary
    ALTER COLUMN word_id SET NOT NULL;

-- 5) Adjust unique constraint to work on (user_id, word_id)
ALTER TABLE user_vocabulary
    DROP CONSTRAINT IF EXISTS unique_user_word;

ALTER TABLE user_vocabulary
    ADD CONSTRAINT unique_user_word_pivot UNIQUE (user_id, word_id);

-- 6) Drop indexes that depend on columns to be removed
DROP INDEX IF EXISTS idx_user_vocabulary_word;
DROP INDEX IF EXISTS idx_user_vocabulary_example_sentence_turkish;

-- 7) Create index for new word_id column
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_word_id ON user_vocabulary(word_id);

-- 8) Add foreign key from user_vocabulary.word_id to vocabulary.id
ALTER TABLE user_vocabulary
    ADD CONSTRAINT fk_user_vocabulary_word_id
    FOREIGN KEY (word_id) REFERENCES vocabulary(id) ON DELETE CASCADE;

-- 9) Drop columns now stored in vocabulary (keep original_sentence on pivot)
ALTER TABLE user_vocabulary
    DROP COLUMN IF EXISTS word,
    DROP COLUMN IF EXISTS original_word,
    DROP COLUMN IF EXISTS definition,
    DROP COLUMN IF EXISTS example_sentence,
    DROP COLUMN IF EXISTS example_sentence_turkish,
    DROP COLUMN IF EXISTS notes,
    DROP COLUMN IF EXISTS level;
