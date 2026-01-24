-- Add type column to user_vocabulary table
-- This allows storing different content types: 'word', 'phrase', 'idiom'

-- Step 1: Add type column with default 'word' for backward compatibility
ALTER TABLE user_vocabulary
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'word';

-- Step 2: Create index for type filtering (safe - won't fail if exists)
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_type ON user_vocabulary(type);

-- Step 3: Comment for documentation
COMMENT ON COLUMN user_vocabulary.type IS 'Content type: word, phrase, or idiom';

-- Note: Unique constraint update is optional. 
-- If you need it, run this manually after checking constraint names:
-- 
-- To see existing constraints:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'user_vocabulary'::regclass;
--
-- Then drop and recreate as needed:
-- ALTER TABLE user_vocabulary DROP CONSTRAINT IF EXISTS [constraint_name];
-- ALTER TABLE user_vocabulary ADD CONSTRAINT unique_user_word_type UNIQUE (user_id, word, type);
