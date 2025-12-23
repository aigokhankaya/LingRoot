ALTER TABLE books
ADD COLUMN IF NOT EXISTS voice_settings JSONB DEFAULT '{}'::jsonb;
