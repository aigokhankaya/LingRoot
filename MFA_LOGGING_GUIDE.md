# MFA Backend Routing - Log Rehberi

Bu dokümantasyon, API isteklerinin hangi backend'e gittiğini console log'larından nasıl anlayacağınızı açıklar.

## 📱 Mobile App (LingRootMobile) Console Logs

### Uygulama Başlatıldığında

```
🔗 API_BASE_URL initialized: https://lingloops-backend.onrender.com
🔐 MFA_API_BASE_URL initialized: https://api.booklevel.store/api
📍 MFA requests will go to: CLOUDFLARE TUNNEL
```

veya (eğer MFA URL tanımlı değilse):

```
🔗 API_BASE_URL initialized: https://lingloops-backend.onrender.com
🔐 MFA_API_BASE_URL using default (same as API_BASE_URL)
📍 MFA requests will go to: NORMAL BACKEND
```

### Normal API İstekleri (TTS, Vocabulary, vb.)

```
🌐 [API REQUEST] POST /api/tts/process
📍 [API REQUEST] Target: https://lingloops-backend.onrender.com
```

### MFA API İstekleri

```
🔐 [MFA REQUEST] POST /api/mfa/setup
📍 [MFA REQUEST] Target: https://api.booklevel.store/api
```

## 🌐 Web Frontend Console Logs

### Sayfa Yüklendiğinde

```
🔐 MFA_API_BASE_URL: https://api.booklevel.store
📍 MFA requests will go to: CLOUDFLARE TUNNEL
```

veya (eğer MFA URL tanımlı değilse):

```
🔐 MFA_API_BASE_URL: using default (same as API_BASE_URL)
📍 MFA requests will go to: NORMAL BACKEND
```

### Normal API İstekleri

```
🌐 [API REQUEST] POST /api/tts/process
📍 [API REQUEST] Target: https://lingloops-backend.onrender.com
```

### MFA API İstekleri

```
🔐 [MFA REQUEST] POST /api/mfa/setup
📍 [MFA REQUEST] Target: https://api.booklevel.store
```

## 🔍 Log İkonları Açıklaması

| İkon | Anlamı |
|------|--------|
| 🔗 | Normal API base URL |
| 🔐 | MFA API base URL |
| 📍 | Hedef backend (Cloudflare Tunnel veya Normal Backend) |
| 🌐 | Normal API isteği |
| ⚠️ | Uyarı (örn: token bulunamadı) |
| ❌ | Hata |

## 📊 Örnek Senaryo

### Senaryo 1: MFA Setup İsteği

**Mobile Console:**
```
🔐 [MFA REQUEST] POST /api/mfa/setup
📍 [MFA REQUEST] Target: https://api.booklevel.store/api
```

**Sonuç:** ✅ İstek Cloudflare Tunnel'a gitti (lokal backend)

### Senaryo 2: TTS İşlemi

**Mobile Console:**
```
🌐 [API REQUEST] POST /api/tts/process
📍 [API REQUEST] Target: https://lingloops-backend.onrender.com
```

**Sonuç:** ✅ İstek Render backend'e gitti

### Senaryo 3: MFA Verify

**Web Console:**
```
🔐 [MFA REQUEST] POST /api/mfa/verify-setup
📍 [MFA REQUEST] Target: https://api.booklevel.store
```

**Sonuç:** ✅ İstek Cloudflare Tunnel'a gitti

## 🎯 Hızlı Kontrol

### Mobile App'te kontrol:
1. Expo'yu başlat: `npx expo start --clear`
2. Console'da şu log'u ara: `📍 MFA requests will go to:`
3. `CLOUDFLARE TUNNEL` yazıyorsa ✅ doğru yapılandırılmış

### Web'de kontrol:
1. Browser'ı aç (F12 → Console)
2. Sayfayı yenile
3. Console'da şu log'u ara: `📍 MFA requests will go to:`
4. `CLOUDFLARE TUNNEL` yazıyorsa ✅ doğru yapılandırılmış

## 🚨 Sorun Giderme

### "MFA requests will go to: NORMAL BACKEND" görüyorum

**Neden:** `.env` dosyasında `EXPO_PUBLIC_MFA_API_URL` veya `NEXT_PUBLIC_MFA_API_URL` tanımlı değil.

**Çözüm:**

**Mobile:**
```env
# LingRootMobile/.env
EXPO_PUBLIC_MFA_API_URL=https://api.booklevel.store/api
```

**Web:**
```env
# frontend/.env.local
NEXT_PUBLIC_MFA_API_URL=https://api.booklevel.store
```

Sonra uygulamayı yeniden başlat.

### MFA isteği log'da görünmüyor

**Neden:** İstek henüz yapılmadı veya health check endpoint'i (log'lanmıyor).

**Çözüm:** MFA setup/verify gibi bir işlem yap, log'lar görünecek.

### Her iki istek de aynı backend'e gidiyor

**Kontrol:**
1. `.env` dosyasını kontrol et
2. Uygulamayı tamamen kapat ve yeniden başlat
3. Cache'i temizle: `npx expo start --clear` (mobile) veya `rm -rf .next` (web)

## 📝 Notlar

- Health check endpoint'leri (`/api/health`) log'lanmaz (gürültüyü azaltmak için)
- Log'lar sadece development modda görünür
- Production build'de log'lar otomatik olarak devre dışı kalabilir
- Her istek için hem method (GET/POST) hem de endpoint gösterilir
- Target URL tam olarak gösterilir, böylece hangi backend'e gittiğini kesin olarak görebilirsin

## 🎉 Özet

✅ **Normal API istekleri** → `🌐 [API REQUEST]` → Render backend  
✅ **MFA API istekleri** → `🔐 [MFA REQUEST]` → Cloudflare Tunnel  
✅ Console'da kolayca ayırt edebilirsin  
✅ Başlangıçta hangi backend'in kullanılacağı belirtilir  
