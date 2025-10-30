# Dış Servisler Migration Talimatları

## Sorun

`external_services` tablosu henüz oluşturulmamış. Bu yüzden admin panelinde "Dış Servisler Yönetimi" sayfası boş görünüyor.

## Çözüm 1: Supabase Dashboard Üzerinden (Önerilen)

1. [Supabase Dashboard](https://supabase.com/dashboard) adresine gidin
2. Projenizi seçin
3. Sol menüden **SQL Editor**'ü açın
4. Aşağıdaki SQL kodunu kopyalayıp çalıştırın:

```sql
-- Create external_services table for managing third-party API configurations
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_external_services_name ON external_services(service_name);
CREATE INDEX IF NOT EXISTS idx_external_services_type ON external_services(service_type);
CREATE INDEX IF NOT EXISTS idx_external_services_active ON external_services(is_active);

-- Insert default podcast service
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

-- Create updated_at trigger
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
```

5. **Run** butonuna tıklayın
6. Başarılı mesajını gördükten sonra sayfayı yenileyin

## Çözüm 2: Backend Script ile

Backend klasöründe terminal açıp şunu çalıştırın:

```bash
npm run migrate:external-services
```

## Çözüm 3: psql ile

PostgreSQL client varsa:

```bash
psql -d <DATABASE_URL> -f backend/migrations/0037_create_external_services_table.sql
```

## Doğrulama

Migration başarılı olduysa, admin panelinde:
1. Sol menüden **"Dış Servisler"** sekmesine tıklayın
2. **"podcast_generator"** servisini görmelisiniz
3. URL: `https://localhost50005.app.n8n.cloud/webhook/create-podcast`
4. Token: `***` (güvenlik için maskelenmiş)

## Admin Panelde Düzenleme

Migration tamamlandıktan sonra:
- Servis URL'sini değiştirebilirsiniz
- Token'ı güncelleyebilirsiniz
- Yeni servisler ekleyebilirsiniz
- Servisleri aktif/pasif yapabilirsiniz

Yapılan değişiklikler otomatik olarak podcast oluşturma işlemlerinde kullanılacaktır.

## Podcast API Bağlantısı

Kod otomatik olarak:
1. `podcast_generator` servisinin konfigürasyonunu DB'den çeker
2. API URL ve token bilgilerini kullanır
3. Podcast oluşturma isteğini gönderir

Eğer DB'de bulamazsa, fallback olarak kodda tanımlı default değerleri kullanır.
