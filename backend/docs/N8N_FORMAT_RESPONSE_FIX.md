# n8n Format Response Node Düzeltmesi

## 🚨 Sorun

Response'da:
- `topic: "Unknown"` döndürülüyor
- `level: "A2"` döndürülüyor (request A1 idi)
- Eski/cached ses oynatılıyor

## ✅ Çözüm

n8n'de **"Ses Bilgilerini Ekle" (Format Response)** node'unu güncelleyin.

### Mevcut Kod (Yanlış):

```javascript
{
  "audioUrl": "{{ $json.audioUrl }}",
  "subtitlesUrl": "{{ $json.subtitlesUrl }}",
  "duration": "{{ $json.duration }}",
  "level": "A2",           // ❌ Hardcoded
  "topic": "Unknown",      // ❌ Hardcoded
  "createdAt": "{{ $json.createdAt }}",
  "costs": null
}
```

### Düzeltilmiş Kod (Doğru):

```javascript
{
  "audioUrl": "={{ $json.audioUrl }}",
  "subtitlesUrl": "={{ $json.subtitlesUrl }}",
  "duration": "={{ $json.duration }}",
  "level": "={{ $('Webhook Trigger').item.json.body.level }}",           // ✅ Webhook'tan al
  "topic": "={{ $('Webhook Trigger').item.json.body.topic }}",           // ✅ Webhook'tan al
  "createdAt": "={{ $now.toISO() }}",                                     // ✅ Şimdiki zaman
  "costs": "={{ $json.costs || null }}"
}
```

---

## 📋 n8n'de Adım Adım Düzeltme

### 1. "Format Response" Node'unu Açın

n8n workflow'unda → **"Ses Bilgilerini Ekle"** node'una tıklayın

### 2. Response Body'yi Güncelleyin

**Method 1: JSON Object (Önerilen)**

Response Body Type: `JSON`

```json
{
  "audioUrl": "={{ $json.audioUrl }}",
  "subtitlesUrl": "={{ $json.subtitlesUrl }}",
  "duration": "={{ $json.duration }}",
  "level": "={{ $('Webhook Trigger').item.json.body.level }}",
  "topic": "={{ $('Webhook Trigger').item.json.body.topic }}",
  "createdAt": "={{ $now.toISO() }}",
  "costs": "={{ $json.costs || null }}"
}
```

**Method 2: Expression (Alternatif)**

Response Body Type: `Expression`

```javascript
{
  audioUrl: $json.audioUrl,
  subtitlesUrl: $json.subtitlesUrl,
  duration: $json.duration,
  level: $('Webhook Trigger').item.json.body.level,
  topic: $('Webhook Trigger').item.json.body.topic,
  createdAt: $now.toISO(),
  costs: $json.costs || null
}
```

### 3. Test Edin

```bash
curl -X POST "https://lgpodcast1.app.n8n.cloud/webhook/create-podcast" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mK8vXp2Rq9Yw3Tz5Hn7Js4" \
  -d '{
    "topic": "Beşiktaş futbol takımı tarihi",
    "level": "A1",
    "duration": 3
  }'
```

**Beklenen Response:**
```json
{
  "audioUrl": "https://...supabase.co/storage/.../audio/besiktas_a1_123.mp3",
  "subtitlesUrl": "https://...supabase.co/storage/.../vtt/besiktas_a1_123.vtt",
  "duration": "52.15",
  "level": "A1",              // ✅ Doğru
  "topic": "Beşiktaş futbol takımı tarihi",  // ✅ Doğru
  "createdAt": "2025-10-29T20:10:00.000Z",
  "costs": null
}
```

---

## 🔍 Webhook Data Path

n8n'de webhook'tan gelen data şu path'te:

```javascript
// Webhook Trigger node'undan veriyi almak için:
$('Webhook Trigger').item.json.body.topic      // "Beşiktaş futbol takımı tarihi"
$('Webhook Trigger').item.json.body.level      // "A1"
$('Webhook Trigger').item.json.body.duration   // 3
```

---

## 🧪 Debug: Webhook Data'yı Görmek

Format Response node'unda geçici olarak:

```javascript
{
  "debug_webhook_body": "={{ JSON.stringify($('Webhook Trigger').item.json.body) }}",
  "audioUrl": "={{ $json.audioUrl }}",
  ...
}
```

Bu şekilde webhook'tan gelen tüm body'yi görebilirsiniz.

---

## ⚠️ Dikkat: Node İsimleri

n8n'de node ismi farklıysa, güncelle:

```javascript
// Eğer webhook node'unuzun adı farklıysa:
$('Webhook Trigger').item.json.body.topic    // ✅ Default name
$('Webhook').item.json.body.topic           // ⚠️ Eğer "Webhook" olarak adlandırıldıysa
```

Node ismini kontrol edin: n8n'de node'a tıklayın → üstte isim görünür.

---

## 📝 Checklist

- [ ] Format Response node'u açıldı
- [ ] Response body güncellendi
- [ ] `topic` webhook'tan alınıyor
- [ ] `level` webhook'tan alınıyor
- [ ] `createdAt` dinamik
- [ ] Workflow save edildi
- [ ] Test request başarılı
- [ ] Frontend'de doğru topic görünüyor

**Hazır! 🎉**
