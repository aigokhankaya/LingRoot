# n8n → Supabase Direkt Upload Entegrasyon Dokümantasyonu

## 📋 Genel Bakış

Bu doküman, n8n workflow'unuzun podcast ses dosyalarını ve altyazılarını **doğrudan Supabase Storage'a** yüklemesi için gerekli tüm bilgileri içerir.

**n8n Webhook URL:** `https://lgpodcast1.app.n8n.cloud/webhook/create-podcast`

---

## 🔑 Gerekli Kimlik Bilgileri

### 1. Supabase Credentials

n8n workflow'unuzda aşağıdaki Supabase kimlik bilgilerine ihtiyacınız var:

| Credential | Değer | Nasıl Bulunur |
|------------|-------|---------------|
| **SUPABASE_URL** | `https://xxxxx.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| **SUPABASE_SERVICE_KEY** | `eyJhbG...` (uzun token) | Supabase Dashboard → Settings → API → service_role key (secret) |
| **SUPABASE_BUCKET_NAME** | `lingroot-audio` | Supabase Dashboard → Storage → Bucket adı |

⚠️ **ÖNEMLİ:** `service_role` key kullanın, `anon` key değil! Service role key tam yetki sağlar.

### 2. n8n Environment Variables

n8n'de bu değerleri environment variable olarak saklamanız önerilir:

```javascript
// n8n Credentials → Add credential → Environment Variable
SUPABASE_URL
SUPABASE_SERVICE_KEY
SUPABASE_BUCKET_NAME
```

---

## 📁 Supabase Storage Yapısı

### Bucket Konfigürasyonu

```
Bucket Name: lingroot-audio
├── audio/                          # Ses dosyaları
│   ├── podcast_topic_a1_123456.mp3
│   ├── podcast_topic_b1_123457.mp3
│   └── ...
└── subtitles/                      # Altyazı dosyaları (opsiyonel)
    ├── podcast_topic_a1_123456.vtt
    └── ...
```

### Bucket Ayarları

Supabase Dashboard'da bucket ayarları:

1. **Public Bucket:** ✅ AÇIK (public URL'ler için gerekli)
2. **File Size Limit:** 50 MB (podcast'ler için yeterli)
3. **Allowed MIME Types:** 
   - `audio/mpeg` (MP3)
   - `audio/wav` (WAV)
   - `text/vtt` (VTT altyazılar)
   - `text/plain` (SRT altyazılar)

---

## 🔄 n8n Workflow Yapısı

### Node Sıralaması

```
1. Webhook Trigger
   ↓
2. Function: Parse Input
   ↓
3. HTTP Request: Download Audio (Google Drive)
   ↓
4. Supabase: Upload Audio
   ↓
5. Function: Prepare VTT Content
   ↓
6. Supabase: Upload VTT
   ↓
7. Function: Format Response
   ↓
8. Respond to Webhook
```

---

## 🛠️ n8n Node Konfigürasyonları

### Node 1: Webhook Trigger

**Node Type:** `Webhook`

**Settings:**
- **HTTP Method:** POST
- **Path:** `create-podcast`
- **Response Mode:** Wait for Workflow to Finish
- **Response Code:** 200

**Beklenen Input:**
```json
{
  "topic": "Harput Kalesi",
  "level": "A1",
  "audio_url": "https://drive.google.com/file/d/1zbPuFePZd1fZWxtLC-haWO43Zusm2Hm_/view",
  "subtitles": {
    "srt": "1\n00:00:00,000 --> 00:00:04,085\nSpeaker A: Text...",
    "vtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:04.085\nSpeaker A: Text..."
  },
  "duration_seconds": 52.42,
  "speaking_rate": 1.0
}
```

---

### Node 2: Function - Parse Input

**Node Type:** `Function`

```javascript
// Input'u parse et ve temizle
const input = $input.item.json;

// Topic'i dosya adı için formatla
const topicSlug = (input.topic || 'podcast')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

// Timestamp ekle
const timestamp = Date.now();

// Dosya adları oluştur
const audioFileName = `${topicSlug}_${input.level || 'a1'}_${timestamp}.mp3`;
const vttFileName = `${topicSlug}_${input.level || 'a1'}_${timestamp}.vtt`;

// Google Drive URL'ini download URL'ine çevir
let downloadUrl = input.audio_url;
if (downloadUrl.includes('drive.google.com')) {
  const fileId = downloadUrl.match(/\/d\/([^\/]+)/)?.[1] || 
                 downloadUrl.match(/id=([^&]+)/)?.[1];
  if (fileId) {
    downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
}

return {
  json: {
    topic: input.topic,
    level: input.level,
    audio_url: downloadUrl,
    audio_file_name: audioFileName,
    vtt_file_name: vttFileName,
    vtt_content: input.subtitles?.vtt || '',
    srt_content: input.subtitles?.srt || '',
    duration_seconds: input.duration_seconds,
    speaking_rate: input.speaking_rate || 1.0,
    supabase_audio_path: `audio/${audioFileName}`,
    supabase_vtt_path: `audio/${vttFileName}`
  }
};
```

---

### Node 3: HTTP Request - Download Audio

**Node Type:** `HTTP Request`

**Settings:**
- **Method:** GET
- **URL:** `={{ $json.audio_url }}`
- **Response Format:** File
- **Download:** ✅ Yes
- **Binary Property:** `audio_data`
- **Timeout:** 60000 (60 saniye)

**Headers:**
```json
{
  "User-Agent": "n8n-workflow"
}
```

---

### Node 4: Supabase - Upload Audio

**Node Type:** `HTTP Request`

**Settings:**
- **Method:** POST
- **URL:** `={{ $env.SUPABASE_URL }}/storage/v1/object/{{ $env.SUPABASE_BUCKET_NAME }}/{{ $json.supabase_audio_path }}`
- **Authentication:** Generic Credential Type
  - **Header Auth**
  - **Name:** `Authorization`
  - **Value:** `Bearer {{ $env.SUPABASE_SERVICE_KEY }}`

**Headers:**
```json
{
  "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_KEY }}",
  "Content-Type": "audio/mpeg",
  "Cache-Control": "3600"
}
```

**Body:**
- **Body Content Type:** Binary
- **Binary Property:** `audio_data`
- **Options:**
  - **Upload:** ✅ Yes
  - **Upsert:** ✅ Yes (üzerine yazma)

**Response:**
```json
{
  "Key": "audio/podcast_topic_a1_123456.mp3",
  "Id": "uuid-here"
}
```

---

### Node 5: Function - Prepare VTT for Upload

**Node Type:** `Function`

```javascript
// VTT content'i Buffer'a çevir
const vttContent = $input.first().json.vtt_content;
const vttFileName = $input.first().json.vtt_file_name;
const supabaseVttPath = $input.first().json.supabase_vtt_path;

// VTT'yi binary data olarak hazırla
const buffer = Buffer.from(vttContent, 'utf-8');

return {
  json: {
    vtt_file_name: vttFileName,
    supabase_vtt_path: supabaseVttPath
  },
  binary: {
    vtt_data: {
      data: buffer.toString('base64'),
      mimeType: 'text/vtt',
      fileName: vttFileName
    }
  }
};
```

---

### Node 6: Supabase - Upload VTT

**Node Type:** `HTTP Request`

**Settings:**
- **Method:** POST
- **URL:** `={{ $env.SUPABASE_URL }}/storage/v1/object/{{ $env.SUPABASE_BUCKET_NAME }}/{{ $json.supabase_vtt_path }}`
- **Authentication:** Generic Credential Type
  - **Header Auth**
  - **Name:** `Authorization`
  - **Value:** `Bearer {{ $env.SUPABASE_SERVICE_KEY }}`

**Headers:**
```json
{
  "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_KEY }}",
  "Content-Type": "text/vtt",
  "Cache-Control": "3600"
}
```

**Body:**
- **Body Content Type:** Binary
- **Binary Property:** `vtt_data`
- **Options:**
  - **Upsert:** ✅ Yes

---

### Node 7: Function - Format Response

**Node Type:** `Function`

```javascript
// Supabase public URL'lerini oluştur
const supabaseUrl = $env.SUPABASE_URL;
const bucketName = $env.SUPABASE_BUCKET_NAME;

// İlk node'dan gelen metadata
const metadata = $('Parse Input').item.json;

// Upload sonuçları
const audioPath = metadata.supabase_audio_path;
const vttPath = metadata.supabase_vtt_path;

// Public URL'ler
const audioPublicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${audioPath}`;
const vttPublicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${vttPath}`;

// Frontend beklediği format
return {
  json: {
    status: "success",
    message: "Podcast created and uploaded to Supabase successfully",
    data: {
      audio: {
        public_url: audioPublicUrl,
        file_name: metadata.audio_file_name,
        duration_seconds: metadata.duration_seconds,
        storage_path: audioPath
      },
      subtitles: {
        vtt_url: vttPublicUrl,
        srt: metadata.srt_content,
        vtt: metadata.vtt_content,
        storage_path: vttPath
      },
      metadata: {
        topic: metadata.topic,
        level: metadata.level,
        speaking_rate: metadata.speaking_rate,
        created_at: new Date().toISOString()
      }
    }
  }
};
```

---

### Node 8: Respond to Webhook

**Node Type:** `Respond to Webhook`

**Settings:**
- **Respond With:** Using 'Respond to Webhook' Node
- **Response Code:** 200
- **Response Body:** `={{ $json }}`

---

## 🔐 Güvenlik ve Environment Variables

### n8n'de Environment Variables Tanımlama

#### Yöntem 1: n8n Cloud (Önerilen)

1. n8n Dashboard → Settings → Variables
2. Yeni değişken ekle:
   - `SUPABASE_URL` = `https://xxxxx.supabase.co`
   - `SUPABASE_SERVICE_KEY` = `eyJhbG...` (service_role key)
   - `SUPABASE_BUCKET_NAME` = `lingroot-audio`

#### Yöntem 2: Self-Hosted n8n

`.env` dosyasına ekle:

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET_NAME=lingroot-audio
```

n8n'i restart edin:
```bash
docker-compose restart n8n
# veya
pm2 restart n8n
```

---

## 🧪 Test Etme

### Test Request (cURL)

```bash
curl -X POST https://lgpodcast1.app.n8n.cloud/webhook/create-podcast \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Test Podcast",
    "level": "A1",
    "audio_url": "https://drive.google.com/file/d/YOUR_FILE_ID/view",
    "subtitles": {
      "srt": "1\n00:00:00,000 --> 00:00:04,085\nTest subtitle",
      "vtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:04.085\nTest subtitle"
    },
    "duration_seconds": 10.5,
    "speaking_rate": 1.0
  }'
```

### Beklenen Response

```json
{
  "status": "success",
  "message": "Podcast created and uploaded to Supabase successfully",
  "data": {
    "audio": {
      "public_url": "https://xxxxx.supabase.co/storage/v1/object/public/lingroot-audio/audio/test_podcast_a1_1730189234567.mp3",
      "file_name": "test_podcast_a1_1730189234567.mp3",
      "duration_seconds": 10.5,
      "storage_path": "audio/test_podcast_a1_1730189234567.mp3"
    },
    "subtitles": {
      "vtt_url": "https://xxxxx.supabase.co/storage/v1/object/public/lingroot-audio/audio/test_podcast_a1_1730189234567.vtt",
      "srt": "1\n00:00:00,000 --> 00:00:04,085\nTest subtitle",
      "vtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:04.085\nTest subtitle",
      "storage_path": "audio/test_podcast_a1_1730189234567.vtt"
    },
    "metadata": {
      "topic": "Test Podcast",
      "level": "A1",
      "speaking_rate": 1.0,
      "created_at": "2024-10-29T13:38:00.000Z"
    }
  }
}
```

---

## 📊 Veritabanına Kaydetme (Opsiyonel)

Podcast metadata'sını Supabase PostgreSQL'e kaydetmek isterseniz:

### Ek Node: Supabase Database Insert

**Node Type:** `HTTP Request` (Supabase REST API)

**Settings:**
- **Method:** POST
- **URL:** `={{ $env.SUPABASE_URL }}/rest/v1/contenthistory`
- **Authentication:** Header Auth
  - `Authorization: Bearer {{ $env.SUPABASE_SERVICE_KEY }}`
  - `apikey: {{ $env.SUPABASE_SERVICE_KEY }}`

**Headers:**
```json
{
  "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_KEY }}",
  "apikey": "{{ $env.SUPABASE_SERVICE_KEY }}",
  "Content-Type": "application/json",
  "Prefer": "return=representation"
}
```

**Body:**
```json
{
  "user_id": "{{ $json.user_id || null }}",
  "level": "{{ $json.metadata.level }}",
  "mp3_url": "{{ $json.data.audio.public_url }}",
  "input": "{{ $json.metadata.topic }}",
  "input_type": "podcast",
  "created_at": "{{ $json.metadata.created_at }}"
}
```

---

## ⚠️ Hata Yönetimi

### Yaygın Hatalar ve Çözümleri

#### 1. "403 Forbidden" - Yetki Hatası

**Neden:**
- Yanlış service key kullanıyorsunuz
- Bucket public değil
- Service role key yetkisi yok

**Çözüm:**
```bash
# Supabase Dashboard'da:
1. Settings → API → service_role key'i kopyala (anon değil!)
2. Storage → lingroot-audio → Make bucket public
3. Policies → Add policy → Allow authenticated/service role uploads
```

#### 2. "404 Not Found" - Bucket Bulunamadı

**Neden:**
- Bucket adı yanlış
- Bucket silinmiş

**Çözüm:**
```bash
# Bucket adını kontrol et:
https://your-project.supabase.co/storage/buckets
```

#### 3. "413 Payload Too Large"

**Neden:**
- Ses dosyası çok büyük (>50MB)

**Çözüm:**
```javascript
// Supabase bucket ayarlarında file size limit'i artırın
// veya n8n'de audio compression ekleyin
```

#### 4. "Timeout" - İndirme Süresi Aşıldı

**Neden:**
- Google Drive dosyası çok büyük
- İnternet bağlantısı yavaş

**Çözüm:**
```javascript
// HTTP Request node'da timeout'u artırın:
"timeout": 120000  // 2 dakika
```

---

## 📈 Performans Optimizasyonu

### 1. Paralel Upload

VTT ve audio upload'larını paralel yapın:

```
Node 3: Download Audio
   ↓
Split Into Batches
   ├─→ Node 4A: Upload Audio
   └─→ Node 4B: Upload VTT
   ↓
Merge
```

### 2. Retry Logic

Network hatalarında tekrar dene:

```javascript
// HTTP Request node → Settings → Options
"retry": {
  "enabled": true,
  "maxRetries": 3,
  "waitBetweenRetries": 1000
}
```

### 3. Compression (Opsiyonel)

Büyük ses dosyalarını sıkıştırın:

```javascript
// FFmpeg kullanarak
// Yeni node ekle: Execute Command
ffmpeg -i input.mp3 -b:a 128k output.mp3
```

---

## 🔗 Faydalı Linkler

- **Supabase Storage Docs:** https://supabase.com/docs/guides/storage
- **n8n HTTP Request Node:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
- **Supabase REST API:** https://supabase.com/docs/reference/javascript/storage-from-upload

---

## 📝 Checklist

Upload işlemi çalışmadan önce kontrol edin:

- [ ] Supabase project oluşturuldu
- [ ] `lingroot-audio` bucket oluşturuldu
- [ ] Bucket **public** olarak işaretlendi
- [ ] Service role key alındı (Settings → API)
- [ ] n8n'de environment variables tanımlandı
- [ ] n8n workflow'u import edildi
- [ ] Test request gönderildi
- [ ] Public URL'ler browser'da açıldı

---

## 🆘 Destek

Sorun yaşarsanız:

1. **n8n Logs:** n8n workflow execution logs'unu kontrol edin
2. **Supabase Logs:** Dashboard → Logs → Storage logs
3. **Backend Logs:** Backend server logs'unda error mesajları arayın

**Log Örnekleri:**

```bash
# n8n'de başarılı upload:
✅ HTTP Request successful: 201 Created

# Supabase'de başarılı upload:
✅ Object created: audio/test_a1_123.mp3
```

---

## 📄 Özet: Tek Bakışta n8n Setup

```
1. Supabase credentials'ları al
   └─ URL, Service Key, Bucket Name

2. n8n'e environment variables ekle
   └─ SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET_NAME

3. Workflow node'larını oluştur
   └─ Webhook → Parse → Download → Upload Audio → Upload VTT → Response

4. Test et
   └─ cURL ile test request gönder

5. Production'a al
   └─ Frontend'i webhook URL'ine bağla
```

**Tamamlandı! 🎉**
