-- Migration: Add Knowledge Base and Favorites features for Liro
-- Description: Adds user_favorites table and enhances topics table for source tracking

-- 1. Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- 'content_item', 'topic', 'book', 'document'
    item_id VARCHAR(255) NOT NULL, -- UUID or Integer ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_type ON user_favorites(item_type);

-- 2. Add source tracking to topics table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'topics' 
        AND column_name = 'source_type'
    ) THEN
        ALTER TABLE topics 
        ADD COLUMN source_type VARCHAR(50) DEFAULT 'chat', -- 'chat', 'pdf', 'book'
        ADD COLUMN source_id VARCHAR(255);
    END IF;
END $$;

-- 3. Add is_favorite column to user_content_progress (for easier querying)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_content_progress' 
        AND column_name = 'is_favorite'
    ) THEN
        ALTER TABLE user_content_progress 
        ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
