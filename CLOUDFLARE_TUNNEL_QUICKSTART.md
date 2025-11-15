# 🚀 Cloudflare Tunnel Hızlı Başlangıç

LingRoot MFA backend'inizi 10 dakikada Cloudflare Tunnel ile internete açın.

---

## ⚡ Hızlı Kurulum (3 Adım)

### 1️⃣ Cloudflared Kur

```powershell
# PowerShell'i yönetici olarak çalıştırın
choco install cloudflared
```

### 2️⃣ Otomatik Kurulum Script'ini Çalıştır

```powershell
cd f:\Main
.\setup-cloudflare-tunnel.ps1
```

Script sizden şunları soracak:
- **Tunnel adı**: `lingroot-mfa` (varsayılan)
- **Domain**: Örn: `api.lingroot.com`
- **Backend port**: `5001` (varsayılan)

### 3️⃣ Başlat ve Test Et

```powershell
# Terminal 1: Backend'i başlat
cd f:\Main\backend
npm run dev

# Terminal 2: Tunnel'ı başlat
cloudflared tunnel run lingroot-mfa

# Terminal 3: Test et
curl https://api.lingroot.com/api/health
```

✅ **Başarılı yanıt**: `{"status":"ok","timestamp":"..."}`

---

## 🔧 Manuel Kurulum (Adım Adım)

Script kullanmak istemiyorsanız:

### 1. Login

```powershell
cloudflared tunnel login
```

### 2. Tunnel Oluştur

```powershell
cloudflared tunnel create lingroot-mfa
```

### 3. DNS Kayıt

```powershell
cloudflared tunnel route dns lingroot-mfa api.lingroot.com
```

### 4. Config Dosyası

`C:\Users\<kullanıcı>\.cloudflared\config.yml`:

```yaml
tunnel: lingroot-mfa
credentials-file: C:\Users\<kullanıcı>\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: api.lingroot.com
    service: http://localhost:5001
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
  - service: http_status:404
```

### 5. Backend .env

`f:\Main\backend\.env`:

```env
NODE_ENV=production
PORT=5001
ALLOWED_ORIGINS=https://api.lingroot.com,http://localhost:19006
```

### 6. Mobile .env

`f:\Main\LingRootMobile\.env`:

```env
EXPO_PUBLIC_API_URL=https://api.lingroot.com/api
```

### 7. Başlat

```powershell
# Backend
cd f:\Main\backend
npm run dev

# Tunnel
cloudflared tunnel run lingroot-mfa
```

---

## 🧪 Test Script'i

Herşeyin doğru çalıştığını kontrol edin:

```powershell
cd f:\Main
.\test-cloudflare-tunnel.ps1
```

Script şunları test eder:
- ✅ Cloudflared kurulumu
- ✅ Tunnel durumu
- ✅ Config dosyası
- ✅ Lokal backend
- ✅ DNS çözümleme
- ✅ HTTPS erişimi
- ✅ .env dosyaları

---

## 🔄 Günlük Kullanım

### Backend ve Tunnel'ı Başlatma

```powershell
# Terminal 1: Backend
cd f:\Main\backend
npm run dev

# Terminal 2: Tunnel
cloudflared tunnel run lingroot-mfa
```

### Windows Servisi (Otomatik Başlatma)

```powershell
# Yönetici olarak
cloudflared service install
cloudflared service start

# Artık sadece backend'i başlatmanız yeterli
cd f:\Main\backend
npm run dev
```

### Tunnel'ı Durdurma

```powershell
# Manuel çalıştırıyorsanız: Ctrl+C

# Servis olarak çalışıyorsa:
cloudflared service stop
```

---

## 🐛 Hızlı Sorun Giderme

### 502 Bad Gateway

**Neden**: Backend çalışmıyor veya tunnel başlatılmamış

**Çözüm**:
```powershell
# Backend'i kontrol et
curl http://localhost:5001/api/health

# Çalışmıyorsa başlat
cd f:\Main\backend
npm run dev

# Tunnel'ı kontrol et
cloudflared tunnel info lingroot-mfa

# Çalışmıyorsa başlat
cloudflared tunnel run lingroot-mfa
```

### CORS Hatası

**Neden**: Backend ALLOWED_ORIGINS yanlış yapılandırılmış

**Çözüm**: `f:\Main\backend\.env` dosyasında:
```env
ALLOWED_ORIGINS=https://api.lingroot.com,http://localhost:19006
```

### DNS Bulunamıyor

**Neden**: DNS kaydı oluşturulmamış veya henüz yayılmamış

**Çözüm**:
```powershell
# DNS kaydı oluştur
cloudflared tunnel route dns lingroot-mfa api.lingroot.com

# 5-10 dakika bekleyin (DNS yayılması)
```

### Mobile App Bağlanamıyor

**Neden**: .env dosyası yanlış veya app yeniden build edilmemiş

**Çözüm**:
```powershell
# .env kontrol et
cat f:\Main\LingRootMobile\.env

# Doğru değilse düzelt:
echo "EXPO_PUBLIC_API_URL=https://api.lingroot.com/api" > f:\Main\LingRootMobile\.env

# App'i yeniden başlat
cd f:\Main\LingRootMobile
npx expo start --clear
```

---

## 📊 Monitoring

### Tunnel Durumu

```powershell
cloudflared tunnel info lingroot-mfa
```

### Logları İzleme

```powershell
cloudflared tunnel run lingroot-mfa --loglevel debug
```

### Cloudflare Dashboard

1. https://one.dash.cloudflare.com/ adresine gidin
2. **Access** → **Tunnels**
3. Tunnel'ınızı seçin
4. Metrikleri görüntüleyin

---

## 💡 İpuçları

### Birden Fazla Backend

`config.yml` dosyasına birden fazla hostname ekleyebilirsiniz:

```yaml
ingress:
  - hostname: api.lingroot.com
    service: http://localhost:5001
  - hostname: admin.lingroot.com
    service: http://localhost:3000
  - service: http_status:404
```

### Güvenlik

Sadece belirli IP'lerden erişim için Cloudflare Dashboard'dan Access Policy ekleyin.

### Development vs Production

Development için lokal IP kullanın, production için Cloudflare Tunnel:

```env
# Development
EXPO_PUBLIC_API_URL=http://192.168.1.100:5001/api

# Production
EXPO_PUBLIC_API_URL=https://api.lingroot.com/api
```

---

## 📚 Daha Fazla Bilgi

- **Detaylı Rehber**: `CLOUDFLARE_TUNNEL_SETUP.md`
- **Kurulum Script'i**: `setup-cloudflare-tunnel.ps1`
- **Test Script'i**: `test-cloudflare-tunnel.ps1`

---

## 🆘 Yardım

Sorun mu yaşıyorsunuz?

1. Test script'ini çalıştırın: `.\test-cloudflare-tunnel.ps1`
2. Detaylı rehberi okuyun: `CLOUDFLARE_TUNNEL_SETUP.md`
3. Cloudflare Community: https://community.cloudflare.com/

---

**Hazırlayan**: LingRoot Team  
**Son Güncelleme**: 14 Kasım 2024
