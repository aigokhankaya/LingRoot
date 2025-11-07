# Apple App Store Server Notifications - Setup & Test Guide

## 📋 Backend Endpoints Oluşturuldu

Backend'de Apple Server Notifications için endpoint'ler hazır:

### Production URL:
```
https://lingloops-backend.onrender.com/api/iap/apple/notifications
```

### Sandbox URL (Test için):
```
https://lingloops-backend.onrender.com/api/iap/apple/notifications/sandbox
```

---

## 🔧 App Store Connect'te Ayarlama

1. **App Store Connect** → **Apps** → **LingRoot**
2. Sol menüden **App Information** sekmesine git
3. Aşağı scroll yap → **App Store Server Notifications** bölümünü bul
4. **Set Up URL** butonuna tıkla

### URL'leri Gir:

**Production Server URL:**
```
https://lingloops-backend.onrender.com/api/iap/apple/notifications
```

**Sandbox Server URL:**
```
https://lingloops-backend.onrender.com/api/iap/apple/notifications/sandbox
```

5. **Save** butonuna tıkla

---

## 🧪 Test Etme (Sandbox)

### 1. App Store Connect'te Test Notification Gönder

1. **App Store Connect** → **Apps** → **LingRoot**
2. **App Information** → **App Store Server Notifications**
3. **Send Test Notification** butonuna tıkla
4. Notification type seç (örn: `SUBSCRIBED`, `DID_RENEW`, `EXPIRED`)
5. **Send** tıkla

### 2. Backend Loglarını Kontrol Et

Render Dashboard'da backend loglarını izle:

```
https://dashboard.render.com
```

Şu logları göreceksin:

```
[NOTIF-xxxxx] 🍎 Apple Server Notification received
[NOTIF-xxxxx] Notification Type: SUBSCRIBED
[NOTIF-xxxxx] ✅ Notification processed successfully
```

### 3. Gerçek Satın Alım Testi

1. **TestFlight** veya **Sandbox** hesabıyla iOS uygulamayı aç
2. Bir abonelik satın al
3. Backend'de şu logları gör:
   - İlk satın alım: `SUBSCRIBED`
   - Yenileme: `DID_RENEW`
   - İptal: `DID_CHANGE_RENEWAL_STATUS` (subtype: `AUTO_RENEW_DISABLED`)

---

## 📊 Hangi Olaylar İzleniyor?

Backend şu notification'ları handle ediyor:

| Notification Type | Açıklama | Backend Aksiyonu |
|------------------|----------|------------------|
| `SUBSCRIBED` | Yeni abonelik | Log (zaten purchase sırasında oluşturuldu) |
| `DID_RENEW` | Abonelik yenilendi | `enddate` güncelle |
| `DID_CHANGE_RENEWAL_STATUS` | Otomatik yenileme değişti | `apple_auto_renew_status` güncelle |
| `EXPIRED` | Abonelik süresi doldu | `apple_subscription_status = 'expired'` |
| `REFUND` | Para iadesi yapıldı | Aboneliği sonlandır, `status = 'refunded'` |
| `REVOKE` | Abonelik iptal edildi | Aboneliği sonlandır, `status = 'revoked'` |
| `PRICE_INCREASE` | Fiyat artışı | Sadece log |

---

## 🔍 Troubleshooting

### Backend'e Notification Gelmiyor

1. **URL'leri kontrol et** - App Store Connect'te doğru URL'ler girilmiş mi?
2. **HTTPS gerekli** - HTTP çalışmaz, sadece HTTPS
3. **Backend çalışıyor mu?** - Render'da backend up durumda mı kontrol et
4. **200 response** - Backend her zaman 200 döndürmeli (hata olsa bile)

### Test Notification Başarısız

1. **App Store Connect'te "Send Test Notification"** kullan
2. Render loglarında hata var mı kontrol et
3. Endpoint doğru mu: `/api/iap/apple/notifications`

### Production'da Çalışmıyor

1. Sandbox URL yerine Production URL kullanıldığından emin ol
2. Apple'ın notification göndermesi 24-48 saat sürebilir
3. İlk birkaç notification test amaçlı olabilir

---

## 📝 Database Schema Gereksinimleri

Backend'in çalışması için `subscriptions` tablosunda şu kolonlar olmalı:

- `apple_transaction_id` (string) - Apple transaction ID
- `apple_auto_renew_status` (boolean) - Otomatik yenileme durumu
- `apple_subscription_status` (string) - expired, refunded, revoked, active
- `enddate` (timestamp) - Abonelik bitiş tarihi
- `updated_at` (timestamp) - Son güncelleme

---

## ✅ Deployment Checklist

- [x] Backend endpoint'leri oluşturuldu
- [x] Routes tanımlandı
- [x] Controller logic yazıldı
- [ ] Backend Render'a deploy edildi
- [ ] App Store Connect'te URL'ler girildi
- [ ] Test notification gönderildi
- [ ] Backend logları kontrol edildi
- [ ] Gerçek satın alım testi yapıldı

---

## 🚀 Sonraki Adımlar

1. **Backend'i Render'a deploy et:**
   ```bash
   git add -A
   git commit -m "Add Apple Server Notifications support"
   git push origin main
   ```

2. **App Store Connect'te URL'leri gir** (yukarıdaki adımları takip et)

3. **Test notification gönder** ve logları kontrol et

4. **Gerçek satın alım yap** ve notification'ların geldiğini doğrula

---

## 📚 Referanslar

- [Apple Server Notifications Documentation](https://developer.apple.com/documentation/appstoreservernotifications)
- [Notification Types](https://developer.apple.com/documentation/appstoreservernotifications/notificationtype)
- [Testing Server Notifications](https://developer.apple.com/documentation/appstoreservernotifications/testing_server_notifications)
