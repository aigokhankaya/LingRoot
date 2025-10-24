# Google Play In-App Purchase Entegrasyonu

Bu dokümantasyon, LingRoot backend'ine Google Play IAP doğrulamasının nasıl eklendiğini açıklar.

## Genel Bakış

Android uygulamasında yapılan satın almaları doğrulamak için Google Play Developer API kullanılmaktadır. Bu, sahte satın almaları önler ve güvenli bir abonelik sistemi sağlar.

## Kurulum Adımları

### 1. Google Cloud Console Kurulumu

Detaylı adımlar için: `docs/GOOGLE_PLAY_IAP_SETUP.md`

**Özet:**
1. Google Cloud Console'da proje oluştur
2. "Google Play Android Developer API"yi aktif et
3. Service Account oluştur
4. JSON key dosyasını indir
5. Service account email'i kopyala

### 2. Google Play Console Kurulumu

1. Google Play Console > Users and permissions
2. Service account email'i ekle
3. İzinler:
   - ✅ View financial data, orders, and cancellation survey responses
   - ✅ Manage orders and subscriptions

### 3. Backend Kurulumu

#### 3.1. NPM Paketini Yükle

```bash
cd backend
npm install googleapis@latest
```

#### 3.2. Service Account Key Dosyasını Yerleştir

```bash
# JSON key dosyasını backend klasörüne kopyala
cp /path/to/downloaded-key.json backend/google-play-service-account.json
```

⚠️ **UYARI:** Bu dosya GİZLİDİR! Git'e commit ETMEYİN!

#### 3.3. Environment Variables

`.env` dosyasına ekleyin:

```env
# Google Play IAP
GOOGLE_PLAY_SERVICE_ACCOUNT_PATH=./google-play-service-account.json
GOOGLE_PLAY_PACKAGE_NAME=com.nsyzk.lingrootmobile
```

## Kod Yapısı

### Backend Dosyaları

1. **`controllers/iapController.js`**
   - `getGooglePlayClient()`: Google Play API client'ı başlatır
   - `verifyGooglePlayPurchase()`: Satın alma doğrulama endpoint'i

2. **`routes/iapRoutes.js`**
   - `POST /api/iap/google/verify`: Android IAP doğrulama endpoint'i

### Mobile App Dosyaları

1. **`src/services/iap.ts`**
   - Platform bazlı IAP işlemleri
   - iOS: Apple receipt verification
   - Android: Google Play purchase token verification

2. **`src/services/api.ts`**
   - `verifyGooglePlayPurchase()`: Backend'e doğrulama isteği gönderir

3. **`src/screens/PackagesScreen.tsx`**
   - Platform bazlı product ID kullanımı
   - iOS: `apple_product_id`
   - Android: `google_product_id`

## API Endpoint

### POST /api/iap/google/verify

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "purchaseToken": "purchase_token_from_google_play",
  "productId": "com.nsyzk.lingrootmobile.gold.monthly",
  "packageName": "com.nsyzk.lingrootmobile"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription activated successfully",
  "data": {
    "subscriptionId": "uuid",
    "planName": "Gold",
    "expiresAt": "2025-11-24T18:00:00.000Z"
  }
}
```

**Error Responses:**

- **400**: Invalid purchase token or expired subscription
- **404**: Purchase not found or plan not found
- **500**: Google Play API error or server error

## Doğrulama Akışı

1. **Mobile App**: Kullanıcı satın alma yapar
2. **Google Play**: Purchase token döner
3. **Mobile App**: Backend'e purchase token gönderir
4. **Backend**: Google Play API ile doğrular
5. **Google Play API**: Satın alma detaylarını döner
6. **Backend**: 
   - Payment state kontrol eder (1 veya 2 olmalı)
   - Expiry date kontrol eder (gelecekte olmalı)
   - Veritabanında subscription oluşturur
   - User role'ü premium yapar
7. **Mobile App**: Başarı mesajı gösterir

## Güvenlik

### Kontrol Edilen Alanlar

1. **Payment State**: 
   - 0 = Pending (reddedilir)
   - 1 = Received (kabul edilir)
   - 2 = Free trial (kabul edilir)
   - 3 = Pending deferred (reddedilir)

2. **Expiry Time**: 
   - Subscription'ın süresi dolmamış olmalı
   - `expiryTimeMillis > Date.now()`

3. **Purchase Token Uniqueness**:
   - Aynı purchase token ile birden fazla subscription oluşturulamaz

### Best Practices

✅ **Yapılması Gerekenler:**
- Service account key'i güvenli sakla
- Environment variables kullan
- Detaylı log tut
- Error handling yap
- Purchase token'ları veritabanında sakla

❌ **Yapılmaması Gerekenler:**
- Service account key'i git'e commit etme
- Purchase token'ları client-side'da sakla
- API hatalarını kullanıcıya gösterme
- Doğrulama yapmadan subscription oluşturma

## Test Etme

### Test Kullanıcıları

1. Google Play Console > Setup > License testing
2. Test email adresleri ekle
3. Test cihazda bu email ile giriş yap

### Test Satın Alma

1. Test cihazda uygulamayı aç
2. Packages ekranına git
3. Bir paket seç
4. Google Play test satın alma ekranı açılır
5. "Test card" ile satın al
6. Backend loglarını kontrol et

### Log Kontrol

```bash
# Backend loglarını izle
tail -f backend/logs/app.log

# Veritabanını kontrol et
SELECT * FROM subscriptions WHERE provider = 'google' ORDER BY created_at DESC LIMIT 5;
```

## Sorun Giderme

### "Service account key not found"

**Çözüm:**
```bash
# Key dosyasının var olduğunu kontrol et
ls -la backend/google-play-service-account.json

# .env dosyasında path'i kontrol et
cat backend/.env | grep GOOGLE_PLAY
```

### "Google Play API authentication failed"

**Çözüm:**
1. Service account'un Google Play Console'da ekli olduğunu kontrol et
2. Doğru izinlerin verildiğini kontrol et
3. JSON key dosyasının geçerli olduğunu kontrol et

### "Purchase not found in Google Play"

**Çözüm:**
1. Purchase token'ın doğru olduğunu kontrol et
2. Product ID'nin doğru olduğunu kontrol et
3. Package name'in doğru olduğunu kontrol et
4. Satın almanın gerçekten tamamlandığını kontrol et

### "Payment not completed"

**Çözüm:**
- Kullanıcının ödemeyi tamamladığından emin ol
- Test kullanıcısı için test card kullanıldığından emin ol
- Google Play Console'da satın almanın görünüp görünmediğini kontrol et

## Veritabanı Şeması

### subscriptions tablosu

```sql
-- Google Play için yeni kolonlar
ALTER TABLE subscriptions ADD COLUMN google_purchase_token TEXT;
ALTER TABLE subscriptions ADD COLUMN google_product_id TEXT;
ALTER TABLE subscriptions ADD COLUMN provider VARCHAR(20); -- 'apple' veya 'google'

-- Index
CREATE INDEX idx_subscriptions_google_purchase_token ON subscriptions(google_purchase_token);
CREATE INDEX idx_subscriptions_provider ON subscriptions(provider);
```

### subscription_plans tablosu

```sql
-- Google Play product ID
ALTER TABLE subscription_plans ADD COLUMN google_product_id TEXT;
```

## Migration

Migration script'i çalıştır:

```bash
# SQL dosyasını çalıştır
psql -h your_host -U your_user -d your_db -f backend/migrations/0004_add_google_play_fields.sql
```

## Monitoring

### Önemli Metrikler

1. **Başarılı Doğrulamalar**: Google Play API'den 200 response
2. **Başarısız Doğrulamalar**: 404, 401, 403 hatalar
3. **Subscription Oluşturma**: Veritabanına yazılan kayıtlar
4. **Active Subscriptions**: `provider = 'google' AND status = 'active'`

### Log Örnekleri

```
[IAP] Google Play purchase verification started for user abc123, product com.nsyzk.lingrootmobile.gold.monthly
[IAP] Verifying purchase with Google Play API - Package: com.nsyzk.lingrootmobile, Product: com.nsyzk.lingrootmobile.gold.monthly
[IAP] ✅ Purchase verified successfully with Google Play API
[IAP] Found plan: Gold for product com.nsyzk.lingrootmobile.gold.monthly
[IAP] Successfully created Google Play subscription xyz789 for user abc123
```

## İletişim

Sorularınız için:
- Backend: `backend/controllers/iapController.js`
- Mobile: `LingRootMobile/src/services/iap.ts`
- Dokümantasyon: `docs/GOOGLE_PLAY_IAP_SETUP.md`
