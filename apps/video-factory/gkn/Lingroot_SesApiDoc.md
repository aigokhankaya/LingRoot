# LingRoot Core ↔ Video Factory — Entegrasyon Dokümanı

> **Created:** 2026-06-27 | **Updated:** 2026-06-27 | **Version:** 1.0
> **Muhatap:** Video Factory ekibi · **Sahip:** LingRoot Core/Backend
> Bu tek doküman, Video Factory'nin LingRoot Core ile entegre olması için gereken
> her şeyi içerir: kontrat, auth, davranış, hatalar, test ve bağlantı ayarları.

---

## 0. Sınır (kim neyi yapar)

| Sorumluluk | Sahip |
|---|---|
| Seviye-bazlı **script + seslendirme (TTS) + SRT altyazı** | **LingRoot Core** |
| Görsel üretimi, render (JSON2Video), YouTube/sosyal yayın | **Video Factory** |

LingRoot Core, tek bir CEFR seviyesi için **scene-aware** ses paketi döndüren bir
internal endpoint sağlar. Video Factory bunu konu başına 6 kez (her seviye için bir
kez) çağırır, ortak görsellerle birleştirip videoyu üretir.

---

## 1. Endpoint & Auth

```
POST /internal/video-level-package
Authorization: Bearer <LINGROOT_CORE_API_KEY>
Content-Type: application/json
Accept: application/json
```

- `/api` altında **değil** — kök `/internal` altında servis edilir.
- Anahtar sunucuda `.env`'den okunur, **hiçbir log/hata mesajında geçmez**, sabit-zamanlı karşılaştırılır.
- Hatalı/eksik anahtar → `401 {"error":"Unauthorized."}`.
- Sunucuda anahtar tanımlı değilse → `500`.

---

## 2. İstek Kontratı (Request)

Sözleşme v1. Tüm alanlar **zorunlu**.

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

| Alan | Tip | Kural |
|---|---|---|
| `schema_version` | const | Sabit `1`. |
| `topic_id` | string | Konu slug'ı; yanıtta birebir geri döner. |
| `topic` | string | İnsan-okur başlık. |
| `core_message` | string | Ana fikir; tüm seviyeler bunu anlatır. |
| `target_level` | enum | `A1\|A2\|B1\|B2\|C1\|C2`. Tek seviye. |
| `target_duration_seconds` | number | 10–180. Hedef süre (bkz. §5 süre notu). |
| `language` | string | Örn. `en` (≥2 karakter). |
| `voice_profile` | string | Bkz. §6 ses profili tablosu. |
| `subtitle_format` | const | Sabit `srt`. |
| `content_style` | const | Sabit `short_listening_video`. |
| `brand` | const | Sabit `LingRoot`. |
| `scene_ids` | string[] | **Sıralı, benzersiz**, en az 1. |

---

## 3. Yanıt Kontratı (Response)

HTTP 200. Yanıt **birebir** şu alanları içerir — **fazladan alan yoktur**
(`additionalProperties:false` ile reddedilir).

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
  "audio_url": "https://<public-host>/audio/vf_<id>.mp3",
  "subtitle_url": "https://<public-host>/audio/vf_<id>.srt",
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

| Alan | Tip | Garanti |
|---|---|---|
| `schema_version` | const | `1`. |
| `topic_id` | string | İstekteki ile **birebir aynı**. |
| `level` | enum | İstekteki `target_level` ile **birebir aynı**. |
| `voiceover_script` | string | Tam seslendirme metni (düz). |
| `script_lines` | array | `scene_id`+`text`. **scene_ids ile aynı sıra.** |
| `audio_url` | uri | TTS ses dosyası, public URL (§5). |
| `subtitle_url` | uri | SRT altyazı, public URL (§5). |
| `subtitle_lines` | array | `scene_id`,`start`,`end`,`text`. Her sahneyi kapsar; `end>start`; `end ≤ duration`. |
| `duration_seconds` | number | Üretilen sesin **gerçek süresi** (ffprobe). |
| `voice_profile` | string | Kullanılan profil. |
| `speaking_rate` | number | Seviyeye göre değişir (A1≠C2). |

---

## 4. En kritik kısıt: scene-aware çıktı

Tüm seviyeler **aynı görsel sahne listesini** paylaşır. Bu yüzden:

- `script_lines` sahne kimlikleri = istekteki `scene_ids` (**aynı sıra, birebir**).
- `subtitle_lines` **her sahneyi en az bir cue ile kapsar**; her cue bir `scene_id`'ye bağlıdır.
- Bölme/eşleme kararını **Core verir**; düz paragraf gönderilmez.

Core bunu garanti eder; Video Factory yanıtta zorunlu olarak doğrular ve uymayan
yanıtı reddeder.

---

## 5. Ses & altyazı dosyaları (erişilebilirlik — KRİTİK)

**Format:** MP3, ≥128 kbps, 44.1/48 kHz, mono yeterli. Süre `duration_seconds` ile tutarlı.

**Erişilebilirlik:** `audio_url` ve `subtitle_url`, **render servisi (JSON2Video)
tarafından doğrudan HTTP GET ile indirilebilir** public URL'lerdir. Kalıcıdır,
one-shot değildir, çoklu GET edilebilir. Localhost/internal adresler döndürülmez.

> ⚠️ **Entegrasyon öncesi doğrula:** Core, dosyaları Cloudflare R2'ye yükler ve
> `R2_PUBLIC_BASE_URL` tabanlı URL döndürür. Render bağlamadan önce, dönen
> `audio_url`'in bulduğunuz ortamdan `curl -I` ile **HTTP 200** verdiğini doğrulayın.
> (LingRoot tarafı bu domain'in DNS'te çözülür ve public olmasından sorumludur.)

**Süre hedefleme:** `duration_seconds` daima gerçek ses süresidir. Düşük seviyeler
(A1/A2) doğası gereği yavaş/kısa olduğundan az sahnede hedefin altında kalabilir;
**daha uzun süre için daha fazla `scene_ids` gönderin**. İçerik uzunluğu sahne
sayısıyla ölçeklenir.

---

## 6. Ses profilleri & seviye hızları

| `voice_profile` | Google voice | languageCode |
|---|---|---|
| `english_female` (default) | en-US-Neural2-F | en-US |
| `english_male` | en-US-Neural2-D | en-US |
| `british_female` | en-GB-Neural2-A | en-GB |
| `british_male` | en-GB-Neural2-B | en-GB |

Bilinmeyen profil → `english_female`'e düşer.

| Seviye | Hedef WPM | speaking_rate |
|---|---|---|
| A1 | 90 | 0.80 |
| A2 | 100 | 0.88 |
| B1 | 115 | 0.95 |
| B2 | 130 | 1.02 |
| C1 | 145 | 1.08 |
| C2 | 160 | 1.15 |

---

## 7. Davranışsal garantiler

- **Auth:** Bearer key; anahtar loglanmaz.
- **topic/level eşleşmesi:** yanıt `topic_id` ve `level` istekle birebir aynı.
- **Sahne sırası:** `script_lines` = `scene_ids` (aynı sıra).
- **Altyazı:** her sahne kapsanır; `end>start`; cue `duration_seconds`'ı aşmaz (≈+0.25s tolerans).
- **Şema:** `additionalProperties:false` — fazladan alan yok.
- **Latency:** seviye başına ~3–6 sn. 30 sn senkron timeout yeterli; **async gerekmez**.
- **Idempotency:** retry güvenli, tutarlı sonuç.

### Hata kodları

| Durum | HTTP | VF retry? |
|---|---|---|
| Geçersiz istek (şema/alan) | 400 | Hayır |
| Auth hatası | 401 | Hayır |
| OpenAI yapılandırılmamış | 503 | Evet |
| Script/TTS/upload hatası | 502 | Evet |
| Merge/beklenmeyen hata | 500 | Evet |

VF retryable kümesi: `408, 425, 429, 500, 502, 503, 504` (exponential backoff, 3 deneme).

---

## 8. §9 Açık soruların cevapları

1. **Mevcut durum:** (a) CEFR metni ✓, (b) altyazı/timing ✓, (c) TTS ses ✓ — üçü de hazır, endpoint kuruldu.
2. **TTS:** Google Cloud TTS (Neural2). Profiller §6. İngilizce dışı dil şu an kapsamda değil.
3. **Barındırma:** Cloudflare R2, public URL (signed değil, kalıcı). Domain çözülürlüğü §5.
4. **Süre:** metin hedefe göre üretilir; `duration_seconds` gerçek süredir. Düşük seviyeler kısa kalabilir → daha çok sahne (§5).
5. **Sahne bölme:** Evet, Core üstlenir (§4).
6. **Latency:** ~3–6 sn/seviye; 30 sn senkron yeterli.
7. **Auth/ortam:** Bearer key (§10). URL Cloudflare Tunnel üzerinden.
8. **Versiyonlama:** `schema_version: 1`; kırıcı değişiklik → versiyon artışı.

---

## 9. Kabul kriteri durumu (local e2e ile doğrulandı)

```
[x] POST /internal/video-level-package, Bearer auth ile çalışıyor
[x] Tek CEFR seviyesi için tam yanıt
[x] script_lines, scene_ids ile aynı sırada
[x] subtitle_lines her sahneyi kapsıyor, timing geçerli, süreyi aşmıyor
[x] duration_seconds gerçek ses süresiyle tutarlı (ffprobe)
[x] speaking_rate ve metin seviyeye göre farklılaşıyor (A1≠C2)
[x] 6 seviyenin 6'sı da geçerli paket döndürüyor
[~] audio_url render bulutundan indirilebiliyor — obje public; dönen domain'in
    canlı ortamda çözülürlüğü §5'e göre doğrulanmalı
```

Doğrulanmış örnek farklılaşma (4 sahne): A1 → 17 kelime / 0.80 rate; C2 → 70 kelime / 1.15 rate.

---

## 10. Bağlantı ayarları (Video Factory `.env`)

```
LINGROOT_CORE_PROVIDER=http
LINGROOT_CORE_API_URL=https://api.lingroot.com         # Core backend kök adresi (Cloudflare Tunnel)
LINGROOT_CORE_API_KEY=<güvenli kanaldan iletilir>       # repoya yazılmaz
LINGROOT_CORE_LEVEL_ENDPOINT=/internal/video-level-package
LINGROOT_CORE_TIMEOUT_MS=30000
LINGROOT_CORE_MAX_ATTEMPTS=3
LINGROOT_CORE_VOICE_PROFILE=english_female
```

İstek tam olarak şuraya gider: `https://api.lingroot.com/internal/video-level-package`

> **API anahtarı** güvenli bir kanaldan (parola yöneticisi vb.) ayrıca paylaşılır;
> bu dokümana veya repoya yazılmaz.

---

## 11. Test

```bash
# 1) Yol/auth erişilebilir mi (auth'suz → 401 beklenir):
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://api.lingroot.com/internal/video-level-package

# 2) Uçtan uca (gerçek paket):
KEY="<LINGROOT_CORE_API_KEY>"
curl -s -X POST https://api.lingroot.com/internal/video-level-package \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"schema_version":1,"topic_id":"test","topic":"Test","core_message":"Smoke test.","target_level":"A1","target_duration_seconds":30,"language":"en","voice_profile":"english_female","subtitle_format":"srt","content_style":"short_listening_video","brand":"LingRoot","scene_ids":["scene-1","scene-2"]}'

# 3) Dönen audio_url indirilebilir mi:
curl -sI "<audio_url>" -w "%{http_code} %{content_type}\n" -o /dev/null   # 200 audio/mpeg

# 4) Video Factory'nin kendi client'ı ile kontrat kontrolü:
npm run core:check -- --topic "Why do people forget new words?" --levels A1 --scenes 2 --duration 30
```

`core:check` "LingRoot Core contract check passed." yazarsa entegrasyon hazırdır;
ardından 6 seviyeli tam üretime geçilebilir.

---

## 12. Ek — LingRoot tarafı deploy / go-live (dahili)

> Bu bölüm **LingRoot ekibi içindir**; Video Factory'nin yapacağı bir şey değildir.
> Tek dokümanda tutmak için buraya eklenmiştir. Sıra önemlidir.

1. **Deploy:** Endpoint `main`'e merge edildi (PR #262). Render `lingroot-backend`
   servisinin yeni `main`'i deploy ettiğini doğrula.
2. **Prod env (Render dashboard):**
   - `VIDEO_FACTORY_API_KEY` = `<güçlü key>` — set edilmezse endpoint `500` döner;
     Video Factory tarafıyla **aynı** olmalı.
   - `OPENAI_VIDEO_FACTORY_MODEL` = `gpt-4o` (opsiyonel; kodda default `gpt-4o`).
   - (`render.yaml`'a anahtarlar `sync:false` ile eklendi; gerçek değer dashboard'dan girilir.)
   - `OPENAI_API_KEY` ve Google TTS credential'ları prod'da zaten mevcut.
3. **Erişilebilirlik (kritik):** Prod `R2_PUBLIC_BASE_URL`'in DNS'te çözülen, public
   bir adres olduğunu doğrula. Çözülmüyorsa custom domain'i Cloudflare R2 bucket'ına
   bağla ya da base URL'i çalışan public adrese çevir. (§5'teki render-erişilebilirliği
   bu adımla sağlanır.)
4. **Host/tunnel:** `https://api.lingroot.com/internal/...` çözülüyor ve backend'e
   iletiliyor mu — auth'suz POST → `401` (deploy + yol erişimi kanıtı):
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X POST \
     https://api.lingroot.com/internal/video-level-package
   ```

### İlgili LingRoot kaynak dosyaları
- Route: `backend/routes/internalRoutes.js` · Controller: `backend/controllers/videoLevelPackageController.js`
- Service: `backend/services/videoLevelPackageService.js` · Auth: `backend/middleware/internalApiAuth.js`
- Rubric/voice: `backend/constants/cefrLevelRules.js` · Prompt: `backend/prompts/video-scene-script.txt`
- Mount: `backend/server.js` (`app.use('/internal', ...)`) · Env: `VIDEO_FACTORY_API_KEY`, `OPENAI_VIDEO_FACTORY_MODEL`

---

## 13. Kontrat referansları (Video Factory repo'su)

- İstek şeması: `schemas/lingroot-core-request.schema.json`
- Yanıt şeması: `schemas/lingroot-core-response.schema.json`
- HTTP client + doğrulama: `src/adapters/http-lingroot-core-client.ts`
- Seviye rubric'i: `config/level-rules.json`
