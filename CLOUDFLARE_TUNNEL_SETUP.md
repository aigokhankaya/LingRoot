# Cloudflare Tunnel ile MFA Backend Kurulum Rehberi

Bu rehber, LingRoot MFA backend'inizi Cloudflare Tunnel kullanarak lokal bilgisayarınızdan internete açmanız için hazırlanmıştır.

## 📋 İçindekiler
1. [Gereksinimler](#gereksinimler)
2. [Cloudflare Tunnel Kurulumu](#cloudflare-tunnel-kurulumu)
3. [Backend Yapılandırması](#backend-yapılandırması)
4. [Mobile App Yapılandırması](#mobile-app-yapılandırması)
5. [Test ve Doğrulama](#test-ve-doğrulama)
6. [Sorun Giderme](#sorun-giderme)

---

## 🔧 Gereksinimler

- Windows 10/11
- Node.js 16+ ve npm
- Cloudflare hesabı (ücretsiz)
- Bir domain (Cloudflare'de yönetilen)
- PowerShell (yönetici yetkisi)

---

## 🚀 Cloudflare Tunnel Kurulumu

### Adım 1: Cloudflare Hesabı ve Domain Hazırlığı

1. **Cloudflare hesabı oluşturun** (henüz yoksa): https://dash.cloudflare.com/sign-up
2. **Domain ekleyin**: 
   - Cloudflare Dashboard → "Add a Site"
   - Domain'inizi girin (örn: `lingroot.com`)
   - Nameserver'ları domain sağlayıcınızda güncelleyin

### Adım 2: Cloudflared CLI Kurulumu

1. **Cloudflared'i indirin**:
   ```powershell
   # PowerShell'i yönetici olarak çalıştırın
   
   # Chocolatey ile (önerilen)
   choco install cloudflared
   
   # VEYA manuel indirme
   # https://github.com/cloudflare/cloudflared/releases/latest
   # cloudflared-windows-amd64.exe dosyasını indirin
   # C:\Program Files\cloudflared\ klasörüne kopyalayın
   # PATH'e ekleyin
   ```

2. **Kurulumu doğrulayın**:
   ```powershell
   cloudflared --version
   ```

### Adım 3: Cloudflare'e Giriş Yapın

```powershell
cloudflared tunnel login
```

Bu komut bir tarayıcı penceresi açacak. Cloudflare hesabınıza giriş yapın ve domain'inizi seçin.

### Adım 4: Tunnel Oluşturun

```powershell
# Tunnel oluştur
cloudflared tunnel create lingroot-mfa

# Tunnel ID'yi not edin (çıktıda görünecek)
# Örnek: Created tunnel lingroot-mfa with id 12345678-1234-1234-1234-123456789abc
```

Tunnel bilgileri `C:\Users\<kullanıcı>\.cloudflared\` klasöründe saklanır.

### Adım 5: DNS Kaydı Oluşturun

```powershell
# Subdomain için DNS kaydı oluştur
cloudflared tunnel route dns lingroot-mfa api.lingroot.com

# Başarılı olursa şu mesajı göreceksiniz:
# Created CNAME record for api.lingroot.com
```

> **Not**: `api.lingroot.com` yerine kendi domain'inizi kullanın.

### Adım 6: Tunnel Yapılandırma Dosyası Oluşturun

`C:\Users\<kullanıcı>\.cloudflared\config.yml` dosyası oluşturun:

```yaml
tunnel: lingroot-mfa
credentials-file: C:\Users\<kullanıcı>\.cloudflared\<tunnel-id>.json

ingress:
  # MFA Backend
  - hostname: api.lingroot.com
    service: http://localhost:5001
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
      
  # Catch-all rule (zorunlu)
  - service: http_status:404
```

> **Önemli**: 
> - `<kullanıcı>` yerine Windows kullanıcı adınızı yazın
> - `<tunnel-id>` yerine Adım 4'te aldığınız tunnel ID'yi yazın
> - `api.lingroot.com` yerine kendi subdomain'inizi yazın

---

## ⚙️ Backend Yapılandırması

### Adım 1: Backend .env Dosyasını Güncelleyin

`f:\Main\backend\.env` dosyasını düzenleyin:

```env
# Server Configuration
NODE_ENV=production
PORT=5001

# CORS - Cloudflare domain'inizi ekleyin
ALLOWED_ORIGINS=https://api.lingroot.com,http://localhost:19006

# Database
DATABASE_URL=your_database_url_here

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Diğer ayarlar...
```

### Adım 2: Backend'i Başlatın

```powershell
cd f:\Main\backend
npm install
npm run dev
```

Backend `http://localhost:5001` adresinde çalışmalı.

---

## 📱 Mobile App Yapılandırması

### Adım 1: .env Dosyası Oluşturun

`f:\Main\LingRootMobile\.env` dosyası oluşturun:

```env
# Cloudflare Tunnel URL'inizi kullanın
EXPO_PUBLIC_API_URL=https://api.lingroot.com/api
```

### Adım 2: app.json Güncellemesi (Opsiyonel)

`f:\Main\LingRootMobile\app.json` dosyasında:

```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_API_URL": "https://api.lingroot.com/api"
    }
  }
}
```

---

## 🌐 Tunnel'ı Başlatma

### Manuel Başlatma

```powershell
cloudflared tunnel run lingroot-mfa
```

### Windows Servisi Olarak Çalıştırma (Önerilen)

Bilgisayar açıldığında otomatik başlaması için:

```powershell
# PowerShell'i yönetici olarak çalıştırın
cloudflared service install
```

Servis yönetimi:

```powershell
# Servisi başlat
cloudflared service start

# Servisi durdur
cloudflared service stop

# Servis durumunu kontrol et
Get-Service cloudflared
```

---

## ✅ Test ve Doğrulama

### 1. Tunnel Durumunu Kontrol Edin

```powershell
cloudflared tunnel info lingroot-mfa
```

### 2. Backend Erişimini Test Edin

Tarayıcıda veya PowerShell'de:

```powershell
# Health check
curl https://api.lingroot.com/api/health

# Beklenen yanıt:
# {"status":"ok","timestamp":"..."}
```

### 3. Mobile App'i Test Edin

```powershell
cd f:\Main\LingRootMobile

# Development build
npx expo start

# VEYA APK build
eas build --platform android --profile preview
```

Mobile app'te login yapmayı deneyin.

---

## 🔍 Sorun Giderme

### Problem 1: Tunnel Bağlanamıyor

**Çözüm**:
```powershell
# Tunnel'ı yeniden başlatın
cloudflared tunnel cleanup lingroot-mfa
cloudflared tunnel run lingroot-mfa
```

### Problem 2: 502 Bad Gateway

**Nedenleri**:
- Backend çalışmıyor
- Port yanlış yapılandırılmış

**Çözüm**:
```powershell
# Backend'in çalıştığını doğrulayın
curl http://localhost:5001/api/health

# Çalışmıyorsa backend'i başlatın
cd f:\Main\backend
npm run dev
```

### Problem 3: CORS Hatası

**Çözüm**: Backend `.env` dosyasında `ALLOWED_ORIGINS` ayarını kontrol edin:

```env
ALLOWED_ORIGINS=https://api.lingroot.com,http://localhost:19006
```

### Problem 4: SSL/TLS Hatası

**Çözüm**: `config.yml` dosyasında `noTLSVerify: true` olduğundan emin olun.

### Logları İnceleme

```powershell
# Tunnel logları
cloudflared tunnel run lingroot-mfa --loglevel debug

# Windows servis logları
Get-EventLog -LogName Application -Source cloudflared -Newest 50
```

---

## 📊 Cloudflare Dashboard Monitoring

1. **Cloudflare Dashboard'a gidin**: https://dash.cloudflare.com
2. **Zero Trust** → **Access** → **Tunnels**
3. Tunnel'ınızı seçin ve metrikleri görüntüleyin:
   - Aktif bağlantılar
   - Trafik istatistikleri
   - Hata oranları

---

## 🔒 Güvenlik Önerileri

### 1. Access Policy Ekleyin (Opsiyonel)

Sadece belirli IP'lerden erişim için:

```powershell
# Cloudflare Dashboard → Zero Trust → Access → Applications
# "Add an application" → Self-hosted
# Policy: IP aralığı veya email bazlı erişim kuralları ekleyin
```

### 2. Rate Limiting

Cloudflare Dashboard → Security → WAF → Rate Limiting Rules

### 3. Secrets Yönetimi

`.env` dosyalarını **asla** Git'e commit etmeyin:

```powershell
# .gitignore dosyasına ekleyin
echo ".env" >> f:\Main\backend\.gitignore
echo ".env" >> f:\Main\LingRootMobile\.gitignore
```

---

## 🎯 Hızlı Başlangıç Özeti

```powershell
# 1. Cloudflared kur
choco install cloudflared

# 2. Login
cloudflared tunnel login

# 3. Tunnel oluştur
cloudflared tunnel create lingroot-mfa

# 4. DNS kayıt
cloudflared tunnel route dns lingroot-mfa api.lingroot.com

# 5. Config dosyası oluştur
# C:\Users\<kullanıcı>\.cloudflared\config.yml

# 6. Backend başlat
cd f:\Main\backend
npm run dev

# 7. Tunnel başlat
cloudflared tunnel run lingroot-mfa

# 8. Test et
curl https://api.lingroot.com/api/health
```

---

## 📚 Ek Kaynaklar

- [Cloudflare Tunnel Dokümantasyonu](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Cloudflared GitHub](https://github.com/cloudflare/cloudflared)
- [Zero Trust Dashboard](https://one.dash.cloudflare.com/)

---

## 💡 İpuçları

1. **Geliştirme sırasında**: Tunnel'ı terminal'de çalıştırın (logları görmek için)
2. **Production'da**: Windows servisi olarak çalıştırın (otomatik başlatma)
3. **Birden fazla backend**: `config.yml` dosyasında birden fazla hostname ekleyebilirsiniz
4. **Ücretsiz plan**: Cloudflare Tunnel tamamen ücretsizdir, trafik limiti yoktur

---

## 🆘 Destek

Sorun yaşarsanız:
1. Bu dokümandaki "Sorun Giderme" bölümünü kontrol edin
2. Cloudflare Community: https://community.cloudflare.com/
3. GitHub Issues: Proje repository'sinde issue açın

---

**Son Güncelleme**: 14 Kasım 2024
**Versiyon**: 1.0
