-- Set environment configuration
-- Use 'production' for production (Render URLs)
-- Use 'test' for local development (localhost:5001)

-- Insert or update environment setting
INSERT INTO settings (key, value)
VALUES ('environment', 'production')
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value;

-- To switch to test/local mode, run:
-- UPDATE settings SET value = 'test' WHERE key = 'environment';

-- To switch back to production mode, run:
-- UPDATE settings SET value = 'production' WHERE key = 'environment';

-- Check current setting:
-- SELECT * FROM settings WHERE key = 'environment';
