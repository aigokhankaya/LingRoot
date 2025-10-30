# n8n Podcast Integration - Güncelleme Özeti

## 🎉 Tamamlanan Güncellemeler

### 1. Frontend API Güncellemeleri

**Dosya:** `frontend/src/lib/api.ts`

✅ **Değişiklikler:**
- n8n webhook URL'i güncellendi: `https://lgpodcast1.app.n8n.cloud/webhook/create-podcast`
- `PodcastCreationParams` basitleştirildi (sadece: topic, level, duration)
- n8n'den gelen yeni response formatı desteklendi:
  ```typescript
  // Yeni format:
  { audioUrl, subtitlesUrl, duration, level, topic, createdAt, costs }
  
  // Eski format (backward compatibility için korundu):
  { status, data: { audio, subtitles } }
  ```
- Supabase Storage URL'leri direkt kullanılıyor (Google Drive conversion kaldı)

### 2. Frontend Podcast Sayfası Güncellemeleri

**Dosya:** `frontend/pages/welcome.tsx`

✅ **Değişiklikler:**
- Podcast oluşturma parametreleri basitleştirildi
- Gereksiz parametreler kaldırıldı:
  - ❌ `styleType`
  - ❌ `voiceChoice`
  - ❌ `conversationStyle`
  - ❌ `personalityA`
  - ❌ `personalityB`
  - ❌ `includeHumor`
  - ❌ `includeFiller`
- ✅ Sadece gerekli parametreler:
  - ✅ `topic` (string)
  - ✅ `level` (A1, A2, B1, B2, C1, C2)
  - ✅ `duration` (number, dakika)
- VTT altyazı URL'i artık Supabase'den direkt geliyor (blob URL conversion kaldırıldı)
- Maliyet bilgileri console'da loglanıyor

### 3. Backend Database Setup

**Dosya:** `backend/docs/PODCAST_SERVICE_SETUP.sql`

✅ **Yeni SQL Script:**
- `external_services` tablosuna podcast service kaydı eklendi
- Service name: `podcast_generator`
- API URL: `https://lgpodcast1.app.n8n.cloud/webhook/create-podcast`
- API Token: NULL (webhook public)

---

## 📡 n8n Webhook Formatı

### Request (Frontend → n8n)

```json
POST https://lgpodcast1.app.n8n.cloud/webhook/create-podcast
Content-Type: application/json

{
  "topic": "Mardin kültürü",
  "level": "A1",
  "duration": 2
}
```

### Response (n8n → Frontend)

```json
{
  "audioUrl": "https://ffgfcmmbeisoughtac.supabase.co/storage/v1/object/public/audio-outputs/audio/default.mp3",
  "subtitlesUrl": "https://ffgfcmmbeisoughtac.supabase.co/storage/v1/object/public/audio-outputs/vtt/default.vtt",
  "duration": "31.88",
  "level": "A2",
  "topic": "Unknown",
  "createdAt": "2025-10-29T19:36:20.598Z",
  "costs": null
}
```

---

## 🔄 Data Flow

```
Frontend (welcome.tsx)
    ↓ POST { topic, level, duration }
n8n Webhook
    ↓ TTS Generation + Supabase Upload
Response { audioUrl, subtitlesUrl, ... }
    ↓
Frontend (OutputSection)
    → Audio Player + Subtitles
```

---

## ✅ Kurulum Adımları

### 1. Database Update

```bash
# Supabase SQL Editor'de çalıştırın:
psql -h your-project.supabase.co -U postgres -d postgres -f backend/docs/PODCAST_SERVICE_SETUP.sql

# veya SQL Editor'de manuel:
# backend/docs/PODCAST_SERVICE_SETUP.sql dosyasını açın ve çalıştırın
```

### 2. Frontend Deploy

```bash
cd frontend
npm run build
# Deploy to Vercel/Netlify
```

### 3. Test

```bash
# Test request:
curl -X POST https://lgpodcast1.app.n8n.cloud/webhook/create-podcast \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Test Podcast",
    "level": "A1",
    "duration": 2
  }'
```

---

## 🧪 Test Checklist

- [ ] n8n webhook'u test edildi (Postman/cURL)
- [ ] Frontend'den podcast oluşturma çalışıyor
- [ ] Audio URL Supabase'den geliyor
- [ ] Subtitle URL Supabase'den geliyor
- [ ] Audio player çalışıyor
- [ ] Subtitles görünüyor
- [ ] Database'e podcast kaydı düşüyor
- [ ] Maliyet bilgileri loglanıyor

---

## 📊 Karşılaştırma: Eski vs Yeni

| Özellik | Eski Format | Yeni Format |
|---------|-------------|-------------|
| **Request Params** | 10+ parametre | 3 parametre (topic, level, duration) |
| **Audio Source** | Google Drive + Conversion | Supabase Storage (direkt) |
| **Subtitle Source** | Google Drive + Blob URL | Supabase Storage (direkt) |
| **Response Format** | Nested `{ status, data: { audio } }` | Flat `{ audioUrl, subtitlesUrl }` |
| **Webhook URL** | localhost:50005 (eski) | lgpodcast1.app.n8n.cloud |
| **Authentication** | Bearer token | None (public webhook) |

---

## 🚨 Breaking Changes

### Kaldırılan Özellikler:
- ❌ `styleType` - n8n workflow'da kullanılmıyor
- ❌ `voiceChoice` - n8n workflow'da kullanılmıyor
- ❌ Personality options - n8n workflow'da kullanılmıyor
- ❌ Humor/Filler options - n8n workflow'da kullanılmıyor

### Migration Notu:
Eski podcast creation UI'da bu parametreler hala görünüyorsa, UI'dan kaldırılabilir veya sadece görsel olarak bırakılabilir (n8n'e gönderilmeyecek).

---

## 📝 Yapılacaklar (Opsiyonel)

### UI İyileştirmeleri:
- [ ] Podcast creation form'dan gereksiz inputları kaldır
- [ ] Duration slider'ı basitleştir (1-10 dakika)
- [ ] Level selector'ı basitleştir (dropdown)
- [ ] Success message'e maliyet bilgisi ekle

### Backend İyileştirmeleri:
- [ ] Podcast history tablosu oluştur
- [ ] User podcast listesi endpoint'i
- [ ] Podcast cache mekanizması
- [ ] Rate limiting (n8n webhook için)

---

## 🔗 İlgili Dosyalar

- `frontend/src/lib/api.ts` - API client
- `frontend/pages/welcome.tsx` - Podcast creation UI
- `backend/docs/PODCAST_SERVICE_SETUP.sql` - Database setup
- `backend/docs/N8N_COMPACT_GUIDE.md` - n8n workflow guide
- `backend/docs/N8N_SUPABASE_DIRECT_UPLOAD.md` - Detailed n8n guide

---

## ✅ Özet

**Tamamlandı:**
- ✅ Frontend n8n webhook'una bağlandı
- ✅ Request parametreleri basitleştirildi (topic, level, duration)
- ✅ Response formatı yeni n8n çıktısına uyumlu
- ✅ Supabase Storage URL'leri direkt kullanılıyor
- ✅ Backward compatibility korundu

**Test Edilmeli:**
- ⏳ Frontend'den podcast oluşturma
- ⏳ Audio playback
- ⏳ Subtitle görüntüleme
- ⏳ Database kaydı

**İyi çalışmalar! 🚀**
