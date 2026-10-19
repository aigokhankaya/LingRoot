# Codex Çalışma ve Koordinasyon Günlüğü

Son güncelleme: **2026-07-18 13:04 +03**

Bu dosya, LingRoot Video Factory üzerinde çalışan bütün Codex/Claude/agent
oturumları için ortak ilerleme günlüğüdür. Paralel çalışanlar işe başlamadan
önce bu dosyayı okumalıdır.

## Günlük kullanım kuralı

Her çalışma oturumu:

1. İşe başlamadan önce bu dosyayı ve `git status --short` çıktısını okumalıdır.
2. Üstleneceği fazı, görevi ve dosyaları **Aktif işler** bölümüne yazmalıdır.
3. Başka bir çalışanın aktif sahipliğindeki dosyaları habersiz değiştirmemelidir.
4. İş tamamlandığında yaptığı değişiklikleri, test sonuçlarını ve kalan riskleri
   bu dosyaya eklemelidir.
5. Doğrulanmamış bir işi tamamlandı olarak işaretlememelidir.
6. Gerçek API, yayın, scheduler yükleme veya secret gerektiren işlemleri açıkça
   belirtmelidir.

Bu dosya teknik kontrat değildir. Öncelik sırası:

```text
schemas/ → config/ ve .env.example → ADR'ler → CLAUDE.md → docs/ → bu günlük
```

## Mevcut proje durumu

```text
Aktif faz: Faz 3 — Kontrollü private publishing
Tamamlanan milestone: YouTube private upload ve private playlist yönetimi
Sıradaki milestone: Gerçek YouTube kontrolleri veya Instagram paketleme sınırı
Varsayılan çalışma modu: DRY_RUN=true
Varsayılan yayın modu: PUBLISH_MODE=review
Git durumu: Faz 0–3.2 tamamı main'e commitlendi ve push edildi (HEAD 9f3e833); working tree temiz
Son doğrulama: 68 test, 16 JSON Schema, typecheck, build, dry-run, QA ve scheduler smoke başarılı
```

## Değişmez proje kararları

- n8n kullanılmaz.
- Bir topic package içinde A1–C2 aynı görsel manifestini ve sahne sırasını
  kullanır.
- Level paketleri bağımsız görsel veya scene listesi taşımaz.
- Gerçek CEFR metni, ses ve altyazının sahibi LingRoot Core’dur.
- `dry-run` gerçek provider yapılandırılmış olsa bile mock adapter kullanır.
- Public yayın yalnızca `PUBLISH_MODE=auto_public` ve
  `AUTO_PUBLIC_PUBLISH=true` birlikte verilirse düşünülebilir.
- Secret değerler loglara, output paketlerine ve raporlara yazılmaz.

---

## Faz 0 — Başlangıç durumu

Repo daha önce aşağıdaki commitlerle oluşturulmuştu:

```text
6a6b1f2 initial project setup
191d61c add entry point and dependencies
6027231 feat: phase 1 mock-first skeleton
e8a5874 test: lock shared-visuals invariant with vitest fixtures + tamper tests
```

Mevcut başlangıçta:

- TypeScript/ESM iskeleti vardı.
- Config ve sekiz temel JSON Schema vardı.
- Paylaşılan görsel invariant testi vardı.
- Gerçek CLI ve uçtan uca output üretimi yoktu.
- `agents/`, `skills/`, `prompts/`, `src/qa`, `src/workflows`,
  `src/scheduler` büyük ölçüde placeholder durumundaydı.

---

## Faz 1 — Local mock factory

Durum: **Tamamlandı**

### 1. Dokümantasyon düzeni

Yapılanlar:

- Kök `README.md` oluşturuldu.
- `CLAUDE.md` kalıcı agent sözleşmesi olarak yeniden düzenlendi.
- Doküman hiyerarşisi oluşturuldu:

```text
docs/product/product-brief.md
docs/architecture/overview.md
docs/architecture/decisions/ADR-0001-shared-visuals.md
docs/architecture/decisions/ADR-0002-core-api-boundary.md
docs/runbooks/dry-run.md
docs/runbooks/scheduler.md
docs/roadmap.md
```

- 2.503 satırlık ilk brief aktif kontrat olmaktan çıkarılıp `gkn/` altında
  tarihsel kaynak olarak işaretlendi.
- Klasör README’lerindeki placeholder açıklamalar güncellendi.

### 2. Kontrat ve yayın güvenliği

Yapılanlar:

- Yayın modları şu şekilde sabitlendi:

```text
review
private_upload
auto_public
```

- `auto_public`, ikinci açık onay olarak `AUTO_PUBLIC_PUBLISH=true` gerektiriyor.
- `.env.example`, config, TypeScript tipleri ve production report şeması aynı
  yayın modeline getirildi.
- Config güvenlik testleri eklendi.

### 3. Mock/local adapter katmanı

Eklenenler:

```text
src/services/lingroot-core-client.ts
src/services/image-client.ts
src/services/render-client.ts
src/services/storage-client.ts
src/services/social-metadata.ts

src/adapters/mock-lingroot-core-client.ts
src/adapters/mock-image-client.ts
src/adapters/mock-render-client.ts
src/adapters/local-storage-client.ts
```

Mock render adapter gerçek video yerine deterministik placeholder dosya yazıyor.
Mock image ve Core adapterları ortak fixture kaynağını kullanıyor.

### 4. Uçtan uca production workflow

Eklenen ana workflow:

```text
src/workflows/generate-topic-package.ts
```

Workflow şu çıktıları üretiyor:

```text
outputs/topic-packages/<date>_<topic>/
  topic-package.json
  production-report.json
  qa-report.json
  common/
    visual-scenes.json
    image-manifest.json
    images/*.png
  levels/<LEVEL>/
    level-package.json
    script.txt
    audio.mp3
    subtitles.srt
    subtitles.vtt
    render-payload.json
    video.mp4
    youtube-metadata.json
    instagram-metadata.json
    qa-report.json
  social/
  logs/
```

Desteklenen modlar:

```text
dry-run
test-single-level
test-six-levels
production
```

Production ve six-level modları A1–C2 setini zorunlu tutuyor.

### 5. Semantic QA

Eklenen:

```text
src/qa/package-qa.ts
```

Kontroller:

- JSON Schema geçerliliği
- Beklenen level seti ve benzersizliği
- Topic ID eşleşmesi
- Level badge eşleşmesi
- Ortak scene sırası
- Script ve subtitle scene referansları
- Ortak image dosyalarının varlığı
- Audio/subtitle süre uyumu
- Render payload schema ve ortak manifest eşitliği
- Level scriptlerinin birbirinden farklı olması
- Tüm beklenen artifactlerin varlığı
- Diskteki manifest ile topic package manifestinin eşitliği
- Secret benzeri değer sızıntısı

### 6. CLI ve scheduler

Eklenen komutlar:

```bash
npm run dry-run
npm run generate
npm run daily
npm run qa
npm run scheduler:test
npm run scheduler:install
npm run scheduler:uninstall
```

Scheduler:

- macOS launchd plist preview üretir.
- `scheduler:test` tek-level smoke production çalıştırır.
- `scheduler:install` gerçek LaunchAgent yüklemez; yalnızca güvenli preview
  üretir.
- `scheduler:uninstall` preview dosyasını kaldırır.

### 7. Agent, skill ve promptlar

Oluşturulan 10 agent:

```text
project-orchestrator
topic-strategist
visual-director
cefr-editor
subtitle-qa
render-operator
social-packaging-agent
publishing-agent
analytics-agent
compliance-agent
```

Oluşturulan ve `quick_validate.py` ile doğrulanan 7 skill:

```text
lingroot-video-factory
cefr-level-editor
visual-scene-planner
youtube-packaging
instagram-reels-packaging
render-qa
local-scheduler
```

Oluşturulan promptlar:

```text
topic-package.prompt.md
visual-scenes.prompt.md
social-metadata.prompt.md
qa-review.prompt.md
thumbnail.prompt.md
```

### 8. Faz 1 doğrulama sonucu

Başarılı çalıştırılanlar:

```bash
npm run typecheck
npm test
npm run validate:schemas
npm run dry-run
npm run qa
npm run scheduler:test
npm run scheduler:install
npm run scheduler:uninstall
npm run daily
npm run build
```

Faz 1 sonunda:

```text
25 test başarılı
8 JSON Schema başarılı
Dry-run QA skoru 1.0
```

---

## Faz 2.1 — LingRoot Core API

Durum: **Kod ve lokal contract testleri tamamlandı**

Gerçek LingRoot ortamındaki bağlantı testi, API URL/key sağlanana kadar açık.

### 1. Versioned API kontratı

Eklenen şemalar:

```text
schemas/lingroot-core-request.schema.json
schemas/lingroot-core-response.schema.json
```

Kontrat:

- `schema_version: 1`
- `POST /internal/video-level-package`
- Bearer internal API key
- İstekte sıralı `scene_ids`
- Yanıtta scene-aware `script_lines`
- Yanıtta scene-aware `subtitle_lines`
- Audio/subtitle URL, duration, voice profile ve speaking rate

Karar: API yanıtı scene-aware olmak zorunda. Düz metni sonradan tahmini olarak
sahnelere bölme yaklaşımı kullanılmadı.

### 2. HTTP adapter

Eklenen:

```text
src/adapters/http-lingroot-core-client.ts
src/adapters/lingroot-core-client-factory.ts
```

Özellikler:

- Bearer authentication
- Request/response JSON Schema validation
- Topic ve level eşleşme kontrolü
- Script scene sırası kontrolü
- Subtitle scene kapsamı ve timing kontrolü
- Configurable timeout
- Configurable retry
- Retry edilen durumlar:

```text
timeout
network TypeError
HTTP 408, 425, 429, 500, 502, 503, 504
```

- API key hata mesajlarına eklenmiyor.

### 3. Adapter seçimi

Eklenen environment ayarları:

```text
LINGROOT_CORE_PROVIDER=mock|http
LINGROOT_CORE_API_URL=
LINGROOT_CORE_API_KEY=
LINGROOT_CORE_LEVEL_ENDPOINT=/internal/video-level-package
LINGROOT_CORE_TIMEOUT_MS=30000
LINGROOT_CORE_MAX_ATTEMPTS=3
LINGROOT_CORE_VOICE_PROFILE=english_female
```

Güvenlik davranışı:

- `DRY_RUN=true` normal production workflow’da her zaman mock Core client seçer.
- Gerçek Core API yalnızca açıkça çağrılan bağlantı kontrolünde kullanılır.

### 4. Manuel bağlantı kontrolü

Eklenen komut:

```bash
npm run core:check -- \
  --topic "Why do people forget new words?" \
  --levels A1 \
  --scenes 2 \
  --duration 45
```

Bu komut:

- Tek level için gerçek HTTP çağrısı yapar.
- Level package schema’sını doğrular.
- Production paketi veya medya dosyası üretmez.
- API credential olmadığı için henüz gerçek LingRoot ortamında çalıştırılmadı.

### 5. Testler

Eklenen test dosyaları:

```text
tests/http-lingroot-core-client.test.ts
tests/lingroot-core-factory.test.ts
```

Test edilenler:

- Versioned scene-aware request body
- Authorization header
- Response → LevelPackage mapping
- HTTP 503 retry
- Timeout/abort
- 401 hatasında key sızıntısı olmaması
- Scene sırası drift reddi
- Dry-run’ın mock client zorlaması
- Explicit Core check’in HTTP adapter seçmesi

### 6. Faz 2.1 doğrulama sonucu

Son başarılı doğrulama:

```text
32 test başarılı
10 JSON Schema başarılı
TypeScript typecheck başarılı
Build başarılı
Dry-run başarılı
QA skoru 1.0
Scheduler smoke test başarılı
```

---

## Faz 2.2 — OpenAI görsel üretimi

Durum: **Kod ve lokal contract testleri tamamlandı**

Gerçek OpenAI üretim testi, `OPENAI_API_KEY` sağlanana kadar açık.

### 1. Resmi API doğrulaması

OpenAI’nin güncel resmi Image API dokümantasyonu kontrol edildi.

Uygulanan varsayılanlar:

```text
model: gpt-image-2
size: 1024x1536
quality: medium
output_format: png
moderation: auto
background: opaque
timeout: 130 saniye
```

Kararlar:

- Image API’nin base64 image çıktısı decode ediliyor.
- PNG/JPEG/WebP binary signature doğrulanıyor.
- Moderation `auto` değerine kilitlendi.
- Draft/connection check için `quality=low` kullanılabilir.
- Timeout ve retry, iki dakikaya yaklaşabilen üretim latency’sine göre
  sınırlandırıldı.

### 2. Provider-neutral image kontratı

Eklenen şemalar:

```text
schemas/image-generation-request.schema.json
schemas/image-generation-result.schema.json
```

Eklenen metadata:

- topic ve scene ID
- provider ve model
- OpenAI request ID
- oluşturulma zamanı
- content type ve extension
- byte boyutu
- size ve quality
- moderation modu

Bu provenance `VisualScenes.scenes[].imageProvenance` altında tutuluyor ve QA
tarafından doğrulanıyor.

### 3. Scene planning ayrımı

Eklenen:

```text
src/services/visual-scene-planner.ts
```

Önceki `ImageClient.produceScenes()` yapısı kaldırıldı.

Yeni sınır:

```text
Visual scene planner → prompt ve scene sırası
Image client → tek scene için binary image üretimi
```

Workflow önce ortak scene planını oluşturuyor, image client’ı scene başına bir
kez çağırıyor, ardından A1–C2 level döngüsüne geçiyor.

Test ile doğrulanan kritik davranış:

```text
2 ortak scene + 6 CEFR level = 2 image generation çağrısı
```

### 4. OpenAI adapter ve factory

Eklenen:

```text
src/adapters/openai-image-client.ts
src/adapters/image-client-factory.ts
```

Özellikler:

- Bearer authentication
- Opsiyonel organization/project headerları
- Provider-neutral request validation
- Base64 decode ve binary signature validation
- Non-secret provenance
- Configurable timeout/retry
- Timeout ve network hataları retry
- HTTP 408, 429 ve 5xx retry
- Diğer 4xx hatalar retry edilmez
- API key hata mesajlarına veya metadata’ya yazılmaz

Dry-run güvenliği:

- `DRY_RUN=true` normal workflow’da her zaman `MockImageClient` seçer.
- `IMAGE_PROVIDER=openai` tek başına gerçek çağrı başlatmaz.

### 5. Image config

Eklenen environment ayarları:

```text
IMAGE_PROVIDER=mock|openai
OPENAI_API_KEY=
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

Image size için edge, 16-pixel multiple, ratio ve toplam pixel limitleri config
seviyesinde doğrulanıyor.

### 6. Explicit image check

Eklenen komut:

```bash
npm run image:check -- \
  --topic "Why do people forget new words?" \
  --quality low \
  --size 1024x1536 \
  --format png
```

Komut tek gerçek image üretir ve şunları yazar:

```text
outputs/image-checks/<run-id>/
  scene-1.png
  request.json
  result.json
```

API key bulunmadığında güvenli şekilde şu hata ile durduğu doğrulandı:

```text
OPENAI_API_KEY is required when IMAGE_PROVIDER=openai.
```

Gerçek ücretli çağrı yapılmadı.

### 7. QA ve timezone düzeltmesi

QA’ya image provenance kontrolleri eklendi:

- provenance schema
- topic/scene eşleşmesi
- moderation `auto`
- image dosyasının varlığı

Ayrıca üretim klasör tarihi UTC yerine configured scheduler timezone ile
hesaplanacak şekilde düzeltildi. `2026-06-21T21:30Z`, Europe/Istanbul için
`2026-06-22` olarak test edildi.

### 8. Test ve doğrulama

Eklenen testler:

```text
tests/openai-image-client.test.ts
tests/image-client-factory.test.ts
tests/dates.test.ts
```

Güncellenen testler:

```text
tests/adapters.test.ts
tests/config.test.ts
tests/production-workflow.test.ts
tests/lingroot-core-factory.test.ts
```

Son başarılı sonuç:

```text
42 test başarılı
12 JSON Schema başarılı
TypeScript typecheck başarılı
Build başarılı
Dry-run başarılı
QA skoru 1.0
Scheduler smoke test başarılı
Paket tarihi Europe/Istanbul için 2026-06-22
```

---

## Faz 2.3 — Supabase Storage

Durum: **Kod ve lokal contract testleri tamamlandı**

Gerçek Supabase round-trip testi, URL/key/bucket sağlanana kadar açık.

### 1. Resmi storage modeli

Supabase resmi Storage dokümanları ve `storage-js` kaynak kodu doğrulandı.

Uygulanan REST yolları:

```text
POST   /storage/v1/object/<bucket>/<key>
GET    /storage/v1/object/<bucket>/<key>
DELETE /storage/v1/object/<bucket>
```

Delete body:

```json
{"prefixes":["object-key"]}
```

Kararlar:

- Bucket private kabul edilir.
- Service-role key server-side tutulur ve RLS’yi bypass ettiği bilinerek
  kullanılır.
- Public URL otomatik üretilmez.
- Bucket adapter tarafından otomatik oluşturulmaz.
- Production objeleri için overwrite yerine yeni benzersiz key önerilir.

### 2. Provider-neutral storage kontratı

`src/services/storage-client.ts` stabilize edildi.

Yeni kontrat:

```text
store(key, data, options)
retrieve(key)
remove(key)
```

Stored object metadata:

- provider
- canonical key/path
- byte boyutu
- content type
- bucket
- etag

Object key güvenliği:

- absolute path normalize edilir ve root slash kaldırılır
- boş segment reddedilir
- `.` ve `..` reddedilir
- Windows separator normalize edilir

### 3. Local storage güncellemesi

`LocalStorageClient` yeni kontrata uyarlandı:

- content type metadata
- normalized key
- remove desteği
- test sonunda temp objeyi temizleme

### 4. Supabase HTTP adapter ve factory

Eklenen:

```text
src/adapters/supabase-storage-client.ts
src/adapters/storage-client-factory.ts
```

Özellikler:

- Authorization ve `apikey` headerları
- Private upload/download
- Content-Type ve cache-control
- Opsiyonel `x-upsert`
- Upload/download/remove
- Timeout ve transient retry
- Secret içermeyen hata mesajları

Retry güvenliği:

- Download ve delete idempotent olduğu için retry edilir.
- Upload yalnızca `upsert=true` ise retry edilir.
- Non-upsert upload response kaybında duplicate/overwrite riski nedeniyle
  otomatik tekrar edilmez.

Retry edilen durumlar:

```text
timeout
network TypeError
HTTP 408, 423, 429, 500, 502, 503, 504
```

### 5. Storage config

Eklenen:

```text
STORAGE_PROVIDER=local|supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=
SUPABASE_STORAGE_TIMEOUT_MS=30000
SUPABASE_STORAGE_MAX_ATTEMPTS=3
```

Dry-run normal workflow’da her zaman `LocalStorageClient` kullanır.

### 6. Explicit round-trip check

Eklenen:

```bash
npm run storage:check
```

Komut:

1. Benzersiz healthcheck objesi yükler.
2. Objeyi private endpoint’ten indirir.
3. Byte eşitliğini kontrol eder.
4. Objeyi siler.
5. Secret içermeyen sonucu `outputs/storage-checks/` altına yazar.

Credential bulunmadığında şu güvenli hata doğrulandı:

```text
SUPABASE_URL is required when STORAGE_PROVIDER=supabase.
```

Gerçek remote mutation yapılmadı.

### 7. Testler

Eklenen:

```text
tests/supabase-storage-client.test.ts
tests/storage-client-factory.test.ts
```

Test edilenler:

- Upload/download/delete REST path ve methodları
- Bearer ve apikey headerları
- URL encoding
- x-upsert
- ETag/canonical metadata
- Download retry
- Non-upsert upload’ın retry edilmemesi
- Traversal key reddi
- Service-role key’in hataya sızmaması
- Dry-run’ın local storage zorlaması
- Explicit check’in Supabase adapter seçmesi

### 8. Doğrulama

Son başarılı sonuç:

```text
49 test başarılı
12 JSON Schema başarılı
TypeScript typecheck başarılı
Build başarılı
Dry-run başarılı
QA skoru 1.0
Scheduler smoke test başarılı
```

---

## Faz 2.4 — JSON2Video render

Durum: **Kod ve lokal contract testleri tamamlandı**

Gerçek JSON2Video render testi, API key ve erişilebilir asset URL’leri
sağlanana kadar açık.

### 1. Resmi API sözleşmesi

JSON2Video resmi API dokümanı doğrulandı.

Akış:

```text
POST /v2/movies
GET  /v2/movies?project=<id>&format=simple
GET  movie.url
```

Authentication:

```text
x-api-key
```

Async status:

```text
pending
running
done
error
timeout
```

### 2. Versioned provider kontratları

Eklenen şemalar:

```text
schemas/json2video-movie-request.schema.json
schemas/json2video-submit-response.schema.json
schemas/json2video-status-response.schema.json
```

Toplam JSON Schema sayısı 15’e çıktı.

### 3. Movie builder

Eklenen:

```text
src/services/json2video-movie-builder.ts
```

Builder davranışı:

- custom 1080×1920 canvas
- ortak scene manifest sırasını korur
- her scene için tek image elementi
- `resize: cover`
- global audio
- global subtitle
- global CEFR badge text
- `client-data` içinde topic/level/scene ID provenance
- local path veya renderer tarafından erişilemeyen refleri reddeder

### 4. Submit/poll/download adapterı

Eklenen:

```text
src/adapters/json2video-render-client.ts
src/adapters/render-client-factory.ts
```

Güvenlik ve güvenilirlik:

- `POST /movies` non-idempotent kabul edildi ve otomatik retry edilmedi.
- Status polling ve MP4 download transient hatalarda retry edilir.
- API key hata veya metadata’ya yazılmaz.
- Poll timeout sınırlıdır.
- Async `error` ve `timeout` hard fail’dir.
- Project ID drift reddedilir.
- 1080×1920 resolution drift reddedilir.
- Download edilen final dosya MP4 `ftyp` signature ile doğrulanır.

### 5. Config ve explicit check

Eklenen:

```text
RENDER_PROVIDER=mock|json2video
JSON2VIDEO_API_KEY=
JSON2VIDEO_API_BASE_URL=https://api.json2video.com/v2
JSON2VIDEO_QUALITY=high
JSON2VIDEO_REQUEST_TIMEOUT_MS=30000
JSON2VIDEO_POLL_INTERVAL_MS=3000
JSON2VIDEO_POLL_TIMEOUT_MS=600000
JSON2VIDEO_POLL_MAX_ATTEMPTS=3
```

Komut:

```bash
npm run render:check -- \
  --image-url "https://..." \
  --audio-url "https://..." \
  --subtitle-url "https://..." \
  --levels A1 \
  --duration 5
```

Komut gerçek movie submit/poll/download yapar ve
`outputs/render-checks/<run-id>/` altına payload, provider JSON, result ve MP4
yazar.

Credential bulunmadığında güvenli hata doğrulandı:

```text
JSON2VIDEO_API_KEY is required when RENDER_PROVIDER=json2video.
```

### 6. Testler

Eklenen:

```text
tests/json2video-movie-builder.test.ts
tests/json2video-render-client.test.ts
tests/render-client-factory.test.ts
```

Test edilenler:

- Ortak scene sırasının Movie JSON’a aynen aktarılması
- Audio/subtitle/badge bileşimi
- Local URL reddi
- Submit → running → done polling
- MP4 download ve signature
- Non-idempotent submit’in retry edilmemesi
- Polling 503 retry
- Async provider error mapping
- API key sızıntısı olmaması
- Dry-run mock render zorlaması
- Explicit check’in JSON2Video seçmesi

### 7. Doğrulama

Son başarılı sonuç:

```text
57 test başarılı
15 JSON Schema başarılı
TypeScript typecheck başarılı
Build başarılı
Dry-run başarılı
QA skoru 1.0
Scheduler smoke test başarılı
```

---

## Faz 2.5 — Signed private asset delivery

Durum: **Tamamlandı**

### Yapılanlar

- `StorageClient.createSignedReadUrl()` kontratı eklendi.
- Supabase signed URL endpoint’i uygulandı:

```text
POST /storage/v1/object/sign/<bucket>/<key>
{"expiresIn": <seconds>}
```

- Local storage signed URL üretmediği için açık `NotImplementedError` davranışı
  eklendi.
- Signed URL:
  - yalnızca transient render payload’da kullanılıyor,
  - kalıcı manifestte `supabase://bucket/key` ref ile değiştiriliyor,
  - summary/log/level package içine yazılmıyor.
- Expiry’nin render poll penceresini kapsaması zorunlu hale getirildi.
- Supabase service-role key signed URL’ye veya hatalara yazılmıyor.

### Test

- Signed URL endpoint/body doğrulandı.
- Dönen relative `signedURL` doğru storage base URL ile birleştirildi.
- URL içinde service-role key bulunmadığı doğrulandı.

---

## Faz 2.6 — Multi-level real-provider integration orchestration

Durum: **Kod ve lokal entegrasyon testleri tamamlandı**

Gerçek provider credentiallarıyla çalışma açık.

### Orkestrasyon

Eklenen:

```text
src/workflows/run-single-level-integration-check.ts
src/cli/integration-check.ts
```

Dosya adı geriye uyumluluk için single-level adını koruyor; içinde generic
`runMultiLevelIntegrationCheck()` bulunuyor.

Akış:

```text
1 topic
  → shared scene plan
  → scene başına 1 OpenAI image
  → scene başına 1 Supabase private upload
  → scene başına transient signed URL
  → seçili her CEFR level için LingRoot Core package
  → seçili her level için sıralı JSON2Video render
  → local güvenli review çıktısı
  → remote integration image cleanup
```

### Kritik invariant

Test ile:

```text
1 scene + 2 level = 1 image generation + 1 upload + 2 render
```

doğrulandı. Level başına görsel üretimi yapılmıyor.

### Güvenli output

Her level için:

```text
level-package.json
script.txt
subtitles.srt
subtitles.vtt
render-payload.json
youtube-metadata.json
instagram-metadata.json
render-result.json
video.mp4
```

oluşturuluyor.

Kalıcı dosyalarda:

- Signed URL tokenı yok.
- LingRoot Core audio/subtitle URL’si yok.
- API key yok.
- Visual manifest canonical `supabase://bucket/key` taşıyor.
- Remote image objeleri `finally` içinde siliniyor.

### Integration report

Eklenen:

```text
schemas/integration-check-report.schema.json
```

Report:

- run/topic/level bilgisi
- canonical storage objectleri
- secret-free render sonuçları
- `secretsPersisted: false`

taşıyor ve yazılmadan önce schema ile doğrulanıyor.

Toplam JSON Schema sayısı 16 oldu.

### CLI

Minimum:

```bash
npm run integration:check -- \
  --topic "Why do people forget new words?" \
  --levels A1 \
  --scenes 1 \
  --duration 15
```

Multi-level:

```bash
npm run integration:check -- \
  --topic "Why do people forget new words?" \
  --levels A1,A2,B1,B2,C1,C2 \
  --scenes 2 \
  --duration 30
```

Signed URL minimum expiry:

```text
(render poll timeout × level sayısı) + 10 dakika
```

### Test ve doğrulama

Eklenen:

```text
tests/single-level-integration-check.test.ts
```

Test edilenler:

- Signed URL’nin render sırasında kullanılması
- Signed tokenın kalıcı summary’ye yazılmaması
- Core media URL’lerinin kalıcı output’a yazılmaması
- Remote cleanup
- Multi-level ortak görsel reuse
- Level render sırası
- Integration report schema

Son sonuç:

```text
61 test başarılı
16 JSON Schema başarılı
TypeScript typecheck başarılı
Build başarılı
Dry-run başarılı
QA skoru 1.0
Scheduler smoke test başarılı
```

---

## Faz 3.1 — YouTube private resumable upload

Durum: **Kod ve lokal contract testleri tamamlandı; gerçek credential kontrolü
bekliyor**

### Yapılanlar

- Provider-neutral `YouTubeClient` ve private upload result kontratı eklendi.
- OAuth refresh token ile geçici access token alma akışı uygulandı.
- `videos.insert` resumable session’ı `privacyStatus=private` ve
  `notifySubscribers=false` ile sınırlandı.
- Session başlatma non-idempotent kabul edilerek kör retry engellendi.
- Belirsiz/retryable upload hatasında session offset’i sorgulanıp kalan
  byte’lardan devam edildi.
- OAuth tokenlar log ve output dosyalarından uzak tutuldu.
- Explicit gerçek mutation komutu eklendi:

```bash
npm run youtube:check -- \
  --video "outputs/.../video.mp4" \
  --metadata "outputs/.../youtube-metadata.json"
```

### Test ve doğrulama

- OAuth refresh request’i ve private upload metadata’sı lokal HTTP server ile
  doğrulandı.
- Transient upload hatası sonrası status query ve resume davranışı test edildi.
- Public metadata’nın network çağrısından önce reddedildiği doğrulandı.
- Faz 3.1 sonunda tüm suite 66 teste ulaştı.
- Gerçek credential bulunmadığı için remote YouTube videosu oluşturulmadı.

---

## Faz 3.2 — YouTube private playlist yönetimi

Durum: **Kod ve lokal contract testleri tamamlandı; gerçek credential kontrolü
bekliyor**

### API ve güvenlik kontratı

2026-06-22 tarihli resmi YouTube Data API dokümanına göre:

- `playlists.list`, authenticated kullanıcının playlistlerini `mine=true` ile
  ve sayfalı olarak tarar.
- Exact-title playlist varsa yalnızca `private` olduğunda yeniden kullanılır.
- Aynı başlıkta public veya unlisted playlist varsa hard-fail edilir.
- Eksik playlist `playlists.insert` ile `privacyStatus=private` oluşturulur.
- `playlistItems.list`, `playlistId + videoId` ile üyeliği kontrol eder.
- Mevcut üyelikte insert atlanır; eksik üyelik tek
  `playlistItems.insert` çağrısıyla eklenir.
- Playlist ve playlist-item create çağrıları non-idempotent olduğu için
  otomatik retry edilmez.
- Access token bellekte kısa süreli cache’lenir; output veya loga yazılmaz.

Resmi kaynaklar:

```text
https://developers.google.com/youtube/v3/docs/playlists/list
https://developers.google.com/youtube/v3/docs/playlists/insert
https://developers.google.com/youtube/v3/docs/playlistItems/list
https://developers.google.com/youtube/v3/docs/playlistItems/insert
```

### İsimlendirme ve CLI

Deterministik playlist isimleri:

```text
Topic playlist: <topic-title> | All Levels
Level playlist: <CEFR-level> English Listening
```

Explicit komut:

```bash
npm run youtube:playlist-check -- \
  --video-id "YOUTUBE_VIDEO_ID" \
  --topic-title "Why do people forget new words?" \
  --levels A1
```

Bir video yalnızca kendi CEFR level’ına eklenebildiği için komut tam bir level
kabul eder. Topic ve level playlistlerini bulur/oluşturur, sonra videoyu ikisine
duplicate-safe ekler. Sonuç
`outputs/youtube-playlist-checks/<run-id>.json` altında secret-free yazılır.

### Eklenen/değişen ana dosyalar

```text
src/services/youtube-client.ts
src/adapters/youtube-private-upload-client.ts
src/adapters/youtube-client-factory.ts
src/core/config.ts
src/cli/youtube-playlist-check.ts
tests/youtube-playlist-client.test.ts
docs/integrations/youtube-private-upload.md
```

Yeni config:

```text
YOUTUBE_DATA_API_BASE_URL=https://www.googleapis.com/youtube/v3
```

Playlist yönetimi için refresh token `youtube` veya `youtube.force-ssl`
scope’larından biriyle alınmalıdır; yalnız `youtube.upload` scope’u yeterli
değildir.

### Test ve doğrulama

Lokal contract testlerinde:

- Sayfalı exact-title private playlist bulma
- Eksik playlist’i private oluşturma
- Aynı başlıklı non-private playlist’i reddetme
- Mevcut video üyeliğinde insert atlama
- Eksik videoyu doğru resource body ile ekleme
- Access token cache’i

doğrulandı.

Son sonuç:

```text
18 test dosyası / 68 test başarılı
16 JSON Schema başarılı
TypeScript typecheck başarılı
Build başarılı
Dry-run başarılı
QA skoru 1.0
Scheduler smoke test başarılı
git diff --check başarılı
```

Credentialları bilerek boşaltılmış explicit
`youtube:playlist-check`, network mutation yapmadan
`YOUTUBE_CLIENT_ID is required.` hatasıyla güvenli durdu.

---

## Aktif işler

### 2026-07-18 — Codex / Admin YouTube üretim ve yayın parametreleri

- Durum: aktif
- Görev: `/admin/lingroot-media` ekranını profesyonel üretim operasyonu
  açısından incelemek; admin formu, Media API kontratı, worker ve YouTube
  release sınırlarını uyumlu hale getirerek anlamlı üretim/yayın parametreleri
  sunmak.
- İncelenen / sahip olunan kapsam:
  - `frontend/src/app/admin/lingroot-media/`
  - `frontend/src/services/mediaService.ts`
  - `frontend/src/types/media.ts`
  - `backend/constants/mediaFactory.js`
  - `backend/controllers/adminMediaController.js`
  - `backend/services/mediaCampaignService.js`
  - gerekli Media migration/dokümantasyon ve Video Factory worker kontratları

### 2026-07-17 — Codex / Alcatraz 6 seviyeli public YouTube seti

- Durum: tamamlandı — altı video ve yedi playlist public, YouTube read-back
  doğrulaması başarılı
- Görev: Kullanıcının açık talebiyle 1962 Alcatraz kaçışı konusunda A1-C2
  altı adet 6 dakikalık yatay videoyu Marin + yüksek ses kalitesiyle üretmek,
  QA yapmak ve ek onay beklemeden public YouTube release gerçekleştirmek.
- Operasyon kapsamı:
  - Gerçek LingRoot Core, OpenAI görsel/TTS ve YouTube API çağrıları
  - `apps/video-factory/outputs/topic-packages/` altında yeni paket
  - Operator approve ve public release kayıtları
  - YouTube video/playlist metadata ve görünürlük doğrulaması
- Paket / run:
  - `outputs/topic-packages/2026-07-17_the-1962-escape-from-alcatraz-prison-how-did-it-happen_20260717T112124Z-the-1962-escape-from-alcatraz-prison-how-did-it-happen`
  - `20260717T112124Z-the-1962-escape-from-alcatraz-prison-how-did-it-happen`
- Üretim sonucu:
  - 12 ortak 16:9 görsel, altı distinct CEFR script, OpenAI `marin`
    (`gpt-4o-mini-tts`) ve yüksek kalite mastering kullanıldı.
  - Nihai süreler: A1 `356.313s`, A2 `324.967s`, B1 `346.467s`,
    B2 `351.700s`, C1 `359.533s`, C2 `340.368s`.
  - Altı video da `1920x1080`, H.264 + AAC mono `48 kHz`.
  - Paket QA son çalıştırması: skor `1.0`, hata `0`, uyarı `0`.
  - Son kare örnekleri görsel olarak incelendi; seviye rozeti ve gömülü
    altyazılar okunaklı bulundu.
- Tarihsel doğruluk:
  - NPS ve FBI resmi kaynaklarıyla kapanış nedeni, bulunan kanıtlar ve
    kaçışçıların belirsiz akıbeti doğrulandı.
  - A1/B1/B2'deki üç yanıltıcı kapanış/kanıt ifadesi final videolardan
    ses-görüntü-altyazı senkronu birlikte korunarak çıkarıldı.
  - YouTube açıklamalarına resmi NPS/FBI kaynak bağlantıları ve kısa tarihsel
    not eklendi.
- Public YouTube sonucu:
  - A1: `GjdJHfuUhVs` — https://www.youtube.com/watch?v=GjdJHfuUhVs
  - A2: `E_EKfT9IncI` — https://www.youtube.com/watch?v=E_EKfT9IncI
  - B1: `9F1YIwjeUWM` — https://www.youtube.com/watch?v=9F1YIwjeUWM
  - B2: `Lh17XXrGwXg` — https://www.youtube.com/watch?v=Lh17XXrGwXg
  - C1: `tGbmjGHkHvQ` — https://www.youtube.com/watch?v=tGbmjGHkHvQ
  - C2: `Sg-YXTgcFOU` — https://www.youtube.com/watch?v=Sg-YXTgcFOU
  - Konu playlist'i: `PLClJIqiofk_c` —
    https://www.youtube.com/playlist?list=PLClJIqiofk_c
  - Seviye playlist'leri: A1 `PLJPA3Dy6CsLM`, A2 `PLGygsFrucqZA`,
    B1 `PLYkDIfBjUc7I`, B2 `PLFLv-BN9nbGc`, C1 `PLCesXd-L6J1k`,
    C2 `PLJreryU5qweQ`.
  - YouTube API geri okuması altı videonun `public`, `processed`,
    `succeeded`; yedi playlist'in `public` ve konu playlist'inin altı videoyu
    içerdiğini doğruladı.
- Operasyonel sağlamlaştırma:
  - OpenAI TTS çağrılarına parça başına timeout ve ağ hatası retry desteği
    eklendi (`backend/utils/audio/openaiTTS.js`).
  - Long-form JSON noktalama/cümle sayısı normalizasyonu ve C2 için süreyi
    koruyan kelime bütçesi toleransı eklendi
    (`backend/services/videoLevelPackageService.js`).
  - Uzun Core çağrıları için yerel Factory timeout'u `3600000ms`, deneme
    sayısı `1` yapıldı; `.env` git dışında kaldı.
  - Yanlış Google sesli ilk A1 çıktısı ve final öncesi orijinaller silinmedi;
    `/private/tmp/alcatraz-wrong-google-a1-20260717T120143Z`,
    `/private/tmp/alcatraz-original-overlength-videos-20260718` ve
    `/private/tmp/alcatraz-pre-factual-cut-videos-20260718` altında geri
    alınabilir tutuldu.
  - İlk playlist insert çağrısındaki geçici YouTube `409
    SERVICE_UNAVAILABLE`, idempotent release tekrarıyla video yüklemeden
    giderildi.
  - Değişen iki backend dosyası `node --check` ile; hedefli
    `videoLevelPackage.test.js` ise coverage kapalı çalıştırmada 4/4 test ile
    doğrulandı. Repo `git diff --check` başarılı.

### 2026-07-17 — Codex / Admin kontrollü 5–10 dk YouTube ve ses kalitesi

- Durum: tamamlandı (canlı migration ve gerçek üretim/yayın bekliyor)
- Görev: Yatay YouTube üretimini admin tarafından seçilen 5–10 dakika
  seçeneklerine genişletmek, ses kalite profilini kampanyadan TTS/mastering
  katmanına taşımak ve ilk uzun set varsayılanını 7 dakika + yüksek kalite
  yapmak.
- Sahip olunan dosyalar:
  - `backend/constants/mediaFactory.js`
  - `backend/controllers/adminMediaController.js`
  - `backend/controllers/videoLevelPackageController.js`
  - `backend/migrations/0103_media_long_form.sql`
  - `backend/migrations/0104_media_audio_quality.sql`
  - `backend/services/mediaCampaignService.js`
  - `backend/services/videoLevelPackageService.js`
  - `backend/utils/audio/audioMerger.js`
  - `backend/tests/mediaCampaignService.test.js`
  - `backend/tests/videoLevelPackage.test.js`
  - `frontend/src/app/admin/lingroot-media/page.tsx`
  - `frontend/src/app/admin/lingroot-media/[campaignId]/page.tsx`
  - `frontend/src/types/media.ts`
  - `apps/video-factory/schemas/lingroot-core-request.schema.json`
  - `apps/video-factory/src/core/types.ts`
  - `apps/video-factory/src/services/lingroot-core-client.ts`
  - `apps/video-factory/src/services/media-job-api-client.ts`
  - `apps/video-factory/src/cli/worker.ts`
  - `apps/video-factory/src/workflows/produce-topic.ts`
  - ilgili contract/workflow testleri ve Video Factory dokümantasyonu
- Yapılanlar:
  - Admin YouTube formatı 5, 6, 7, 8, 9 ve 10 dakikalık yatay seçeneklere
    genişletildi; yatay seçildiğinde 7 dakika, Marin ve yüksek kalite atanıyor.
  - `voiceQuality` (`standard` / `high`) kampanya tablosu, admin API, worker ve
    LingRoot Core v1 isteği boyunca taşındı.
  - Yüksek kalite 48 kHz / 192 kbps MP3 mastering ve EBU R128 uyumlu loudness
    normalizasyonunu etkinleştiriyor; standart profil 24 kHz / 128 kbps kalıyor.
  - Long-form script bütçesi ve prompt metni seçilen süreye göre dinamik hale
    getirildi; Factory duration/state/QA üst sınırı 600 saniyeye çıkarıldı.
  - `0104_media_audio_quality.sql` eklendi, `0103` süre constraint'i 600
    saniyeye genişletildi ve admin ayrıntısında süre/kalite görünür yapıldı.
- Doğrulama:
  - Backend hedefli 3 suite / 16 test başarılı.
  - Video Factory 36 test dosyası / 117 test başarılı.
  - 21 JSON Schema, Video Factory typecheck ve build başarılı.
  - Frontend `tsc --noEmit` başarılı.
  - Backend ilgili dosyalarda `node --check` ve repo `git diff --check`
    başarılı.
  - Frontend `next build`, çalışan `next dev` ile aynı `.next` alanında uzun
    süre beklediği için yalnız bu oturumun build process'leri durduruldu; mevcut
    dev server'a dokunulmadı.
- Kalan risk / sonraki adım:
  - `0103` ve `0104` production veritabanına henüz uygulanmadı.
  - Backend/frontend/media worker/quality worker deploy-restart edilmedi.
  - Gerçek 7 dakikalık set, konu seçilmediği için üretilmedi veya YouTube'a
    gönderilmedi; yayın yine QA + insan onayı + release kapılarını koruyor.

### 2026-07-16 00:44 — Codex / Kalıcı public YouTube politikası

- Durum: tamamlandı
- Görev: Kullanıcı talebiyle mevcut playlistleri public yapmak ve bundan
  sonraki onaylı release'lerde video + playlist public geçişini kalıcı çift
  güvenlik kapısına bağlamak.
- Sahip olunan dosyalar:
  - `.env`
  - `CLAUDE.md`
  - `src/services/youtube-client.ts`
  - `src/adapters/youtube-private-upload-client.ts`
  - `src/workflows/release-topic.ts`
  - `tests/youtube-playlist-client.test.ts`
  - `tests/release-topic.test.ts`
  - `docs/runbooks/production-workflow.md`
  - `docs/integrations/youtube-private-upload.md`
  - `gkn/CodexYapilan.md`
- Yapılanlar:
  - YouTube videos/playlists update kontratları resmi dokümandan doğrulandı.
  - Local `.env` çift kapısı `PUBLISH_MODE=auto_public` ve
    `AUTO_PUBLIC_PUBLISH=true` olarak kalıcı açıldı.
  - Release private-first upload, playlist üyeliği ve metadata tamamlandıktan
    sonra video + topic/CEFR playlist public geçişi yapacak şekilde genişletildi.
  - Existing public CEFR playlistleri sonraki topic release'lerinde güvenle
    yeniden kullanılabilir hale getirildi.
  - `The Seven Hills of Istanbul` topic playlist'i ve altı CEFR playlist'i
    public yapıldı.
  - README, CLAUDE ve YouTube/production runbook'ları güncellendi.
- Doğrulama:
  - YouTube read-back: 6/6 video ve 7/7 playlist `public`.
  - 34 test dosyasında 104 test geçti.
  - 21 JSON Schema, typecheck, build ve `git diff --check` geçti.
  - Production report `auto_public`; altı metadata dosyası `public` doğrulandı.
- Kalan risk/bloker:
  - Local komut çıktısına yansıyan OpenAI ve OAuth secretları kullanıcıyla
    koordineli döndürülmeli.
  - Public policy hâlâ QA-backed operator `approve` + `release` adımını korur;
    `produce` ve `daily` doğrudan yayın yapmaz.

### 2026-07-15 23:48 — Codex / YouTube OAuth kurulumu

- Durum: tamamlandı
- Görev: YouTube Data API OAuth bağlantısını güvenli biçimde hazırlamak,
  refresh token üretim yardımcısını eklemek ve private otomatik yükleme
  runbook'unu tamamlamak.
- Sahip olunan dosyalar:
  - `src/services/youtube-oauth.ts`
  - `src/cli/youtube-auth.ts`
  - `src/adapters/youtube-private-upload-client.ts`
  - `tests/youtube-auth.test.ts`
  - `tests/youtube-playlist-client.test.ts`
  - `package.json`
  - `.env.example`
  - `docs/integrations/youtube-private-upload.md`
  - `docs/runbooks/production-workflow.md`
  - `README.md`
  - `gkn/CodexYapilan.md`
- Yapılanlar:
  - Mevcut YouTube adapterı, release workflow'u ve boş credential durumu
    incelendi.
  - Google'ın güncel OAuth/loopback/Testing kuralları resmi dokümanlardan
    doğrulandı.
  - State + PKCE + offline access kullanan `youtube:auth` Desktop OAuth
    yardımcısı eklendi.
  - Yardımcı refresh token'ı yalnız git-ignore kapsamındaki `.env` içine yazar,
    dosya iznini `0600` yapar ve yetkili kanal adı/ID'sini doğrular.
  - `.env.example`, README ve YouTube/production runbook'ları güncellendi.
  - Mevcut yerel `.env` izni secret değerlerini korumak için `0600` yapıldı;
    YouTube client ID, client secret ve refresh token alanları dolduruldu.
  - OAuth kanal kontrolü `Ling Root` kanalı (`UCawrU_1MSrik9KTyMkOlj0w`) için
    başarıyla tamamlandı.
  - `The Seven Hills of Istanbul` gerçek paketi operator onayıyla A1-C2 altı
    private video olarak yüklendi.
  - Kullanıcının ayrı açık onayıyla geçici çift güvenlik kapısı
    (`PUBLISH_MODE=auto_public`, `AUTO_PUBLIC_PUBLISH=true`) altında altı video
    public'e geçirildi; bu kapılar `.env` içinde kalıcı açılmadı.
  - Topic playlist ve altı CEFR playlist'i oluşturulup üyelikleri doğrulandı;
    video metadata açıklamalarına çapraz bağlantılar yazıldı.
  - Yeni private playlistlerin YouTube API'de gecikmeli görünmesi nedeniyle
    alınan `playlistNotFound` için yalnız kesin 404'lerde üyeliği yeniden
    kontrol eden güvenli propagation retry eklendi.
  - YouTube Data API hataları token/query sızdırmadan method, endpoint ve
    provider reason koduyla tanılanabilir hale getirildi.
- Doğrulama:
  - 33 test dosyasında 102 test geçti.
  - 21 JSON Schema derlendi.
  - TypeScript typecheck ve build geçti.
  - `git diff --check` geçti.
  - Eksik client JSON denemesi network çağrısı yapmadan güvenli hata verdi.
  - Release preflight bütün 16 kontrolle ve sıfır hata ile geçti.
  - YouTube read-back kontrolünde altı videonun `private`, topic playlist'in
    altı üyeli ve her CEFR playlist'inin bir üyeli olduğu doğrulandı.
  - Public güncelleme sonrasında altı video YouTube API'de `public` döndü ve
    kimliksiz oEmbed isteklerinin tamamı HTTP 200 ile çözüldü.
- Kalan risk/bloker:
  - OAuth uygulaması Testing durumunda kaldığı sürece refresh token 7 gün sonra
    sona erebilir.
  - Sohbette paylaşılmış OAuth client secret Google Cloud'da döndürülmeli ve
    `.env` yeni secret ile güncellenmelidir.

Yeni çalışan aşağıdaki formatı kullanmalıdır:

```markdown
### YYYY-MM-DD HH:MM — Çalışan/oturum adı

- Durum: başladı | devam ediyor | tamamlandı | bloke
- Görev:
- Sahip olunan dosyalar:
- Yapılanlar:
- Doğrulama:
- Kalan risk/bloker:
```

---

## Açık işler ve önerilen sıra

### Öncelik 1 — Gerçek LingRoot Core ortam kontrolü

Gerekenler:

- `LINGROOT_CORE_API_URL`
- `LINGROOT_CORE_API_KEY`
- Backend endpoint’inin iki yeni JSON Schema ile uyumlu olması

Çalıştırılacak:

```bash
npm run core:check -- \
  --topic "Why do people forget new words?" \
  --levels A1 \
  --scenes 2 \
  --duration 45
```

Bu iş credential sağlanana kadar bloke kabul edilmez; Faz 2’nin diğer
adapterları paralel geliştirilebilir.

### Öncelik 2 — Gerçek OpenAI image ortam kontrolü

Gereken:

- `OPENAI_API_KEY`
- Image API erişimi ve yeterli quota

Çalıştırılacak:

```bash
npm run image:check -- \
  --topic "Why do people forget new words?" \
  --quality low \
  --size 1024x1536
```

### Öncelik 3 — Gerçek Supabase ortam kontrolü

Gereken:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Mevcut private `SUPABASE_STORAGE_BUCKET`

Çalıştırılacak:

```bash
npm run storage:check
```

### Öncelik 4 — Render sağlayıcısı

Kod ve lokal test tamamlandı. Gerçek kontrol için:

```bash
npm run render:check -- \
  --image-url "https://..." \
  --audio-url "https://..." \
  --subtitle-url "https://..." \
  --levels A1 \
  --duration 5
```

### Öncelik 5 — YouTube gerçek private kontrolleri

Önce yalnız upload:

```bash
npm run youtube:check -- \
  --video "outputs/.../video.mp4" \
  --metadata "outputs/.../youtube-metadata.json"
```

Upload private doğrulandıktan sonra dönen video ID ile:

```bash
npm run youtube:playlist-check -- \
  --video-id "YOUTUBE_VIDEO_ID" \
  --topic-title "Why do people forget new words?" \
  --levels A1
```

Playlist komutu için refresh token’ın `youtube` veya `youtube.force-ssl`
scope’una sahip olduğu ayrıca doğrulanmalıdır.

### Öncelik 6 — Gerçek altı-level doğrulama

Üç farklı topic için:

- A1–C2 gerçek Core paketleri
- Tek ortak görsel seti
- Gerçek render
- QA raporu
- İnsan review paketi

üretilmeli.

### Öncelik 7 — Instagram kontrollü paketleme sınırı

YouTube gerçek kontrolleri credential beklerken paralel ilerletilebilecek
sonraki kod milestone’u:

- Instagram’a uygun mevcut metadata/media paketini doğrulama
- Önce manuel/review handoff
- API publishing’i normal production workflow’dan ayrı tutma
- Public mutation için ayrıca açık yayın gate’i

---

## Bilinen riskler ve notlar

- Bu oturum sürerken Faz 0–3.1 ve Faz 3.2 adapter/config değişiklikleri
  `18c4675`–`79758ed` commit serisiyle `main` dalına alındı.
- Faz 3.2 playlist CLI, contract testi ve dokümantasyon değişiklikleri çalışma
  ağacında henüz commitlenmedi. Paralel çalışanlar `git reset`,
  `git checkout --`, toplu dosya silme veya kullanıcı değişikliklerini geri
  alma işlemi yapmamalıdır.
- Gerçek LingRoot backend endpoint’i henüz bu repodan doğrulanmadı.
- OpenAI image adapter tamamlandı fakat gerçek API key ile denenmedi.
- Supabase Storage adapter tamamlandı fakat gerçek credential ile denenmedi.
- JSON2Video adapter tamamlandı fakat gerçek credential ile denenmedi.
- Signed URL katmanı tamamlandı; gerçek credentiallarla doğrulanmadı.
- YouTube private upload ve playlist adapterları tamamlandı; gerçek OAuth
  credentiallarıyla denenmedi.
- Playlist create/insert API’si idempotency key sunmadığı için aynı kanal
  üzerinde eşzamanlı iki playlist komutu çalıştırılmamalıdır.
- Üretilen medya dosyaları Faz 1’de placeholder’dır.
- `outputs/` ve `logs/` git-ignore kapsamındadır.
- Scheduler gerçek LaunchAgent olarak yüklenmedi; yalnızca preview ve smoke test
  yapıldı.

---

## Değişiklik günlüğü

### 2026-06-22 08:45 — Claude (proje yönetimi)

- Durum: tamamlandı
- Görev: Commitlenmemiş Faz 1/2/3 working tree'sini doğrulayıp güvene almak ve
  main'e push etmek. (Codex eşzamanlı çalışıyordu, kullanıcı talebiyle durdu.)
- Yapılanlar:
  - Codex'in iddiaları bağımsız doğrulandı (test/şema/typecheck/dry-run/QA).
  - ~107 dosyalık Faz 1+2 working tree'si 5 mantıklı commit'e bölünüp push edildi
    (docs / core / schemas / source / tests).
  - Codex'in Faz 3 YouTube increment'i (playlist-check CLI + client testleri)
    yeşil doğrulandıktan sonra ayrı commit ile push edildi.
  - `.env`, `.env.example`'dan oluşturuldu (gitignore'da). Core URL/KEY henüz boş.
- Doğrulama:
  - 68 test, 16 JSON Schema, typecheck, dry-run QA 1.0 — hepsi yeşil.
  - HEAD == origin/main == 9f3e833.
  - Paylaşılan görsel kuralı çıktıda uçtan uca doğrulandı (6 seviye aynı görsel).
- Kalan risk/bloker:
  - Hiçbir gerçek provider credential ile denenmedi (Core/OpenAI/Supabase/
    JSON2Video/YouTube). Öncelik 1: LingRoot Core URL+KEY bekliyor.
  - Eşzamanlı iki agent aynı working tree'de risk yarattı; tek seferde tek agent
    önerilir.

### 2026-06-22 08:20 — Codex

- Durum: tamamlandı
- Görev: Faz 3.1 YouTube private resumable upload ve Faz 3.2 private playlist
  yönetimi.
- Yapılanlar:
  - OAuth refresh ve private resumable upload adapterı tamamlandı.
  - Upload resume/status query güvenliği eklendi.
  - Private playlist exact-title find/create eklendi.
  - Duplicate-safe playlist item insert eklendi.
  - Access token cache ve YouTube Data API base config eklendi.
  - `youtube:check` ve `youtube:playlist-check` explicit komutları eklendi.
  - README, CLAUDE.md, roadmap, service/adapter/CLI ve integration
    dokümantasyonu güncellendi.
- Doğrulama:
  - 18 test dosyasında 68 test geçti.
  - 16 JSON Schema derlendi.
  - Typecheck, build, dry-run, QA, scheduler smoke ve `git diff --check` geçti.
  - Credentiallar boşken playlist komutu remote mutation yapmadan güvenli hata
    verdi.
- Kalan risk:
  - Gerçek YouTube credentiallarıyla upload/playlist mutation yapılmadı.
  - Playlist yönetimi için refresh token’ın `youtube` veya
    `youtube.force-ssl` scope’u gereklidir.
  - Playlist CLI, yeni playlist contract testi ve son dokümantasyon
    güncellemeleri henüz commitlenmedi.
- Sıradaki plan:
  - Credential varsa gerçek private upload, ardından playlist kontrolü.
  - Credential yoksa Instagram review/manual packaging milestone’u.

### 2026-06-22 08:08 — Codex

- Durum: tamamlandı
- Görev: Faz 2.5 signed delivery ve Faz 2.6 multi-level gerçek-provider
  orkestrasyonu.
- Yapılanlar:
  - Supabase signed read URL desteği eklendi.
  - Signed tokenların persistence’ı engellendi.
  - Multi-level integration workflow ve CLI eklendi.
  - Ortak image generation/upload bütün level’larda tekrar kullanıldı.
  - Safe subtitles, metadata, render payload/result ve report üretildi.
  - Integration report schema eklendi.
- Doğrulama:
  - 61 test geçti.
  - 16 JSON Schema derlendi.
  - Typecheck, build, dry-run, QA ve scheduler smoke test geçti.
  - Credential yokken explicit integration check güvenli hata verdi.
- Kalan risk:
  - Gerçek provider credentiallarıyla ücretli/mutating uçtan uca çalışma
    yapılmadı.
  - Çalışma ağacı hâlâ commitlenmedi.
- Sıradaki plan:
  - Credential sağlanırsa gerçek A1 integration check.
  - Credential yoksa Faz 3 YouTube private upload kontratı.

### 2026-06-22 00:29 — Codex

- Durum: tamamlandı
- Görev: Faz 2.4 JSON2Video render provider kontratı ve adapterı.
- Yapılanlar:
  - Resmi JSON2Video movie/status sözleşmesi doğrulandı.
  - Üç provider JSON Schema eklendi.
  - Movie JSON builder eklendi.
  - Non-idempotent submit + retryable poll/download adapterı eklendi.
  - MP4 ve resolution doğrulaması eklendi.
  - Render config/factory ve `render:check` eklendi.
  - README, CLAUDE.md, roadmap ve integration dokümanı güncellendi.
- Doğrulama:
  - 57 test geçti.
  - 15 JSON Schema derlendi.
  - Typecheck, build, dry-run, QA ve scheduler smoke test geçti.
  - `render:check`, API key yokken güvenli hata verdi.
- Kalan risk:
  - Gerçek JSON2Video kredili render yapılmadı.
  - Private artifact signed URL entegrasyonu eksik.
  - Çalışma ağacı hâlâ commitlenmedi.
- Sıradaki plan: Supabase signed URL ve single-level gerçek orchestration.

### 2026-06-22 00:19 — Codex

- Durum: tamamlandı
- Görev: Faz 2.3 provider-neutral storage ve Supabase Storage adapterı.
- Yapılanlar:
  - Supabase resmi upload/access/private-bucket dokümanları doğrulandı.
  - Storage kontratı store/retrieve/remove olarak stabilize edildi.
  - Local storage yeni kontrata geçirildi.
  - Supabase private HTTP adapterı ve factory eklendi.
  - Object key traversal, service-role secret ve idempotent retry güvenliği
    eklendi.
  - `npm run storage:check` round-trip komutu eklendi.
  - README, CLAUDE.md, roadmap ve integration dokümanı güncellendi.
- Doğrulama:
  - 49 test geçti.
  - 12 JSON Schema derlendi.
  - Typecheck, build, dry-run, QA ve scheduler smoke test geçti.
  - Dry-run QA skoru 1.0.
  - `storage:check`, credential yokken güvenli hata verdi.
- Kalan risk:
  - Gerçek Supabase upload/download/delete testi credential olmadığı için
    yapılmadı.
  - Çalışma ağacı hâlâ commitlenmedi.
- Sıradaki plan: Render provider kontratı ve adapterı.

### 2026-06-22 00:13 — Codex

- Durum: tamamlandı
- Görev: Faz 2.2 OpenAI görsel üretim sağlayıcısı.
- Yapılanlar:
  - Güncel resmi OpenAI Image API davranışı doğrulandı.
  - Provider-neutral image request/result şemaları eklendi.
  - Scene planning, image provider sınırından ayrıldı.
  - OpenAI HTTP image adapterı ve factory eklendi.
  - Binary signature, provenance, moderation, timeout ve retry kontrolleri
    eklendi.
  - `npm run image:check` eklendi.
  - QA image provenance kontrolü eklendi.
  - Paket tarihi scheduler timezone’una bağlandı.
  - README, CLAUDE.md, roadmap ve integration dokümanı güncellendi.
- Doğrulama:
  - 42 test geçti.
  - 12 JSON Schema derlendi.
  - Typecheck, build, dry-run, QA ve scheduler smoke test geçti.
  - Dry-run QA skoru 1.0.
  - `image:check`, API key yokken güvenli ve açık hata verdi.
- Kalan risk:
  - Gerçek ücretli OpenAI image çağrısı API key olmadığı için yapılmadı.
  - Çalışma ağacı hâlâ commitlenmedi.
- Sıradaki plan: Storage kontratı ve provider adapterı.

### 2026-06-21 23:59 — Codex

- Durum: tamamlandı
- Görev: `gkn/CodexYapilan.md` dosyasını ortak koordinasyon günlüğüne çevirmek.
- Yapılanlar:
  - Faz 0, Faz 1 ve Faz 2.1 çalışmaları geriye dönük kaydedildi.
  - Mevcut doğrulama sonuçları yazıldı.
  - Açık işler, riskler ve paralel çalışma protokolü eklendi.
  - Bu dosyanın her çalışma sonrasında güncellenmesi zorunlu hale getirildi.
- Doğrulama: Dosya yolu ve mevcut git durumu kontrol edildi.
- Kalan risk: Faz 1/Faz 2 değişiklikleri henüz commitlenmedi.
