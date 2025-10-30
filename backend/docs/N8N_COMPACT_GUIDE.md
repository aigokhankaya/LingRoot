# n8n Supabase Upload - Kompakt Rehber

## 🔑 Environment Variables
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...  (service_role key)
SUPABASE_BUCKET_NAME=lingroot-audio
```

## 📋 Workflow Nodes

### 1. Webhook Trigger
- Method: POST
- Path: `create-podcast`
- Response: Wait for workflow

### 2. Function: Parse Input
```javascript
const input = $input.item.json;
const topic = (input.topic || 'podcast').toLowerCase().replace(/[^a-z0-9]+/g, '_');
const timestamp = Date.now();
const audioFile = `${topic}_${input.level || 'a1'}_${timestamp}.mp3`;
const vttFile = `${topic}_${input.level || 'a1'}_${timestamp}.vtt`;

// Google Drive URL → Download URL
let dlUrl = input.audio_url;
if (dlUrl.includes('drive.google.com')) {
  const fileId = dlUrl.match(/\/d\/([^\/]+)/)?.[1];
  if (fileId) dlUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
}

return {
  json: {
    topic: input.topic,
    level: input.level,
    audio_url: dlUrl,
    audio_file: audioFile,
    vtt_file: vttFile,
    vtt_content: input.subtitles?.vtt || '',
    srt_content: input.subtitles?.srt || '',
    duration: input.duration_seconds,
    audio_path: `audio/${audioFile}`,
    vtt_path: `audio/${vttFile}`
  }
};
```

### 3. HTTP Request: Download Audio
- Method: GET
- URL: `={{ $json.audio_url }}`
- Response Format: File
- Binary Property: `audio_data`
- Timeout: 60000

### 4. HTTP Request: Upload Audio
- Method: POST
- URL: `={{ $env.SUPABASE_URL }}/storage/v1/object/{{ $env.SUPABASE_BUCKET_NAME }}/{{ $json.audio_path }}`
- Headers:
```json
{
  "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_KEY }}",
  "Content-Type": "audio/mpeg",
  "Cache-Control": "3600"
}
```
- Body: Binary → `audio_data`
- Options: Upsert ✅

### 5. Function: Prepare VTT
```javascript
const vtt = $input.first().json.vtt_content;
const vttFile = $input.first().json.vtt_file;
const vttPath = $input.first().json.vtt_path;
const buffer = Buffer.from(vtt, 'utf-8');

return {
  json: { vtt_file: vttFile, vtt_path: vttPath },
  binary: {
    vtt_data: {
      data: buffer.toString('base64'),
      mimeType: 'text/vtt',
      fileName: vttFile
    }
  }
};
```

### 6. HTTP Request: Upload VTT
- Method: POST
- URL: `={{ $env.SUPABASE_URL }}/storage/v1/object/{{ $env.SUPABASE_BUCKET_NAME }}/{{ $json.vtt_path }}`
- Headers:
```json
{
  "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_KEY }}",
  "Content-Type": "text/vtt",
  "Cache-Control": "3600"
}
```
- Body: Binary → `vtt_data`
- Options: Upsert ✅

### 7. Function: Format Response
```javascript
const url = $env.SUPABASE_URL;
const bucket = $env.SUPABASE_BUCKET_NAME;
const meta = $('Parse Input').item.json;
const audioPath = meta.audio_path;
const vttPath = meta.vtt_path;
const audioUrl = `${url}/storage/v1/object/public/${bucket}/${audioPath}`;
const vttUrl = `${url}/storage/v1/object/public/${bucket}/${vttPath}`;

return {
  json: {
    status: "success",
    message: "Podcast uploaded successfully",
    data: {
      audio: {
        public_url: audioUrl,
        file_name: meta.audio_file,
        duration_seconds: meta.duration,
        storage_path: audioPath
      },
      subtitles: {
        vtt_url: vttUrl,
        srt: meta.srt_content,
        vtt: meta.vtt_content,
        storage_path: vttPath
      },
      metadata: {
        topic: meta.topic,
        level: meta.level,
        created_at: new Date().toISOString()
      }
    }
  }
};
```

### 8. Respond to Webhook
- Response Code: 200
- Body: `={{ $json }}`

## 🧪 Test
```bash
curl -X POST https://lgpodcast1.app.n8n.cloud/webhook/create-podcast \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Test",
    "level": "A1",
    "audio_url": "https://drive.google.com/file/d/FILE_ID/view",
    "subtitles": {"vtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:05.000\nTest"},
    "duration_seconds": 5
  }'
```

## ⚠️ Önemli
- Bucket "lingroot-audio" adıyla oluşturun
- Bucket'ı PUBLIC yapın
- service_role key kullanın (anon değil)
- Environment variables'ı n8n'de tanımlayın

## ✅ Checklist
- [ ] Supabase credentials alındı
- [ ] n8n env variables tanımlandı
- [ ] Bucket public yapıldı
- [ ] 8 node eklendi
- [ ] Test başarılı
