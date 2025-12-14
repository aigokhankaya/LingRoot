-- Create user_book_progress table for tracking reading/listening status
CREATE TABLE user_book_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Polymorphic reference (can be Public Book or User Document)
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('book', 'document')),
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Progress Data
    current_chapter_index INTEGER DEFAULT 1,
    current_position_seconds INTEGER DEFAULT 0, -- Audio timestamp
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_finished BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints to ensure logical integrity
    CONSTRAINT check_content_reference CHECK (
        (content_type = 'book' AND book_id IS NOT NULL AND document_id IS NULL) OR
        (content_type = 'document' AND document_id IS NOT NULL AND book_id IS NULL)
    ),
    UNIQUE(user_id, content_type, book_id, document_id)
);

-- Indexes for performance
CREATE INDEX idx_user_progress_user ON user_book_progress(user_id);
CREATE INDEX idx_user_progress_last_access ON user_book_progress(last_accessed_at DESC);

-- Add cover_image_url and author to documents table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'cover_image_url') THEN
        ALTER TABLE documents ADD COLUMN cover_image_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'author') THEN
        ALTER TABLE documents ADD COLUMN author TEXT;
    END IF;
END $$;
