# Migration Kontrolü

## Supabase'de Kontrol

1. [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Şu sorguyu çalıştırın:

```sql
SELECT * FROM external_services;
```

Eğer sonuç geliyorsa ✅ migration başarılı.

## Frontend'de Kontrol

1. Admin paneline gidin: `http://localhost:3000/admin/dashboard`
2. Sol menüden **"Dış Servisler"** sekmesine tıklayın
3. Sayfayı yenileyin (F5)
4. Browser console'u açın (F12) ve şu log'lara bakın:
   - `🔧 [EXTERNAL SERVICES] Fetching from: ...`
   - `🔧 [EXTERNAL SERVICES] Response status: ...`
   - `🔧 [EXTERNAL SERVICES] Data received: ...`

## Eğer Hala Boş Görünüyorsa

### 1. Backend Log Kontrolü
Backend terminalinde şu log'ları görüyor musunuz?
```
🔧 [CONTROLLER] Fetching all external services...
🔧 [CONTROLLER] Found X services
```

### 2. Token Kontrolü
Browser console'da şunu çalıştırın:
```javascript
localStorage.getItem('lingroot_token')
```
Null dönüyorsa, admin olarak tekrar giriş yapın.

### 3. API Endpoint Kontrolü
Browser'da şu URL'yi açın:
```
http://localhost:5001/api/external-services
```

Eğer 401 hatası alıyorsanız → Token sorunu
Eğer 500 hatası alıyorsanız → Backend/DB sorunu
Eğer JSON dönüyorsa → Frontend sorunu

### 4. CORS Sorunu
Eğer console'da CORS hatası varsa, backend'de `server.js` dosyasında CORS ayarları kontrol edin.

## Hızlı Test

Supabase SQL Editor'de:
```sql
-- Servis var mı?
SELECT COUNT(*) FROM external_services;

-- Podcast servisi var mı?
SELECT * FROM external_services WHERE service_name = 'podcast_generator';

-- Tüm servisleri göster
SELECT 
    id, 
    service_name, 
    service_type, 
    api_url,
    is_active,
    created_at
FROM external_services
ORDER BY created_at DESC;
```

## Manuel Test Servisi Ekleme

Eğer podcast servisi yoksa, manuel ekleyin:

```sql
INSERT INTO external_services (
    service_name, 
    service_type, 
    api_url, 
    api_token, 
    description, 
    configuration
)
VALUES (
    'podcast_generator',
    'podcast',
    'https://localhost50005.app.n8n.cloud/webhook/create-podcast',
    'mK8vXp2Rq9Yw3Tz5Hn7Js4',
    'N8N Podcast Generation Service',
    '{"timeout": 300000, "maxRetries": 3}'::jsonb
);
```
