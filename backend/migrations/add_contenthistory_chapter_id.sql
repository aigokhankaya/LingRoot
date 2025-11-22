-- Migration: Add optional chapter_id to contenthistory to link TTS records with book chapters
-- This file is intended to be run on Supabase (see run_on_supabase.sql or manual SQL editor).

-- 1) Add chapter_id column if it does not exist
ALTER TABLE contenthistory
ADD COLUMN IF NOT EXISTS chapter_id INTEGER REFERENCES book_chapters(id) ON DELETE SET NULL;

-- 2) Helpful indexes for lookups by chapter and user+chapter
CREATE INDEX IF NOT EXISTS idx_contenthistory_chapter_id
ON contenthistory(chapter_id);

CREATE INDEX IF NOT EXISTS idx_contenthistory_user_chapter
ON contenthistory(user_id, chapter_id);

-- 3) Documentation
COMMENT ON COLUMN contenthistory.chapter_id IS 'Optional FK to book_chapters.id for book-based audio history';
