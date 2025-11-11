# n8n Supabase Upload - Hızlı Başlangıç

## 🚀 5 Dakikada Kurulum

### 1. Supabase Credentials

Supabase Dashboard'dan alın:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...  # service_role key (Settings → API)
SUPABASE_BUCKET_NAME=lingroot-audio
```

### 2. n8n Environment Variables

n8n'de tanımlayın:
- Settings → Variables → Add New
- Yukarıdaki 3 değişkeni ekleyin

### 3. Supabase Bucket Ayarları

```bash
1. Storage → Create Bucket → "lingroot-audio"
2. Bucket → Settings → Make Public ✅
3. File size limit: 50 MB
```

### 4. Test Request

```bash
curl -X POST https://lgpodcast1.app.n8n.cloud/webhook/create-podcast \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Test",
    "level": "A1",
    "audio_url": "https://drive.google.com/file/d/FILE_ID/view",
    "subtitles": {
      "vtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:05.000\nTest"
    },
    "duration_seconds": 5
  }'
```

---

## 📁 Dosya Yolları

### Supabase Storage

```
lingroot-audio/
└── audio/
    ├── topic_a1_123456.mp3   → Ses dosyası
    └── topic_a1_123456.vtt   → Altyazı
```

### Public URL Format

```
https://xxxxx.supabase.co/storage/v1/object/public/lingroot-audio/audio/dosya.mp3
```

---

## 🔑 Kullanılan Şifreler

| Ne | Nereden | Ne İçin |
|----|---------|---------|
| **service_role key** | Supabase → Settings → API | Storage'a upload yetkisi |
| **Project URL** | Supabase → Settings → API | API endpoint |
| **Bucket Name** | Supabase → Storage | Dosya klasörü |

⚠️ **DİKKAT:** `service_role` key kullanın, `anon` key ÇALIŞMAZ!

---

## 🛠️ n8n Node'lar (Minimal)

```
1. Webhook Trigger
   → POST: create-podcast

2. Function: Parse Input
   → Dosya adları oluştur

3. HTTP Request: Download Audio
   → GET audio_url

4. HTTP Request: Upload to Supabase
   → POST {{ SUPABASE_URL }}/storage/v1/object/{{ BUCKET }}/audio/{{ filename }}
   → Header: Authorization: Bearer {{ SERVICE_KEY }}
   → Body: Binary audio data

5. Respond to Webhook
   → Return public URL
```

---

## ✅ Test Checklist

- [ ] Service key doğru (403 hatası alınmıyor)
- [ ] Bucket public (404 hatası alınmıyor)
- [ ] Environment variables tanımlı
- [ ] Upload başarılı (201 response)
- [ ] Public URL browser'da açılıyor

---

## 🆘 Hata Çözümleri

| Hata | Çözüm |
|------|-------|
| **403 Forbidden** | Service role key kontrol et |
| **404 Not Found** | Bucket adı doğru mu? |
| **413 Too Large** | File size limit artır |
| **Timeout** | HTTP timeout değerini artır (60s+) |

---

## 📞 Detaylı Doküman

Tam döküman: `N8N_SUPABASE_DIRECT_UPLOAD.md`

**Hazır! 🎉**
