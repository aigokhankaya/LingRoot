-- Migration: Add original_text column to documents table
-- Purpose: Store the full original text extracted from uploaded PDFs/text inputs
-- so it can be retrieved later without re-parsing sections.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_text TEXT;
