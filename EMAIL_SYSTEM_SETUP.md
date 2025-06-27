# 📧 LingRoot Email System - Kurulum ve Kullanım Rehberi

## 🎯 Özellikler

✅ **Otomatik Hoşgeldin Maili**: Yeni kayıt olan kullanıcılara otomatik hoşgeldin maili gönderilir
✅ **Google OAuth Desteği**: Google ile kayıt olan kullanıcılara da hoşgeldin maili gönderilir  
✅ **Güvenli Gmail SMTP**: Gmail'in güvenli SMTP servisi kullanılır
✅ **HTML + Text**: Hem HTML hem plain text email formatları desteklenir
✅ **Hata Toleransı**: Email hatası kayıt işlemini etkilemez
✅ **Test Endpoints**: Email sistemini test etmek için endpoint'ler
✅ **Logging**: Tüm email işlemleri loglanır

## 🔧 Kurulum

### 1. Gmail Hesabı Hazırlığı

1. Gmail hesabınızda **2-Step Verification**'ı aktif edin
2. Google hesap ayarlarından **App passwords** bölümüne gidin
3. LingRoot için özel bir app password oluşturun (16 karakterlik)

### 2. Environment Variables

Backend'teki `.env` dosyasına şu değişkenleri ekleyin:

```env
# Email Configuration
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

### 3. Sistem Dosyaları

Sistem şu dosyalardan oluşur:

- `backend/utils/emailService.js` - Email servisi
- `backend/routes/testEmailRoutes.js` - Test endpoint'leri
- `backend/controllers/authController.js` - Kayıt sonrası email gönderimi

## 📧 Email Şablonu

### Hoşgeldin Email İçeriği:

- **Konu**: `🎉 [İsim], LingRoot'a Hoş Geldiniz! İngilizce yolculuğunuz başlasın`
- **Tasarım**: Modern, responsive HTML tasarım
- **İçerik**: 
  - Hoşgeldin mesajı
  - 3 adımlık başlangıç rehberi
  - Dashboard'a yönlendirme
  - İpuçları ve iletişim bilgileri

## 🧪 Test Endpoints

### 1. Email Yapılandırması Kontrolü
```http
GET /api/test-email/config-status
```
Email ayarlarının doğru yapılıp yapılmadığını kontrol eder.

### 2. Email Bağlantı Testi
```http
GET /api/test-email/test-connection
```
Gmail SMTP bağlantısını test eder.

### 3. Test Email Gönderimi
```http
POST /api/test-email/test-welcome
Content-Type: application/json

{
  "email": "test@example.com",
  "firstName": "Test Kullanıcı"
}
```

### 4. Email Şablonu Önizleme
```http
GET /api/test-email/preview-template?firstName=TestKullanıcı&email=test@example.com
```
Email şablonunu browser'da önizler.

## 🚀 Kullanım

### Otomatik Email Gönderimi

Email sistemi şu durumlarda otomatik olarak çalışır:

1. **Normal Kayıt**: `POST /api/auth/register` endpoint'i ile kayıt
2. **Google OAuth**: İlk kez Google ile giriş yapan kullanıcılar

### Manuel Email Gönderimi

```javascript
const { sendWelcomeEmail } = require('./utils/emailService');

// Hoşgeldin maili gönder
const result = await sendWelcomeEmail('user@example.com', 'Kullanıcı İsmi');

if (result.success) {
  console.log('Email gönderildi:', result.messageId);
} else {
  console.error('Email hatası:', result.error);
}
```

## 📋 Kurulum Test Listesi

- [ ] Gmail hesabında 2-Step Verification aktif
- [ ] App password oluşturuldu
- [ ] `.env` dosyasında EMAIL_USER ve EMAIL_PASSWORD tanımlandı
- [ ] Backend server yeniden başlatıldı
- [ ] `GET /api/test-email/config-status` endpoint'i ✅ döndürüyor
- [ ] `GET /api/test-email/test-connection` endpoint'i başarılı
- [ ] Test email gönderimi çalışıyor
- [ ] Yeni kayıt sırasında email otomatik gönderiliyor

## 🔍 Troubleshooting

### Email Gönderilmiyor

1. **Gmail ayarları kontrol edin**:
   - 2-Step Verification aktif mi?
   - App password doğru mu?

2. **Environment variables kontrol edin**:
   ```bash
   GET /api/test-email/config-status
   ```

3. **SMTP bağlantısını test edin**:
   ```bash
   GET /api/test-email/test-connection
   ```

### Email Spam'e Düşüyor

- Gmail hesabının reputation'ını artırmak için az sayıda email ile başlayın
- SPF/DKIM kayıtlarını domain'inize ekleyin (prod için)

### Geliştirme Ortamında Test

```bash
# Backend başlat
cd backend && npm start

# Test endpoint'lerini kullan
curl http://localhost:5001/api/test-email/config-status
curl http://localhost:5001/api/test-email/test-connection
```

## 📈 Monitoring

Email işlemleri backend loglarında takip edilebilir:

```
[EMAIL] ✅ Hoşgeldin maili başarıyla gönderildi: user@example.com
[EMAIL] ❌ Hoşgeldin maili gönderilemedi: user@example.com
```

## 🛡️ Güvenlik

- Email şifreleri environment variable'larda saklanır
- Gmail App passwords kullanılır (asla gerçek şifre değil)
- Email hatası kayıt işlemini engellemez
- Rate limiting Gmail tarafından otomatik yapılır

## 📞 İletişim

Herhangi bir sorun için:
- Backend loglarını kontrol edin
- Test endpoint'lerini kullanın
- Gmail quota limitlerini kontrol edin (günlük 500 email)

## 📞 Sonuç

Bu sistem başarıyla kurulmuş ve test edilmiştir. Email sistemi:
- Yeni kayıt olan kullanıcılara otomatik hoşgeldin maili gönderir
- Google OAuth kullanıcılarına da hoşgeldin maili gönderir
- Hata durumunda kayıt işlemini etkilemez
- Test endpoint'leri ile kolay test edilebilir 