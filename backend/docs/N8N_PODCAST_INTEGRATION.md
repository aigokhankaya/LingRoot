# n8n Podcast Integration - Supabase Upload

## Overview
Bu döküman, n8n workflow'unuzun podcast ses dosyasını ve altyazılarını Supabase'e yüklemek için backend API'sini nasıl kullanacağını açıklar.

**⚠️ YENİ:** Supabase'e **direkt upload** için `N8N_SUPABASE_DIRECT_UPLOAD.md` dokümanına bakın.

## İki Yöntem

### Yöntem 1: Backend API Üzerinden (Bu Doküman)
- n8n → Backend API → Supabase
- Authentication kontrol
- Database kayıt otomatik

### Yöntem 2: Direkt Supabase Upload (Önerilen ⭐)
- n8n → Supabase Storage (direkt)
- Daha hızlı
- Daha basit
- Detay: `N8N_SUPABASE_DIRECT_UPLOAD.md`

## Endpoint
```
POST /api/podcast/upload
```

**Base URL (Production):** `https://your-backend-domain.com`
**Base URL (Development):** `http://localhost:5001`

## Authentication
Bu endpoint public erişimlidir (authentication gerekmez). Ancak `user_id` parametresi ile ilişkilendirme yapılabilir.

Eğer kullanıcı bilgisi ile kaydetmek isterseniz:
```
POST /api/podcast/upload-authenticated
```
Bu endpoint için `Authorization: Bearer <token>` header'ı gereklidir.

---

## Request Format

### Option 1: Google Drive URL ile (Önerilen)
```json
{
  "audio_url": "https://drive.google.com/file/d/1zbPuFePZd1fZWxtLC-haWO43Zusm2Hm_/view?usp=drivesdk",
  "subtitles": {
    "srt": "1\n00:00:00,000 --> 00:00:04,085\nSpeaker A: Have you been to Harput Kalesi? It's amazing!\n\n2\n00:00:04,085 --> 00:00:08,700\nSpeaker B: Yeah, I went last summer. The view is fantastic!",
    "vtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:04.085\nSpeaker A: Have you been to Harput Kalesi? It's amazing!\n\n2\n00:00:04.085 --> 00:00:08.700\nSpeaker B: Yeah, I went last summer. The view is fantastic!"
  },
  "metadata": {
    "topic": "Harput Kalesi",
    "level": "A1",
    "duration_seconds": "52.42",
    "file_name": "harput_kalesi_A1_20251026160530.mp3",
    "speaking_rate": 1.0
  },
  "user_id": "optional-user-uuid-here"
}
```

### Option 2: Base64 Audio Buffer ile
```json
{
  "audio_buffer": "base64_encoded_audio_data_here...",
  "subtitles": {
    "srt": "...",
    "vtt": "..."
  },
  "metadata": {
    "topic": "Topic Name",
    "level": "A1",
    "duration_seconds": "52.42"
  }
}
```

---

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `audio_url` | string | Yes* | Google Drive veya herhangi bir URL'den ses dosyasını indirir |
| `audio_buffer` | string | Yes* | Base64 encoded audio data (alternative to audio_url) |
| `subtitles` | object | Yes | Altyazı bilgileri |
| `subtitles.srt` | string | Yes | SRT format altyazı |
| `subtitles.vtt` | string | Yes | WebVTT format altyazı |
| `metadata` | object | No | Podcast metadata bilgileri |
| `metadata.topic` | string | No | Podcast konusu |
| `metadata.level` | string | No | İngilizce seviyesi (A1, A2, B1, B2, C1, C2) |
| `metadata.duration_seconds` | string | No | Ses dosyası süresi (saniye) |
| `metadata.file_name` | string | No | Orijinal dosya adı |
| `metadata.speaking_rate` | number | No | Konuşma hızı (0.5 - 2.0) |
| `user_id` | string | No | Kullanıcı ile ilişkilendirme için UUID |

*Not: `audio_url` veya `audio_buffer` ikisinden biri mutlaka sağlanmalıdır.

---

## Success Response

**Status Code:** 200 OK

```json
{
  "success": true,
  "message": "Podcast uploaded successfully",
  "data": {
    "audio": {
      "public_url": "https://your-supabase.co/storage/v1/object/public/bucket-name/audio/harput_kalesi_a1_1730000000000.mp3",
      "file_name": "harput_kalesi_a1_1730000000000.mp3"
    },
    "subtitles": {
      "vtt_url": "https://your-supabase.co/storage/v1/object/public/bucket-name/audio/harput_kalesi_a1_1730000000000.vtt",
      "srt": "1\n00:00:00,000 --> 00:00:04,085\n...",
      "vtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:04.085\n..."
    },
    "metadata": {
      "duration_seconds": "52.42",
      "level": "A1",
      "topic": "Harput Kalesi"
    },
    "content_history_id": "uuid-here-if-user_id-provided"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Either audio_url or audio_buffer must be provided"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to upload audio to Supabase",
  "details": "Error details..."
}
```

---

## n8n Workflow Implementation

### Adımlar:

#### 1. **HTTP Request Node - Podcast Oluşturma**
Mevcut podcast oluşturma servisiniz (örn: Google TTS, ElevenLabs, vb.)

Output:
- Audio dosyası (Google Drive veya başka bir yerde)
- SRT altyazı
- VTT altyazı
- Metadata

#### 2. **Function Node - Request Body Hazırlama**
```javascript
// n8n Function Node
const audioUrl = $input.item.json.audio.drive_link;
const subtitles = $input.item.json.subtitles;
const metadata = {
  topic: $input.item.json.topic || 'Podcast',
  level: $input.item.json.level || 'A1',
  duration_seconds: $input.item.json.audio.duration_seconds,
  file_name: $input.item.json.audio.file_name,
  speaking_rate: 1.0
};

return {
  json: {
    audio_url: audioUrl,
    subtitles: {
      srt: subtitles.srt,
      vtt: subtitles.vtt
    },
    metadata: metadata,
    user_id: null // veya $input.item.json.user_id
  }
};
```

#### 3. **HTTP Request Node - Supabase Upload**
- **Method:** POST
- **URL:** `https://your-backend-domain.com/api/podcast/upload`
- **Authentication:** None (veya Bearer Token if using /upload-authenticated)
- **Body Content Type:** JSON
- **Body:**
  ```json
  {
    "audio_url": "={{ $json.audio_url }}",
    "subtitles": {
      "srt": "={{ $json.subtitles.srt }}",
      "vtt": "={{ $json.subtitles.vtt }}"
    },
    "metadata": "={{ $json.metadata }}",
    "user_id": "={{ $json.user_id }}"
  }
  ```

#### 4. **Success Response**
Backend'den gelen `data.audio.public_url` ve `data.subtitles.vtt_url` değerlerini kullanarak frontend'e response dönün.

---

## n8n'den Frontend'e Response Formatı

Frontend'in beklediği format (güncellenmiş):

```json
{
  "status": "success",
  "message": "Podcast created successfully",
  "data": {
    "audio": {
      "public_url": "https://supabase-url/audio/file.mp3",
      "file_name": "harput_kalesi_A1_20251026160530.mp3",
      "duration_seconds": "52.42"
    },
    "subtitles": {
      "srt": "1\n00:00:00,000 --> 00:00:04,085\n...",
      "vtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:04.085\n..."
    }
  }
}
```

**ÖNEMLİ:** Frontend kodu artık `data.audio.public_url` veya `data.audio.drive_link` alanını kontrol ediyor. Supabase URL'i `public_url` olarak dönülmelidir.

---

## Test cURL Command

```bash
curl -X POST https://your-backend-domain.com/api/podcast/upload \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://drive.google.com/file/d/1zbPuFePZd1fZWxtLC-haWO43Zusm2Hm_/view?usp=drivesdk",
    "subtitles": {
      "srt": "1\n00:00:00,000 --> 00:00:04,085\nSpeaker A: Test\n",
      "vtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:04.085\nSpeaker A: Test\n"
    },
    "metadata": {
      "topic": "Test Podcast",
      "level": "A1",
      "duration_seconds": "52.42"
    }
  }'
```

---

## Environment Variables (Backend)

Backend `.env` dosyasında aşağıdaki değişkenlerin tanımlı olması gerekir:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_BUCKET_NAME=lingroot-audio
```

---

## Troubleshooting

### 1. "Supabase client is not initialized"
- Backend `.env` dosyasında `SUPABASE_URL` ve `SUPABASE_SERVICE_KEY` değerlerini kontrol edin
- Backend'i restart edin

### 2. "Failed to upload audio to Supabase"
- Supabase bucket'ının public olup olmadığını kontrol edin
- Bucket adının doğru olduğunu kontrol edin
- Service role key'in doğru yetkilere sahip olduğunu kontrol edin

### 3. "Audio download failed"
- Google Drive linkinin erişilebilir olduğunu kontrol edin
- URL'in doğru format olduğunu kontrol edin
- Timeout değerini artırın (şu an 60 saniye)

### 4. CORS Errors
- Backend'de CORS ayarlarının doğru yapıldığından emin olun
- n8n webhook URL'inin allowedOrigins listesine eklendiğinden emin olun

---

## Notes
- Ses dosyaları `audio/` klasörüne yüklenir
- Dosya adları otomatik olarak temizlenir (boşluklar `_` ile değiştirilir)
- VTT dosyası yüklenemezse warning log'u kaydedilir ama işlem başarısız sayılmaz
- `user_id` sağlanırsa, podcast `contenthistory` tablosuna kaydedilir
