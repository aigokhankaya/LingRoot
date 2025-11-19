# Google Sign-In Sorunu - Çözüm Özeti

## Yapılan İyileştirmeler

### 1. Google Auth Script Yükleme İyileştirildi
**Dosya:** `frontend/src/lib/googleAuth.ts`

**Değişiklikler:**
- ✅ Script zaten yüklü mü kontrolü eklendi
- ✅ `window.google` nesnesinin hazır olmasını bekleyen retry mekanizması
- ✅ 10 saniyelik timeout eklendi
- ✅ Detaylı console logları eklendi
- ✅ Hata mesajları iyileştirildi

**Önceki Sorun:**
```typescript
// Basit yükleme - timing sorunları olabilir
if (document.getElementById('google-identity-script')) {
  resolve(true);
  return;
}
```

**Yeni Çözüm:**
```typescript
// Script yüklü ama window.google hazır değilse yeniden yükle
if (existingScript && window.google) {
  console.log('✅ Google Identity Services zaten yüklü');
  resolve(true);
  return;
}

if (existingScript) {
  console.log('⚠️ Script elementi var ama window.google yok, yeniden yükleniyor...');
  existingScript.remove();
}
```

### 2. Test Sayfası Oluşturuldu
**Dosya:** `frontend/pages/test-google-auth.tsx`

Bu sayfa ile:
- Environment variable'ların doğru yüklendiğini kontrol edebilirsiniz
- Google Auth akışını adım adım test edebilirsiniz
- Detaylı hata mesajları görebilirsiniz
- Credential'ın başarıyla alındığını doğrulayabilirsiniz

**Kullanım:**
```
http://localhost:3000/test-google-auth
```

### 3. Kapsamlı Debug Rehberi
**Dosya:** `GOOGLE_SIGNIN_DEBUG.md`

Sorun giderme için adım adım rehber içerir.

## Olası Sorunlar ve Çözümleri

### ❌ Sorun 1: "Google Client ID yapılandırılmamış"

**Sebep:** Environment variable yüklenmemiş

**Çözüm:**
```powershell
# 1. .env.local dosyasını kontrol edin
cd f:\Main\frontend
Get-Content .\.env.local | Select-String "GOOGLE"

# 2. Next.js'i yeniden başlatın
npm run dev
```

### ❌ Sorun 2: "Origin mismatch" veya "redirect_uri_mismatch"

**Sebep:** Google Cloud Console'da URL'ler eklenmemiş

**Çözüm:**
1. https://console.cloud.google.com/apis/credentials adresine gidin
2. OAuth 2.0 Client ID'nizi bulun: `308629480159-43l1s64c2cei400tlnsbdtb5rurmsalt.apps.googleusercontent.com`
3. **Authorized JavaScript origins** bölümüne ekleyin:
   - `http://localhost:3000`
   - `http://localhost:3001`
   - `https://lingroot.com`
   - `https://www.lingroot.com`
4. **Authorized redirect URIs** bölümüne ekleyin:
   - `http://localhost:3000`
   - `https://lingroot.com`
   - `https://www.lingroot.com`
5. Kaydedin

### ❌ Sorun 3: "Google Identity Services yüklenemedi"

**Sebep:** Ağ bağlantısı, VPN veya güvenlik duvarı

**Çözüm:**
- VPN kullanıyorsanız kapatın
- Antivirüs/Firewall'u geçici olarak devre dışı bırakın
- Farklı bir ağda deneyin
- Tarayıcı konsolunda network tab'ını kontrol edin

### ❌ Sorun 4: "idpiframe_initialization_failed"

**Sebep:** Third-party cookies devre dışı

**Çözüm:**
1. Chrome Settings → Privacy and security → Cookies
2. "Allow all cookies" veya "Block third-party cookies in Incognito" seçin
3. Sayfayı yenileyin

### ❌ Sorun 5: Popup açılmıyor

**Sebep:** Popup blocker

**Çözüm:**
1. Tarayıcının popup blocker'ını devre dışı bırakın
2. localhost için izin verin
3. Tekrar deneyin

## Test Adımları

### Adım 1: Environment Variable Kontrolü
```powershell
cd f:\Main\frontend
Get-Content .\.env.local | Select-String "GOOGLE"
```

**Beklenen Çıktı:**
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=308629480159-43l1s64c2cei400tlnsbdtb5rurmsalt.apps.googleusercontent.com
```

### Adım 2: Next.js'i Başlatın
```powershell
cd f:\Main\frontend
npm run dev
```

### Adım 3: Test Sayfasını Açın
```
http://localhost:3000/test-google-auth
```

### Adım 4: "Google Auth Test Et" Butonuna Tıklayın

**Başarılı Durumda Göreceğiniz Loglar:**
```
🔄 Google Identity Services script yükleniyor...
✅ Google Identity Services başarıyla yüklendi
✅ Client ID: 308629480159-...
✅ Google Auth başlatıldı
✅ window.google mevcut
🎯 One Tap JWT Credential alındı
✅ TEST BAŞARILI! Credential alındı.
```

### Adım 5: Gerçek Login Sayfasını Test Edin
```
http://localhost:3000/login
```

## Backend Kontrolü

Backend'in Google OAuth endpoint'i zaten doğru yapılandırılmış:

**Endpoint:** `POST /api/auth/google`

**Request Body:**
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIs...",
  "rememberMe": false
}
```

**Backend Kodu:** `backend/controllers/authController.js` - `googleLogin` fonksiyonu

Backend hem JWT credential hem de Access Token'ı destekliyor.

## Google Cloud Console Yapılandırması

### Gerekli Ayarlar

1. **OAuth consent screen:**
   - User Type: External veya Internal
   - Scopes: email, profile
   - Test users: Geliştirme sırasında kendinizi ekleyin

2. **Credentials:**
   - Type: OAuth 2.0 Client ID
   - Application type: Web application
   - Name: LingRoot Web
   - Authorized JavaScript origins: (yukarıda listelenmiş)
   - Authorized redirect URIs: (yukarıda listelenmiş)

### Hızlı Erişim
🔗 https://console.cloud.google.com/apis/credentials

## Kod Akışı

```
1. Kullanıcı "Google ile Giriş" butonuna tıklar
   ↓
2. initializeGoogleAuth() çağrılır
   - Google Identity Services script yüklenir
   - window.google nesnesi hazır olana kadar beklenir
   ↓
3. signInWithGoogle() çağrılır
   - Google One Tap prompt gösterilir
   - Eğer gösterilemezse OAuth popup açılır
   ↓
4. Kullanıcı Google hesabını seçer
   ↓
5. Credential (JWT veya Access Token) alınır
   ↓
6. loginWithGoogle(credential) çağrılır
   - Frontend: src/lib/auth.tsx
   - Backend'e POST /api/auth/google isteği gönderilir
   ↓
7. Backend credential'ı doğrular
   - JWT ise decode eder
   - Access Token ise Google API'den kullanıcı bilgilerini alır
   ↓
8. Kullanıcı oluşturulur veya giriş yapılır
   ↓
9. JWT token döndürülür
   ↓
10. Frontend token'ı localStorage'a kaydeder
    ↓
11. Kullanıcı /welcome sayfasına yönlendirilir
```

## Önemli Notlar

1. **Environment Variables:** Next.js'de browser'da kullanılacak environment variable'lar `NEXT_PUBLIC_` prefix'i ile başlamalı
2. **Server Restart:** `.env.local` değişikliklerinden sonra Next.js'i yeniden başlatın
3. **Cache:** Sorun yaşarsanız browser cache'ini temizleyin
4. **HTTPS:** Production'da mutlaka HTTPS kullanın
5. **CORS:** Backend'in frontend domain'ini CORS'ta izin verdiğinden emin olun

## Başarı Kriterleri

✅ Test sayfasında "✅ TEST BAŞARILI" mesajı görünüyor
✅ Login sayfasında Google ile giriş çalışıyor
✅ Credential backend'e başarıyla gönderiliyor
✅ Kullanıcı /welcome sayfasına yönlendiriliyor
✅ Token localStorage'a kaydediliyor

## Sorun Devam Ederse

1. **Test sayfasını kullanın:** http://localhost:3000/test-google-auth
2. **Console loglarını kaydedin:** F12 → Console tab
3. **Network tab'ını kontrol edin:** F12 → Network tab → /api/auth/google
4. **Google Cloud Console'u kontrol edin:** Authorized origins ve redirect URIs
5. **Backend loglarını kontrol edin:** Terminal'de backend loglarına bakın

## Ek Kaynaklar

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web/guides/overview)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
