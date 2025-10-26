# Google Play In-App Purchase API Kurulumu

## 1. Google Cloud Console'da Service Account Oluşturma

### Adım 1: Google Cloud Console'a Git
1. https://console.cloud.google.com/ adresine gidin
2. Projenizi seçin veya yeni proje oluşturun

### Adım 2: Google Play Android Developer API'yi Aktif Et
1. Sol menüden **APIs & Services** > **Library** seçin
2. "Google Play Android Developer API" aratın
3. **Enable** butonuna tıklayın

### Adım 3: Service Account Oluştur
1. Sol menüden **APIs & Services** > **Credentials** seçin
2. **Create Credentials** > **Service Account** seçin
3. Service account detaylarını doldurun:
   - **Service account name**: `lingroot-iap-verifier`
   - **Service account ID**: otomatik oluşur
   - **Description**: `LingRoot IAP verification service`
4. **Create and Continue** tıklayın
5. Role seçin (opsiyonel, şimdilik atlayabilirsiniz)
6. **Done** tıklayın

### Adım 4: Service Account Key Oluştur
1. Oluşturduğunuz service account'a tıklayın
2. **Keys** sekmesine gidin
3. **Add Key** > **Create new key** seçin
4. **JSON** formatını seçin
5. **Create** tıklayın
6. JSON dosyası indirilecek - bu dosyayı **GÜVENLİ** bir yere kaydedin!

### Adım 5: Service Account Email'i Kopyala
- Service account listesinde email adresini kopyalayın
- Örnek: `lingroot-iap-verifier@project-id.iam.gserviceaccount.com`

## 2. Google Play Console'da İzin Verme

### Adım 1: Google Play Console'a Git
1. https://play.google.com/console/ adresine gidin
2. Uygulamanızı seçin

### Adım 2: Service Account'a Erişim Ver
1. Sol menüden **Users and permissions** seçin
2. **Invite new users** tıklayın
3. Service account email adresini yapıştırın
4. **App permissions** sekmesinde uygulamanızı seçin
5. **Account permissions** bölümünde şu izinleri verin:
   - ✅ **View financial data, orders, and cancellation survey responses**
   - ✅ **Manage orders and subscriptions**
6. **Invite user** tıklayın
7. Service account email'e gelen daveti **kabul etmeye gerek yok** (otomatik aktif olur)

## 3. Backend Kurulumu

### Adım 1: JSON Key Dosyasını Yerleştir
1. İndirdiğiniz JSON key dosyasını backend klasörüne kopyalayın:
   ```
   backend/google-play-service-account.json
   ```
2. `.gitignore` dosyasına ekleyin:
   ```
   google-play-service-account.json
   ```

### Adım 2: Environment Variables

**Lokal Geliştirme için** `.env` dosyasına ekleyin:
```env
# Google Play IAP (Local Development)
GOOGLE_PLAY_SERVICE_ACCOUNT_PATH=./google-play-service-account.json
GOOGLE_PLAY_PACKAGE_NAME=com.nsyzk.lingrootmobile
```

**Production (Render, Heroku, vb.) için:**
```env
# Google Play IAP (Production)
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
GOOGLE_PLAY_PACKAGE_NAME=com.nsyzk.lingrootmobile
```

**Not:** JSON dosyasının içeriğini tek satır string olarak kopyalayın.

### Adım 3: NPM Paketlerini Yükle
```bash
cd backend
npm install googleapis@latest
```

## 4. Test Etme

### Test Satın Alma
1. Google Play Console'da test kullanıcıları ekleyin
2. Test cihazında satın alma yapın
3. Backend loglarını kontrol edin

### Doğrulama Endpoint'i Test
```bash
curl -X POST http://localhost:5001/api/iap/google/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "purchaseToken": "test_purchase_token",
    "productId": "com.nsyzk.lingrootmobile.gold.monthly",
    "packageName": "com.nsyzk.lingrootmobile"
  }'
```

## Güvenlik Notları

⚠️ **ÖNEMLİ:**
- JSON key dosyasını **asla** git'e commit etmeyin
- Production'da environment variable veya secret manager kullanın
- Service account'a minimum gerekli izinleri verin
- Key rotation yapın (6-12 ayda bir)

## 5. Render'a Deploy

### Yöntem 1: Secret Files (ÖNERİLEN - Daha Temiz)

#### Adım 1: Secret File Oluştur

1. **Render Dashboard** → Your Service → **Secret Files**
2. **Add Secret File** tıklayın
3. Şu bilgileri girin:

**Filename:**
```
/etc/secrets/google-play-service-account.json
```

**Contents:**
- `google-play-service-account.json` dosyasını açın
- **Tüm içeriği** kopyalayıp yapıştırın (çok satırlı olabilir, sorun değil!)

4. **Save** tıklayın

#### Adım 2: Environment Variables Ekle

1. **Environment** sekmesine git
2. Şu değişkenleri ekle:

**`GOOGLE_PLAY_SERVICE_ACCOUNT_PATH`**
```
/etc/secrets/google-play-service-account.json
```

**`GOOGLE_PLAY_PACKAGE_NAME`**
```
com.nsyzk.lingrootmobile
```

3. **Save Changes** tıklayın

---

### Yöntem 2: Environment Variable (Alternatif)

Eğer Secret Files kullanamıyorsanız:

1. Render Dashboard → Your Service → Environment
2. Şu değişkenleri ekleyin:

**`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`**
```
JSON dosyasının tüm içeriğini buraya yapıştırın (tek satır string)
```

**`GOOGLE_PLAY_PACKAGE_NAME`**
```
com.nsyzk.lingrootmobile
```

3. **Save Changes** tıklayın
4. Service otomatik olarak yeniden deploy olacak

### Adım 3: Deploy Sonrası Test

```bash
# Health check
curl https://your-app.onrender.com/api/health

# IAP endpoint test (JWT token gerekli)
curl -X POST https://your-app.onrender.com/api/iap/google/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "purchaseToken": "test_token",
    "productId": "com.nsyzk.lingrootmobile.gold.monthly",
    "packageName": "com.nsyzk.lingrootmobile"
  }'
```

### Adım 4: Logları Kontrol Et

Render Dashboard → Logs bölümünden şu logları arayın:
```
[IAP] Using Google Play service account from environment variable
[IAP] Google Play API client initialized successfully
```

## Sorun Giderme

### "Invalid Credentials" Hatası
- Service account email'in Google Play Console'da ekli olduğundan emin olun
- JSON key dosyasının doğru path'te olduğunu kontrol edin
- **Render'da:** `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` değişkeninin doğru olduğunu kontrol edin

### "Permission Denied" Hatası
- Google Play Console'da doğru izinleri verdiğinizden emin olun
- Service account'un uygulamanıza erişimi olduğunu kontrol edin

### "API Not Enabled" Hatası
- Google Cloud Console'da "Google Play Android Developer API"nin aktif olduğunu kontrol edin

### "JSON Parse Error" (Render'da)
- JSON içeriğinin tek satır olduğundan emin olun
- Özel karakterlerin escape edilmediğinden emin olun
- JSON'un geçerli olduğunu kontrol edin: https://jsonlint.com/
