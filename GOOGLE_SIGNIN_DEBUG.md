# Google Sign-In Sorun Giderme Rehberi

## Mevcut Durum

Google Client ID yapılandırılmış: `308629480159-43l1s64c2cei400tlnsbdtb5rurmsalt.apps.googleusercontent.com`

## Olası Sorunlar ve Çözümleri

### 1. Google Cloud Console Yapılandırması

Google OAuth'un web'de çalışması için Google Cloud Console'da şu ayarların yapılmış olması gerekir:

#### a) Authorized JavaScript Origins (İzin Verilen JavaScript Kökenleri)
Aşağıdaki URL'leri ekleyin:
- `http://localhost:3000` (development)
- `http://localhost:3001` (alternatif port)
- `https://lingroot.com` (production)
- `https://www.lingroot.com` (production www)
- Production domain'inizin tüm varyasyonları

#### b) Authorized Redirect URIs (İzin Verilen Yönlendirme URI'leri)
Aşağıdaki URL'leri ekleyin:
- `http://localhost:3000` (development)
- `https://lingroot.com` (production)
- `https://www.lingroot.com` (production www)

**Nasıl Yapılır:**
1. https://console.cloud.google.com/apis/credentials adresine gidin
2. OAuth 2.0 Client ID'nizi bulun (`308629480159-...`)
3. Edit/Düzenle'ye tıklayın
4. "Authorized JavaScript origins" ve "Authorized redirect URIs" bölümlerine yukarıdaki URL'leri ekleyin
5. Kaydedin

### 2. Next.js Sunucusunu Yeniden Başlatın

`.env.local` dosyasındaki değişiklikler için Next.js'in yeniden başlatılması gerekir:

```powershell
# Frontend dizininde
cd f:\Main\frontend
npm run dev
```

### 3. Browser Cache Temizleme

Google OAuth bilgileri tarayıcıda cache'leniyor olabilir:

1. Chrome DevTools açın (F12)
2. Application tab'ına gidin
3. "Clear storage" seçeneğine tıklayın
4. "Clear site data" butonuna basın
5. Sayfayı yenileyin (Ctrl+Shift+R)

### 4. CORS Sorunu

Backend'in CORS ayarlarını kontrol edin:

```javascript
// backend/server.js veya app.js
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://lingroot.com',
    'https://www.lingroot.com'
  ],
  credentials: true
}));
```

### 5. Google Identity Services Script Yükleme Hatası

Tarayıcı konsolunda şu hatayı görüyorsanız:

```
Failed to load resource: https://accounts.google.com/gsi/client
```

Bu, ağ bağlantısı veya güvenlik duvarı sorunu olabilir.

**Çözüm:**
- VPN kullanıyorsanız kapatın
- Antivirüs/Firewall'u geçici olarak devre dışı bırakın
- Farklı bir ağda deneyin

### 6. Content Security Policy (CSP) Sorunu

Eğer CSP header'ları varsa, Google'ın scriptlerini engelliyor olabilir.

`_document.tsx` veya `next.config.js` dosyasında CSP ayarlarını kontrol edin ve şunları ekleyin:

```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; frame-src https://accounts.google.com;"
        }
      ]
    }
  ];
}
```

## Test Adımları

1. **Tarayıcı Konsolunu Açın** (F12)
2. **Login sayfasına gidin** (http://localhost:3000/login)
3. **Google ile giriş butonuna tıklayın**
4. **Konsoldaki hata mesajlarını kontrol edin**

### Beklenen Console Logları

Başarılı durumda:
```
🔄 Google Auth başlatılıyor...
🔄 Google Sign-In tetikleniyor...
✅ Google credential alındı
🔄 Backend'e gönderiliyor...
✅ Google giriş başarılı
```

### Yaygın Hata Mesajları ve Çözümleri

#### "Google Client ID yapılandırılmamış"
- `.env.local` dosyasını kontrol edin
- Next.js sunucusunu yeniden başlatın

#### "popup_closed_by_user"
- Kullanıcı popup'ı kapattı (normal davranış)

#### "access_denied"
- Kullanıcı izin vermedi (normal davranış)

#### "idpiframe_initialization_failed"
- Cookies devre dışı
- Third-party cookies'i etkinleştirin

#### "Origin mismatch"
- Google Cloud Console'da Authorized JavaScript Origins'i kontrol edin
- Doğru URL'leri eklediğinizden emin olun

## Hızlı Test Komutu

```powershell
# Frontend'i başlat
cd f:\Main\frontend
npm run dev

# Backend'i başlat (başka bir terminal)
cd f:\Main\backend
npm start
```

Ardından http://localhost:3000/login adresine gidin ve Google ile giriş yapmayı deneyin.

## Debug Modu

Daha detaylı loglar için `googleAuth.ts` dosyasına ek console.log'lar eklenmiştir. Tarayıcı konsolunda şu logları göreceksiniz:

- Credential tipi (JWT vs Access Token)
- Credential uzunluğu
- Google prompt notification durumu
- OAuth response detayları

## Destek

Sorun devam ederse:
1. Tarayıcı konsol loglarını kaydedin
2. Network tab'ında `/api/auth/google` isteğini kontrol edin
3. Response'u inceleyin
