# Admin Email Bildirim Sistemi Analizi

> **Oluşturulma:** 2026-02-21 | **Güncellenme:** 2026-02-21 | **Versiyon:** 1.0

## Genel Bakış

LingRoot backend'inde admin kullanıcılara email bildirimi gönderen iki farklı sistem bulunmaktadır:

1. **AI Error Notifier** - AI servisleri (TTS, Chat) hatalarında
2. **Support Notifier** - Destek mesajları alındığında

---

## 1. AI Error Notifier

**Dosya:** `backend/utils/notifications/aiErrorNotifier.js`

### Konfigürasyon

| Env Variable | Açıklama | Varsayılan |
|--------------|----------|------------|
| `ADMIN_NOTIFICATION_EMAILS` | Admin emailleri (virgülle ayrılmış) | - |
| `ADMIN_EMAIL` | Tek admin emaili (fallback) | - |
| `AI_ERROR_NOTIFICATIONS_ENABLED` | Bildirimleri aç/kapa | `true` |

### Desteklenen AI Servisleri

| Provider | Sabit | Açıklama |
|----------|-------|----------|
| `google_tts` | `AI_PROVIDERS.GOOGLE_TTS` | Google Text-to-Speech |
| `gemini_tts` | `AI_PROVIDERS.GEMINI_TTS` | Gemini TTS (Podcast) |
| `openai_chat` | `AI_PROVIDERS.OPENAI_CHAT` | OpenAI GPT Chat |
| `openai_tts` | `AI_PROVIDERS.OPENAI_TTS` | OpenAI TTS |

### Bildirim Gönderilen Hata Tipleri

| Hata Tipi | HTTP Status | Tetikleyici Mesajlar | Kritik Mi? |
|-----------|-------------|---------------------|------------|
| `billing` | 402 | "billing", "payment", "invoice" | Evet |
| `quota` | - | "quota", "exceeded", "resource_exhausted" | Evet |
| `rate_limit` | 429 | "rate limit", "too many requests" | Hayır |
| `api_key` | 401 | "api key", "invalid key", "expired" | Evet |
| `permission` | 403 | "permission", "denied", "forbidden" | Evet |
| `credits` | - | "insufficient", "credits", "balance" | Evet |
| `unknown` | - | Diğer tüm hatalar | Hayır |

### Spam Kontrolü (Cooldown)

| Hata Tipi | Cooldown Süresi |
|-----------|-----------------|
| Kritik hatalar (billing, api_key, credits) | 30 dakika |
| Diğer hatalar | 15 dakika |

Aynı provider+errorType kombinasyonu için cooldown süresi dolmadan yeni bildirim gönderilmez.

### Bildirimlerin Tetiklendiği Yerler

#### 1. Async TTS İşleme Hatası
**Dosya:** `backend/routes/ttsRoutes.js:271`

```javascript
notifyAIError({
  provider: AI_PROVIDERS.GOOGLE_TTS,
  method: 'process-async',
  error: error,
  httpStatus: error.status || error.response?.status,
  userId,
  context: {
    jobId: job.id,
    level: requestBody?.level,
    inputType: requestBody?.input_type
  }
});
```

**Senaryo:** Kullanıcı narration (TTS) içeriği oluştururken Google TTS servisi hata verirse.

#### 2. Async Podcast Oluşturma Hatası
**Dosya:** `backend/routes/ttsRoutes.js:714`

```javascript
notifyAIError({
  provider: AI_PROVIDERS.GEMINI_TTS,
  method: 'create-podcast-async',
  error: error,
  httpStatus: error.status || error.response?.status,
  userId,
  context: {
    jobId: job.id,
    topic,
    level,
    duration
  }
});
```

**Senaryo:** Kullanıcı podcast oluştururken Gemini TTS servisi hata verirse.

### Email İçeriği

Gönderilen email şunları içerir:

- **Header:** Provider adı ve hata tipi
- **Detaylar:** Method, HTTP status, timestamp, environment
- **Kullanıcı Bilgileri:** User ID, email, isim, CEFR seviyesi (varsa)
- **Hata Mesajı:** Orijinal hata metni
- **Context:** Job ID, topic, level vb.
- **Önerilen Aksiyonlar:** Hata tipine göre öneriler
- **Stack Trace:** Varsa hata stack'i

---

## 2. Support Notifier

**Dosya:** `backend/utils/notifications/supportNotifier.js`

### Konfigürasyon

Bu sistem `.env` değil, veritabanındaki `users` tablosundan `role='admin'` olan kullanıcıları çeker.

```sql
SELECT email, firstname, lastname
FROM users
WHERE role = 'admin' AND email IS NOT NULL
```

### Bildirim Gönderilen Senaryolar

| Senaryo | Açıklama |
|---------|----------|
| Yeni destek talebi | Kullanıcı yeni bir destek konuşması başlattığında |
| Takip mesajı | Kullanıcı mevcut bir destek konuşmasına mesaj yazdığında |

### Atama Mantığı

1. **assignedAdminId varsa:** Sadece atanmış admin'e gönderilir
2. **Atanmış admin bulunamazsa:** Tüm adminlere gönderilir
3. **assignedAdminId yoksa:** Tüm adminlere gönderilir

### Email İçeriği

- **Öncelik:** Urgent (Acil), High (Yüksek), Medium (Orta), Low (Düşük)
- **Kullanıcı Bilgileri:** Ad soyad, email, telefon, user ID
- **Mesaj Bilgileri:** Konu, tarih, konuşma ID
- **Mesaj İçeriği:** Kullanıcının yazdığı metin

---

## Akış Şeması

```
┌─────────────────────────────────────────────────────────────────┐
│                    EMAIL BİLDİRİM SİSTEMİ                       │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   TTS Hatası    │ │ Podcast Hatası  │ │  Destek Mesajı  │
│  (Google TTS)   │ │  (Gemini TTS)   │ │                 │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────────────────────┐    ┌─────────────────┐
│       aiErrorNotifier.js        │    │supportNotifier.js│
│  - Hata tipi tespit             │    │  - Admin'leri DB │
│  - Cooldown kontrolü            │    │    den çek       │
│  - ADMIN_EMAIL'e gönder         │    │  - Email gönder  │
└────────────────┬────────────────┘    └────────┬────────┘
                 │                              │
                 ▼                              ▼
         ┌─────────────┐               ┌─────────────┐
         │  mailer.js  │               │  mailer.js  │
         │ (sendMail)  │               │ (sendMail)  │
         └─────────────┘               └─────────────┘
```

---

## Önerilen Aksiyonlar (Hata Tipine Göre)

### Billing Error
1. Provider konsolunda fatura durumunu kontrol et
2. Kredi kartının geçerliliğini doğrula
3. Ödeme başarısızlıklarını incele

### Quota Exceeded
1. Provider konsolunda kullanım limitlerini kontrol et
2. Daha yüksek plan'a geçmeyi düşün
3. Beklenmeyen kullanım artışlarını incele

### Rate Limit
1. Request throttling uygula
2. Rate limit tier'ını artır
3. Eşzamanlı istek pattern'lerini incele

### Invalid API Key
1. `.env` dosyasındaki API anahtarını doğrula
2. API anahtarının rotate edilip edilmediğini kontrol et
3. Gerekirse yeni API anahtarı oluştur

### Permission Denied
1. Service account yetkilerini kontrol et
2. Provider konsolunda API'nin etkin olduğunu doğrula
3. IAM rollerini ve erişim politikalarını incele

### Insufficient Credits
1. Hesaba kredi ekle
2. Otomatik faturalandırma veya top-up ayarla

---

## Örnek .env Konfigürasyonu

```bash
# Admin email bildirimleri (tek veya virgülle ayrılmış çoklu)
ADMIN_EMAIL=admin@example.com
ADMIN_NOTIFICATION_EMAILS=admin1@example.com,admin2@example.com

# AI hata bildirimlerini aç/kapa (varsayılan: true)
AI_ERROR_NOTIFICATIONS_ENABLED=true
```

---

## Loglama

| Log Tag | Açıklama |
|---------|----------|
| `[AI_ERROR_NOTIFIER]` | AI hata bildirimi logları |
| `[SUPPORT_NOTIFICATION]` | Destek bildirimi logları |

### Örnek Log Çıktıları

```
[AI_ERROR_NOTIFIER] Notification sent to admin@example.com: gemini_tts:billing
[AI_ERROR_NOTIFIER] Skipping notification (cooldown): google_tts:rate_limit - 5 occurrences in 10 min
[SUPPORT_NOTIFICATION] Sent notifications to admins: admin@example.com for conversation conv-123
```

---

## Notlar

1. **AI Error Notifier** env variable (`ADMIN_EMAIL` veya `ADMIN_NOTIFICATION_EMAILS`) kullanır
2. **Support Notifier** veritabanından `role='admin'` kullanıcıları çeker
3. Her iki sistem de `mailer.js` modülünü kullanarak email gönderir
4. AI hataları için spam önleme (cooldown) mekanizması vardır
5. Support bildirimleri için cooldown yoktur (her mesajda bildirim gider)
