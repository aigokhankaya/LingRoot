# LingRoot Video Factory

Video Factory bu repoda `apps/video-factory` altında bulunur, ancak LingRoot web
sunucusundan ayrı bir worker/CLI süreci olarak çalışır. FFmpeg render işleri API
request handler'larında başlatılmaz.

## Sorumluluklar

- LingRoot API: TopicBrief, CEFR script, TTS MP3 ve altyazı sözleşmeleri.
- Video Factory: dört ortak görsel, A1-C2 altı render, teknik/CEFR QA ve review.
- YouTube: bu aşamanın dışında; yalnızca insan onayı sonrasında release komutu.

## Internal API

Her iki endpoint `Authorization: Bearer <LINGROOT_INTERNAL_API_KEY>` kullanır.
Geçiş sürecinde backend `VIDEO_FACTORY_API_KEY` adını da destekler.

```text
POST /internal/video-topic-brief
POST /internal/video-level-package
```

Factory'nin `.env` dosyası ana uygulamadan ayrıdır ve Git'e eklenmez. Yerel
geliştirmede API adresi `http://127.0.0.1:5001` olabilir; başka makinedeki worker
için kalıcı, DNS'te çözümlenen HTTPS adresi gerekir. `audio_url` ve
`subtitle_url` worker tarafından indirilebilir olmalıdır.

## Bir Konudan Altı Video

Factory iki üretim profili taşır:

| Profil | CLI | Çıktı | Süre | Sahne |
| --- | --- | --- | --- | --- |
| Dikey kısa | `--format short` | 1080x1920 | 30-60 sn | 4 varsayılan |
| Yatay YouTube | `--format long` | 1920x1080 | 300-600 sn | 12 varsayılan |

Yatay ve dikey hedefler tek kampanyada karıştırılmaz. Yatay format yalnızca
YouTube hedefiyle ayrı kampanya olarak üretilir. Uzun profil Core'a sahne
kimlikleriyle birlikte `scene_briefs` gönderir; böylece CEFR metni ortak görsel
akışla aynı sırada kalır.

```bash
npm run video:check
npm run video:preflight
npm run video:produce -- \
  --topic "What are the seven hills of Istanbul?" \
  --levels A1,A2,B1,B2,C1,C2 \
  --scenes 4
```

Çıktı `apps/video-factory/outputs/topic-packages/` altında oluşur. Başarılı bir
pakette altı gerçek `video.mp4`, `qa-report.json`, `production-report.json` ve
`review/index.html` bulunur. Kabul için QA durumu `review_ready` olmalı ve her
MP4 ffprobe ile 1080x1920, H.264/AAC olarak doğrulanmalıdır.

Standart yatay YouTube seti:

```bash
npm run video:produce -- \
  --format long \
  --duration 420 \
  --voice openai_marin \
  --topic "Why do songs get stuck in your head?" \
  --levels A1,A2,B1,B2,C1,C2 \
  --scenes 12
```

Bu profil 1920x1080 H.264/AAC üretir ve her seviyenin gerçek süresini 300-600
saniye aralığında doğrular. Admin panelinde 5, 6, 7, 8, 9 ve 10 dakika
seçenekleri bulunur; ilk uzun setin varsayılanı 7 dakikadır. Ses kalitesi
`standard` veya `high` seçilebilir. `high`, 48 kHz / 192 kbps çıktı ve ses
yüksekliği normalizasyonu uygular; uzun YouTube kampanyası varsayılan olarak
`openai_marin` + `high` kullanır. OpenAI sesi sentetiktir; YouTube açıklamasına
AI anlatım bildirimi otomatik eklenir.

## LingRoot Media Worker

Admin panelinden kuyruğa eklenen kampanyalar aynı render akışını ayrı worker
sürecinde kullanır:

```bash
npm run media:worker
# Kuyruktaki tek işi alıp çıkmak için:
npm run media:worker:once
```

Worker `POST /internal/media-jobs/claim` ile bir işi lease eder; heartbeat,
ilerleme, tamamlanma ve hata durumlarını internal API'ye geri yazar. Gerekli
ayarlar `apps/video-factory/.env` içinde `MEDIA_API_URL` ve `MEDIA_API_KEY`'dir.
Bu anahtar backend'deki `LINGROOT_INTERNAL_API_KEY` ile aynı olmalıdır.

Yerel artifact URI'ları `file://` olarak kaydedilir. Admin panelinden uzaktan
önizleme isteniyorsa worker çıktıları kalıcı obje depolamaya aktarılmalı ve
`MEDIA_ARTIFACT_PUBLIC_BASE_URL` tanımlanmalıdır.

## Agent QA Worker

Render işi tamamlandığında backend ayrı bir kalite işi oluşturur. Bu iş,
FFmpeg worker'dan bağımsız bir process tarafından tüketilir:

```bash
npm run media:quality-worker
# Kuyruktaki tek kalite işini alıp çıkmak için:
npm run media:quality-worker:once
```

Kalite worker'ı `topic-package.json`, teknik `qa-report.json`, ortak görseller ve
platform metadata'sını okur. Dört uzman assessment ile deterministik supervisor
kararını `agent-quality-report.json` dosyasına yazar ve internal kalite API'sine
gönderir.

```dotenv
QUALITY_AGENT_PROVIDER=mock       # mock | openai
QUALITY_AGENT_MODE=shadow         # shadow | enforced
QUALITY_AGENT_MODEL=gpt-5-mini
QUALITY_AGENT_TIMEOUT_MS=90000
QUALITY_AGENT_MAX_ATTEMPTS=2
QUALITY_AGENT_RUBRIC_VERSION=v1
QUALITY_AGENT_IMAGE_DETAIL=low
```

`mock` provider deterministik smoke/kabul testi içindir. `openai` provider
Responses API'ye strict JSON schema ve görsel input gönderir; anahtar
`QUALITY_AGENT_API_KEY` veya `OPENAI_API_KEY` üzerinden alınır. Worker yalnızca
yerel `file://` paketlerini açar. Ayrı bir makinede çalışacaksa remote paket
indirme/senkronizasyonu eklenmeden HTTP artifact URI kullanılmamalıdır.

Agent QA yayın yapmaz, credential taşımaz ve otomatik olarak yeni render
başlatmaz. `shadow` modda sonuç operatöre gösterilir ancak kampanyayı bloke
etmez. `enforced` mod yalnızca kalibre edilmiş rubric sonrası kullanılmalıdır.

## Yayın Sınırı

`produce` YouTube'a yükleme yapmaz. Sonraki aşamada operatör paketi ayrı ayrı
`approve` ve `release` komutlarıyla yayınlar. OAuth secret'ları yalnızca bu
release ortamında bulunmalıdır.
