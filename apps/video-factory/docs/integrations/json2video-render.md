# JSON2Video render integration (optional fallback)

## Amaç

JSON2Video, FFmpeg'in calistigi yerel renderer kullanilamadiginda secilen
ucretli bulut fallback'idir. Ortak visual manifest ile bir CEFR level'ın audio,
subtitle ve badge verisini final 1080x1920 MP4'e donusturur.

Resmi kaynaklar:

- [Create movie](https://json2video.com/docs/v2/reference/api-endpoints/movies-create)
- [Get movie status](https://json2video.com/docs/v2/reference/api-endpoints/movies-status)
- [Movie JSON](https://json2video.com/docs/v2/reference/json-syntax/movie)
- [Error handling](https://json2video.com/docs/v2/guides/production/error-handling)

## API akışı

```text
POST /v2/movies
  → project ID
GET /v2/movies?project=<id>&format=simple
  → pending/running/done/error/timeout
GET movie.url
  → final MP4
```

Authentication `x-api-key` headerıyla yapılır.

## Movie builder

Provider-neutral `RenderPayload`, JSON2Video Movie JSON’a çevrilir:

- `resolution: custom`
- `width: 1080`
- `height: 1920`
- ortak manifest sırasıyla bir scene dizisi
- her scene içinde tek `image` elementi ve `resize: cover`
- movie-level `audio`
- movie-level `subtitles`
- movie-level CEFR badge text
- `client-data` içinde topic, level ve sıralı scene ID listesi

Image/audio/subtitle kaynakları JSON2Video sunucuları tarafından erişilebilir
HTTP(S) URL olmalıdır. Local path reddedilir.

## Retry ve idempotency

`POST /movies` idempotent değildir; aynı request her seferinde yeni project
oluşturur. Bu nedenle submit çağrısı network/5xx durumunda otomatik tekrar
edilmez.

Retry yalnızca:

- status polling
- final MP4 download

için timeout, network, HTTP 408, 429 ve 5xx durumlarında uygulanır.

Async `movie.status=error|timeout` hard failure’dır. `done` sonucunda URL,
resolution ve indirilen MP4 signature doğrulanır.

## Konfigürasyon

```text
RENDER_PROVIDER=json2video
JSON2VIDEO_API_KEY=...
JSON2VIDEO_API_BASE_URL=https://api.json2video.com/v2
JSON2VIDEO_QUALITY=high
JSON2VIDEO_REQUEST_TIMEOUT_MS=30000
JSON2VIDEO_POLL_INTERVAL_MS=3000
JSON2VIDEO_POLL_TIMEOUT_MS=600000
JSON2VIDEO_POLL_MAX_ATTEMPTS=3
```

## Explicit render kontrolü

```bash
npm run render:check -- \
  --topic "Render integration check" \
  --image-url "https://..." \
  --audio-url "https://..." \
  --subtitle-url "https://..." \
  --levels A1 \
  --duration 5
```

Komut gerçek render kredisi tüketebilir. Şunları üretir:

```text
outputs/render-checks/<run-id>/
  render-payload.json
  json2video-movie.json
  video.mp4
  result.json
```

Normal dry-run daima `MockRenderClient` kullanır.
