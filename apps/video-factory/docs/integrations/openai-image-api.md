# OpenAI Image API integration

## Amaç

OpenAI Image API, topic başına planlanan ortak scene görsellerini üretir. Scene
planlama provider’dan ayrıdır; OpenAI adapter yalnızca provider-neutral image
request alır ve binary image ile provenance metadata döndürür.

Resmi kaynaklar:

- [Image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
- [Images API reference](https://platform.openai.com/docs/api-reference/images/create)

## Varsayılan model ve format

```text
Model: gpt-image-2
Size: 1024x1536
Quality: medium
Output: png
Moderation: auto
Background: opaque
```

`1024x1536` portrait output mobil video kompozisyonuna uygundur. Draft ve
bağlantı testlerinde maliyet/latency için `quality=low` kullanılabilir.

OpenAI Image API base64-encoded image data döndürür. Adapter base64 verisini
decode eder ve beklenen PNG/JPEG/WebP binary signature ile doğrular.

## Güvenlik ve retry

- API key yalnızca Authorization header’da kullanılır.
- Hata mesajları response body veya API key içermez.
- Moderation proje seviyesinde `auto` değerine kilitlidir.
- Timeout varsayılanı 130 saniyedir.
- Timeout, network hatası, HTTP 408, 429 ve 5xx retry edilir.
- Diğer 4xx hataları retry edilmez.
- `x-request-id` güvenli provenance alanı olarak kaydedilir.

## Konfigürasyon

```text
IMAGE_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_SIZE=1024x1536
OPENAI_IMAGE_QUALITY=medium
OPENAI_IMAGE_OUTPUT_FORMAT=png
OPENAI_IMAGE_MODERATION=auto
OPENAI_IMAGE_TIMEOUT_MS=130000
OPENAI_IMAGE_MAX_ATTEMPTS=3
OPENAI_ORGANIZATION=
OPENAI_PROJECT=
```

## Explicit bağlantı kontrolü

```bash
npm run image:check -- \
  --topic "Why do people forget new words?" \
  --quality low \
  --size 1024x1536 \
  --format png
```

Komut gerçek maliyet doğurur. Tek scene üretir ve şunları yazar:

```text
outputs/image-checks/<run-id>/
  scene-1.png
  request.json
  result.json
```

## Dry-run güvenliği

Normal workflow `DRY_RUN=true` olduğunda her zaman `MockImageClient` kullanır.
`IMAGE_PROVIDER=openai` tek başına gerçek çağrı başlatmaz.
