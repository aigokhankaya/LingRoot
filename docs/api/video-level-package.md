# Video Factory — Seviye Paketi API'si

> **Created:** 2026-06-22 | **Updated:** 2026-06-22 | **Version:** 1.0

LingRoot Core'un `lingroot-video-factory` servisi için sağladığı internal endpoint.
Tek bir CEFR seviyesi için **scene-aware script + seslendirme (TTS) + SRT altyazı**
üretir ve erişilebilir (public) URL'ler döndürür.

## Endpoint

```
POST /internal/video-level-package
```

> `/api` altında **değil**. Cloudflare Tunnel → Backend zinciri üzerinden erişilir
> (deployment kuralı 12). Video Factory tarafında `LINGROOT_CORE_API_URL` = backend
> kök adresi, endpoint default `/internal/video-level-package`.

## Kimlik Doğrulama

```
Authorization: Bearer <VIDEO_FACTORY_API_KEY>
```

- Anahtar `.env` içindeki `VIDEO_FACTORY_API_KEY`'den okunur (kodda asla yer almaz).
- Karşılaştırma sabit-zamanlı (`crypto.timingSafeEqual`); anahtar hiçbir log/hata
  mesajında geçmez.
- Hatalı/eksik anahtar → `401 { "error": "Unauthorized." }`.
- Sunucuda anahtar tanımlı değilse → `500`.

## İstek (Request)

Sözleşme v1 (`schemas/lingroot-core-request.schema.json`). Tüm alanlar zorunlu:

```json
{
  "schema_version": 1,
  "topic_id": "why-do-people-forget-new-words",
  "topic": "Why do people forget new words?",
  "core_message": "People forget new words because memory needs repetition, retrieval and meaningful context.",
  "target_level": "A1",
  "target_duration_seconds": 45,
  "language": "en",
  "voice_profile": "english_female",
  "subtitle_format": "srt",
  "content_style": "short_listening_video",
  "brand": "LingRoot",
  "scene_ids": ["scene-1", "scene-2", "scene-3"]
}
```

Doğrulama: `target_level` ∈ A1..C2; `target_duration_seconds` ∈ [10,180];
`scene_ids` sıralı, benzersiz, en az 1 öğe; sabit alanlar (`schema_version`,
`subtitle_format`, `content_style`, `brand`) birebir eşleşmeli.

## Yanıt (Response)

HTTP 200, sözleşme v1 (`schemas/lingroot-core-response.schema.json`).
Yanıt **birebir** bu alanları içerir — fazladan alan yok (VF tarafı
`additionalProperties: false` ile reddeder):

```json
{
  "schema_version": 1,
  "topic_id": "why-do-people-forget-new-words",
  "level": "A1",
  "voiceover_script": "We learn new words. Then we forget them. This is normal.",
  "script_lines": [
    { "scene_id": "scene-1", "text": "We learn new words." },
    { "scene_id": "scene-2", "text": "Then we forget them." },
    { "scene_id": "scene-3", "text": "This is normal." }
  ],
  "audio_url": "https://<r2-public-host>/audio/vf_<id>.mp3",
  "subtitle_url": "https://<r2-public-host>/audio/vf_<id>.srt",
  "subtitle_lines": [
    { "scene_id": "scene-1", "start": 0.0, "end": 2.1, "text": "We learn new words." },
    { "scene_id": "scene-2", "start": 2.1, "end": 4.4, "text": "Then we forget them." },
    { "scene_id": "scene-3", "start": 4.4, "end": 6.0, "text": "This is normal." }
  ],
  "duration_seconds": 6.0,
  "voice_profile": "english_female",
  "speaking_rate": 0.80
}
```

Garantiler:
- `script_lines` sahne sırası = istekteki `scene_ids` (birebir, aynı sıra).
- `subtitle_lines` her sahneyi kapsar; `end > start`; son cue `duration_seconds`'ta biter.
- `duration_seconds` = birleştirilmiş MP3'ün **ffprobe ile ölçülen gerçek süresi**.
- `speaking_rate` ve metin seviyeye göre gerçekten farklılaşır (A1 ≠ C2).

## İç Akış

1. **Scene-aware script** — tek OpenAI çağrısı (`prompts/video-scene-script.txt`,
   JSON çıktı, model `OPENAI_VIDEO_FACTORY_MODEL`, default `gpt-4o`). Sahne sayısı
   kadar satır, seviye rubric'i + WPM bütçesine göre.
2. **Per-scene TTS** — her sahne ayrı ayrı Google TTS ile seslendirilir
   (rule 3 uyumlu). Her segmentin gerçek süresi ffprobe ile ölçülür.
3. **Merge** — segmentler tek MP3'e birleştirilir (`mergeAudioSegmentsToBuffer`),
   gerçek toplam süre ölçülür.
4. **Altyazı** — sahne cue'ları kümülatif segment sürelerinden üretilir ve gerçek
   süreye ölçeklenir (cue.end ≤ duration). SRT olarak yazılır.
5. **Upload** — MP3 + SRT, `FILE_STORAGE_PROVIDER` (prod: `cloudflare` R2) üzerinden
   public URL olarak yüklenir. Kalıcı ve çoklu GET'e uygun.

## Ses Profili Eşleme

| voice_profile | Google voice | languageCode |
|---|---|---|
| `english_female` (default) | en-US-Neural2-F | en-US |
| `english_male` | en-US-Neural2-D | en-US |
| `british_female` | en-GB-Neural2-A | en-GB |
| `british_male` | en-GB-Neural2-B | en-GB |

Bilinmeyen profil → `english_female`'e düşer.

## Seviyeye Göre Konuşma Hızı

| Seviye | WPM (hedef) | Google speakingRate |
|---|---|---|
| A1 | 90 | 0.80 |
| A2 | 100 | 0.88 |
| B1 | 115 | 0.95 |
| B2 | 130 | 1.02 |
| C1 | 145 | 1.08 |
| C2 | 160 | 1.15 |

## Hata Kodları

| Durum | HTTP | Retry (VF) |
|---|---|---|
| Geçersiz istek (şema/alan) | 400 | Hayır |
| Auth hatası | 401 | Hayır |
| OpenAI yapılandırılmamış | 503 | Evet |
| Script üretimi / TTS / upload hatası | 502 | Evet |
| Merge / beklenmeyen hata | 500 | Evet (502/503/504 retry edilir; 500 retry edilir) |

VF retryable kümesi: `408, 425, 429, 500, 502, 503, 504` (exponential backoff, 3 deneme).

## İlgili Dosyalar (Core)

- Route: `backend/routes/internalRoutes.js`
- Controller: `backend/controllers/videoLevelPackageController.js`
- Service: `backend/services/videoLevelPackageService.js`
- Auth: `backend/middleware/internalApiAuth.js`
- Sabitler/rubric: `backend/constants/cefrLevelRules.js`
- Prompt: `backend/prompts/video-scene-script.txt`
- Mount: `backend/server.js` (`app.use('/internal', ...)`)
- Env: `VIDEO_FACTORY_API_KEY`, `OPENAI_VIDEO_FACTORY_MODEL` (opsiyonel)
