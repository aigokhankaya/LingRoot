# LingRoot Core API integration

## Amaç

LingRoot Core, her CEFR seviyesi için metin, ses ve altyazının sahibidir. Video
Factory bu içeriği yeniden üretmez; versioned internal API kontratı üzerinden
alır.

Endpoint:

```text
POST /internal/video-level-package
Authorization: Bearer <LINGROOT_CORE_API_KEY>
Content-Type: application/json
```

Canonical kontratlar:

- `schemas/lingroot-core-request.schema.json`
- `schemas/lingroot-core-response.schema.json`

## Scene-aware sözleşme

İstek ortak manifestteki sıralı `scene_ids` listesini gönderir. Yanıt:

- her scene için sıralı `script_lines`
- her subtitle cue için `scene_id`
- audio ve subtitle asset URL’leri
- süre, voice profile ve speaking rate

taşır. Script sırası istekle birebir eşleşmezse veya subtitle bilinmeyen bir
scene’e referans verirse adapter yanıtı reddeder.

## Konfigürasyon

```text
LINGROOT_CORE_PROVIDER=http
LINGROOT_CORE_API_URL=https://internal-api.example.com
LINGROOT_CORE_API_KEY=...
LINGROOT_CORE_LEVEL_ENDPOINT=/internal/video-level-package
LINGROOT_CORE_TIMEOUT_MS=30000
LINGROOT_CORE_MAX_ATTEMPTS=3
LINGROOT_CORE_VOICE_PROFILE=english_female
```

API key loglara, hata metinlerine veya raporlara yazılmaz.

## Bağlantı kontrolü

```bash
npm run core:check -- \
  --topic "Why do people forget new words?" \
  --levels A1 \
  --scenes 2 \
  --duration 45
```

Komut tek level için gerçek HTTP çağrısı yapar, response schema ve semantic
scene bağını doğrular. Medya dosyalarını indirmez ve production paketi yazmaz.

## Retry politikası

Timeout, bağlantı hatası ve HTTP `408`, `425`, `429`, `500`, `502`, `503`,
`504` yeniden denenir. Diğer 4xx yanıtları tekrar edilmez. Deneme sayısı ve
timeout environment ile sınırlandırılır.

## Dry-run güvenliği

`DRY_RUN=true` olduğunda normal production workflow daima mock Core client
seçer. Gerçek Core çağrısı yalnızca açıkça çalıştırılan `core:check` ile yapılır.
