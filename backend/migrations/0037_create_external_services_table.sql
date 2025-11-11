-- Create external_services table for managing third-party API configurations
CREATE TABLE IF NOT EXISTS external_services (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) UNIQUE NOT NULL,
    service_type VARCHAR(50) NOT NULL, -- 'podcast', 'translation', 'tts', etc.
    api_url TEXT NOT NULL,
    api_token TEXT,
    is_active BOOLEAN DEFAULT true,
    configuration JSONB DEFAULT '{}', -- Additional configuration options
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_external_services_name ON external_services(service_name);
CREATE INDEX IF NOT EXISTS idx_external_services_type ON external_services(service_type);
CREATE INDEX IF NOT EXISTS idx_external_services_active ON external_services(is_active);

-- Insert default podcast service configuration
INSERT INTO external_services (service_name, service_type, api_url, api_token, description, configuration)
VALUES (
    'podcast_generator',
    'podcast',
    'https://localhost50005.app.n8n.cloud/webhook/create-podcast',
    'mK8vXp2Rq9Yw3Tz5Hn7Js4',
    'N8N Podcast Generation Service',
    '{"timeout": 300000, "maxRetries": 3}'::jsonb
)
ON CONFLICT (service_name) DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_external_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_external_services_updated_at
    BEFORE UPDATE ON external_services
    FOR EACH ROW
    EXECUTE FUNCTION update_external_services_updated_at();

-- Add comment
COMMENT ON TABLE external_services IS 'Stores configuration for external API services like podcast generation, translation services, etc.';
