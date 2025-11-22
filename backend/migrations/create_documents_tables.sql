-- Documents & Document Sections tables for PDF/document workflow
-- This migration is intended to be run on the same Postgres/Supabase DB used by other LingRoot tables.

-- Main documents table: stores high-level metadata about an uploaded document/PDF
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    original_filename TEXT,
    mime_type TEXT,
    page_count INTEGER,
    language VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sections table: stores sliced parts of a document similar to book_chapters
CREATE TABLE IF NOT EXISTS document_sections (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    section_index INTEGER NOT NULL,
    section_title TEXT,
    section_text TEXT NOT NULL,
    word_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, section_index)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_document_sections_document_id ON document_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_document_sections_document_section ON document_sections(document_id, section_index);
