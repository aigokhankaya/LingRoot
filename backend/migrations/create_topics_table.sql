-- Migration: Create Topics Table with Embedding Support
-- Description: Creates topics table for RAG-based content suggestions

-- Drop existing table if needed (careful in production!)
-- DROP TABLE IF EXISTS topics CASCADE;

-- Create topics table
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    embedding TEXT, -- JSON stringified vector (1536 dimensions for OpenAI ada-002)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'topics_user_id_fkey'
    ) THEN
        ALTER TABLE topics 
        ADD CONSTRAINT topics_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add suggested_topic column to conversations table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'suggested_topic'
    ) THEN
        ALTER TABLE conversations 
        ADD COLUMN suggested_topic TEXT;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_topics_user_id ON topics(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topics_title ON topics USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_topics_description ON topics USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_conversations_suggested_topic ON conversations(suggested_topic);

-- Create updated_at trigger for topics
CREATE OR REPLACE FUNCTION update_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_topics_updated_at
    BEFORE UPDATE ON topics
    FOR EACH ROW
    EXECUTE FUNCTION update_topics_updated_at();

-- Optional: Enable pgvector extension for native vector similarity search
-- Uncomment if you have pgvector installed on your Supabase/PostgreSQL instance
/*
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column (alternative to TEXT embedding)
ALTER TABLE topics 
ADD COLUMN embedding_vector vector(1536);

-- Create index for vector similarity search
CREATE INDEX ON topics USING ivfflat (embedding_vector vector_cosine_ops);
*/

-- Grant permissions
-- GRANT ALL ON topics TO authenticated;

-- Example query for finding similar topics (using JSON embedding)
/*
WITH query_embedding AS (
  SELECT '[0.1, 0.2, ...]'::jsonb as embedding
)
SELECT 
  t.id,
  t.title,
  t.description,
  -- Cosine similarity calculation would be done in application layer
FROM topics t, query_embedding q
ORDER BY t.created_at DESC;
*/

-- Add comments
DO $$ 
BEGIN
    EXECUTE 'COMMENT ON TABLE topics IS ''User-generated topics with embeddings for RAG-based suggestions''';
    EXECUTE 'COMMENT ON COLUMN topics.embedding IS ''OpenAI text-embedding-ada-002 vector (1536 dims) stored as JSON string''';
    
    -- Only add comment if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' 
        AND column_name = 'suggested_topic'
    ) THEN
        EXECUTE 'COMMENT ON COLUMN conversations.suggested_topic IS ''AI-suggested topic from conversation context''';
    END IF;
END $$;
