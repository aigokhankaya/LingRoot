# LingRoot Media Operasyon Rehberi

Tarih: 15 Temmuz 2026

## Kapsam

LingRoot Media, LingRoot monoreposunun parçası olarak admin panelinden bir konu girerek A1-C2 video paketlerini
oluşturmak, hedef sosyal platform metadata'sını yönetmek, üretimi izlemek ve
çıktıları insan onayına sunmak için eklendi.

İlk fazda etkin olanlar:

- YouTube, Instagram, X ve TikTok hedef seçimi
- Platform bazlı başlık, açıklama, hashtag ve yayın zamanı
- Konu, amaç, ton, CTA, görsel stil, ses, süre, sahne ve altyazı ayarları
- A1-C2 olmak üzere tek kampanyadan altı video üretimi
- Kalıcı PostgreSQL iş kuyruğu, worker lease/heartbeat ve hata sonrası retry
- Artifact, QA, review ve onay ekranı
- İçerik, görsel, AV/altyazı ve platform metadata'sı için Agent QA
- Bulguları birleştiren, yayın yetkisi olmayan deterministik supervisor

İlk fazda bilinçli olarak etkin olmayanlar:

- YouTube OAuth upload
- Instagram Graph API publish
- X media upload/post
- TikTok Content Posting API

`approved` durumu yalnızca insan onayını ifade eder; harici platforma gönderim
başlatmaz. Yayın connector'ları ayrı credential ve release aşaması olarak
eklenecektir.

## Mimari

```text
Admin /admin/lingroot-media
  -> /api/admin/media/campaigns
  -> PostgreSQL media_generation_jobs
  -> apps/video-factory worker
  -> LingRoot TopicBrief + LevelPackage internal API
  -> FFmpeg A1-C2 render
  -> artifact ve QA kayıtları
  -> media_quality_runs
  -> apps/video-factory quality worker
  -> uzman agent'lar + bounded supervisor
  -> admin review_ready / approved
```

FFmpeg hiçbir web request handler'ında çalışmaz. Admin API yalnızca kampanyayı
ve işi kaydeder; aynı monorepodaki `apps/video-factory` ayrı process olarak
kuyruğu tüketir. Bu sınır bir ekip/repo ayrımı değil, deploy ve kaynak izolasyonu
sınırıdır.

## Veritabanı

Migration:

```text
backend/migrations/0101_lingroot_media_factory.sql
backend/migrations/0102_media_agent_quality.sql
```

Oluşturulan tablolar:

| Tablo | Amaç |
| --- | --- |
| `media_campaigns` | Brief, üretim ayarları, durum ve review |
| `media_campaign_targets` | Platform bazlı metadata ve zamanlama |
| `media_generation_jobs` | Kalıcı queue, retry, lease ve ilerleme |
| `media_artifacts` | Video, ses, altyazı, QA ve review dosyaları |
| `media_quality_runs` | Agent QA kuyruğu, lease, skor ve karar |
| `media_quality_assessments` | Uzman ve supervisor değerlendirmeleri |
| `media_quality_findings` | Kanıt, önem, kapsam ve önerilen aksiyon |
| `media_quality_feedback` | Operatör katılım/itiraz ve override kaydı |

Migration production veritabanına bir kez uygulanmalıdır:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f backend/migrations/0101_lingroot_media_factory.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f backend/migrations/0102_media_agent_quality.sql
```

Migration idempotent'tir. RLS tüm yeni tablolarda açıktır ve public/anon policy
tanımlı değildir; erişim yalnızca backend PostgreSQL bağlantısından yapılır.

## Backend API

Admin endpoint'lerinin tamamı mevcut `authenticate` ve `authorizeAdmin`
middleware'lerinden geçer:

```text
GET    /api/admin/media/campaigns
POST   /api/admin/media/campaigns
GET    /api/admin/media/campaigns/:id
PUT    /api/admin/media/campaigns/:id
DELETE /api/admin/media/campaigns/:id
POST   /api/admin/media/campaigns/:id/generate
POST   /api/admin/media/campaigns/:id/retry
POST   /api/admin/media/campaigns/:id/cancel
POST   /api/admin/media/campaigns/:id/approve
POST   /api/admin/media/campaigns/:id/request-revision
POST   /api/admin/media/campaigns/:id/duplicate
POST   /api/admin/media/campaigns/:id/quality/rerun
POST   /api/admin/media/campaigns/:id/quality/:runId/feedback
```

Worker endpoint'leri `Authorization: Bearer <LINGROOT_INTERNAL_API_KEY>` ister:

```text
POST /internal/media-jobs/claim
POST /internal/media-jobs/:id/heartbeat
POST /internal/media-jobs/:id/progress
POST /internal/media-jobs/:id/complete
POST /internal/media-jobs/:id/fail

POST /internal/media-quality/claim
POST /internal/media-quality/:id/heartbeat
POST /internal/media-quality/:id/progress
POST /internal/media-quality/:id/complete
POST /internal/media-quality/:id/fail
```

Bir lease 90 saniyedir. Worker 30 saniyede bir heartbeat gönderir. Süresi geçen
iş başka worker tarafından `FOR UPDATE SKIP LOCKED` ile tekrar alınabilir. En
fazla üç deneme yapılır.

## Konfigürasyon

Backend:

```dotenv
LINGROOT_INTERNAL_API_KEY=<güçlü-ortak-anahtar>
```

`apps/video-factory/.env`:

```dotenv
DRY_RUN=false
MEDIA_API_URL=https://<kalici-lingroot-host>
MEDIA_API_KEY=<LINGROOT_INTERNAL_API_KEY ile aynı>
MEDIA_WORKER_ID=video-worker-01
MEDIA_WORKER_POLL_MS=5000

QUALITY_WORKER_ID=quality-worker-01
QUALITY_WORKER_POLL_MS=5000
QUALITY_AGENT_PROVIDER=mock
QUALITY_AGENT_MODE=shadow
QUALITY_AGENT_MODEL=gpt-5-mini
QUALITY_AGENT_RUBRIC_VERSION=v1

# Artifact'lar public storage'a senkronlanıyorsa:
MEDIA_ARTIFACT_PUBLIC_BASE_URL=https://<media-domain>/video-factory
```

Factory'nin TopicBrief, Core, OpenAI, R2 ve FFmpeg ayarları ayrıca
`docs/VIDEO_FACTORY.md` içinde tanımlıdır.

## Çalıştırma

```bash
npm run video:check
npm run video:preflight
npm run media:worker
npm run media:quality-worker
```

Scheduler/cron tipi kullanımda her tetiklemede yalnızca bir işi işlemek için:

```bash
npm run media:worker:once
npm run media:quality-worker:once
```

Admin sayfası:

```text
/admin/lingroot-media
```

Akış:

1. Yeni İçerik sekmesinde brief ve en az bir platform seçilir.
2. A1-C2 seçili bırakılarak `Kaydet ve üret` kullanılır.
3. Kampanya `queued` olur ve worker işi claim eder.
4. Görsel, seviye, render ve QA ilerlemesi iş listesine yansır.
5. Teknik QA başarılıysa kampanya `quality_queued` olur.
6. Quality worker dört uzmanı ve supervisor'ı çalıştırır.
7. Detay sayfasındaki Agent QA alanında skor, bulgu ve kanıtlar incelenir.
8. Operatör bulguya katılır, itiraz eder veya onarım ister.
9. İçerik yalnızca insan tarafından onaylanır; agent'lar yayın yapamaz.

## Agent QA Karar Modeli

`content`, `visual`, `av_sync` ve `platform` uzmanları birbirinden bağımsız,
schema ile sınırlı rapor üretir. Supervisor yeni medya üretmez ve araç
çağıramaz; uzman skorlarını sabit ağırlıklarla birleştirir:

| Boyut | Ağırlık |
| --- | ---: |
| İçerik | %25 |
| CEFR | %20 |
| Görsel | %20 |
| Ses/altyazı | %20 |
| Platform | %15 |

FFmpeg/ffprobe ve mevcut teknik QA bir hard gate'tir. Bu kapı geçilmezse
model skoru yüksek olsa bile paket bloke edilir. `critical` bulgu bloke eder;
`high` veya 70 altı skor onarım, `medium` veya 85 altı skor insan incelemesi
önerir. Bunlar öneridir; `shadow` mod kampanya akışını engellemez.

İlk canlı kullanımda `QUALITY_AGENT_PROVIDER=mock` ve
`QUALITY_AGENT_MODE=shadow` tutulmalıdır. Gerçek model gözlemi için provider
`openai` yapıldığında `OPENAI_API_KEY` gerekir. Agent prompt'ları version'lanır,
token kullanımı kaydedilir ve görseller modele untrusted input olarak verilir.
`enforced` moda ancak gerçek paketlerdeki insan geri bildirimleriyle eşikler
kalibre edildikten sonra geçilmelidir.

## Kabul Kontrolü

```bash
cd frontend && npx tsc --noEmit
cd ../backend && npm test -- --runInBand --coverage=false \
  tests/mediaCampaignService.test.js tests/videoTopicBrief.test.js
cd ../apps/video-factory && npm run typecheck && npm test -- --run
```

Production kabulünde ayrıca:

- Migration tabloları görünür olmalı.
- Admin token olmadan Media API `401` dönmeli.
- Internal key olmadan worker API `401` dönmeli.
- Worker tek kampanyayı claim edip A1-C2 altı MP4 oluşturmalı.
- Dikey çıktılar 1080x1920, yatay YouTube çıktıları 1920x1080 H.264/AAC olmalı.
- Yatay YouTube süresi admin tarafından 300, 360, 420, 480, 540 veya 600
  saniye seçilebilmeli; ilk set 420 saniye + yüksek ses kalitesi kullanmalı ve
  QA sonucu `review_ready` olmalı.
- Yatay ve dikey hedefler ayrı kampanyalarda tutulmalı.
- Quality worker paketi claim edip beş assessment ve tek rapor yazmalı.
- Shadow moddaki agent kararı yayın veya otomatik onarım başlatmamalı.
- Artifact URL'leri admin tarayıcısından erişilebilir olmalı.

## Mevcut Altyapı Gereksinimleri

- Kalıcı LingRoot HTTPS/DNS adresi
- Kalıcı public R2/media domaini
- Worker makinesinde Node.js 20+, FFmpeg ve ffprobe

15 Temmuz 2026 tarihinde `0101_lingroot_media_factory.sql` ve
`0102_media_agent_quality.sql` production PostgreSQL veritabanına transaction
içinde uygulandı. Sekiz `media_*` tablosu, iki aktif-iş unique index'i ve tüm
yeni tablolardaki RLS durumu doğrulandı. Bağlantıdaki `28P01` hatası, doğrudan
Supabase DB host'u ile pooler kullanıcı adının birlikte kullanılmasından
kaynaklanıyordu; doğrudan host için `PGUSER=postgres` olarak düzeltildi.
