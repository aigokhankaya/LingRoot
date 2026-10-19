# Production Workflow

## Amaç

Bu runbook, bir LingRoot konusunu ortak gorsellerle A1-C2 seviyelerinde alti
video olarak uretip insan onayindan sonra YouTube'a yüklemek icindir. Upload
her zaman private başlar; yayın hedefi çift environment kapısıyla seçilir.

## Onkosullar

Gercek uretimden once `.env` icinde asagidaki provider'lar etkin olmalidir:

```text
DRY_RUN=false
LINGROOT_TOPIC_PROVIDER=http
LINGROOT_CORE_PROVIDER=http
IMAGE_PROVIDER=openai
STORAGE_PROVIDER=local
RENDER_PROVIDER=ffmpeg
```

Topic endpoint, `POST /internal/video-topic-brief` sozlesmesine gore
`TopicBrief` dondurmelidir. API URL/key alanlari, OpenAI, Supabase,
JSON2Video ve YouTube credential'lari yalnizca secili provider icin `.env`
icinde bulunur. Birincil akista FFmpeg, `ffprobe`, `subtitles` ve `drawtext`
filter'lari PATH uzerinde olmalidir. `STORAGE_PROVIDER=supabase` istege bagli
kalici arsivdir; local FFmpeg render imzali URL gerektirmez.

Ucretli bulut fallback'i gerekiyorsa `RENDER_PROVIDER=json2video` ve
`STORAGE_PROVIDER=supabase` birlikte secilir. Bu durumda JSON2Video API key'i
ve signed asset URL'leri gerekir.

Credential ve yerel arac denetimi maliyet olusturmadan yapilir:

```bash
npm run preflight
```

## Guvenli mock denemesi

Bu komut ag cagrisi veya YouTube mutation'i yapmaz:

```bash
DRY_RUN=true npm run produce -- \
  --topic "Why do people forget new words?" \
  --levels A1,A2 \
  --scenes 2
```

## Gercek production run

Preflight basarili olduktan sonra bir konu icin alti seviye paket olusturulur:

```bash
npm run produce -- \
  --topic "Why do people forget new words?" \
  --levels A1,A2,B1,B2,C1,C2 \
  --scenes 4
```

Run su dosyalari uretir:

```text
outputs/topic-packages/<date>_<topic>_<run-id>/
  run-state.json
  topic-package.json
  qa-report.json
  production-report.json
  common/images/
  levels/<CEFR>/video.mp4
  review/index.html
```

`run-state.json` signed URL, access token veya API key icermez. Yerel FFmpeg
render sonucu dosya yolu hemen kaydedilir. JSON2Video fallback'i secildiginde
project ID, YouTube upload tamamlandiginda video ID hemen bu dosyaya kaydedilir.

Kesilen bir run ayni paketten devam ettirilir:

```bash
npm run produce -- --resume "outputs/topic-packages/<package-dir>"
```

## Review ve YouTube release

İlk kurulumda Google Cloud Desktop OAuth client JSON'u kullanılarak kanal
bağlantısı bir kez oluşturulur:

```bash
npm run youtube:auth -- \
  --client-json "/tam/yol/client_secret_....json"
```

Komut credentialları git-ignore kapsamındaki `.env` dosyasına yazar ve yetki
verilen kanal adını/ID'sini gösterir. Ayrıntılı Cloud Console adımları için
[YouTube private upload entegrasyonu](../integrations/youtube-private-upload.md)
kullanılır.

`review/index.html`, ortak gorselleri, alti video preview'unu, scriptleri ve
QA bulgularini birlikte gosterir. QA basariliysa operator paketi acikca
onaylar:

```bash
npm run approve -- --package "outputs/topic-packages/<package-dir>"
```

Yalnizca `review_approved` durumundaki ve gercek medya iceren bir paket
yuklenebilir:

```bash
npm run release -- --package "outputs/topic-packages/<package-dir>"
```

Release, tek komutta her videoyu önce private yukler, topic playlist'i ile ilgili CEFR
playlist'ine ekler ve tum video ID'leri olustuktan sonra aciklamalara diger
seviyelerin ve topic playlist'inin baglantilarini yazar. Yeniden calisma,
state'te kayitli video ID'lerini tekrar yuklemez.

Kalıcı review-gated public yayın için `.env`:

```text
PUBLISH_MODE=auto_public
AUTO_PUBLIC_PUBLISH=true
```

Bu iki değer birlikteyse release sonunda videolar, topic playlist'i ve CEFR
playlistleri public yapılır. Değerlerden biri kapalıysa sonuç private kalır.
`produce` ve `daily` hiçbir durumda doğrudan public yayın yapmaz; operator
onayı zorunludur.

## Scheduler

`npm run daily` yalnizca `config/content-calendar.example.json` icinde bugunun
`status: "approved"` kaydini kabul eder. Sessiz fallback topic yoktur.
Scheduler production+review paketi uretir; YouTube release her zaman ayri bir
operator adimidir.

## Canliya gecis sirasi

1. `npm run preflight`
2. `core:check`, `image:check`, `storage:check` (Supabase secildiyse) ve `render:check` (JSON2Video secildiyse)
3. Tek seviye gercek `produce`
4. Tek konu, alti seviye ve hedef privacy ile `release`
5. Uc farkli konu icin onayli run
6. `launchd` scheduler kurulumu
