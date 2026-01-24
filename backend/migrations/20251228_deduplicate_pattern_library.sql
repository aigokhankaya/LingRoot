-- Migration: Deduplicate pattern_library table
-- Description: Remove duplicate records where text, translation, and explanation are identical
-- Date: 2025-12-28

-- Step 1: Create a temporary table to store the IDs of records we want to keep
-- For each group of duplicates, we keep the oldest one (earliest created_at)
WITH duplicates AS (
    SELECT 
        id,
        text,
        translation,
        explanation,
        ROW_NUMBER() OVER (
            PARTITION BY text, COALESCE(translation, ''), COALESCE(explanation, '')
            ORDER BY created_at ASC
        ) as row_num
    FROM pattern_library
)
-- Step 2: Delete all duplicate records (keeping only the first one in each group)
DELETE FROM pattern_library
WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
);

-- Step 3: Add a unique constraint to prevent future duplicates
-- Using a unique index on (text, translation, explanation) with COALESCE for NULL handling
CREATE UNIQUE INDEX IF NOT EXISTS idx_pattern_library_unique_content 
ON pattern_library (
    text, 
    COALESCE(translation, ''), 
    COALESCE(explanation, '')
);

-- Step 4: Log the result
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count FROM pattern_library;
    RAISE NOTICE 'Deduplication complete. Remaining records: %', remaining_count;
END $$;
