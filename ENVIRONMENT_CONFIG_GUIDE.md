# Environment Configuration Guide

Bu rehber, mobil uygulamanın backend URL'lerini dinamik olarak yönetmek için kullanılan environment configuration sistemini açıklar.

## Genel Bakış

Mobil uygulama artık veritabanındaki `settings` tablosunda `key='environment'` değerine göre otomatik olarak doğru backend URL'sine bağlanır:

- **`value='production'`**: Render.com production URL'si (`https://lingloops-backend.onrender.com`)
- **`value='test'`**: Local development URL'si (`http://localhost:5001`)

## Nasıl Çalışır?

1. **Backend Endpoint**: `/api/config/environment` endpoint'i environment ayarını döndürür
2. **Mobile Service**: `environmentConfig.ts` servisi bu ayarı alır ve cache'ler (5 dakika)
3. **Dynamic URLs**: Tüm API çağrıları otomatik olarak doğru URL'yi kullanır

## Environment Ayarını Değiştirme

### Yöntem 1: Node.js Script (Önerilen)

```bash
# Production mode (Render URLs)
cd backend
node scripts/set_environment.js production

# Test mode (Local URLs)
node scripts/set_environment.js test
```

### Yöntem 2: SQL Query

```sql
-- Production mode
UPDATE settings SET value = 'production' WHERE key = 'environment';

-- Test mode
UPDATE settings SET value = 'test' WHERE key = 'environment';

-- Mevcut ayarı kontrol et
SELECT * FROM settings WHERE key = 'environment';
```

### Yöntem 3: İlk Kurulum

Eğer `settings` tablosunda henüz `environment` kaydı yoksa:

```sql
INSERT INTO settings (key, value)
VALUES ('environment', 'production');
```

## Mobil Uygulamada Kullanım

### Otomatik Kullanım

Tüm mevcut servisler (`api.ts`, `supabase.ts`, `AuthContext.tsx`, `ChatScreen.tsx`) otomatik olarak güncellenmiştir. Ekstra bir şey yapmanıza gerek yok.

### Manuel Kullanım (Yeni Servisler İçin)

Yeni bir serviste backend URL'sine ihtiyacınız varsa:

```typescript
import { getApiBaseUrl } from '../services/environmentConfig';

// Async function içinde
const baseUrl = await getApiBaseUrl();
const response = await fetch(`${baseUrl}/api/endpoint`);
```

## Cache Yönetimi

Environment ayarı 5 dakika boyunca cache'lenir. Değişikliği hemen görmek için:

### Uygulamayı Yeniden Başlatma
```typescript
// Uygulama başlangıcında otomatik olarak yeni ayar alınır
```

### Cache'i Manuel Temizleme (Debug için)
```typescript
import { refreshEnvironmentConfig } from '../services/environmentConfig';

// Force refresh
await refreshEnvironmentConfig();
```

## Test Senaryosu

### Local Backend ile Test

1. Local backend'i başlat:
```bash
cd backend
npm run dev
```

2. Environment'ı test moduna al:
```bash
node scripts/set_environment.js test
```

3. Mobil uygulamayı yeniden başlat (Xcode veya Expo)

4. Tüm API çağrıları artık `http://localhost:5001`'e gidecek

### Production'a Dönüş

```bash
node scripts/set_environment.js production
```

## Güvenlik Notları

- `/api/config/environment` endpoint'i **public**'tir (authentication gerektirmez)
- Bu endpoint sadece environment bilgisini döndürür, hassas veri içermez
- Varsayılan değer her zaman `production`'dır (güvenli fallback)

## Troubleshooting

### Değişiklik Uygulanmıyor

1. Cache süresini bekleyin (5 dakika)
2. Uygulamayı tamamen kapatıp yeniden açın
3. Database'de ayarın doğru olduğunu kontrol edin:
```sql
SELECT * FROM settings WHERE key = 'environment';
```

### Local Backend'e Bağlanamıyor

1. Backend'in çalıştığından emin olun: `http://localhost:5001/api/health`
2. iOS Simulator'da localhost erişimi için özel ayar gerekmez
3. Android Emulator'da `localhost` yerine `10.0.2.2` kullanmanız gerekebilir

### Logs

Mobil uygulama console'unda şu logları göreceksiniz:

```
🌍 [ENV CONFIG] Fetched from backend: test
🌍 [ENV CONFIG] Fresh config: { environment: 'test', baseUrl: 'http://localhost:5001' }
🔗 API_BASE_URL initialized: http://localhost:5001
```

## Dosya Yapısı

```
backend/
├── routes/configRoutes.js          # Environment endpoint
├── scripts/
│   ├── set_environment.js          # Node.js script
│   └── set_environment.sql         # SQL script
└── utils/settings.js               # Settings helper

LingRootMobile/
└── src/
    └── services/
        └── environmentConfig.ts    # Environment config service
```

## API Reference

### GET /api/config/environment

**Response:**
```json
{
  "success": true,
  "data": {
    "environment": "production" // or "test"
  }
}
```

**No Authentication Required**

### Environment Config Functions

```typescript
// Get full config
const config = await getEnvironmentConfig();
// Returns: { environment: 'production' | 'test', baseUrl: string }

// Get just the URL
const url = await getApiBaseUrl();
// Returns: string

// Force refresh
const newConfig = await refreshEnvironmentConfig();

// Clear cache
await clearEnvironmentCache();
```
