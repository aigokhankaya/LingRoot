# n8n Workflow Örneği: Podcast → Supabase Upload

Bu döküman, n8n workflow'unuzun podcast oluşturup Supabase'e yüklemesi için gerekli node'ları gösterir.

## Workflow Akışı

```
[Webhook Trigger] 
    ↓
[Podcast Generator Service]
    ↓
[Function: Prepare Upload Data]
    ↓
[HTTP Request: Upload to Backend]
    ↓
[Function: Format Response]
    ↓
[Respond to Webhook]
```

---

## 1. Webhook Trigger Node

**Node Type:** Webhook  
**Path:** `/webhook/create-podcast`  
**Method:** POST

**Expected Input:**
```json
{
  "topic": "Harput Kalesi",
  "level": "A1",
  "duration": 3,
  "styleType": "friendly_chat",
  "voiceChoice": "english_female",
  "personalityA": "curious_enthusiast",
  "personalityB": "knowledgeable_friend",
  "includeHumor": true,
  "includeFiller": true
}
```

---

## 2. Podcast Generator Service Node

**Node Type:** HTTP Request (veya özel servisiniz)  
Bu node'un mevcut podcast generation servisiniz olduğunu varsayıyoruz.

**Output Example:**
```json
{
  "audio_file": "binary_or_url",
  "drive_link": "https://drive.google.com/file/d/1zbPuFe.../view?usp=drivesdk",
  "subtitles": {
    "srt": "1\n00:00:00,000 --> 00:00:04,085\n...",
    "vtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:04.085\n..."
  },
  "duration_seconds": "52.42",
  "file_name": "harput_kalesi_A1_20251026160530.mp3"
}
```

---

## 3. Function Node: Prepare Upload Data

**Node Type:** Function  
**Function Code:**

```javascript
// Get input from previous node
const input = $input.item.json;

// Prepare the request body for backend upload
const uploadPayload = {
  audio_url: input.drive_link || input.audio_url,
  subtitles: {
    srt: input.subtitles.srt,
    vtt: input.subtitles.vtt
  },
  metadata: {
    topic: input.topic || $('Webhook').item.json.body.topic,
    level: input.level || $('Webhook').item.json.body.level,
    duration_seconds: input.duration_seconds,
    file_name: input.file_name,
    speaking_rate: 1.0
  },
  user_id: null // Kullanıcı ID'si varsa buraya ekleyin
};

return {
  json: uploadPayload
};
```

---

## 4. HTTP Request Node: Upload to Backend

**Node Type:** HTTP Request  
**Settings:**

- **Method:** POST
- **URL:** `https://your-backend-domain.com/api/podcast/upload`
  - Development: `http://localhost:5001/api/podcast/upload`
  - Production: `https://lingroot-backend.onrender.com/api/podcast/upload` (veya sizin domain'iniz)
- **Authentication:** None
- **Body Content Type:** JSON
- **Specify Body:** Using Fields Below
- **Fields:**
  - `audio_url`: `{{ $json.audio_url }}`
  - `subtitles`: `{{ $json.subtitles }}`
  - `metadata`: `{{ $json.metadata }}`
  - `user_id`: `{{ $json.user_id }}`

**Alternative: Raw JSON Body**
```
{
  "audio_url": "={{ $json.audio_url }}",
  "subtitles": "={{ $json.subtitles }}",
  "metadata": "={{ $json.metadata }}",
  "user_id": "={{ $json.user_id }}"
}
```

---

## 5. Function Node: Format Response

**Node Type:** Function  
**Function Code:**

```javascript
// Get backend response
const backendResponse = $input.item.json;

// Check if upload was successful
if (!backendResponse.success) {
  throw new Error('Upload failed: ' + backendResponse.error);
}

// Format response for frontend
const formattedResponse = {
  status: "success",
  message: "Podcast created successfully",
  data: {
    audio: {
      public_url: backendResponse.data.audio.public_url,
      file_name: backendResponse.data.audio.file_name,
      duration_seconds: backendResponse.data.metadata.duration_seconds
    },
    subtitles: {
      srt: backendResponse.data.subtitles.srt,
      vtt: backendResponse.data.subtitles.vtt
    }
  }
};

return {
  json: formattedResponse
};
```

---

## 6. Respond to Webhook Node

**Node Type:** Respond to Webhook  
**Response Code:** 200  
**Response Body:**

```
{{ $json }}
```

Bu, yukarıdaki Function node'dan gelen formatted response'u döndürür.

---

## Alternatif: Base64 Audio Buffer Kullanımı

Eğer Google Drive yerine doğrudan audio buffer göndermek isterseniz:

### Function Node (Modified):

```javascript
const input = $input.item.json;

// Convert audio binary to base64
const audioBase64 = Buffer.from(input.audio_file).toString('base64');

const uploadPayload = {
  audio_buffer: audioBase64, // audio_url yerine
  subtitles: {
    srt: input.subtitles.srt,
    vtt: input.subtitles.vtt
  },
  metadata: {
    topic: input.topic,
    level: input.level,
    duration_seconds: input.duration_seconds
  }
};

return {
  json: uploadPayload
};
```

---

## Error Handling

Her HTTP Request node'una **Error Output** ekleyin:

```javascript
// Error Handler Function
const error = $input.item.json;

return {
  json: {
    status: "error",
    message: error.message || "Upload failed",
    error: error
  }
};
```

---

## Testing

### Test Input (Webhook):
```bash
curl -X POST https://your-n8n-instance.com/webhook/create-podcast \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Test Podcast",
    "level": "A1",
    "duration": 1
  }'
```

### Expected Final Response:
```json
{
  "status": "success",
  "message": "Podcast created successfully",
  "data": {
    "audio": {
      "public_url": "https://supabase-url/audio/test_podcast_a1_1730000000.mp3",
      "file_name": "test_podcast_a1_1730000000.mp3",
      "duration_seconds": "12.5"
    },
    "subtitles": {
      "srt": "...",
      "vtt": "..."
    }
  }
}
```

---

## Monitoring & Debugging

### Backend Logs
Backend'de Winston logger kullanılıyor. Logları kontrol etmek için:

```bash
# Development
npm run dev

# Production (Render/Heroku)
# Dashboard'dan logs sekmesini kontrol edin
```

### n8n Executions
n8n dashboard'da **Executions** sekmesinden workflow çalıştırmalarını kontrol edin.

### Frontend Console
Frontend'de browser console'u açın ve şu logları arayın:
```
🎙️ [PODCAST] Creating podcast with params
🎙️ [PODCAST] Success response
🎙️ [PODCAST] Using direct URL from backend (Supabase)
```

---

## Backup: Eski Response Format Desteği

Frontend kodu hem eski (Google Drive) hem de yeni (Supabase) formatı destekliyor:

**Eski format (Google Drive):**
```json
{
  "status": "success",
  "data": {
    "audio": {
      "drive_link": "https://drive.google.com/..."
    }
  }
}
```

**Yeni format (Supabase):**
```json
{
  "status": "success",
  "data": {
    "audio": {
      "public_url": "https://supabase-url/..."
    }
  }
}
```

Her ikisi de çalışacaktır.
