# LingRoot Video Factory

LingRoot için tek bir konuyu ortak görsel akışla A1–C2 seviyelerinde altı kısa
dinleme videosuna dönüştüren lokal TypeScript üretim sistemi.

> Same topic. Your level.

## Durum

Mock ve gerçek provider adapter'ları, resume edilebilir production run, teknik
QA ve review-gated YouTube release akışı uygulanmıştır. LingRoot
TopicBrief ve Core endpoint'leri gerçek altı videolu yerel üretimde
doğrulanmıştır. Public yayın varsayılan olarak kapalı kalır.

## Gereksinimler

- Node.js 20+
- npm
- macOS, Linux veya Windows
- FFmpeg + ffprobe (`subtitles`, `drawtext`, `libx264` destekli)

## Kurulum

```bash
npm install
cp .env.example .env
```

Gerçek yerel render için `DRY_RUN=false`, `PUBLISH_MODE=review`, LingRoot HTTP
provider'ları, `IMAGE_PROVIDER=openai`, `STORAGE_PROVIDER=local` ve
`RENDER_PROVIDER=ffmpeg` kullanılır. YouTube bilgileri bu aşamada gerekmez.

## Temel komutlar

```bash
npm run dry-run
npm run generate -- --topic "Why do people forget new words?" --mode test-single-level --levels A1 --scenes 2
npm run generate -- --topic "Why do people forget new words?" --mode test-six-levels --scenes 2
npm run generate -- --topic "Why do people forget new words?" --mode production
npm run qa
npm run scheduler:test
```

Production komutlari:

```bash
npm run preflight -- --render-only
npm run produce -- --topic "Why do people forget new words?" --scenes 4
npm run approve -- --package "outputs/topic-packages/<package-dir>"
npm run release -- --package "outputs/topic-packages/<package-dir>"
npm run produce -- --resume "outputs/topic-packages/<package-dir>"
npm run produce -- --resume "outputs/topic-packages/<package-dir>" --rerender
```

`produce` yalnızca altı MP4 ve review paketi üretir; YouTube'a bağlanmaz.
`approve` ve `release`, YouTube yayinini birbirinden ayiran bilincli operator
adimlaridir. Release videoyu önce private yükler; iki public kapısı açıksa
metadata ve playlistler tamamlandıktan sonra public'e geçirir. Ayrintili akıs icin
[Production workflow runbook](docs/runbooks/production-workflow.md) kullanilir.

İlk YouTube bağlantısı için Google Cloud'dan **Desktop app** OAuth client JSON'u
indirilir ve tek seferlik yetkilendirme çalıştırılır:

```bash
npm run youtube:auth -- \
  --client-json "/tam/yol/client_secret_....json"
```

Komut doğru YouTube kanalını doğrular ve üç gizli değeri yalnızca git-ignore
kapsamındaki `.env` dosyasına yazar. Kurulum ayrıntıları:
[YouTube private upload](docs/integrations/youtube-private-upload.md).

LingRoot Core API bağlantı kontrolü:

```bash
LINGROOT_CORE_PROVIDER=http npm run core:check -- \
  --topic "Why do people forget new words?" \
  --levels A1 \
  --scenes 2
```

Bu komut gerçek API çağrısı yapar. Normal `dry-run`, provider `http` olarak
ayarlansa bile mock client kullanır.

OpenAI görsel üretim bağlantı kontrolü:

```bash
npm run image:check -- \
  --topic "Why do people forget new words?" \
  --quality low \
  --size 1024x1536
```

Bu komut tek bir gerçek görsel üretir ve `outputs/image-checks/` altına image,
request ve provenance metadata yazar. Normal `dry-run`, `IMAGE_PROVIDER=openai`
olsa bile mock image client kullanır.

Supabase Storage round-trip kontrolü:

```bash
npm run storage:check
```

Bu komut private bucket’a benzersiz bir healthcheck objesi yükler, indirerek
byte eşitliğini doğrular ve objeyi siler. Normal `dry-run` local storage
kullanmaya devam eder.

Yerel FFmpeg birincil render yoludur. `RENDER_PROVIDER=ffmpeg` ile `produce`,
paketteki local gorsel, ses ve SRT dosyalarindan H.264/AAC MP4'leri uretir;
bulut render kredisi kullanmaz. `npm run preflight -- --render-only`, FFmpeg,
ffprobe, LingRoot ve görsel üretim ayarlarını denetler; YouTube kimlik bilgilerini
bilinçli olarak kapsam dışında bırakır. Düz `npm run preflight` release öncesi
YouTube bilgilerini de denetler.

JSON2Video alternatif render kontrolu:

```bash
npm run render:check -- \
  --image-url "https://..." \
  --audio-url "https://..." \
  --subtitle-url "https://..." \
  --levels A1 \
  --duration 5
```

Bu yalnizca `RENDER_PROVIDER=json2video` secenegi icin kullanilan ucretli bulut
fallback'idir. Kaynak URL’lerin JSON2Video tarafından HTTP(S) üzerinden
erişilebilir olması gerekir. Komut render job’ını submit eder, tamamlanana kadar
poll eder ve final MP4’ü `outputs/render-checks/` altına indirir.

Gerçek seçili-level entegrasyon kontrolü:

```bash
npm run integration:check -- \
  --topic "Why do people forget new words?" \
  --levels A1 \
  --scenes 1 \
  --duration 15
```

Bu komut OpenAI → Supabase private storage/signed URL → LingRoot Core →
JSON2Video zincirini çalıştırır. Gerçek maliyet ve remote mutation doğurur;
yalnızca gerekli credentiallar hazırken bilinçli olarak çalıştırılmalıdır.

Birden fazla level aynı ortak görsellerle sıralı üretilebilir:

```bash
npm run integration:check -- \
  --topic "Why do people forget new words?" \
  --levels A1,A2,B1,B2,C1,C2 \
  --scenes 2 \
  --duration 30
```

YouTube private upload kontrolü:

```bash
npm run youtube:check -- \
  --video "outputs/.../video.mp4" \
  --metadata "outputs/.../youtube-metadata.json"
```

Metadata `privacyStatus=private` olmak zorundadır. Komut OAuth refresh token ile
geçici access token alır ve resumable upload kullanır.

YouTube private playlist kontrolü:

```bash
npm run youtube:playlist-check -- \
  --video-id "YOUTUBE_VIDEO_ID" \
  --topic-title "Why do people forget new words?" \
  --levels A1
```

Komut topic için `<topic> | All Levels`, her seçili CEFR seviyesi için
`<level> English Listening` adlı private playlist’i bulur veya oluşturur.
Videoyu önce mevcut üyelik açısından kontrol eder; aynı playlist’e ikinci kez
eklemez. Bu komut gerçek remote mutation ve YouTube API quota kullanır.

Geliştirme doğrulamaları:

```bash
npm run typecheck
npm test
npm run validate:schemas
npm run build
```

## Üretilen paket

Her production çalışma `outputs/topic-packages/<date>_<topic-slug>_<run-id>/` altında şunları üretir:

```text
topic-package.json
production-report.json
qa-report.json
run-state.json
common/
  visual-scenes.json
  image-manifest.json
  images/
levels/
  A1/
  A2/
  B1/
  B2/
  C1/
  C2/
social/
review/
```

Her level klasöründe script, audio, SRT/VTT altyazı, render payload, video,
platform metadata ve level QA raporu bulunur. `DRY_RUN=true` yalnızca test
amaçlı mock medya üretir.

## Değişmez kural

Bir topic package içindeki bütün seviyeler aynı görsel manifestini ve sahne
sırasını kullanır. Level paketleri kendi görsellerini taşımaz.

## Güvenlik

- `.env` commit edilmez.
- `.env`, `youtube:auth` tarafından yalnız kullanıcıya açık `0600` izniyle
  tutulur.
- Secret değerler loglara ve raporlara yazılmaz.
- Varsayılan yayın modu `review`’dur.
- Public yayın için hem `PUBLISH_MODE=auto_public` hem
  `AUTO_PUBLIC_PUBLISH=true` gerekir.
- `produce` hiçbir YouTube çağrısı yapmaz.

## Dokümantasyon

- [Ortak çalışma günlüğü](gkn/CodexYapilan.md)
- [Ürün özeti](docs/product/product-brief.md)
- [Mimari](docs/architecture/overview.md)
- [Production readiness plan](docs/product/production-readiness-plan.md)
- [Roadmap](docs/roadmap.md)
- [Dry-run runbook](docs/runbooks/dry-run.md)
- [Scheduler runbook](docs/runbooks/scheduler.md)
- [LingRoot Topic Brief API entegrasyonu](docs/integrations/lingroot-topic-api.md)
- [LingRoot Core API entegrasyonu](docs/integrations/lingroot-core-api.md)
- [OpenAI Image API entegrasyonu](docs/integrations/openai-image-api.md)
- [Supabase Storage entegrasyonu](docs/integrations/supabase-storage.md)
- [Local FFmpeg render](docs/integrations/local-ffmpeg-render.md)
- [JSON2Video render entegrasyonu](docs/integrations/json2video-render.md)
- [Gerçek multi-level entegrasyon kontrolü](docs/runbooks/integration-check.md)
- [Production workflow](docs/runbooks/production-workflow.md)
- [YouTube private upload](docs/integrations/youtube-private-upload.md)

Orijinal uzun brief `gkn/` altında kaynak/arşiv olarak tutulur. Aktif teknik
kontratlar şemalar, config dosyaları ve `docs/` içeriğidir.
