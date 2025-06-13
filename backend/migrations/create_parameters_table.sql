-- Create parameters table for storing application configuration
CREATE TABLE IF NOT EXISTS parameters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default parameters
INSERT INTO parameters (key, value, description) VALUES 
('mock_tts_enabled', 'false', 'Enable mock TTS responses instead of real API calls'),
('mock_content_save_enabled', 'false', 'Enable mock content saving instead of real database saves'),
('mock_auth_enabled', 'false', 'Enable mock authentication for testing purposes')
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_parameters_key ON parameters(key);

-- Add RLS policies if needed
ALTER TABLE parameters ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to parameters" ON parameters
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admin users to modify parameters (you can adjust this based on your needs)
CREATE POLICY "Allow admin to modify parameters" ON parameters
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin'); 