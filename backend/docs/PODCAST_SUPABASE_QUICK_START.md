# Podcast → Supabase Migration - Quick Start Guide

## 📋 Özet

Podcast'leri Google Drive yerine Supabase'e yüklemek için gerekli tüm değişiklikler yapıldı.

---

## ✅ Yapılan Değişiklikler

### 1. Backend

#### Yeni Dosyalar:
- `backend/controllers/podcastController.js` - Podcast upload controller
- `backend/routes/podcastRoutes.js` - Podcast routes
- `backend/docs/N8N_PODCAST_INTEGRATION.md` - Detaylı API dökümanı
- `backend/docs/N8N_WORKFLOW_EXAMPLE.md` - n8n workflow örneği

#### Güncellenen Dosyalar:
- `backend/server.js` - Podcast routes eklendi
- `backend/utils/storageUploader.js` - Content type auto-detection eklendi (VTT/SRT desteği)

#### Yeni Endpoint:
```
POST /api/podcast/upload
POST /api/podcast/upload-authenticated (with auth)
```

### 2. Frontend

#### Güncellenen Dosyalar:
- `frontend/src/lib/api.ts` - Response parser güncellendi (Supabase public_url desteği)
- `frontend/pages/welcome.tsx` - VTT subtitle handling iyileştirildi

---

## 🚀 Kurulum Adımları

### 1. Backend Environment Variables

`backend/.env` dosyasına ekleyin:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_BUCKET_NAME=lingroot-audio
```

### 2. Supabase Bucket Setup

Supabase dashboard'da:

1. Storage → New Bucket
2. Bucket name: `lingroot-audio` (veya .env'deki değer)
3. **Public bucket** olarak ayarlayın
4. `audio/` klasörü otomatik oluşturulacak

### 3. Backend Restart

```bash
cd backend
npm install # axios dependency check
npm run dev
```

### 4. Test Backend Endpoint

```bash
curl -X POST http://localhost:5001/api/podcast/upload \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://example.com/audio.mp3",
    "subtitles": {
      "srt": "1\n00:00:00,000 --> 00:00:05,000\nTest",
      "vtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:05.000\nTest"
    },
    "metadata": {
      "topic": "Test",
      "level": "A1"
    }
  }'
```

**Başarılı response:**
```json
{
  "success": true,
  "message": "Podcast uploaded successfully",
  "data": {
    "audio": {
      "public_url": "https://...supabase.co/storage/.../audio/test_a1_xxx.mp3"
    }
  }
}
```

---

## 🔧 n8n Workflow Güncelleme

### Mevcut Workflow'unuzu Değiştirin:

**Eski:**
```
Podcast Generator → Format Response → Return to Frontend
```

**Yeni:**
```
Podcast Generator → Prepare Upload Data → Backend Upload → Format Response → Return to Frontend
```

### Eklemeniz Gereken Node'lar:

#### 1. Function Node: "Prepare Upload Data"
```javascript
return {
  json: {
    audio_url: $input.item.json.drive_link,
    subtitles: {
      srt: $input.item.json.subtitles.srt,
      vtt: $input.item.json.subtitles.vtt
    },
    metadata: {
      topic: $input.item.json.topic,
      level: $input.item.json.level,
      duration_seconds: $input.item.json.duration_seconds,
      file_name: $input.item.json.file_name
    }
  }
};
```

#### 2. HTTP Request Node: "Upload to Backend"
- **URL:** `https://your-backend.com/api/podcast/upload`
- **Method:** POST
- **Body:** Raw JSON
  ```json
  {
    "audio_url": "={{ $json.audio_url }}",
    "subtitles": "={{ $json.subtitles }}",
    "metadata": "={{ $json.metadata }}"
  }
  ```

#### 3. Function Node: "Format for Frontend"
```javascript
const backend = $input.item.json;
return {
  json: {
    status: "success",
    message: "Podcast created successfully",
    data: {
      audio: {
        public_url: backend.data.audio.public_url,
        file_name: backend.data.audio.file_name,
        duration_seconds: backend.data.metadata.duration_seconds
      },
      subtitles: backend.data.subtitles
    }
  }
};
```

---

## 🧪 Test Senaryosu

### 1. Frontend'den Podcast Oluştur
- `localhost:3000/welcome` sayfasına git
- Podcast sekmesine tıkla
- Bir konu gir (örn: "Harput Kalesi")
- "Podcast Oluştur" butonuna bas

### 2. Kontrol Edilecekler

**Browser Console:**
```
🎙️ [PODCAST] Creating podcast with params
🎙️ [PODCAST] Success response
🎙️ [PODCAST] Using direct URL from backend (Supabase)
```

**Backend Logs:**
```
📤 [PODCAST UPLOAD] Request received
📤 [PODCAST UPLOAD] Downloading audio from URL
📤 [PODCAST UPLOAD] Uploading audio to Supabase...
✅ [PODCAST UPLOAD] Audio uploaded successfully
✅ [PODCAST UPLOAD] VTT uploaded successfully
```

**Supabase Dashboard:**
- Storage → lingroot-audio → audio/
- Yeni MP3 ve VTT dosyalarını göreceksiniz

**Frontend:**
- Ses player görünmeli
- Altyazılar gösterilmeli
- Oynatma çalışmalı

---

## 📊 Response Format Karşılaştırması

### Eski (Google Drive):
```json
{
  "status": "success",
  "data": {
    "audio": {
      "drive_link": "https://drive.google.com/file/d/XXX/view"
    }
  }
}
```
❌ CORS sorunları  
❌ İndirme gerektiriyor  
❌ Direkt oynatılamıyor  

### Yeni (Supabase):
```json
{
  "status": "success",
  "data": {
    "audio": {
      "public_url": "https://supabase.co/storage/.../audio/file.mp3"
    }
  }
}
```
✅ Direkt streaming  
✅ CORS friendly  
✅ CDN support  
✅ Hızlı erişim  

---

## 🐛 Troubleshooting

### Problem: "Supabase client is not initialized"
**Çözüm:**
1. `backend/.env` dosyasını kontrol et
2. `SUPABASE_URL` ve `SUPABASE_SERVICE_KEY` değerlerini doğrula
3. Backend'i restart et

### Problem: "Failed to upload audio to Supabase"
**Çözüm:**
1. Supabase bucket'ının public olduğundan emin ol
2. Bucket adının `.env`'deki ile aynı olduğunu kontrol et
3. Service role key'in storage yetkisi olduğunu doğrula

### Problem: Ses oynatılmıyor
**Çözüm:**
1. Browser console'da network tabını kontrol et
2. Audio URL'inin erişilebilir olduğunu doğrula
3. CORS error varsa backend CORS ayarlarını kontrol et

### Problem: n8n timeout
**Çözüm:**
1. Audio dosyası çok büyük olabilir (timeout: 60 saniye)
2. n8n HTTP request timeout'unu artır
3. Veya audio dosyasını base64 buffer olarak gönder

---

## 📚 Ek Dokümantasyon

- **Detaylı API Dökümanı:** `backend/docs/N8N_PODCAST_INTEGRATION.md`
- **n8n Workflow Örneği:** `backend/docs/N8N_WORKFLOW_EXAMPLE.md`

---

## 🎯 Migration Checklist

- [x] Backend podcast upload endpoint eklendi
- [x] Supabase storage uploader subtitle desteği eklendi
- [x] Frontend response parser güncellendi
- [x] Dokümantasyon oluşturuldu
- [ ] Backend `.env` dosyası güncellendi (YAPILACAK)
- [ ] Supabase bucket oluşturuldu (YAPILACAK)
- [ ] n8n workflow güncellendi (YAPILACAK)
- [ ] Test edildi (YAPILACAK)

---

## 💡 Sonraki Adımlar

1. **Backend Deploy:**
   - Render/Heroku dashboard'dan environment variables ekle
   - Deploy et

2. **n8n Güncelle:**
   - Workflow'u yukardaki gibi değiştir
   - Test et

3. **Production Test:**
   - Frontend'den podcast oluştur
   - Supabase'de dosyaları kontrol et
   - Ses oynatmayı test et

4. **Cleanup (Opsiyonel):**
   - Google Drive'daki eski podcast dosyalarını arşivle
   - n8n'den Google Drive integration'ı kaldır

---

## 🎉 Tamamlandı!

Artık podcast'leriniz Supabase'de saklanıyor ve direkt streaming yapılabiliyor!
