# Google Play Real-Time Developer Notifications (RTDN) Setup

Bu doküman, Google Play Store'dan gelen subscription event'lerini (yenileme, iptal, süre bitimi vb.) otomatik olarak almak için gerekli kurulum adımlarını açıklar.

## Genel Bakış

Google Play RTDN, subscription lifecycle event'lerini Cloud Pub/Sub aracılığıyla backend'e push eder:

```
Google Play → Cloud Pub/Sub → Push Subscription → Backend Webhook → Database Update
```

## Desteklenen Event'ler

| Notification Type | Açıklama | Backend Aksiyonu |
|-------------------|----------|------------------|
| `SUBSCRIPTION_RENEWED` | Otomatik yenileme başarılı | `enddate` güncelle |
| `SUBSCRIPTION_RECOVERED` | Account hold'dan kurtuldu | Status aktif yap |
| `SUBSCRIPTION_CANCELED` | Kullanıcı iptal etti | Auto-renew kapat |
| `SUBSCRIPTION_ON_HOLD` | Ödeme sorunu | Status güncelle |
| `SUBSCRIPTION_IN_GRACE_PERIOD` | Grace period başladı | Status güncelle |
| `SUBSCRIPTION_EXPIRED` | Süre doldu | Status expired yap |
| `SUBSCRIPTION_REVOKED` | İade edildi | Subscription iptal et |

## Kurulum Adımları

### 1. Google Cloud Console Ayarları

#### 1.1 Pub/Sub Topic Oluştur

1. [Google Cloud Console](https://console.cloud.google.com) → Pub/Sub → Topics
2. **Create Topic** tıkla
3. Topic ID: `lingroot-play-billing` (veya istediğiniz isim)
4. **Create** tıkla

#### 1.2 Push Subscription Oluştur

1. Oluşturulan topic'e tıkla → **Create Subscription**
2. Subscription ID: `lingroot-play-billing-push`
3. Delivery type: **Push**
4. Endpoint URL: `https://api.lingroot.com/api/iap/google/notifications`
   - Veya Render URL: `https://lingloops-backend.onrender.com/api/iap/google/notifications`
5. **Create** tıkla

#### 1.3 Service Account Yetkilendirme

Topic'e Google Play erişim izni vermek için:

1. Topic → Permissions sekmesi
2. **Add Principal** tıkla
3. New principal: `google-play-developer-notifications@system.gserviceaccount.com`
4. Role: `Pub/Sub Publisher`
5. **Save** tıkla

### 2. Google Play Console Ayarları

1. [Google Play Console](https://play.google.com/console) → Uygulamanı seç
2. **Monetization setup** (veya Monetize → Products → Subscriptions altında)
3. **Real-time developer notifications** bölümü
4. Topic name: `projects/YOUR_PROJECT_ID/topics/lingroot-play-billing`
   - Örnek: `projects/lingroot-app/topics/lingroot-play-billing`
5. **Save** tıkla
6. **Send test notification** ile test et

### 3. Backend Endpoint

Endpoint zaten oluşturuldu:

```
POST /api/iap/google/notifications
```

Test endpoint:
```
GET /api/iap/google/notifications/test
```

### 4. Database Migration

Supabase SQL Editor'da çalıştır:

```sql
-- Google Play RTDN kolonlarını ekle
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS google_subscription_status VARCHAR(50);

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS google_auto_renew_status BOOLEAN DEFAULT TRUE;

-- Index oluştur
CREATE INDEX IF NOT EXISTS idx_subscriptions_google_status 
ON subscriptions(google_subscription_status) 
WHERE google_subscription_status IS NOT NULL;
```

Veya migration dosyasını kullan:
```bash
psql $DATABASE_URL < backend/migrations/add_google_rtdn_fields.sql
```

## Test Etme

### 1. Endpoint Test

```bash
curl https://api.lingroot.com/api/iap/google/notifications/test
```

Beklenen yanıt:
```json
{
  "status": "ok",
  "message": "Google Play RTDN endpoint is working",
  "timestamp": "2024-12-14T..."
}
```

### 2. Google Play Console'dan Test

1. Play Console → Monetization setup
2. Real-time developer notifications
3. **Send test notification** tıkla
4. Backend loglarını kontrol et

### 3. Sandbox Test

Google Play Sandbox'ta subscription alındığında:
- Subscription 5 dakikada expire olur (gerçek 1 ay yerine)
- Auto-renew 5 dakikada bir gerçekleşir
- Bu sayede tüm lifecycle event'leri test edilebilir

## Troubleshooting

### Notification Gelmiyor

1. **Topic permissions kontrol et**: Google Play service account'a Pub/Sub Publisher rolü verildi mi?
2. **Push subscription endpoint doğru mu?**: HTTPS zorunlu, doğru URL?
3. **Firewall/CORS**: Endpoint erişilebilir mi?

### 401/403 Hatası

Push subscription authentication ayarlarını kontrol et. "No authentication" seçili olmalı (Google Play kendi authentication'ını kullanır).

### Logs

Backend loglarında `[GPLAY-*]` prefix'i ile notification'lar izlenebilir:

```bash
# Render logs
render logs -s lingloops-backend | grep GPLAY
```

## Subscription Durumları

| Status | Açıklama |
|--------|----------|
| `active` | Subscription aktif |
| `canceled` | İptal edildi ama period sonuna kadar aktif |
| `on_hold` | Ödeme sorunu |
| `grace_period` | Grace period |
| `expired` | Süre doldu |
| `revoked` | İade edildi |

## İlgili Dosyalar

- `backend/controllers/googlePlayNotificationsController.js` - RTDN handler
- `backend/routes/googlePlayNotificationsRoutes.js` - Route tanımları
- `backend/migrations/add_google_rtdn_fields.sql` - Database migration
- `backend/controllers/iapController.js` - Initial purchase verification

## Referanslar

- [Google Play RTDN Documentation](https://developer.android.com/google/play/billing/rtdn-reference)
- [Cloud Pub/Sub Push Subscriptions](https://cloud.google.com/pubsub/docs/push)
- [Subscription Lifecycle](https://developer.android.com/google/play/billing/subscriptions)












--Kısa Notlar:
2. Google Cloud Console
Pub/Sub Topic oluştur: lingroot-play-billing
Push Subscription oluştur: Endpoint → https://api.lingroot.com/api/iap/google/notifications
Permission ekle: google-play-developer-notifications@system.gserviceaccount.com → Pub/Sub Publisher
3. Google Play Console
Monetization setup → Real-time developer notifications
Topic: projects/YOUR_PROJECT_ID/topics/lingroot-play-billing
Save & test