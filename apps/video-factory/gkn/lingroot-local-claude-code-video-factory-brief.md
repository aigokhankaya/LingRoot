# LingRoot Local Claude Code Video Factory — Nihai Uygulama Brief’i

> Arşiv notu: Bu dosya ilk kapsam ve fikir kaynağıdır; aktif teknik kontrat
> değildir. Güncel kullanım için `README.md`, kalıcı agent kuralları için
> `CLAUDE.md`, ürün/mimari kararları için `docs/` ve veri kontratları için
> `schemas/` kullanılmalıdır.

## 1. Proje Tanımı

Bu proje, LingRoot için YouTube Shorts ve Instagram Reels odaklı, bilgisayar açıkken lokal olarak çalışan, Claude Code tarafından yönetilen sosyal medya video üretim sistemidir.

Projenin ana amacı, LingRoot’un temel ürün vaadini sosyal medya üzerinde düzenli, ölçeklenebilir ve seviye bazlı video içerikleriyle göstermektir.

LingRoot’un ürün vaadi:

> Same topic. Your level.  
> Aynı konu. Senin seviyen.

Sistem tek bir konu seçer. Örneğin:

```text
Why do people forget new words?
```

Bu konu için ortak bir görsel akış oluşturur. Aynı görseller A1, A2, B1, B2, C1 ve C2 seviyelerinin tamamında kullanılır. Her seviyede değişen unsurlar şunlardır:

- Seslendirme metni
- Ses dosyası
- Konuşma hızı
- Altyazı metni
- Altyazı yoğunluğu
- Video üzerindeki seviye etiketi
- YouTube başlığı
- YouTube açıklaması
- Instagram caption
- Hashtag setleri
- Yayın metadata’sı

Değişmeyen unsurlar:

- Konu
- Ana fikir
- Görsel sahne sırası
- Görsel dosyaları
- Genel video akışı
- LingRoot marka dili

Sonuçta sistem 1 konu için 6 ayrı kısa video üretir:

```text
A1 English Listening
A2 English Listening
B1 English Listening
B2 English Listening
C1 English Listening
C2 English Listening
```

Bu sistem n8n kullanmayacaktır. Tüm operasyon Claude Code tarafından kurulacak repo, lokal scriptler ve bilgisayar açıkken çalışan zamanlayıcı üzerinden yönetilecektir.

---

## 2. Temel Mimari Karar

Bu proje mevcut LingRoot ana projesinin içine gömülmeyecektir. Ayrı bir repo olarak kurulacaktır.

Önerilen repo adı:

```text
lingroot-video-factory
```

Mimari karar:

```text
LingRoot ana proje = kullanıcıya çalışan ürün
LingRoot Video Factory = sosyal medya üretim otomasyonu
LingRoot Core API = ikisinin ortak kullandığı ses / altyazı / CEFR servis katmanı
```

Video Factory içinde seslendirme, CEFR seviye metni ve altyazı üretimi yeniden yazılmayacaktır. Bu işler mevcut LingRoot backend içindeki core servislerden internal API olarak çağrılacaktır.

İlk fazda Video Factory mock LingRoot client ile çalışacaktır. Sonraki fazda LingRoot backend içinde aşağıdaki benzeri bir internal endpoint oluşturulacaktır:

```text
POST /internal/video-level-package
```

Video Factory bu endpoint’i güvenli bir internal API key ile çağıracaktır:

```text
Authorization: Bearer LINGROOT_INTERNAL_API_KEY
```

Bu kararın nedeni:

- Ana LingRoot projesi temiz kalır.
- Sosyal medya üretim otomasyonu ana ürün build/deploy sürecini kirletmez.
- YouTube, Instagram, render, scheduler, Google Drive/Sheets gibi bağımlılıklar ana üründen ayrılır.
- Video Factory ileride başka bilgisayarda, sunucuda veya CI/CD ortamında çalıştırılabilir.
- Ses/altyazı/CEFR kalitesi yine LingRoot ana sisteminden gelir.

---

## 3. Stratejik Amaç

Bu sistem yalnızca sosyal medya videosu üretmek için kurulmayacaktır. Asıl amaç, LingRoot’un ürün deneyimini sosyal medyada görünür hale getirmektir.

LingRoot uygulamasında kullanıcı şunu yapabilir:

```text
Kendi sevdiği veya merak ettiği konuyu seçer.
İngilizce seviyesini seçer.
LingRoot o konuyu kullanıcının seviyesinde dinleme pratiğine dönüştürür.
```

YouTube ve Instagram sistemi bunun küçük, paylaşılabilir ve tekrar edilebilir demosu olacaktır.

Sosyal medya videosunu gören kullanıcı şu mesajı net şekilde almalıdır:

```text
Bu konu bana zor geliyorsa daha kolay seviyesini dinleyebilirim.
Bu konu kolay geliyorsa daha ileri seviyesini dinleyebilirim.
LingRoot ile kendi sevdiğim konuları da kendi seviyemde dinleyebilirim.
```

Kanalın ana konumlandırması:

```text
One topic. Six English levels.
Same topic. Your level.
```

Türkçe stratejik karşılığı:

```text
Aynı konu, altı farklı İngilizce seviyesi.
Sevdiğin konuları kendi seviyende dinle.
```

---

## 4. Ana Ürün Kuralı

Bu projenin en kritik kuralı şudur:

```text
Bir topic package içinde tüm seviyeler aynı image_url listesini kullanmalıdır.
```

Yani A1, A2, B1, B2, C1 ve C2 videolarının tamamında aynı görseller kullanılacaktır.

Bu kuralın sebebi:

1. Üretim maliyetini düşürmek
2. Seviye farkını daha görünür hale getirmek
3. “Same topic. Your level.” vaadini güçlendirmek
4. Günlük/haftalık üretimi sürdürülebilir yapmak
5. Aynı konuya ait tüm seviyeleri playlist olarak paketleyebilmek
6. LingRoot uygulamasındaki kişiselleştirme mantığını sosyal medyada göstermek

Görseller farklı olmayacak. Farkı yaratan şey dil seviyesi, seslendirme, altyazı ve anlatım yoğunluğu olacaktır.

---

## 5. Platform Stratejisi

### 5.1. YouTube Stratejisi

YouTube tarafında her seviye ayrı video olarak yayınlanmalıdır.

Başlık formatı:

```text
[Topic] | [Level] English Listening
```

Örnek:

```text
Why Do We Forget New Words? | A1 English Listening
Why Do We Forget New Words? | A2 English Listening
Why Do We Forget New Words? | B1 English Listening
Why Do We Forget New Words? | B2 English Listening
Why Do We Forget New Words? | C1 English Listening
Why Do We Forget New Words? | C2 English Listening
```

YouTube açıklama formatı:

```text
Listen to this topic at your English level.

This is the A1 version of:
“Why Do We Forget New Words?”

Other levels:
A2: [link]
B1: [link]
B2: [link]
C1: [link]
C2: [link]

LingRoot helps you turn topics you like into English listening practice.

Same topic. Your level.
```

İlk yayınlarda diğer seviye linkleri henüz oluşmamış olabilir. Bu durumda sistem description içinde placeholder kullanmalıdır:

```text
Other levels will be added to this playlist.
```

Daha sonra tüm videolar yüklendikten sonra description update yapılabilir.

YouTube playlist mimarisi iki katmanlı olmalıdır.

#### Konu Bazlı Playlist

Örnek:

```text
Why Do We Forget New Words? - All Levels
```

Bu playlist içinde aynı konuya ait A1–C2 videoları yer alır.

#### Seviye Bazlı Playlist

Örnek:

```text
A1 English Listening
A2 English Listening
B1 English Listening
B2 English Listening
C1 English Listening
C2 English Listening
```

Bu playlistlerde aynı seviyeye ait farklı konular bulunur.

Bu ikili yapı sayesinde kullanıcı iki şekilde ilerleyebilir:

```text
Ben bu konunun tüm seviyelerini görmek istiyorum.
Ben sadece kendi seviyemdeki videoları izlemek istiyorum.
```

### 5.2. Instagram / Reels Stratejisi

Instagram tarafında aynı konuya ait 6 seviyeyi aynı gün arka arkaya yayınlamak önerilmez.

Sebep:

- Feed’de tekrar hissi oluşturabilir.
- Aynı görseller nedeniyle kullanıcıya benzer içerik gibi gelebilir.
- Algoritmik dağıtımda içerik yorgunluğu yaratabilir.
- Kitle hangi seviyeyi sevdiğini ölçmek zorlaşır.

Önerilen Instagram yayın modeli:

```text
Üretim: 1 konu = 6 video aynı anda hazırlanır.
Yayın: seviyeler günlere yayılır.
```

Önerilen paylaşım planları:

#### Model A — Günlük Seviye Paylaşımı

```text
Pazartesi: A1
Salı: A2
Çarşamba: B1
Perşembe: B2
Cuma: C1
Cumartesi: C2
```

#### Model B — Seviye Grupları

```text
Pazartesi: A1 + A2
Çarşamba: B1 + B2
Cuma: C1 + C2
```

#### Model C — Önce Test, Sonra Dağıtım

```text
Önce A2 veya B1 paylaşılır.
Performansa göre diğer seviyeler günlere yayılır.
```

MVP için önerilen model:

```text
Instagram’da aynı konuya ait 6 videoyu aynı gün yayınlama.
Önce A1 veya B1 ile test et.
Sonra diğer seviyeleri günlere yay.
```

---

## 6. Yayın Riskleri ve Önlemler

Aynı görsellerle 6 farklı video üretmek platform açısından tamamen yasak değildir. Ancak düşük farklılaştırılmış içerik gibi algılanma riski vardır.

Bu riski azaltmak için her seviye şu açılardan gerçek fark taşımalıdır:

- Dil seviyesi
- Cümle uzunluğu
- Kelime zorluğu
- Ses hızı
- Altyazı satır uzunluğu
- Başlık
- Açıklama
- Caption
- Seviye etiketi
- CTA mesajı

Yani her video sadece “aynı videoya farklı level etiketi koyulmuş” gibi görünmemelidir.

A1 videosu gerçekten basit olmalıdır. C2 videosu gerçekten doğal, ileri seviye ve sofistike olmalıdır.

Platform riski önlemleri:

```text
1. Görseller LingRoot tarafından üretilmiş/orijinal olmalı.
2. Görsellerde marka, logo, ünlü kişi, telifli karakter olmamalı.
3. Her seviyenin metni seviyeye göre ciddi şekilde farklılaşmalı.
4. Her video ayrı metadata ile paketlenmeli.
5. YouTube’da playlist mimarisi doğru kurulmalı.
6. Instagram’da yayınlar günlere yayılmalı.
7. İlk fazda public otomatik yayın değil, onaylı yayın modeli kullanılmalı.
```

---

## 7. Sistemden Beklenen Nihai Çıktı

Bir topic çalıştırıldığında aşağıdaki klasör yapısı oluşmalıdır:

```text
outputs/
  topic-packages/
    2026-06-21_why-do-people-forget-new-words/
      topic-package.json
      production-report.json
      qa-report.json

      common/
        visual-scenes.json
        images/
          scene-01.png
          scene-02.png
          scene-03.png
          scene-04.png
        image-manifest.json

      levels/
        A1/
          script.txt
          audio.mp3
          subtitles.srt
          subtitles.vtt
          render-payload.json
          video.mp4
          youtube-metadata.json
          instagram-metadata.json
          qa-report.json

        A2/
          script.txt
          audio.mp3
          subtitles.srt
          subtitles.vtt
          render-payload.json
          video.mp4
          youtube-metadata.json
          instagram-metadata.json
          qa-report.json

        B1/
          ...

        B2/
          ...

        C1/
          ...

        C2/
          ...

      social/
        youtube-batch.json
        instagram-batch.json
        playlist-plan.json
        publishing-plan.json

      logs/
        run.log
        errors.log
        api-calls.log
```

---

## 8. Teknik Mimari

Sistem n8n kullanmayacaktır.

Ana yapı:

```text
Claude Code
  → proje beyni
  → agent/skill yapısı
  → kod üretimi ve bakım
  → QA kontrolü
  → lokal zamanlayıcı kurulumu
  → günlük üretim komutlarını yönetme

TypeScript CLI App
  → deterministik üretim motoru
  → API çağrıları
  → dosya üretimi
  → render payload üretimi
  → raporlama
  → publishing paketleri

Local Scheduler
  → bilgisayar açıkken belirli saatte işi başlatır
  → macOS launchd veya cron kullanabilir
  → Claude Code scheduled task varsa onu da destekleyebilir

LingRoot Core API
  → A1–C2 seviyelerinde script/audio/subtitle üretir

Image Service
  → ortak görselleri üretir veya mevcut assetleri alır

Storage
  → Supabase Storage veya Cloudflare R2
  → görsel, ses, subtitle ve final video dosyalarını saklar

Render Service
  → JSON2Video veya alternatif video render API
  → ortak görsel + seviye sesi + subtitle ile video üretir

YouTube API
  → ileri fazda video upload
  → playlist yönetimi
  → metadata update

Instagram / Meta API
  → ileri fazda Reels publishing
  → caption ve publish status yönetimi

Google Drive / Sheets
  → opsiyonel arşiv, onay klasörü, içerik takvimi ve üretim logları
```

---

## 9. n8n Kullanılmayacak Alanlar

Bu projede n8n bulunmayacaktır.

Codex / Claude Code aşağıdakileri yapmamalıdır:

```text
n8n workflow kurma.
n8n webhook oluşturma.
n8n schedule trigger kullanma.
n8n node export/import üretme.
n8n credential yapısı hazırlama.
```

n8n yerine kurulacak karşılıklar:

```text
n8n Schedule Trigger yerine:
  macOS launchd / cron / Claude Code local scheduled task

n8n HTTP Request node yerine:
  TypeScript service clients

n8n Code node yerine:
  TypeScript modules

n8n workflow canvas yerine:
  CLI workflow commands

n8n execution log yerine:
  local JSON logs + production-report.json

n8n manual trigger yerine:
  npm run generate veya npm run daily
```

---

## 10. Claude Code’un Rolü

Claude Code bu projede yalnızca kod yazan bir araç değildir. Sistemin lokal üretim yöneticisi olarak konumlandırılacaktır.

Claude Code’un rolleri:

1. Proje yapısını kurmak
2. CLAUDE.md dosyasını oluşturmak
3. Skills dosyalarını oluşturmak
4. Sub-agent tanımlarını oluşturmak
5. TypeScript üretim motorunu yazmak
6. Lokal scheduler kurulumunu hazırlamak
7. Üretim scriptlerini test etmek
8. QA raporlarını kontrol etmek
9. Hata olduğunda düzeltme yapmak
10. Günlük üretim rutininin stabil çalışmasını sağlamak

Claude Code, zamanlayıcı ile bilgisayar açıkken şu işi yapmalıdır:

```text
Belirlenen saatte üretim komutunu çalıştır.
Bugünün konusunu seç.
Topic package oluştur.
Ortak görselleri üret.
LingRoot servisinden 6 seviye audio/subtitle al.
6 render payload oluştur.
6 video render ettir.
Sosyal medya metadata üret.
QA raporu çıkar.
Onay/yayın klasörünü hazırla.
Gerekirse YouTube/Instagram draft/private upload yap.
```

---

## 11. Lokal Zamanlayıcı Tasarımı

Sistem bilgisayar açıkken çalışacaktır.

İlk hedef ortam:

```text
macOS
```

Zamanlayıcı seçenekleri:

### Seçenek 1 — macOS launchd

Production için önerilen lokal scheduler budur.

Avantajları:

- macOS ile natif çalışır
- Bilgisayar açıkken güvenilir çalışır
- Terminal açık olmasa da çalışabilir
- Log dosyası yazdırılabilir
- Belirli saatte komut çalıştırabilir

Kurulacak dosya örneği:

```text
~/Library/LaunchAgents/com.lingroot.video-factory.daily.plist
```

Bu dosya şu komutu çalıştırmalıdır:

```bash
cd /path/to/lingroot-video-factory && npm run daily
```

### Seçenek 2 — cron

Basit testler için kullanılabilir.

Örnek:

```bash
0 9 * * * cd /path/to/lingroot-video-factory && npm run daily >> logs/cron.log 2>&1
```

### Seçenek 3 — Claude Code scheduled task

Claude Code ortamında lokal scheduled task destekleniyorsa kullanılabilir. Ancak sistem sadece buna bağımlı olmamalıdır. Repo içinde mutlaka launchd/cron fallback dosyaları bulunmalıdır.

### Lokal Scheduler Kuralı

Sistem şu şekilde tasarlanmalıdır:

```text
Claude Code kurulumu yapar.
Scheduler komutu çalıştırır.
Asıl üretimi TypeScript CLI gerçekleştirir.
Claude Code gerektiğinde bakım, düzeltme ve QA için devreye girer.
```

Bu ayrım önemlidir. Çünkü günlük üretim her seferinde serbest biçimli sohbet komutlarına bağımlı olmamalıdır. Deterministik CLI komutları kullanılmalıdır.

---

## 12. Repo Adı ve Temel Yapı

Repo adı:

```text
lingroot-video-factory
```

Teknoloji:

```text
TypeScript
Node.js
pnpm veya npm
ESM module format
Zod veya JSON Schema validation
dotenv
tsx veya ts-node
```

Önerilen klasör yapısı:

```text
lingroot-video-factory/
  CLAUDE.md
  README.md
  package.json
  tsconfig.json
  .env.example
  .gitignore

  config/
    brand-rules.json
    level-rules.json
    video-format.json
    publishing-rules.json
    scheduler.json
    content-calendar.example.json

  prompts/
    topic-package.prompt.md
    visual-scenes.prompt.md
    social-metadata.prompt.md
    qa-review.prompt.md
    thumbnail.prompt.md

  schemas/
    topic-package.schema.json
    visual-scenes.schema.json
    level-package.schema.json
    render-payload.schema.json
    youtube-metadata.schema.json
    instagram-metadata.schema.json
    qa-report.schema.json
    production-report.schema.json

  src/
    index.ts

    core/
      types.ts
      config.ts
      logger.ts
      errors.ts
      file-system.ts
      validators.ts
      slugify.ts
      dates.ts

    workflows/
      daily-production.ts
      generate-topic-package.ts
      generate-common-visuals.ts
      generate-level-assets.ts
      build-render-payloads.ts
      render-videos.ts
      prepare-social-package.ts
      run-qa.ts
      publish-youtube.ts
      publish-instagram.ts

    services/
      lingroot-core-client.ts
      image-client.ts
      storage-client.ts
      render-client.ts
      youtube-client.ts
      instagram-client.ts
      google-drive-client.ts
      google-sheets-client.ts

    adapters/
      mock-lingroot-core-client.ts
      mock-image-client.ts
      mock-render-client.ts
      local-storage-client.ts
      supabase-storage-client.ts
      r2-storage-client.ts
      json2video-client.ts

    qa/
      common-images-check.ts
      cefr-level-check.ts
      subtitle-check.ts
      render-check.ts
      metadata-check.ts
      policy-risk-check.ts
      final-package-check.ts

    scheduler/
      install-launchd.ts
      uninstall-launchd.ts
      launchd-template.plist
      cron-example.txt

    cli/
      generate.ts
      daily.ts
      qa.ts
      render.ts
      publish.ts
      scheduler.ts

  agents/
    project-orchestrator.md
    topic-strategist.md
    visual-director.md
    cefr-editor.md
    subtitle-qa.md
    render-operator.md
    social-packaging-agent.md
    publishing-agent.md
    analytics-agent.md
    compliance-agent.md

  skills/
    lingroot-video-factory/
      SKILL.md
    cefr-level-editor/
      SKILL.md
    visual-scene-planner/
      SKILL.md
    youtube-packaging/
      SKILL.md
    instagram-reels-packaging/
      SKILL.md
    render-qa/
      SKILL.md
    local-scheduler/
      SKILL.md

  outputs/
    topic-packages/

  logs/

  scripts/
    setup.ts
    dry-run.ts
    generate-one-topic.ts
    generate-six-levels.ts
    render-all-levels.ts
    install-scheduler.ts
    uninstall-scheduler.ts
```

---

## 13. Komutlar

`package.json` içinde şu komutlar bulunmalıdır:

```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "dry-run": "tsx src/cli/generate.ts --mode dry-run",
    "generate": "tsx src/cli/generate.ts",
    "daily": "tsx src/cli/daily.ts",
    "qa": "tsx src/cli/qa.ts",
    "render": "tsx src/cli/render.ts",
    "publish:youtube": "tsx src/cli/publish.ts --platform youtube",
    "publish:instagram": "tsx src/cli/publish.ts --platform instagram",
    "scheduler:install": "tsx src/cli/scheduler.ts install",
    "scheduler:uninstall": "tsx src/cli/scheduler.ts uninstall",
    "scheduler:test": "tsx src/cli/scheduler.ts test",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest"
  }
}
```

Örnek kullanım:

```bash
npm run dry-run
```

```bash
npm run generate -- --topic "Why do people forget new words?" --mode test --levels A1 --scenes 2
```

```bash
npm run generate -- --topic "Why do people forget new words?" --mode test-six-levels --scenes 2
```

```bash
npm run generate -- --topic "Why do people forget new words?" --mode production
```

```bash
npm run daily
```

```bash
npm run scheduler:install
```

---

## 14. Üretim Modları

Sistem dört üretim modu desteklemelidir.

### 14.1. dry-run

Dış API çağrısı yapmaz. Mock veriyle örnek topic package üretir.

Amaç:

- Repo yapısını test etmek
- Şemaları doğrulamak
- Output formatını görmek
- QA raporunu test etmek

Komut:

```bash
npm run dry-run
```

### 14.2. test-single-level

Bir konu, tek seviye, iki sahne üretir.

Amaç:

- Maliyet düşük test
- LingRoot servis bağlantısı
- Görsel üretim bağlantısı
- Render bağlantısı

Örnek:

```bash
npm run generate -- --topic "Why do people forget new words?" --mode test --levels A1 --scenes 2
```

### 14.3. test-six-levels

Bir konu, altı seviye, iki ortak sahne üretir.

Amaç:

- Ortak görsel kuralını test etmek
- 6 seviye audio/subtitle akışını doğrulamak
- QA sistemini test etmek

Örnek:

```bash
npm run generate -- --topic "Why do people forget new words?" --mode test-six-levels --scenes 2
```

### 14.4. production

Bir konu, altı seviye, tam sahne seti üretir.

Amaç:

- Yayına hazır video paketi üretmek

Örnek:

```bash
npm run generate -- --topic "Why do people forget new words?" --mode production
```

---

## 15. CLAUDE.md İçeriği

`CLAUDE.md` projenin kalıcı proje hafızasıdır.

Codex / Claude Code şu dosyayı oluşturmalıdır:

```markdown
# LingRoot Video Factory

## Project Purpose

This project creates short vertical videos for LingRoot.

LingRoot is a listening-first English learning assistant. It turns topics people care about into English listening practice at their level.

Core promise:

Same topic. Your level.

## Main Rule

For each topic, create one common visual flow.

Use the same images and scene order across:

- A1
- A2
- B1
- B2
- C1
- C2

Only these elements change by level:

- voiceover script
- audio
- subtitles
- speaking rate
- level badge
- YouTube metadata
- Instagram caption

Never generate different images for different levels inside the same topic package.

## No n8n

This project must not use n8n.

Do not create n8n workflows, nodes, webhooks, credentials, or schedule triggers.

All automation must run locally through:

- TypeScript CLI commands
- local scheduler
- macOS launchd
- cron fallback
- Claude Code local scheduled task if available

## Video Format

- Vertical 9:16
- 1080x1920
- 30–60 seconds
- YouTube Shorts and Instagram Reels compatible
- Embedded subtitles
- Short LingRoot CTA
- No long intro

## Brand Tone

Warm, modern, clear, listening-first, not childish, not classroom-like.

Do not create grammar lesson videos.

Create listening experiences.

## Level Rules

A1:
Very simple words, very short sentences, slow pace.

A2:
Simple cause-effect, everyday words, short sentences.

B1:
Natural everyday explanation, medium sentence length.

B2:
Fluent and explanatory, richer vocabulary.

C1:
Analytical, advanced, compact meaning.

C2:
Sophisticated, natural, native-like, not artificially academic.

## Security

Never commit .env.

Never print API keys in logs.

Never expose service role keys in reports.

Use .env.example for placeholders only.

## Publishing Safety

Default publish mode is review/private.

Do not auto-publish public videos unless PUBLISH_MODE=auto_public is explicitly set.

## QA Requirements

Every production run must generate:

- production-report.json
- qa-report.json
- topic-package.json
- level-level QA reports
- common image consistency check
- metadata completeness check

Production should fail if:

- any level is missing
- image list differs between levels
- audio is missing
- subtitles are missing
- render failed
- metadata is missing
```

---

## 16. Kurulacak Claude Code Agent’ları

### 16.1. Project Orchestrator Agent

Ana üretim yöneticisi.

Görevleri:

- Günlük üretimi başlatır
- Konu seçimini tetikler
- Görsel planı oluşturur
- 6 seviye üretimini koordine eder
- Render akışını takip eder
- QA sonuçlarını toplar
- Final raporu üretir

Dosya:

```text
agents/project-orchestrator.md
```

### 16.2. Topic Strategist Agent

Konu seçer ve konunun LingRoot’a uygunluğunu değerlendirir.

Kontrol eder:

- Konu geniş kitleye uygun mu?
- A1’e indirgenebilir mi?
- C2’ye genişletilebilir mi?
- Görselleştirilebilir mi?
- Dinleme pratiği için uygun mu?
- Sosyal medya hook’u var mı?

Dosya:

```text
agents/topic-strategist.md
```

### 16.3. Visual Director Agent

Ortak görsel sahne akışını üretir.

Kritik kural:

```text
Tüm seviyeler aynı görselleri kullanır.
```

Görevleri:

- 2–8 sahne planlar
- Görsel promptları üretir
- Görsellerde yazı/logoları engeller
- Dikey kompozisyon sağlar
- Image manifest üretir

Dosya:

```text
agents/visual-director.md
```

### 16.4. CEFR Editor Agent

A1–C2 seviyelerinin gerçek fark taşımasını sağlar.

Görevleri:

- A1 çok zor mu kontrol eder
- A2 yeterince basit mi kontrol eder
- B1 doğal mı kontrol eder
- B2 akıcı mı kontrol eder
- C1 gelişmiş mi kontrol eder
- C2 doğal ve sofistike mi kontrol eder
- Seviye metinleri birbirinden yeterince ayrışıyor mu kontrol eder

Dosya:

```text
agents/cefr-editor.md
```

### 16.5. Subtitle QA Agent

Altyazı okunabilirliğini denetler.

Görevleri:

- Subtitle line uzunluğu
- Subtitle timing
- A1/A2 kısa satır kontrolü
- C1/C2 aşırı uzun satır kontrolü
- SRT/VTT format kontrolü
- Audio-subtitle süre uyumu

Dosya:

```text
agents/subtitle-qa.md
```

### 16.6. Render Operator Agent

Video render sürecini yönetir.

Görevleri:

- Render payload üretir
- Render API’ye istek atar
- Render durumunu takip eder
- Hata olursa retry yapar
- Video URL veya dosyasını kaydeder
- Render raporu üretir

Dosya:

```text
agents/render-operator.md
```

### 16.7. Social Packaging Agent

YouTube ve Instagram metadata üretir.

Görevleri:

- YouTube title
- YouTube description
- YouTube tags
- Playlist planı
- Instagram caption
- Hashtag setleri
- CTA cümleleri
- Seviye bazlı açıklama

Dosya:

```text
agents/social-packaging-agent.md
```

### 16.8. Publishing Agent

Yayın paketini hazırlar.

MVP’de varsayılan davranış:

```text
Public auto-publish yapma.
Private/unlisted/draft veya local review package oluştur.
```

İleri fazda:

- YouTube upload
- YouTube playlist insert
- Instagram Reels publish
- Google Drive archive
- Google Sheets log update

Dosya:

```text
agents/publishing-agent.md
```

### 16.9. Analytics Agent

Performans ölçümünü hazırlar.

MVP’de sadece metadata ve tracking alanlarını hazırlar.

İleri fazda:

- YouTube Analytics
- Instagram Insights
- Seviye bazlı performans
- Konu bazlı performans
- App dönüşüm analizi

Dosya:

```text
agents/analytics-agent.md
```

### 16.10. Compliance Agent

Platform, telif, marka ve güvenlik kontrollerinden sorumludur.

Kontrol eder:

- Görsellerde logo var mı?
- Ünlü kişi / lisanslı karakter var mı?
- Başkasının içeriği yeniden kullanılmış mı?
- API key loglara yazılmış mı?
- Seviye videoları yeterince farklı mı?
- Platform tekrar içerik riski var mı?
- Marka dili uygun mu?

Dosya:

```text
agents/compliance-agent.md
```

---

## 17. Kurulacak Skills

### 17.1. lingroot-video-factory Skill

Ana üretim skill’i.

İçerik:

- Topic package standardı
- Ortak görsel kuralı
- 6 seviye üretim mantığı
- Output klasör yapısı
- QA gereksinimleri
- Üretim modları

Dosya:

```text
skills/lingroot-video-factory/SKILL.md
```

### 17.2. cefr-level-editor Skill

Seviye kalite kontrol skill’i.

İçerik:

- A1–C2 seviye rubric’i
- Cümle uzunluğu kuralları
- Kelime zorluğu
- Örnek cümleler
- Hatalı seviye örnekleri
- QA checklist

Dosya:

```text
skills/cefr-level-editor/SKILL.md
```

### 17.3. visual-scene-planner Skill

Ortak görsel planlama skill’i.

İçerik:

- Görsel prompt kuralları
- Negative prompt
- Dikey kompozisyon
- Yazı/logo yasağı
- Ortak sahne akışı

Dosya:

```text
skills/visual-scene-planner/SKILL.md
```

### 17.4. youtube-packaging Skill

YouTube paketleme skill’i.

İçerik:

- Başlık formatı
- Description formatı
- Playlist mantığı
- Tags
- Pinned comment önerisi
- Private/unlisted/public publish kuralları

Dosya:

```text
skills/youtube-packaging/SKILL.md
```

### 17.5. instagram-reels-packaging Skill

Instagram Reels paketleme skill’i.

İçerik:

- Caption formatı
- Hashtag formatı
- Günlere yayma stratejisi
- Trial post mantığı
- CTA önerileri

Dosya:

```text
skills/instagram-reels-packaging/SKILL.md
```

### 17.6. render-qa Skill

Render kalite kontrol skill’i.

İçerik:

- Video dosyası kontrolü
- Süre kontrolü
- 9:16 kontrolü
- Audio var mı kontrolü
- Subtitle var mı kontrolü
- Ortak görsel kontrolü
- Render retry kuralları

Dosya:

```text
skills/render-qa/SKILL.md
```

### 17.7. local-scheduler Skill

Bilgisayar açıkken zamanlayıcı kurulum skill’i.

İçerik:

- macOS launchd kurulumu
- cron fallback
- log dosyası yönlendirme
- günlük üretim komutu
- test çalıştırma
- uninstall komutu

Dosya:

```text
skills/local-scheduler/SKILL.md
```

---

## 18. LingRoot Core API Entegrasyonu

LingRoot ana sistemi seviye bazlı seslendirme ve altyazı üretiminden sorumludur.

Bu video factory sistemi kendi içinde metin/ses üretmeye çalışmamalıdır. Ana sistemden servis olarak almalıdır.

Beklenen endpoint:

```text
POST /internal/video-level-package
```

Request örneği:

```json
{
  "topic": "Why do people forget new words?",
  "core_message": "New words are forgotten when they are not repeated in meaningful contexts.",
  "target_level": "A1",
  "target_duration_seconds": 45,
  "voice_profile": "english_female",
  "subtitle_format": "srt",
  "content_style": "short_listening_video",
  "brand": "LingRoot"
}
```

Response örneği:

```json
{
  "topic": "Why do people forget new words?",
  "level": "A1",
  "voiceover_script": "We learn new words. Then we forget them. This is normal...",
  "audio_url": "https://cdn.lingroot.../audio/a1.mp3",
  "subtitle_url": "https://cdn.lingroot.../subtitles/a1.srt",
  "subtitle_lines": [
    {
      "start": 0.0,
      "end": 2.1,
      "text": "We learn new words."
    }
  ],
  "duration_seconds": 43.2,
  "voice_profile": "english_female",
  "speaking_rate": 0.82
}
```

Servis client dosyası:

```text
src/services/lingroot-core-client.ts
```

Mock adapter:

```text
src/adapters/mock-lingroot-core-client.ts
```

Kural:

```text
MVP’de önce mock client çalışmalı.
Sonra gerçek LingRoot API client bağlanmalı.
```

---

## 19. Görsel Üretim Entegrasyonu

Görseller ortak üretilecektir.

Her konu için 2–8 sahne üretilebilir.

MVP:

```text
2–4 sahne
```

Production:

```text
6–8 sahne
```

Görsel sahne örneği:

```json
{
  "scene_number": 1,
  "visual_description": "A young adult trying to remember a new English word while walking in a warm city street.",
  "image_prompt": "Clean, modern, warm educational photo style, realistic but polished, vertical composition, no text, no logos, no copyrighted characters.",
  "duration_weight": 1
}
```

Görsel kuralları:

```text
No text in image.
No brand logo.
No celebrity likeness.
No copyrighted character.
No childish cartoon style.
Use warm, modern, adult-friendly educational visuals.
Vertical mobile composition.
```

Image service dosyası:

```text
src/services/image-client.ts
```

Storage sonrası image manifest:

```json
{
  "topic_id": "why-do-people-forget-new-words",
  "images": [
    {
      "scene_number": 1,
      "image_url": "https://cdn.../scene-01.png",
      "local_path": "common/images/scene-01.png"
    }
  ]
}
```

Kritik test:

```text
A1.level.image_urls === A2.level.image_urls === B1.level.image_urls === B2.level.image_urls === C1.level.image_urls === C2.level.image_urls
```

---

## 20. Render Entegrasyonu

Render servisi JSON2Video veya alternatif bir video API olabilir.

Varsayılan:

```text
RENDER_PROVIDER=json2video
```

Her seviye için ayrı render payload oluşmalıdır.

Ortak girdiler:

- image_url listesi
- scene duration bilgisi
- level badge
- LingRoot branding
- subtitle data
- audio_url

Render payload builder:

```text
src/workflows/build-render-payloads.ts
```

Render client:

```text
src/services/render-client.ts
```

JSON2Video adapter:

```text
src/adapters/json2video-client.ts
```

Render sonucunda beklenen alanlar:

```json
{
  "level": "A1",
  "render_status": "done",
  "video_url": "https://...",
  "duration_seconds": 43.2,
  "resolution": "1080x1920",
  "local_video_path": "levels/A1/video.mp4"
}
```

Render retry kuralı:

```text
Render running ise bekle ve tekrar sorgula.
Render failed ise en fazla 2 kez retry yap.
3. hatada production-report içinde fail olarak işaretle.
```

---

## 21. YouTube Entegrasyonu

MVP’de YouTube otomatik public publish zorunlu değildir.

Öncelik sırası:

```text
Phase 1: metadata package üret
Phase 2: private/unlisted upload
Phase 3: playlist insert
Phase 4: public publish
Phase 5: description update with cross-links
```

YouTube client:

```text
src/services/youtube-client.ts
```

Gerekli işlemler:

- OAuth token yönetimi
- Video upload
- Title
- Description
- Tags
- Privacy status
- Playlist list
- Playlist create if missing
- Playlist insert
- Description update

Varsayılan güvenli ayar:

```text
YOUTUBE_DEFAULT_PRIVACY_STATUS=private
```

Production public publish için ayrıca environment flag gerekir:

```text
PUBLISH_MODE=auto_public
AUTO_PUBLIC_PUBLISH=true
```

Bu flag yoksa sistem public yayın yapmamalıdır.

YouTube metadata örneği:

```json
{
  "title": "Why Do We Forget New Words? | A1 English Listening",
  "description": "Listen to this topic at your English level...",
  "tags": [
    "English listening",
    "A1 English",
    "CEFR A1",
    "LingRoot",
    "Learn English"
  ],
  "privacyStatus": "private",
  "playlists": [
    "Why Do We Forget New Words? - All Levels",
    "A1 English Listening"
  ]
}
```

---

## 22. Instagram Entegrasyonu

MVP’de Instagram otomatik publish zorunlu değildir.

Öncelik sırası:

```text
Phase 1: instagram-metadata.json üret
Phase 2: manuel Reels yayın paketi
Phase 3: API ile kontrollü test
Phase 4: kontrollü auto-publish
```

Instagram client:

```text
src/services/instagram-client.ts
```

Instagram caption örneği:

```text
Same topic. Your level.

This is the A1 version.
Can you understand it?

Turn topics you like into English listening practice with LingRoot.

#EnglishListening #A1English #LearnEnglish #LingRoot
```

Instagram yayın planı:

```json
{
  "platform": "instagram",
  "recommended_publish_strategy": "staggered",
  "level": "A1",
  "caption": "...",
  "hashtags": [
    "#EnglishListening",
    "#A1English",
    "#LearnEnglish",
    "#LingRoot"
  ],
  "publish_day_offset": 0
}
```

---

## 23. Google Drive ve Google Sheets

Google Drive ve Sheets n8n yerine doğrudan TypeScript service client ile kullanılacaktır.

### Google Drive

Amaç:

- Üretim paketlerini klasörlemek
- Ekip onayı için klasör oluşturmak
- Final videoları arşivlemek

Drive klasör yapısı:

```text
LingRoot Video Factory/
  2026-06/
    2026-06-21_why-do-people-forget-new-words/
      common/
      levels/
      social/
      reports/
```

Client:

```text
src/services/google-drive-client.ts
```

### Google Sheets

Amaç:

- İçerik takvimi
- Üretim durumu
- Yayın URL’leri
- QA sonucu
- Performans logları

Sheet kolonları:

```text
date
topic
category
status
A1_status
A2_status
B1_status
B2_status
C1_status
C2_status
youtube_playlist_url
instagram_status
qa_status
drive_folder_url
notes
```

Client:

```text
src/services/google-sheets-client.ts
```

---

## 24. Environment Variables

`.env.example` içinde şu alanlar bulunmalıdır:

```text
# App
APP_ENV=development
DRY_RUN=true
DEFAULT_TARGET_DURATION_SECONDS=45
DEFAULT_VIDEO_WIDTH=1080
DEFAULT_VIDEO_HEIGHT=1920
DEFAULT_SCENE_COUNT=4
DEFAULT_LEVELS=A1,A2,B1,B2,C1,C2

# Scheduler
SCHEDULER_ENABLED=false
SCHEDULER_PROVIDER=launchd
SCHEDULER_TIME=09:00
SCHEDULER_TIMEZONE=Europe/Istanbul

# LingRoot Core API
LINGROOT_API_BASE_URL=
LINGROOT_INTERNAL_API_KEY=
LINGROOT_LEVEL_ENDPOINT=/internal/video-level-package

# Image Generation
IMAGE_PROVIDER=openai
OPENAI_API_KEY=
IMAGE_MODEL=

# Storage
STORAGE_PROVIDER=local
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=

# Render
RENDER_PROVIDER=json2video
JSON2VIDEO_API_KEY=
JSON2VIDEO_API_BASE_URL=https://api.json2video.com/v2

# YouTube
YOUTUBE_ENABLED=false
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=
YOUTUBE_DEFAULT_PRIVACY_STATUS=private

# Instagram / Meta
INSTAGRAM_ENABLED=false
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=

# Google Drive / Sheets
GOOGLE_DRIVE_ENABLED=false
GOOGLE_SHEETS_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_DRIVE_FOLDER_ID=
GOOGLE_SHEET_ID=

# Publishing
PUBLISH_MODE=review
AUTO_PUBLIC_PUBLISH=false
```

Güvenlik kuralları:

```text
.env commit edilmeyecek.
API key loglara yazılmayacak.
Production report içinde secret olmayacak.
Service role key sadece lokal güvenli ortamda kullanılacak.
GitHub’a gerçek secret push edilmeyecek.
```

---

## 25. Topic Package Şeması

`topic-package.json` örneği:

```json
{
  "topic_id": "why-do-people-forget-new-words",
  "topic_title": "Why Do People Forget New Words?",
  "topic_prompt": "Why do people forget new words?",
  "brand": "LingRoot",
  "core_message": "People forget new words because memory needs repetition, retrieval and meaningful context.",
  "target_duration_seconds": 45,
  "levels": ["A1", "A2", "B1", "B2", "C1", "C2"],
  "video_format": {
    "orientation": "vertical",
    "width": 1080,
    "height": 1920,
    "platforms": ["youtube_shorts", "instagram_reels"]
  },
  "common_assets": {
    "visual_scenes_path": "common/visual-scenes.json",
    "image_manifest_path": "common/image-manifest.json"
  },
  "level_packages": {
    "A1": "levels/A1",
    "A2": "levels/A2",
    "B1": "levels/B1",
    "B2": "levels/B2",
    "C1": "levels/C1",
    "C2": "levels/C2"
  },
  "status": "generated"
}
```

---

## 26. QA Sistemi

Her production run sonunda `qa-report.json` üretilmelidir.

### Ortak Görsel Kontrolü

```text
Tüm seviyelerde aynı image_url listesi kullanılmış mı?
Sahne sayısı aynı mı?
Sahne sırası aynı mı?
Görseller mevcut mu?
Görseller public veya render erişimine açık mı?
```

### CEFR Kontrolü

```text
A1 yeterince basit mi?
A2 A1’den biraz daha gelişmiş mi?
B1 doğal mı?
B2 akıcı mı?
C1 ileri seviye mi?
C2 sofistike ve doğal mı?
Seviyeler birbirinden anlamlı şekilde ayrışıyor mu?
```

### Ses Kontrolü

```text
Her seviyede audio var mı?
Audio dosyası erişilebilir mi?
Audio süresi hedef aralıkta mı?
Konuşma hızı seviyeye uygun mu?
```

### Altyazı Kontrolü

```text
SRT/VTT var mı?
Subtitle timing geçerli mi?
Satırlar çok uzun mu?
A1/A2 altyazıları kısa mı?
Audio süresiyle uyumlu mu?
```

### Render Kontrolü

```text
6 video üretildi mi?
Video dosyaları var mı?
Video oranı 9:16 mı?
Video süresi hedef aralıkta mı?
Ses, görüntü ve altyazı birleşmiş mi?
```

### Sosyal Medya Kontrolü

```text
YouTube title var mı?
YouTube description var mı?
Instagram caption var mı?
Hashtag var mı?
Playlist planı var mı?
CTA var mı?
```

### Güvenlik Kontrolü

```text
API key rapora yazılmış mı?
.env yanlışlıkla output’a kopyalanmış mı?
Secret içeren log var mı?
```

Production fail şartları:

```text
Herhangi bir seviyede video yoksa fail.
Herhangi bir seviyede audio yoksa fail.
Herhangi bir seviyede subtitle yoksa fail.
Image listeleri seviyeler arasında farklıysa fail.
Render failed ise fail.
Metadata eksikse warning veya fail.
Secret leak varsa hard fail.
```

---

## 27. Günlük Üretim Akışı

`npm run daily` şu adımları çalıştırmalıdır:

```text
1. Config yükle.
2. Content calendar’dan bugünün konusunu seç.
3. Konu yoksa fallback topic seç veya üret.
4. Topic package oluştur.
5. Ortak görsel sahne planını oluştur.
6. Ortak görselleri üret.
7. Görselleri storage’a yükle veya local kaydet.
8. A1–C2 için LingRoot Core API’den script/audio/subtitle al.
9. Her seviyenin level package dosyalarını yaz.
10. Render payloadlarını oluştur.
11. 6 seviyeyi render et.
12. Render sonuçlarını indir veya URL olarak kaydet.
13. YouTube metadata üret.
14. Instagram metadata üret.
15. Playlist planı oluştur.
16. QA çalıştır.
17. production-report.json oluştur.
18. Google Drive aktifse paketi Drive’a yükle.
19. Google Sheets aktifse log satırı ekle.
20. Publish mode review ise işlemi burada durdur.
21. Publish mode private_upload ise YouTube’a private/unlisted yükle.
22. Publish mode auto_public ise ayrıca explicit flag kontrol et ve public yayınla.
```

Varsayılan publish mode:

```text
review
```

---

## 28. İçerik Takvimi

Content calendar JSON veya Google Sheets olabilir.

MVP’de lokal JSON yeterlidir.

Dosya:

```text
config/content-calendar.example.json
```

Örnek:

```json
[
  {
    "date": "2026-06-21",
    "topic": "Why do people forget new words?",
    "category": "language_learning",
    "priority": 1,
    "status": "approved"
  },
  {
    "date": "2026-06-22",
    "topic": "Why is listening harder than reading?",
    "category": "language_learning",
    "priority": 1,
    "status": "approved"
  }
]
```

Konu yoksa sistem şu kategorilerden otomatik konu önerebilir:

```text
English learning
Memory
Habits
Daily life
Psychology
Productivity
Technology
Work
Health
Culture
```

Ancak otomatik konu seçimi production’da onaysız public publish’e gitmemelidir.

---

## 29. Yayın Stratejisi

### MVP Yayın Stratejisi

```text
Haftada 1 konu üret.
Her konu için 6 video oluştur.
YouTube’a önce private/unlisted yükle veya local review package oluştur.
Instagram için manuel yayın paketi hazırla.
İnsan kontrolünden sonra public yayınla.
```

### 2. Faz Yayın Stratejisi

```text
Haftada 2–3 konu üret.
YouTube’da konu bazlı ve seviye bazlı playlist yapısını oturt.
Instagram’da seviyeleri günlere yay.
A/B thumbnail ve başlık testleri başlat.
```

### 3. Faz Yayın Stratejisi

```text
Günlük konu üretimini test et.
YouTube private upload otomatik olsun.
Public publish hâlâ onaylı olabilir.
Instagram auto-publish kontrollü açılabilir.
Analytics raporu haftalık üretilebilir.
```

---

## 30. Başarı Metrikleri

YouTube metrikleri:

```text
Views
Engaged views
Average view duration
Retention
First 3 seconds retention
Completion rate
Playlist clicks
Description link clicks
Subscribers gained
Comments
Likes
```

Instagram metrikleri:

```text
Reach
Non-follower reach
Plays
Replays
Average watch time
Profile visits
Bio link clicks
Saves
Shares
Comments
```

LingRoot dönüşüm metrikleri:

```text
Landing page visits
App install
Signup
Level selection
First generated listening content
Free-to-paid conversion
Topic-to-user conversion
```

Seviye bazlı metrikler:

```text
En çok izlenen seviye
En yüksek retention alan seviye
En çok kayıt getiren seviye
En yüksek yorum alan seviye
```

Konu bazlı metrikler:

```text
En iyi çalışan konu kategorisi
En iyi çalışan hook tipi
En iyi çalışan video süresi
En iyi çalışan CTA
```

---

## 31. 3 Aylık Roadmap

### Ay 1 — Lokal Video Factory Omurgası

Hedef:

- Repo kurulumu
- CLAUDE.md
- Skills
- Agents
- TypeScript CLI
- Mock servisler
- Dry-run
- QA raporu
- Local scheduler taslağı

Teslimatlar:

```text
npm run dry-run çalışır.
Mock topic package oluşur.
A1–C2 klasörleri oluşur.
Ortak image manifest oluşur.
Mock audio/subtitle oluşur.
QA raporu oluşur.
launchd install script hazırdır.
```

Başarı kriteri:

```text
Bilgisayar açıkken scheduler test komutunu çalıştırabilir.
Dry-run üretim sorunsuz tamamlanır.
```

### Ay 2 — Gerçek Servis Entegrasyonları

Hedef:

- LingRoot Core API bağlantısı
- Görsel üretim bağlantısı
- Storage bağlantısı
- JSON2Video bağlantısı
- 1 konu için gerçek 6 video üretimi
- YouTube/Instagram metadata üretimi

Teslimatlar:

```text
1 konu = 6 video üretilebilir.
Ortak görseller 6 seviyede aynı kullanılır.
Audio/subtitle LingRoot servisinden gelir.
Render tamamlanır.
Metadata hazır olur.
QA raporu geçer.
```

Başarı kriteri:

```text
En az 3 farklı konu için 6 seviyeli video paketi üretildi.
Yayın öncesi manuel kontrol yapılabildi.
```

### Ay 3 — Yayın Paketi ve Büyüme Testi

Hedef:

- YouTube private/unlisted upload
- Playlist yönetimi
- Instagram manuel/yarı otomatik yayın paketi
- Google Drive arşiv
- Google Sheets log
- Haftalık performans raporu

Teslimatlar:

```text
YouTube private upload çalışır.
Playlist planı uygulanır.
Drive klasörü oluşur.
Sheets log satırı eklenir.
Instagram caption paketleri hazırdır.
Haftalık analytics raporu taslağı oluşur.
```

Başarı kriteri:

```text
Haftada en az 1 konu düzenli üretilir.
YouTube’da playlist yapısı kurulur.
Instagram’da staggered release test edilir.
İlk performans sonuçları raporlanır.
```

---

## 32. Kabul Kriterleri

İlk teslimat başarılı sayılmak için şu kriterler karşılanmalıdır:

```text
1. Repo kurulmuş olmalı.
2. n8n kullanılmamalı.
3. CLAUDE.md oluşturulmalı.
4. Skills klasörü oluşturulmalı.
5. Agents klasörü oluşturulmalı.
6. TypeScript CLI çalışmalı.
7. npm run dry-run başarılı olmalı.
8. Mock topic package üretilmeli.
9. A1–C2 klasörleri oluşmalı.
10. Ortak image manifest tüm seviyelerde aynı kullanılmalı.
11. Mock audio/subtitle oluşmalı.
12. YouTube metadata oluşmalı.
13. Instagram metadata oluşmalı.
14. QA raporu oluşmalı.
15. Scheduler install script hazır olmalı.
16. .env.example hazırlanmalı.
17. .env .gitignore içinde olmalı.
18. Secret değerler raporlara yazılmamalı.
19. production-report.json oluşmalı.
20. README içinde kurulum ve kullanım açıklanmalı.
```

---

## 33. Codex / Claude Code’a Verilecek Nihai Uygulama Talimatı

Aşağıdaki talimat doğrudan Codex veya Claude Code’a verilebilir:

```text
LingRoot için n8n kullanmadan, bilgisayar açıkken lokal zamanlayıcı ile çalışan bir YouTube & Instagram Video Factory projesi kur.

Proje adı:
lingroot-video-factory

Ana amaç:
Tek bir konuyu alıp aynı ortak görsellerle A1, A2, B1, B2, C1 ve C2 seviyelerinde 6 ayrı kısa dikey video üretmek.

Ana ürün vaadi:
Same topic. Your level.
Aynı konu. Senin seviyen.

En kritik kural:
Bir topic package içinde tüm seviyeler aynı görsel listesini kullanmalı.
A1–C2 için görseller farklı üretilmemeli.
Sadece seslendirme, altyazı, seviye etiketi ve sosyal medya metadata’sı değişmeli.

Mimari karar:
Bu proje mevcut LingRoot ana projesinin içine gömülmeyecek. Ayrı repo olarak kurulacak.
Ancak seslendirme, CEFR seviye metni ve altyazı üretimi bu projede yeniden yazılmayacak.
Bu işler mevcut LingRoot backend içindeki internal API endpoint’inden alınacak.
İlk fazda mock LingRoot client kullanılacak.
Daha sonra POST /internal/video-level-package endpoint’i LINGROOT_INTERNAL_API_KEY ile çağrılacak.

n8n kesinlikle kullanılmayacak.
n8n workflow, node, webhook, credential veya schedule trigger oluşturma.
Tüm otomasyon TypeScript CLI + lokal scheduler + Claude Code proje yapısı ile kurulacak.

İlk hedef ortam:
macOS.
Bilgisayar açıkken macOS launchd veya cron ile npm run daily çalıştırılacak.
Claude Code scheduled task destekleniyorsa opsiyonel olarak eklenebilir ama sistem buna bağımlı olmamalı.

Teknoloji:
TypeScript
Node.js
dotenv
Zod veya JSON Schema validation
local file outputs
mock service adapters
future real API adapters

İlk fazda gerçek API entegrasyonlarını mock interface olarak kur.
Dry-run çalışmalı.
Daha sonra LingRoot Core API, image generation, storage, render, YouTube, Instagram, Google Drive ve Google Sheets gerçek adapter olarak bağlanabilecek şekilde tasarla.

Oluşturulacak temel dosyalar:
CLAUDE.md
README.md
.env.example
.gitignore
package.json
tsconfig.json
config dosyaları
schemas
prompts
agents
skills
src workflows
src services
src adapters
src scheduler
outputs klasörü
logs klasörü

Komutlar:
npm run dry-run
npm run generate -- --topic "Why do people forget new words?" --mode test --levels A1 --scenes 2
npm run generate -- --topic "Why do people forget new words?" --mode test-six-levels --scenes 2
npm run generate -- --topic "Why do people forget new words?" --mode production
npm run daily
npm run scheduler:install
npm run scheduler:uninstall
npm run qa

İlk teslimatta şunlar çalışmalı:
npm run dry-run
npm run generate test-single-level
npm run generate test-six-levels
npm run qa
npm run scheduler:test

Dry-run çıktısı:
outputs/topic-packages altında örnek topic package oluşmalı.
A1, A2, B1, B2, C1, C2 klasörleri oluşmalı.
Mock script/audio/subtitle dosyaları oluşmalı.
Ortak image manifest oluşmalı.
Tüm seviyeler aynı image manifest’i referans almalı.
YouTube metadata oluşmalı.
Instagram metadata oluşmalı.
QA raporu oluşmalı.
Production report oluşmalı.

Agent dosyalarını oluştur:
project-orchestrator.md
topic-strategist.md
visual-director.md
cefr-editor.md
subtitle-qa.md
render-operator.md
social-packaging-agent.md
publishing-agent.md
analytics-agent.md
compliance-agent.md

Skill dosyalarını oluştur:
lingroot-video-factory/SKILL.md
cefr-level-editor/SKILL.md
visual-scene-planner/SKILL.md
youtube-packaging/SKILL.md
instagram-reels-packaging/SKILL.md
render-qa/SKILL.md
local-scheduler/SKILL.md

QA sistemi şunları kontrol etmeli:
A1–C2 seviyeleri var mı?
Tüm seviyeler aynı image_url listesini mi kullanıyor?
Audio var mı?
Subtitle var mı?
Render payload var mı?
YouTube metadata var mı?
Instagram metadata var mı?
Secret leak var mı?
Seviye farkları temel rubric’e uygun mu?

Varsayılan yayın modu:
review

Public otomatik yayın yapma.
Public publish ancak AUTO_PUBLIC_PUBLISH=true ve PUBLISH_MODE=auto_public ise mümkün olsun.

README içinde şunları açıkla:
kurulum
.env hazırlama
dry-run çalıştırma
test-single-level çalıştırma
test-six-levels çalıştırma
production çalıştırma
scheduler kurma
scheduler kaldırma
output klasör yapısı
güvenlik kuralları
n8n kullanılmadığı

Önce Faz 1’i uygula:
Gerçek API çağrısı yapma.
Mock adapterlarla çalışan üretim omurgasını kur.
Kod bittikten sonra npm run typecheck, npm run dry-run ve npm run qa çalıştır.
Sonuçları raporla.
```

---

## 34. İlk Uygulama Önceliği

Codex / Claude Code ilk etapta kesinlikle aşağıdaki sırayla ilerlemelidir:

```text
1. Repo iskeleti
2. CLAUDE.md
3. .env.example
4. Config ve schema dosyaları
5. Mock servisler
6. CLI komutları
7. Output generator
8. QA sistemi
9. Scheduler install/test dosyaları
10. README
```

Gerçek entegrasyonlara hemen geçilmemelidir.

İlk hedef çalışan omurgadır:

```bash
npm run dry-run
```

Bu komut başarılı olduktan sonra gerçek servis entegrasyonları faz faz eklenmelidir.

---

## 35. Codex’e İlk Verilecek Kısa Komut

Codex / Claude Code’a ilk mesaj olarak şu kullanılabilir:

```text
Yukarıdaki brief’e göre sadece Faz 1’i uygula. Gerçek API entegrasyonu yapma. n8n kullanma. Mock adapterlarla çalışan TypeScript repo iskeletini kur. npm run dry-run, npm run qa ve npm run scheduler:test çalışır hale gelsin.
```

---

## 36. Nihai Ürün Cümlesi

LingRoot Local Claude Code Video Factory, bilgisayar açıkken lokal zamanlayıcı ile çalışan, tek bir konuyu ortak görsel akışla A1’den C2’ye kadar altı farklı İngilizce dinleme videosuna dönüştüren, YouTube Shorts ve Instagram Reels için yayın paketi hazırlayan otomatik içerik üretim sistemidir.

Ana marka cümlesi:

```text
Same topic. Your level.
```

Türkçe karşılığı:

```text
Aynı konu. Senin seviyen.
```
