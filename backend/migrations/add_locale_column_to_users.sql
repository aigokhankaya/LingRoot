-- Add locale column to users table for language preference
ALTER TABLE users
ADD COLUMN IF NOT EXISTS locale VARCHAR(5) DEFAULT 'tr';

-- Add comment to the column
COMMENT ON COLUMN users.locale IS 'User language preference (e.g., tr, en, de)';

-- Add check constraint for supported languages (optional but recommended)
-- Supported languages: tr (Turkish), en (English), de (German), fr (French), es (Spanish), pt (Portuguese), hi (Hindi), id (Indonesian)
ALTER TABLE users
ADD CONSTRAINT check_locale_values CHECK (locale IN ('tr', 'en', 'de', 'fr', 'es', 'pt', 'hi', 'id'));
