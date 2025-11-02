# Render'a Google Play IAP Kurulumu - Hızlı Rehber

## İki Yöntem Var:

### ✅ Yöntem 1: Secret Files (ÖNERİLEN - Daha Kolay)
JSON dosyasını olduğu gibi yükle, tek satır yapma!

### Yöntem 2: Environment Variable (Alternatif)
JSON dosyasını tek satır string olarak yapıştır

---

## YÖNTEM 1: Secret Files (ÖNERİLEN)

### Adım 1: Secret File Ekle

1. **Render Dashboard** → Backend Service'inizi seçin
2. Sol menüden **Secret Files** sekmesine git
3. **Add Secret File** butonuna tıkla

**Filename:**
```
/etc/secrets/google-play-service-account.json
```

**Contents:**
- İndirdiğiniz `google-play-service-account.json` dosyasını açın
- **Tüm içeriği kopyalayıp yapıştırın** (çok satırlı, formatlanmış haliyle - sorun değil!)
- Örnek:
```json
{
  "type": "service_account",
  "project_id": "your-project-123",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "lingroot-iap-verifier@your-project.iam.gserviceaccount.com",
  ...
}
```

4. **Save** tıklayın

### Adım 2: Environment Variables Ekle

1. **Environment** sekmesine git
2. Şu değişkenleri ekle:

**Variable 1:**
- **Key:** `GOOGLE_PLAY_SERVICE_ACCOUNT_PATH`
- **Value:** `/etc/secrets/google-play-service-account.json`

**Variable 2:**
- **Key:** `GOOGLE_PLAY_PACKAGE_NAME`
- **Value:** `com.nsyzk.lingrootmobile`

3. **Save Changes** tıklayın

---

## YÖNTEM 2: Environment Variable (Alternatif)

Eğer Secret Files kullanamıyorsanız:

### 1. GOOGLE_PLAY_SERVICE_ACCOUNT_JSON

**Değer:** İndirdiğiniz `google-play-service-account.json` dosyasının **tüm içeriği** (tek satır string olarak)

**Nasıl Hazırlanır:**
1. `google-play-service-account.json` dosyasını bir text editörde açın
2. **Tüm içeriği** kopyalayın (baştan sona, { ile başlayıp } ile biten)
3. Tek satır olduğundan emin olun (satır sonları \n olarak kalmalı)

**Örnek Format:**
```json
{"type":"service_account","project_id":"your-project-123","private_key_id":"abc123def456...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"lingroot-iap-verifier@your-project.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/..."}
```

### 2. GOOGLE_PLAY_PACKAGE_NAME

**Değer:**
```
com.nsyzk.lingrootmobile
```

---

## Hangi Yöntemi Seçmeliyim?

### ✅ Yöntem 1 (Secret Files) - Eğer:
- JSON dosyasını olduğu gibi yüklemek istiyorsanız
- Tek satır yapma işiyle uğraşmak istemiyorsanız
- Daha temiz ve yönetilebilir bir çözüm istiyorsanız

### Yöntem 2 (Environment Variable) - Eğer:
- Secret Files özelliği yoksa (eski Render planları)
- Tek bir environment variable ile halletmek istiyorsanız

---

### 6. Deploy Tamamlanınca Logları Kontrol Et

Render Dashboard → Logs bölümünde şu mesajları arayın:

✅ **Başarılı:**
```
[IAP] Using Google Play service account from environment variable
[IAP] Google Play API client initialized successfully
```

❌ **Hatalı:**
```
[IAP] Error initializing Google Play API client
Google Play service account not configured
```

## Test Etme

### Backend Health Check
```bash
curl https://lingloops-backend.onrender.com/api/health
```

### IAP Endpoint Test
Mobile app'ten satın alma yaparak test edin veya:
```bash
curl -X POST https://lingloops-backend.onrender.com/api/iap/google/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "purchaseToken": "test_purchase_token",
    "productId": "com.nsyzk.lingrootmobile.gold.monthly",
    "packageName": "com.nsyzk.lingrootmobile"
  }'
```

## Sorun Giderme

### "JSON Parse Error"
- JSON'un tek satır olduğundan emin olun
- Başında/sonunda boşluk olmadığından emin olun
- JSON'un geçerli olduğunu kontrol edin: https://jsonlint.com/

### "Invalid Credentials"
- Service account email'in Google Play Console'da ekli olduğunu kontrol edin
- JSON içeriğinin tam olduğundan emin olun (baştan sona kopyalandı mı?)

### "Permission Denied"
- Google Play Console → Users and permissions → Service account'a doğru izinler verildi mi?
  - ✅ View financial data, orders, and cancellation survey responses
  - ✅ Manage orders and subscriptions

## Önemli Notlar

⚠️ **GÜVENLİK:**
- JSON key dosyasını git'e commit ETMEYİN
- Render'da environment variable olarak saklamak güvenlidir
- Key'i düzenli olarak rotate edin (6-12 ayda bir)

✅ **KONTROL LİSTESİ:**
- [ ] Google Cloud Console'da "Google Play Android Developer API" aktif
- [ ] Service account oluşturuldu ve JSON key indirildi
- [ ] Service account Google Play Console'da eklendi
- [ ] Doğru izinler verildi
- [ ] Render'da environment variables eklendi
- [ ] Deploy tamamlandı
- [ ] Loglar kontrol edildi
- [ ] Test satın alma yapıldı

## Daha Fazla Bilgi

Detaylı kurulum için: `docs/GOOGLE_PLAY_IAP_SETUP.md`
Teknik dokümantasyon için: `backend/GOOGLE_PLAY_IAP_README.md`
