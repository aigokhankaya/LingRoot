# n8n Webhook Hatası Çözümü

## 🚨 Hata

```
Podcast service returned empty response body (HTTP 200). 
Check n8n Respond to Webhook node and use the PRODUCTION webhook URL.
```

## 🔍 Sorun

n8n workflow'unuz HTTP 200 dönüyor ama response body boş.

## ✅ Çözüm

### 1. n8n'de "Respond to Webhook" Node'unu Kontrol Edin

**Mevcut Durum:**
- Response Body: `={{ $json }}`
- Bu format n8n'de çalışmayabilir

**Düzeltme:**

#### Option A: JSON Mode (Önerilen)

```javascript
// Respond to Webhook node settings:
Respond With: Using 'Respond to Webhook' Node
Response Code: 200
Response Body: JSON

// Body içeriği:
{
  "audioUrl": "={{ $json.audioUrl }}",
  "subtitlesUrl": "={{ $json.subtitlesUrl }}",
  "duration": "={{ $json.duration }}",
  "level": "={{ $json.level }}",
  "topic": "={{ $json.topic }}",
  "createdAt": "={{ $json.createdAt }}",
  "costs": "={{ $json.costs }}"
}
```

#### Option B: Expression Mode

```javascript
// Response Body type: Expression
{{ $json }}
```

### 2. Production URL Kullanın

**Test URL (ÇALIŞMAZ):**
```
https://lgpodcast1.app.n8n.cloud/webhook-test/create-podcast
```

**Production URL (KULLANIN):**
```
https://lgpodcast1.app.n8n.cloud/webhook/create-podcast
```

### 3. Workflow'u Aktif Edin

n8n'de:
1. Workflow'u açın
2. Sağ üstte **"Active"** toggle'ını AÇIK yapın
3. Save edin

### 4. Test Edin

```bash
curl -X POST https://lgpodcast1.app.n8n.cloud/webhook/create-podcast \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Test",
    "level": "A1",
    "duration": 2
  }'
```

**Beklenen Response:**
```json
{
  "audioUrl": "https://ffgfcmmbeisoughtac.supabase.co/storage/v1/object/public/audio-outputs/audio/test_a1_123.mp3",
  "subtitlesUrl": "https://ffgfcmmbeisoughtac.supabase.co/storage/v1/object/public/audio-outputs/vtt/test_a1_123.vtt",
  "duration": "31.88",
  "level": "A1",
  "topic": "Test",
  "createdAt": "2025-10-29T19:36:20.598Z",
  "costs": null
}
```

---

## 🔧 n8n Respond to Webhook Node - Tam Konfigürasyon

### Settings Tab

| Setting | Value |
|---------|-------|
| **Respond** | Using 'Respond to Webhook' Node |
| **Response Code** | 200 |
| **Response Headers** | (boş bırakın veya `Content-Type: application/json`) |

### Response Body

**Method 1: JSON Object (Önerilen)**

Response Body Type: `JSON`

```json
{
  "audioUrl": "={{ $json.audioUrl }}",
  "subtitlesUrl": "={{ $json.subtitlesUrl }}",
  "duration": "={{ $json.duration }}",
  "level": "={{ $json.level }}",
  "topic": "={{ $json.topic }}",
  "createdAt": "={{ $json.createdAt }}",
  "costs": "={{ $json.costs }}"
}
```

**Method 2: Expression (Alternatif)**

Response Body Type: `Expression`

```javascript
{{ $json }}
```

**Method 3: String (Son Çare)**

Response Body Type: `String`

```javascript
{{ JSON.stringify($json) }}
```

---

## 🧪 Debug Adımları

### 1. n8n Execution Log Kontrol

n8n'de:
1. Workflow → Executions
2. Son execution'ı açın
3. Her node'un output'unu kontrol edin
4. "Respond to Webhook" node'unun output'unda data var mı?

### 2. Browser Console Kontrol

Frontend'de:
1. F12 → Console
2. Podcast oluştur
3. Network tab → `create-podcast` request
4. Response body'yi kontrol et

### 3. Postman/cURL ile Test

```bash
# Verbose mode ile test
curl -v -X POST https://lgpodcast1.app.n8n.cloud/webhook/create-podcast \
  -H "Content-Type: application/json" \
  -d '{"topic":"Test","level":"A1","duration":2}'
```

**Kontrol:**
- `< HTTP/1.1 200 OK` ✅
- `< Content-Type: application/json` ✅
- Response body boş değil ✅

---

## 📋 Checklist

- [ ] n8n workflow ACTIVE
- [ ] Production webhook URL kullanılıyor (`/webhook/` not `/webhook-test/`)
- [ ] Respond to Webhook node doğru konfigüre edilmiş
- [ ] Response body JSON formatında
- [ ] Test request başarılı (cURL)
- [ ] Frontend'den test başarılı

---

## 🆘 Hala Çalışmıyorsa

### Geçici Çözüm: Mock Response

Frontend'de geçici olarak mock response kullanın:

```typescript
// frontend/src/lib/api.ts
export const createPodcast = async (params: PodcastCreationParams): Promise<PodcastCreationResponse> => {
  // GEÇICI: Mock response
  console.warn('🚧 Using MOCK podcast response');
  return {
    success: true,
    status: 'success',
    message: 'Mock podcast created',
    podcast_url: 'https://ffgfcmmbeisoughtac.supabase.co/storage/v1/object/public/audio-outputs/audio/default.mp3',
    audio_url: 'https://ffgfcmmbeisoughtac.supabase.co/storage/v1/object/public/audio-outputs/audio/default.mp3',
    vtt_subtitles: 'https://ffgfcmmbeisoughtac.supabase.co/storage/v1/object/public/audio-outputs/vtt/default.vtt',
    duration_seconds: '31.88',
    file_name: 'mock_podcast.mp3'
  };
};
```

---

## 📞 n8n Support

Sorun devam ederse:
1. n8n Community: https://community.n8n.io
2. n8n Docs: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/

**Hazır! 🚀**
