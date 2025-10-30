-- Podcast Service Configuration for n8n Webhook
-- Bu SQL dosyasını Supabase SQL Editor'de çalıştırın

-- 1. Eski tabloyu sil (varsa)
DROP TABLE IF EXISTS external_services CASCADE;

-- 2. Yeni tabloyu oluştur
CREATE TABLE external_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT UNIQUE NOT NULL,
  display_name TEXT,
  description TEXT,
  api_url TEXT NOT NULL,
  api_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index ekle (performans için)
CREATE INDEX idx_external_services_name ON external_services(service_name);
CREATE INDEX idx_external_services_active ON external_services(is_active);

-- 4. Podcast service'i ekle
INSERT INTO external_services (
  service_name,
  display_name,
  description,
  api_url,
  api_token,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'podcast_generator',
  'Podcast Generator (n8n)',
  'n8n workflow for AI-powered podcast generation with Supabase storage',
  'https://lgpodcast1.app.n8n.cloud/webhook/create-podcast',
  'mK8vXp2Rq9Yw3Tz5Hn7Js4', -- n8n webhook authorization token
  true,
  NOW(),
  NOW()
)
ON CONFLICT (service_name) 
DO UPDATE SET
  api_url = EXCLUDED.api_url,
  api_token = EXCLUDED.api_token,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 5. Verify the configuration
SELECT 
  id,
  service_name,
  display_name,
  api_url,
  api_token,
  is_active,
  created_at
FROM external_services
WHERE service_name = 'podcast_generator';

-- Expected output:
-- service_name: podcast_generator
-- display_name: Podcast Generator (n8n)
-- api_url: https://lgpodcast1.app.n8n.cloud/webhook/create-podcast
-- api_token: mK8vXp2Rq9Yw3Tz5Hn7Js4
-- is_active: true

-- Test command:
-- curl -X POST "https://lgpodcast1.app.n8n.cloud/webhook/create-podcast" \
--   -H "Content-Type: application/json" \
--   -H "Authorization: Bearer mK8vXp2Rq9Yw3Tz5Hn7Js4" \
--   -d '{"topic":"Test","level":"A1","duration":2}'

-- 6. (Opsiyonel) RLS Policy ekle - public erişim için
ALTER TABLE external_services ENABLE ROW LEVEL SECURITY;

-- Eski policy'leri sil (varsa)
DROP POLICY IF EXISTS "Allow public read access to external services" ON external_services;
DROP POLICY IF EXISTS "Allow authenticated users to read external services" ON external_services;

-- Yeni policy'leri oluştur
CREATE POLICY "Allow public read access to external services"
ON external_services
FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Allow authenticated users to read external services"
ON external_services
FOR SELECT
TO authenticated
USING (true);
