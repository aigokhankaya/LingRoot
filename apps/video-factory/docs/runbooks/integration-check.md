# Real multi-level integration check (JSON2Video fallback)

Bu runbook yerel FFmpeg birincil akisinin degil, ucretli JSON2Video fallback
zincirinin production provider sinirlarini dogrular:

```text
OpenAI Image
  → local image copy
  → Supabase private upload
  → short-lived signed read URL
  → LingRoot Core level package
  → JSON2Video render
  → local final MP4
  → temporary Supabase object cleanup
```

## Önkoşullar

`.env` içinde:

```text
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
LINGROOT_CORE_API_URL
LINGROOT_CORE_API_KEY
JSON2VIDEO_API_KEY
```

Supabase bucket önceden oluşturulmuş ve private olmalıdır. LingRoot Core audio
ve subtitle URL’leri JSON2Video tarafından erişilebilir HTTP(S) URL olmalıdır.

## Çalıştırma

Minimum maliyetli kontrol:

```bash
npm run integration:check -- \
  --topic "Why do people forget new words?" \
  --levels A1 \
  --scenes 1 \
  --duration 15
```

Seçili level seti:

```bash
npm run integration:check -- \
  --topic "Why do people forget new words?" \
  --levels A1,A2,B1 \
  --scenes 1 \
  --duration 15
```

Görseller topic başına bir kez üretilir ve bütün level renderlarında yeniden
kullanılır. Core ve render çağrıları level sırasıyla çalıştırılır.

Signed URL expiry otomatik olarak JSON2Video poll timeout + 5 dakika seçilir.
Multi-level çalışmada bu süre level sayısıyla çarpılır ve ek güvenlik payı
eklenir. Daha uzun süre yalnızca gerektiğinde verilebilir:

```bash
--signed-url-expiry 1200
```

## Güvenlik

- Signed URL yalnızca memory içindeki transient render payload’da kullanılır.
- Signed token, Core media URL veya API key summary/log dosyalarına yazılmaz.
- Diskteki güvenli visual manifest `supabase://bucket/key` canonical ref taşır.
- Remote integration image objeleri başarı/hata durumunda `finally` içinde
  silinir.
- Final MP4 lokal olarak saklanır.

## Çıktı

```text
outputs/integration-checks/<run-id>/
  common/
    visual-scenes.json
    images/
  levels/<level>/
    level-package.json
    script.txt
    subtitles.srt
    subtitles.vtt
    render-payload.json
    youtube-metadata.json
    instagram-metadata.json
    render-result.json
    video.mp4
  summary.json
```

`level-package.json` içindeki audio/subtitle ref alanları bilinçli olarak
`null` yazılır. Güvenli render payload da signed/Core URL yerine canonical
Supabase ref ve `null` media ref taşır.
