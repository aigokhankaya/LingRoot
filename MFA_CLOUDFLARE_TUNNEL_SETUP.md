# MFA Cloudflare Tunnel Kurulum Özeti

Bu dokümantasyon, MFA işlemlerinin Cloudflare Tunnel üzerinden çalışması için yapılan değişiklikleri özetler.

## 🎯 Amaç

- **Normal işlemler**: Render backend (`https://lingloops-backend.onrender.com`)
- **MFA işlemleri**: Cloudflare Tunnel (`https://api.booklevel.store`)

## 📱 Mobile (LingRootMobile) Değişiklikleri

### 1. Environment Variables

**Dosya**: `LingRootMobile/.env`

```env
# Normal backend (Render)
EXPO_PUBLIC_API_URL=https://lingloops-backend.onrender.com/api

# MFA için lokal tunnel
EXPO_PUBLIC_MFA_API_URL=https://api.booklevel.store/api
```

### 2. API Service Güncellemeleri

**Dosya**: `LingRootMobile/src/services/api.ts`

**Değişiklikler:**
- ✅ Ayrı `MFA_API_BASE_URL` değişkeni eklendi
- ✅ Ayrı `mfaApiClient` axios instance oluşturuldu
- ✅ MFA client için interceptor'lar eklendi (auth, token refresh)
- ✅ `mfaService` export edildi (setupMfa, verifyMfa, vb.)

**Kullanım:**
```typescript
import { mfaService } from './services/api';

// MFA setup
const result = await mfaService.setupMfa();

// MFA verify
const verified = await mfaService.verifyMfaSetup(token);

// MFA status
const status = await mfaService.getMfaStatus();
```

## 🌐 Web Frontend Değişiklikleri

### 1. Environment Variables

**Dosya**: `frontend/.env.local`

```env
# Normal backend
NEXT_PUBLIC_API_URL=https://lingloops-backend.onrender.com

# MFA için lokal tunnel
NEXT_PUBLIC_MFA_API_URL=https://api.booklevel.store
```

### 2. API Library Güncellemeleri

**Dosya**: `frontend/src/lib/api.ts`

**Değişiklikler:**
- ✅ `NEXT_PUBLIC_MFA_API_URL` environment variable tanımı eklendi
- ✅ `getMfaApiBaseUrl()` fonksiyonu eklendi
- ✅ Ayrı `mfaApi` axios instance oluşturuldu
- ✅ MFA API için interceptor'lar eklendi
- ✅ `mfaService` export edildi

**Kullanım:**
```typescript
import { mfaService } from '@/lib/api';

// MFA setup
const result = await mfaService.setupMfa();

// MFA verify
const verified = await mfaService.verifyMfaSetup(token);
```

## 🔧 Backend Değişiklikleri

### CORS Ayarları

**Dosya**: `backend/middleware/security.js`

**Değişiklikler:**
```javascript
const allowedOrigins = [
  'https://www.lingroot.com',
  'https://lingroot.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://api.booklevel.store',  // ✅ Cloudflare Tunnel for MFA
  'http://localhost:19006'  // ✅ Expo development
];
```

## 🚀 Cloudflare Tunnel Ayarları

### 1. Tunnel Başlatma

```powershell
# Config.yml'i sil (token kullanmak için)
Remove-Item C:\Users\enesy\.cloudflared\config.yml

# Token al
cloudflared tunnel token booklevel-backend

# Token ile çalıştır
cloudflared tunnel run --token <TOKEN>
```

### 2. Dashboard Ayarları

**Cloudflare Dashboard** → **Networks** → **Tunnels** → **booklevel-backend** → **Configure**

**Public Hostname:**
- Subdomain: `api`
- Domain: `booklevel.store`
- Service: `http://localhost:5001`

### 3. Backend Başlatma

```powershell
cd f:\Main\backend
npm start
```

Backend `localhost:5001` portunda çalışmalı.

## ✅ Test

### 1. Tunnel Test

```powershell
# Health check
curl https://api.booklevel.store/api/health

# Beklenen yanıt:
# {"status":"ok","timestamp":"..."}
```

### 2. Mobile App Test

```powershell
cd f:\Main\LingRootMobile
npx expo start --clear
```

Mobile app'te MFA işlemlerini test et.

### 3. Web Frontend Test

```powershell
cd f:\Main\frontend
npm run dev
```

Web'de MFA işlemlerini test et.

## 📊 API Endpoint'leri

Tüm MFA endpoint'leri artık `https://api.booklevel.store` üzerinden çalışır:

- `POST /api/mfa/setup` - MFA kurulumu (QR kod)
- `POST /api/mfa/verify-setup` - MFA doğrulama (kurulum)
- `POST /api/mfa/verify-login` - MFA doğrulama (login)
- `POST /api/mfa/disable` - MFA devre dışı bırakma
- `GET /api/mfa/status` - MFA durumu
- `POST /api/mfa/regenerate-backup-codes` - Yedek kod yenileme
- `POST /api/mfa/verify-backup-code` - Yedek kod doğrulama

## 🔍 Sorun Giderme

### Mobile App MFA Çağrıları Çalışmıyor

1. `.env` dosyasını kontrol et:
   ```env
   EXPO_PUBLIC_MFA_API_URL=https://api.booklevel.store/api
   ```

2. Expo'yu temiz başlat:
   ```powershell
   npx expo start --clear
   ```

3. Console loglarını kontrol et:
   ```
   🔐 MFA_API_BASE_URL initialized: https://api.booklevel.store/api
   ```

### Web Frontend MFA Çağrıları Çalışmıyor

1. `.env.local` dosyasını kontrol et:
   ```env
   NEXT_PUBLIC_MFA_API_URL=https://api.booklevel.store
   ```

2. Next.js'i yeniden başlat:
   ```powershell
   npm run dev
   ```

3. Browser console'da URL'i kontrol et

### CORS Hatası

Backend `middleware/security.js` dosyasında `https://api.booklevel.store` olduğundan emin ol.

### 502 Bad Gateway

1. Backend çalışıyor mu?
   ```powershell
   curl http://localhost:5001/api/health
   ```

2. Tunnel çalışıyor mu?
   ```powershell
   cloudflared tunnel info booklevel-backend
   ```

3. Dashboard'da port doğru mu? (`localhost:5001`)

## 📝 Notlar

- MFA URL tanımlanmazsa, otomatik olarak normal API URL'i kullanılır
- Tunnel her zaman çalışır durumda olmalı (veya Windows servisi olarak kurulmalı)
- Backend `localhost:5001` portunda çalışmalı
- CORS ayarları her iki URL için de yapılandırılmış durumda

## 🎉 Özet

✅ Mobile app MFA için ayrı URL kullanıyor  
✅ Web frontend MFA için ayrı URL kullanıyor  
✅ Backend CORS ayarları güncellendi  
✅ Cloudflare Tunnel çalışıyor  
✅ Tüm MFA endpoint'leri tunnel üzerinden erişilebilir  

**Artık MFA geliştirmelerini lokal backend'den Cloudflare Tunnel ile çalıştırabilirsin!** 🚀
