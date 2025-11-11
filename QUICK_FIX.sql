-- Önce tabloyu kontrol et
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'external_services'
);

-- Eğer false dönerse, tabloyu oluştur:
CREATE TABLE IF NOT EXISTS external_services (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) UNIQUE NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    api_url TEXT NOT NULL,
    api_token TEXT,
    is_active BOOLEAN DEFAULT true,
    configuration JSONB DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index'leri oluştur
CREATE INDEX IF NOT EXISTS idx_external_services_name ON external_services(service_name);
CREATE INDEX IF NOT EXISTS idx_external_services_type ON external_services(service_type);
CREATE INDEX IF NOT EXISTS idx_external_services_active ON external_services(is_active);

-- Podcast servisini ekle
INSERT INTO external_services (service_name, service_type, api_url, api_token, description, configuration)
VALUES (
    'podcast_generator',
    'podcast',
    'https://localhost50005.app.n8n.cloud/webhook/create-podcast',
    'mK8vXp2Rq9Yw3Tz5Hn7Js4',
    'N8N Podcast Generation Service',
    '{"timeout": 300000, "maxRetries": 3}'::jsonb
)
ON CONFLICT (service_name) DO UPDATE SET
    api_url = EXCLUDED.api_url,
    api_token = EXCLUDED.api_token,
    description = EXCLUDED.description,
    configuration = EXCLUDED.configuration,
    updated_at = CURRENT_TIMESTAMP;

-- Trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_external_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_update_external_services_updated_at ON external_services;
CREATE TRIGGER trigger_update_external_services_updated_at
    BEFORE UPDATE ON external_services
    FOR EACH ROW
    EXECUTE FUNCTION update_external_services_updated_at();

-- Kontrol et
SELECT 
    id, 
    service_name, 
    service_type, 
    api_url,
    CASE WHEN api_token IS NOT NULL THEN '***' ELSE NULL END as token_status,
    is_active,
    created_at
FROM external_services
ORDER BY created_at DESC;
