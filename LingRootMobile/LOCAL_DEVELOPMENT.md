# Lokalde Backend ile Test Etme Rehberi

Bu rehber, Android uygulamasını lokalde çalışan backend sunucusuyla test etmeniz için gerekli adımları açıklar.

## Ön Hazırlık

### 1. Backend'i Lokalde Çalıştırın

Backend klasöründe:

```bash
cd backend
npm install  # İlk seferinde
npm run dev  # Development modunda çalıştır
```

Backend `http://0.0.0.0:5001` adresinde çalışacaktır.

### 2. Bilgisayarınızın Local IP Adresini Bulun

Android cihazınız veya emülatörünüz `localhost`'a doğrudan erişemez. Bilgisayarınızın yerel ağ IP adresini bulmanız gerekiyor.

**Windows'ta:**
```bash
ipconfig
```

**macOS/Linux'ta:**
```bash
ifconfig
# veya
ip addr show
```

`192.168.x.x` veya `10.0.x.x` formatında bir IP adresi arayın. Örnek: `192.168.1.100`

### 3. Environment Dosyasını Oluşturun

`LingRootMobile` klasöründe `.env` dosyası oluşturun:

```bash
cd LingRootMobile
cp env.example .env
```

`.env` dosyasını düzenleyin ve `EXPO_PUBLIC_API_URL` değişkenini bilgisayarınızın IP adresiyle güncelleyin:

```env
# Local development için
EXPO_PUBLIC_API_URL=http://192.168.1.100:5001

# Diğer değişkenler...
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id
```

**ÖNEMLİ:** `192.168.1.100` yerine kendi IP adresinizi yazın!

### 4. Uygulamayı Yeniden Başlatın

Environment değişkenleri değiştiğinde uygulamayı yeniden başlatmanız gerekir:

```bash
# Expo cache'i temizle
npx expo start -c

# Veya
npm start -- --clear
```

## Android Emülatör Kullanıyorsanız

Android Studio emülatörü kullanıyorsanız, bazı özel durumlar vardır:

### Seçenek 1: `10.0.2.2` Kullanın (Önerilen)

Android emülatörü için özel bir IP adresi vardır:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5001
```

`10.0.2.2` emülatörün host makinesine (bilgisayarınıza) erişmek için kullandığı özel adrestir.

### Seçenek 2: Bilgisayarınızın IP'sini Kullanın

Yukarıdaki yöntem çalışmazsa, bilgisayarınızın gerçek IP adresini kullanın:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:5001
```

## Fiziksel Android Cihaz Kullanıyorsanız

1. Cihazınızın bilgisayarınızla **aynı Wi-Fi ağında** olduğundan emin olun
2. Bilgisayarınızın IP adresini kullanın:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:5001
```

3. Windows Firewall'un 5001 portunu engellemediğinden emin olun:
   - Windows Defender Firewall > Advanced Settings > Inbound Rules
   - New Rule > Port > TCP > 5001 > Allow the connection

## Güvenlik Duvarı Ayarları (Windows)

Backend'e dışarıdan erişim için Windows Firewall'da port açmanız gerekebilir:

### PowerShell ile (Yönetici olarak çalıştırın):

```powershell
New-NetFirewallRule -DisplayName "Node.js Backend Port 5001" -Direction Inbound -LocalPort 5001 -Protocol TCP -Action Allow
```

### Manuel Olarak:

1. Windows Defender Firewall açın
2. "Advanced settings" tıklayın
3. "Inbound Rules" > "New Rule"
4. "Port" seçin > "TCP" > "5001" girin
5. "Allow the connection" seçin
6. İsim verin: "Node.js Backend Port 5001"

## Test Etme

### 1. Backend'in Çalıştığını Kontrol Edin

Tarayıcınızda veya Postman'de:

```
http://localhost:5001/api/health
```

Yanıt:
```json
{
  "success": true,
  "message": "API is healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Mobil Cihazdan Erişimi Test Edin

Mobil cihazınızın tarayıcısında:

```
http://192.168.1.100:5001/api/health
```

(IP adresinizi kullanın)

### 3. Uygulamayı Test Edin

Uygulamayı açın ve login/register işlemlerini deneyin. Backend'e yapılan istekleri görmek için backend terminalini izleyin.

## Production'a Geri Dönme

Production backend'e geri dönmek için `.env` dosyasını düzenleyin:

```env
EXPO_PUBLIC_API_URL=https://lingloops-backend.onrender.com
```

Veya `.env` dosyasını silin (fallback olarak production URL kullanılır).

Sonra uygulamayı yeniden başlatın:

```bash
npx expo start -c
```

## Sorun Giderme

### "Network request failed" Hatası

1. Backend'in çalıştığından emin olun
2. IP adresinin doğru olduğunu kontrol edin
3. Firewall ayarlarını kontrol edin
4. Cihaz ve bilgisayarın aynı ağda olduğunu kontrol edin

### "Connection refused" Hatası

1. Backend'in `0.0.0.0` üzerinde dinlediğinden emin olun (sadece `localhost` değil)
2. Port numarasının doğru olduğunu kontrol edin (5001)
3. Başka bir uygulama 5001 portunu kullanıyor olabilir

### Emülatörde "Unable to resolve host" Hatası

1. `10.0.2.2` adresini deneyin
2. Emülatörü yeniden başlatın
3. Expo cache'i temizleyin: `npx expo start -c`

### Backend'e İstek Gitmiyor

`api.ts` dosyasına geçici olarak debug log ekleyin:

```typescript
const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || 'https://lingloops-backend.onrender.com';
console.log('🔗 API_BASE_URL:', API_BASE_URL); // Debug için
```

## Notlar

- `.env` dosyası `.gitignore`'da olduğu için commit edilmeyecektir
- Her geliştirici kendi IP adresini kullanmalıdır
- Production'a deploy ederken `.env` dosyasını silmeyi unutmayın veya production URL'i ayarlayın
- Backend değişikliklerini test ettikten sonra Render'a push etmeden önce lokalde test edin

## Hızlı Komutlar

```bash
# Backend'i başlat
cd backend && npm run dev

# IP adresini bul (Windows)
ipconfig | findstr IPv4

# IP adresini bul (macOS/Linux)
ifconfig | grep "inet "

# Expo cache'i temizle ve başlat
cd LingRootMobile && npx expo start -c

# Firewall kuralı ekle (Windows PowerShell - Yönetici)
New-NetFirewallRule -DisplayName "Node.js Backend Port 5001" -Direction Inbound -LocalPort 5001 -Protocol TCP -Action Allow
```
