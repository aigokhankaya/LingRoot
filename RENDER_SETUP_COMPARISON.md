# Render Google Play IAP Kurulum Karşılaştırması

## Yöntem Karşılaştırması

| Özellik | Yöntem 1: Secret Files | Yöntem 2: Environment Variable |
|---------|------------------------|--------------------------------|
| **Kolay mı?** | ✅ Çok kolay | ⚠️ Tek satır yapma gerekli |
| **JSON Format** | Çok satırlı, formatlanmış | Tek satır string |
| **Güvenlik** | ✅ Daha güvenli | ✅ Güvenli |
| **Yönetim** | ✅ Kolay düzenleme | ⚠️ Zor düzenleme |
| **Render Planı** | Tüm planlar | Tüm planlar |
| **Önerilen** | ✅ EVET | Sadece alternatif |

---

## YÖNTEM 1: Secret Files (ÖNERİLEN) ✅

### Render'da Yapılacaklar:

#### 1. Secret File Ekle
```
Render Dashboard → Service → Secret Files → Add Secret File

Filename: /etc/secrets/google-play-service-account.json
Contents: [JSON dosyasının tüm içeriğini yapıştır - çok satırlı olabilir]
```

#### 2. Environment Variables
```
GOOGLE_PLAY_SERVICE_ACCOUNT_PATH=/etc/secrets/google-play-service-account.json
GOOGLE_PLAY_PACKAGE_NAME=com.nsyzk.lingrootmobile
```

### Avantajlar:
- ✅ JSON dosyasını olduğu gibi kopyala-yapıştır
- ✅ Tek satır yapma derdi yok
- ✅ Daha okunaklı ve yönetilebilir
- ✅ Düzenleme gerektiğinde kolay

---

## YÖNTEM 2: Environment Variable (Alternatif)

### Render'da Yapılacaklar:

#### Environment Variables
```
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={"type":"service_account",...tüm JSON tek satırda...}
GOOGLE_PLAY_PACKAGE_NAME=com.nsyzk.lingrootmobile
```

### JSON'u Tek Satır Yapma:
```bash
# Linux/Mac
cat google-play-service-account.json | jq -c

# Windows PowerShell
(Get-Content google-play-service-account.json -Raw) -replace '\s+', ' '

# Manuel: Tüm satır sonlarını ve fazla boşlukları sil
```

### Dezavantajlar:
- ⚠️ JSON'u tek satır yapmak gerekli
- ⚠️ Düzenleme zor
- ⚠️ Hata yapma riski daha yüksek

---

## Backend Nasıl Çalışıyor?

Backend kodu **otomatik olarak** doğru yöntemi seçer:

```javascript
// Önce environment variable'ı kontrol eder
if (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
  // Yöntem 2: JSON string'i parse et
  const credentials = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
  auth = new google.auth.GoogleAuth({ credentials, ... });
}
// Sonra dosya yolunu kontrol eder
else if (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PATH) {
  // Yöntem 1: Dosyadan oku
  auth = new google.auth.GoogleAuth({ keyFile: path, ... });
}
```

---

## Önerilen Kurulum Adımları

### 1. Google Cloud Console (Tek Sefer)
- [ ] Service account oluştur
- [ ] JSON key dosyasını indir
- [ ] Service account email'i kopyala

### 2. Google Play Console (Tek Sefer)
- [ ] Service account'u ekle
- [ ] İzinleri ver (View financial data, Manage orders)

### 3. Render Dashboard (Her Deploy'da)
- [ ] **Secret Files** → Add Secret File
  - Filename: `/etc/secrets/google-play-service-account.json`
  - Contents: JSON dosyasının içeriği
- [ ] **Environment** → Add Variables
  - `GOOGLE_PLAY_SERVICE_ACCOUNT_PATH=/etc/secrets/google-play-service-account.json`
  - `GOOGLE_PLAY_PACKAGE_NAME=com.nsyzk.lingrootmobile`
- [ ] Save Changes

### 4. Test
- [ ] Deploy tamamlandı mı?
- [ ] Logları kontrol et: `[IAP] Google Play API client initialized successfully`
- [ ] Mobile app'ten test satın alma yap

---

## Sorun Giderme

### "Service account key not found"
**Çözüm:** 
- Secret Files'da dosya adını kontrol et: `/etc/secrets/google-play-service-account.json`
- Environment variable'ı kontrol et: `GOOGLE_PLAY_SERVICE_ACCOUNT_PATH`

### "JSON Parse Error"
**Çözüm:**
- Yöntem 1 kullanıyorsanız: Secret Files'da JSON formatı bozuk olabilir
- Yöntem 2 kullanıyorsanız: JSON tek satır mı kontrol et

### "Invalid Credentials"
**Çözüm:**
- Service account Google Play Console'da ekli mi?
- Doğru izinler verildi mi?
- JSON key dosyası doğru mu?

---

## Hızlı Başlangıç

**En hızlı yöntem (Yöntem 1):**

1. Render Dashboard aç
2. Secret Files → Add Secret File
3. Filename: `/etc/secrets/google-play-service-account.json`
4. Contents: JSON dosyasını kopyala-yapıştır
5. Environment → Add Variables:
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_PATH=/etc/secrets/google-play-service-account.json`
   - `GOOGLE_PLAY_PACKAGE_NAME=com.nsyzk.lingrootmobile`
6. Save Changes
7. ✅ Bitti!

**Toplam süre:** ~2 dakika
