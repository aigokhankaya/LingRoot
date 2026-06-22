# Video Factory API — Canlıya Alma Runbook'u

> **Created:** 2026-06-22 | **Updated:** 2026-06-22 | **Version:** 1.0
> İlgili: [video-level-package.md](../api/video-level-package.md) · [video-factory-handoff.md](../api/video-factory-handoff.md)

`POST /internal/video-level-package` endpoint'ini production'da çalışır hale
getirmek için adım adım kontrol listesi. Sıra önemlidir.

---

## 1. Kod deploy (zorunlu)

- [ ] PR #262 (`feat/video-factory-level-package-api`) `main`'e merge edildi.
- [ ] Render `lingroot-backend` servisi yeni `main`'i deploy etti.
- [ ] Deploy logunda hata yok; `🚀 LingRoot Backend server running` görülüyor.

## 2. Production env değişkenleri (zorunlu)

Render dashboard → `lingroot-backend` → Environment. Eklenecekler:

| Key | Değer | Not |
|---|---|---|
| `VIDEO_FACTORY_API_KEY` | `<güçlü key>` | Set edilmezse endpoint bilinçli `500` döner. VF tarafıyla **aynı** olmalı. |
| `OPENAI_VIDEO_FACTORY_MODEL` | `gpt-4o` | Opsiyonel; kodda default zaten `gpt-4o`. |

> `render.yaml`'a anahtarlar `sync: false` ile eklendi; gerçek değer dashboard'dan girilir.
> `OPENAI_API_KEY` ve Google TTS credential'ları prod'da zaten mevcut (ana app kullanıyor).

## 3. Storage public URL doğrulaması (KRİTİK)

Endpoint, üretilen MP3/SRT için `R2_PUBLIC_BASE_URL` tabanlı URL döndürür. Bu URL,
render bulutu (JSON2Video) tarafından **doğrudan HTTP GET ile indirilebilir** olmalı.

- [ ] Production `R2_PUBLIC_BASE_URL` değerini kontrol et.
- [ ] O domain'in **DNS'te çözüldüğünü ve public erişilebilir** olduğunu doğrula:
  ```bash
  # endpoint'in döndürdüğü gerçek bir audio_url ile:
  curl -sI "<audio_url>" -w "%{http_code} %{content_type}\n" -o /dev/null
  # beklenen: 200 audio/mpeg
  ```

> ⚠️ Local test ortamında `R2_PUBLIC_BASE_URL=https://cdn.booklevel.store` değeri
> **NXDOMAIN** (çözülmüyor); aynı obje `https://pub-bc575ee286bd4f4aa8b853e888a6b089.r2.dev`
> üzerinden 200 dönüyor. Local `.env` "placeholder/testing" olduğu için prod değeri
> farklı olabilir — **prod değerini mutlaka doğrula.** Çözülmüyorsa: ya custom domain'i
> Cloudflare R2 bucket'ına bağla, ya da `R2_PUBLIC_BASE_URL`'i çalışan public adrese çevir.

## 4. Tunnel / yol erişimi doğrulaması

Endpoint `/api` altında değil, kök `/internal` altında. Cloudflare Tunnel'ın bu yolu
backend'e ilettiğini doğrula:

```bash
# auth olmadan 401 dönmeli (yol erişilebilir demektir; 404 ise tunnel/yol sorunu):
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://api.lingroot.com/internal/video-level-package
# beklenen: 401
```

## 5. Uçtan uca canlı test

```bash
KEY="<VIDEO_FACTORY_API_KEY>"
curl -s -X POST https://api.lingroot.com/internal/video-level-package \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"schema_version":1,"topic_id":"go-live-test","topic":"Go live test","core_message":"This is a production smoke test.","target_level":"A1","target_duration_seconds":30,"language":"en","voice_profile":"english_female","subtitle_format":"srt","content_style":"short_listening_video","brand":"LingRoot","scene_ids":["scene-1","scene-2"]}'
```
- [ ] HTTP 200 ve sözleşmeye uygun JSON döndü.
- [ ] Dönen `audio_url` ve `subtitle_url` ayrı bir `curl` ile 200/indirilebilir.

## 6. Video Factory tarafı

VF `.env`:
```
LINGROOT_CORE_PROVIDER=http
LINGROOT_CORE_API_URL=https://api.lingroot.com
LINGROOT_CORE_API_KEY=<VIDEO_FACTORY_API_KEY ile aynı>
LINGROOT_CORE_LEVEL_ENDPOINT=/internal/video-level-package
LINGROOT_CORE_TIMEOUT_MS=30000
LINGROOT_CORE_MAX_ATTEMPTS=3
LINGROOT_CORE_VOICE_PROFILE=english_female
```
- [ ] `npm run core:check -- --topic "..." --levels A1 --scenes 2 --duration 45` yeşil.
- [ ] 6 seviyeli tam üretim denendi.

---

## Hızlı durum özeti

| Bileşen | Durum |
|---|---|
| Endpoint kodu + testler | ✅ Hazır (PR #262) |
| Google TTS / OpenAI / ffmpeg (prod) | ✅ Mevcut |
| `VIDEO_FACTORY_API_KEY` (prod) | ⬜ Dashboard'a girilecek |
| R2 public URL çözülürlüğü | ⬜ Doğrulanacak (kritik) |
| Tunnel `/internal` erişimi | ⬜ Doğrulanacak |
