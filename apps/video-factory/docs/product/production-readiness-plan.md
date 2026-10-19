# Production Readiness Plan

**Durum:** Yerel FFmpeg birincil render akisi, local smoke ve preflight basarili; canli provider ile alti-level kabul testi bekliyor  
**Tarih:** 2026-07-14  
**Proje sahibi:** LingRoot Video Factory  
**Karar sahibi:** LingRoot urun sahibi

## 1. Hedef ve basari tanimi

Bu projenin nihai isi, LingRoot'un onayli bir konusunu alarak ayni konu icin
A1, A2, B1, B2, C1 ve C2 seviyelerinde alti ayri Ingilizce dinleme videosu
uretmektir.

Her run su sonucu vermelidir:

1. LingRoot'tan konu, ana fikir ve ortak sahne anlatisi alinir.
2. Ortak sahne gorselleri bir kez uretilir ve kalici olarak kaydedilir.
3. LingRoot Core'dan her CEFR seviyesi icin ayri script, ses ve altyazi alinir.
4. Her seviye, ayni gorsel varliklari ve sirayi kullanarak ayri MP4'e render edilir.
5. Teknik, CEFR ve yayin QA'lari gecen alti video YouTube'a private olarak
   yuklenir; konu ve seviye playlist'lerine eklenir.
6. Run kesilirse tekrar baslatma, yeni gorsel/render/video olusturmadan
   kaldigi asamadan devam eder.

"Ayni gorseller" kurali, ayni gorsel dosyalari ve sahne sirasi anlamina gelir.
Seviye farkli ses hizlari gerektirdigi icin sahnelerin ekranda kalma sureleri
seviye bazinda farkli olabilir.

## 2. Mevcut durum

### Hazir olan temel

- Ortak visual manifest kurali TypeScript tipleri, JSON Schema'lar ve testlerle
  korunuyor.
- LingRoot Core HTTP adapter'i versioned request/response kontratini, topic ve
  level eslesmesini, sahne sirasini ve altyazi baglarini dogruluyor.
- OpenAI Image, local/Supabase Storage, local FFmpeg, JSON2Video alternatif ve
  YouTube private upload/playlist adapter'lari mevcut.
- Mock uctan uca uretim ve provider adapter testleri mevcut.
- 2026-07-14'te `npm test` 72/72 testle, `npm run typecheck` ve
  `npm run validate:schemas` basariyla tamamlandi.

### Canliya gecis icin kalan dis bagimliliklar

1. LingRoot, `TopicBrief` endpoint'ini bu repodaki contract'a gore canliya
   almalidir.
2. LingRoot Core, OpenAI ve YouTube credential'lari production ortaminda
   saglanmalidir. Supabase arsiv, JSON2Video ise sadece secildiklerinde
   credential gerektirir.
3. Core audio URL'lerinin Factory tarafindan indirilebildigi; hedef makinede
   FFmpeg (`subtitles`, `drawtext`, `libx264`) ve `ffprobe` ile final MP4
   QA'nin calistigi dogrulanmalidir.
4. Uc farkli konu icin alti-level private release kabul testi yapilmalidir.
5. Public/scheduled YouTube ve Instagram otomasyonu bu planin kapsami disinda
   kalmaya devam eder.

## 3. Kapsam ve yayin politikasi

### Bu planin kapsami

- LingRoot topic/scene brief entegrasyonu
- Alti seviyeli gercek production workflow
- Ortak gorsel varliklari, local FFmpeg render ve istege bagli arsiv storage
- Acik secilen JSON2Video bulut fallback'i
- Teknik ve icerik kalite kapilari
- YouTube private upload, playlist ve metadata capraz baglari
- Resume, loglama, scheduler ve kontrollu canliya gecis

### Kapsam disi

- Instagram Graph API ile otomatik yayin
- Otomatik public YouTube yayini
- Analytics tabanli icerik optimizasyonu
- Bulut tabanli surekli worker altyapisi

Ilk yayin hedefi **review -> private YouTube upload** akisi olacaktir. Public
veya scheduled yayin, ayri bir `promote` komutu ve kayitli insan onayi olmadan
asla tetiklenmeyecektir.

## 4. Mimari kararlar

### 4.1 LingRoot siniri

LingRoot, konu secimi/olusturma ile seviye-bazli script, TTS ve altyazi
uretiminin sahibidir. Video Factory gorsel, render, paketleme ve yayin
orkestrasyonunun sahibidir.

Factory'nin topic kaynagi icin `TopicSourceClient`, mock ve HTTP adapter'lari
uygulandi. HTTP adapter, LingRoot'un endpoint'inden en az su immutable
snapshot'i dondurecektir:

```text
topicId, title, coreMessage, category, language, visualOutline[]
```

`visualOutline`, ortak sahnelerin anlamini ve sirasini tasir. Baslik tek basina
`coreMessage` yerine gecemez. Topic API sozlesmesi netlesmeden gercek production
workflow'a baslanmaz.

### 4.2 Ortak asset, seviye bazli zaman cizelgesi

Schema v2 su ayrimi yapacaktir:

- `SharedVisualManifest`: `sceneId`, sira, narrative beat, image prompt,
  image hash ve canonical storage ref.
- `LevelTimeline`: her level icin ayni `sceneId` sirasi, baslangic/bitis ve
  render suresi.

LingRoot level endpoint'i, kendisine gonderilen ortak sahne brief'leriyle
script/altyazi eslemesini yapacak; zaman cizelgesi subtitle cue'larindan
dogrulanacaktir. Mevcut v1 kontrati geriye uyumluluk icin korunur; Factory
gercek production yolunda v2'yi kullanir.

### 4.3 Kalici run durumu

Her run benzersiz `runId` ve atomik yazilan `run-state.json` tasir. State,
topic snapshot'i, artifact canonical referanslari, yerel video dosya yolu,
yalnizca JSON2Video fallback'inde project ID, QA sonuclari ve YouTube video
ID'lerini saklar; token, signed URL veya API key saklamaz.

Run klasoru tarih + slug + run ID ile benzersiz olur. `--resume <run-id>`
tamamlanan adimlari tekrar etmez. Aynı konu icin eszamanli run'lari engellemek
uzere lock ve stale-lock kurtarma kurali uygulanir.

### 4.4 Medya erisimi ve render maliyeti

- Birincil yol: Factory, ortak gorselleri ve her level'in audio/SRT'sini run
  klasorunde local olarak tutar; FFmpeg bu dosyalari dogrudan render eder.
- `STORAGE_PROVIDER=local`, en dusuk maliyetli varsayilandir. Supabase yalnizca
  kalici remote arsiv veya baska makineden resume gerektiginde secilir.
- LingRoot audio URL'si yalnizca Factory tarafindan bir kez indirilebilir
  olmalidir; renderer'in public URL erisimi gerekmez.
- JSON2Video secilirse Factory asset'leri Supabase'e mirror eder ve her render
  aninda memory icinde kisa omurlu signed URL uretir.
- Production asset'leri integration-check'teki gibi is sonunda silinmez;
  retention politikasi ayri olarak uygulanir.

### 4.5 Render saglayici karar kaydi

**Karar (2026-07-14):** `RENDER_PROVIDER=ffmpeg` varsayilan ve birincil
production yoludur. JSON2Video desteklenen ancak acikca secilen fallback'tir.

**Gerekce:** Bir konu icin olusan alti video ayni gorselleri kullanir; yerel
FFmpeg ile bu alti render bulut render kredisi tuketmez, signed URL ve remote
renderer erisimi gerektirmez. Maliyet CPU, elektrik ve local disk ile sinirlidir.

**Sonuc:** Hedef makine FFmpeg filtreleri, yeterli disk ve tek-konulu render
suresi icin kabul edilir. Uzak/olceklendirilebilir render ihtiyaci dogarsa
operator JSON2Video'yu, Supabase ile birlikte, bir run icin acikca secer.

### 4.6 Dogrulama kaydi

**2026-07-14:** Bu gelistirme makinesinde local FFmpeg smoke testi, tek scene
image + MP3 + SRT ile `1080x1920` H.264/AAC MP4 uretti. `ffprobe` bir video ve
bir audio stream ile `1.00` saniye sureyi dogruladi. `npm run preflight`,
`ffprobe` ile `subtitles` ve `drawtext` filtrelerini basarili buldu. Bu kayit,
gercek LingRoot/OpenAI girdileriyle alti-level kabul testinin yerine gecmez.

**2026-07-14 canli kabul engeli:** Yapilandirilmis `api.lingroot.com` hostu bu
makinede DNS ile cozumlenmedi. `api.openai.com` erisilebilir oldugu icin sorun
genel ag erisimi degil, LingRoot host/tunnel yayini veya DNS kaydidir. Gercek
"Istanbul 7 tepe hangileridir" run'i topic brief asamasinda, image veya TTS
maliyeti olusmadan durdu ve resume paketi olusmadi. **Sahip: LingRoot Core.**
Gerekli aksiyon: cozumlenen HTTPS base URL'yi geri getirip
`LINGROOT_TOPIC_API_URL` ve `LINGROOT_CORE_API_URL` ayarlarini guncellemek;
ardindan ayni production komutunu yeniden calistirmak.

## 5. Is paketleri ve sira

### P0 - Kontrat ve kabul kriterleri

**Durum:** Factory tarafi tamamlandi; Core endpoint canli kabul testi bekliyor  
**Bagimlilik:** LingRoot topic API ve Core sahibi

1. LingRoot konu API'sinin gercek endpoint/kimlik dogrulama/yanitini belgele.
2. `TopicBrief` schema ve TypeScript kontratini ekle.
3. Level package v2 icin ortak scene brief ve per-scene timeline kontratini
   ortaklestir.
4. Core'un audio/SRT erisilebilirlik, format ve TTL garantisini yazili kabul
   kriterine bagla.
5. Varsayilan hedefi 30-60 saniye ve 4-6 ortak sahne olarak belirle; gercek
   Core ornekleriyle her seviye icin uygunlugu onayla.

**Cikis kapisi:** Gercek topic brief ve alti level package icin imzalanmis
schema fixture'lari iki repoda da testten gecer.

### P1 - Veri modeli ve run altyapisi

**Durum:** Tamamlandi  
**Bagimlilik:** P0

1. Shared manifest ve level timeline'i ayiran v2 schema/type'larini ekle.
2. Mevcut QA'yi yeni invariant'a tasi: asset hash ve scene sirasi tum
   seviyelerde ayni; timeline seviye bazinda serbest ama gecerli.
3. `RunState`, benzersiz output klasoru, atomik durum yazimi, lock ve resume
   altyapisini ekle.
4. `production-report`u stage, provider project ID ve publish sonucunu
   guvenli sekilde tasiyacak bicimde genislet.

**Cikis kapisi:** Mock test, kesintiden sonra resume edilir; tamamlanan image,
render ve upload adimlari ikinci kez cagrilmaz.

### P2 - Gercek media ve render workflow'u

**Durum:** Local FFmpeg production akisi ve makine smoke testi tamamlandi; gercek provider ile alti-level kabul testi bekliyor  
**Bagimlilik:** P1, gercek provider credential'lari

1. Preflight komutu; aktif provider credential'larini, endpointleri, FFmpeg
   `subtitles`/`drawtext` filtrelerini ve `ffprobe` gereksinimini dogrular.
2. Topic brief'ten ortak gorsel promptlarini olustur; image'leri yalnizca bir
   kez uret, hash'le ve private storage'a yaz.
3. Core'u alti level icin cagir; ses/SRT'yi ve subtitle timeline'ini dogrula.
4. FFmpeg adapter'iyle local image sequence, audio, SRT ve CEFR badge'i
   H.264/AAC MP4'e render et; output yolunu state'e hemen yaz.
5. JSON2Video fallback'inde `submit`, `poll`, `download` asamalarini kullan;
   project ID'yi hemen state'e yaz ve signed URL'leri yalnizca memory'de tut.
6. Final MP4'leri lokal pakete yaz; gerekli olursa kalici storage'a arsivle.

**Cikis kapisi:** Bir konu icin alti gercek MP4 ayni ortak image hash'lerini
kullanir, her biri 1080x1920 ve ses/sure kontrollerini gecer.

### P3 - QA ve review kapisi

**Durum:** Tamamlandi; insan review HTML sayfasi uretildi  
**Bagimlilik:** P2

1. `ffprobe` ile cozum, codec, video/audio stream, sure ve dosya butunlugunu
   dogrula.
2. Ses, subtitle ve scene timeline hizasini toleransla kontrol et.
3. CEFR kurallarini script kelime sayisi, cumle uzunlugu, speaking rate ve
   seviye farki uzerinden zorunlu QA'ya ekle.
4. Ortak gorseller icin contact sheet, her video icin preview/contact sheet
   uret; insan review'u icin pakete ekle.
5. Secret leak, metadata, telif/marka prompt kurallari ve minimum QA skoru
   gecmeden release'i engelle.

**Cikis kapisi:** Run `review_ready` durumuna ancak tum zorunlu QA'lar gectiginde
gecer; insan onayi state'e kaydedilmeden YouTube komutu calismaz.

### P4 - YouTube release orkestrasyonu

**Durum:** Tamamlandi; gercek OAuth kabul testi bekliyor  
**Bagimlilik:** P3, YouTube OAuth credential'lari

1. `release --run <run-id>` komutunu ekle; sadece `review_approved` run'i
   kabul etsin.
2. Alti videoyu private olarak yukle, her basarili video ID'sini aninda state'e
   kaydet ve resume'da yeniden yuklemeyi engelle.
3. Topic ve level playlist'lerini create-or-reuse mantigiyla yonet; video
   uyeligini idempotent ekle.
4. Alti ID elde edilince aciklamalari diger seviyelere ve topic playlist'ine
   baglayacak metadata-update davranisini ekle.
5. Nadir crash pencereleri icin manuel reconciliation raporu uret; kaydi
   olmayan olasi YouTube upload'ini operator onayi olmadan kopyalama.

**Cikis kapisi:** Bir onayli run, alti private video, iki tur playlist uyeligi
ve capraz baglanmis aciklamalarla tamamlanir; tekrar calisma duplicate upload
olusturmaz.

### P5 - Scheduler ve kontrollu rollout

**Durum:** Uygulandi; scheduler canliya gecis kapisi bekliyor  
**Bagimlilik:** P4

1. `daily` komutunu topic takviminden sadece `approved` kayitlari alacak sekilde
   degistir; sessiz fallback topic davranisini kaldir.
2. Scheduler yalnizca production + review paketini olustursun; release ayri
   operator komutu olsun.
3. Gecis sirasi: provider health check -> tek seviye -> tek konu/alti level
   private release -> uc farkli konu -> scheduler.
4. Her run sonrasinda ozet, hata sinifi ve operator aksiyonu iceren rapor yaz.

**Cikis kapisi:** Uc ardisik onayli run manuel mudahale veya duplicate artifact
olmadan tamamlanir.

## 6. Roller ve sorumluluklar

| Alan | Sorumlu | Teslim |
| --- | --- | --- |
| Topic brief, CEFR script, TTS, SRT | LingRoot Core | Versioned API ve fixtures |
| Ortak gorsel, storage, render, QA | Video Factory | Resume edilebilir production run |
| YouTube OAuth, kanal ve onay | Operator / urun sahibi | Private release onayi |
| Mimari, test, dokumantasyon ve runbook | Proje yonetimi | Bu plan, karar kaydi, durum raporu |

## 7. Risk kaydi

| Risk | Etki | Onlem | Sahip |
| --- | --- | --- | --- |
| Hedef makinede FFmpeg filtresi/codec yok | Yerel render basarisiz | `npm run preflight`; sabit FFmpeg surumu ve machine acceptance | Factory + Operator |
| Yerel CPU/disk yetersiz | Alti video yavas veya yarim kalir | Tek topic sirasiyla render, disk esigi ve resume | Factory + Operator |
| Core media URL Factory tarafindan indirilemez | Render basarisiz | Core URL TTL/kontrolu; indirilmis local artifact ile resume | Core + Factory |
| A1/C2 sure farki | Ses-gorsel uyumsuzlugu | Shared asset / per-level timeline modeli | Factory |
| JSON2Video submit sonrasi process kesilir | Cift bulut render maliyeti | Project ID'yi aninda state'e yaz; poll resume | Factory |
| YouTube upload sonrasi process kesilir | Cift video | Video ID state'i, reconciliation raporu, operator gate | Factory + Operator |
| Zayif gorsel veya CEFR farki | Marka ve platform riski | Contact sheet, CEFR QA, insan review | Operator |
| Credential veya signed URL sizintisi | Guvenlik ihlali | Redacted logs, persisted ref kurallari, secret-leak QA | Factory |
| Ayni gun ayni konunun tekrar tetiklenmesi | Cift paket/yayin | Run lock, unique run ID, takvim durumu | Scheduler |

## 8. Proje yonetim ritmi

- Her is paketi baslamadan once bu dokumandaki bagimlilik ve cikis kapisi
  kontrol edilir.
- Kod degisikligi, ilgili schema + unit/integration testi + runbook guncellemesi
  olmadan tamamlanmis sayilmaz.
- Gercek provider veya YouTube islemi ancak acik, maliyet bilincli komutla
  baslatilir; normal test paketi ag erisimi kullanmaz.
- Her milestone sonunda README, roadmap ve bu dokumandaki durum satirlari
  guncellenir.
- P0-P4 tamamlanmadan `auto_public` etkinlestirilmez.

## 9. Ilk uygulama dilimi

Kodlamaya P0 ile baslanacaktir. Ilk degisiklik seti su sirada gelir:

1. `npm run preflight` ile production makinesini ve local FFmpeg'i dogrulamak.
2. LingRoot TopicBrief endpoint'i icin gercek contract testi yapmak.
3. Tek seviye, sonra ayni makinede alti seviye local FFmpeg render kabul testini calistirmak.
4. Private YouTube release ve uc farkli konuda kabul testleri basarili oldugunda scheduler'i etkinlestirmek.

Bu siralama, calisan mock altyapisini erken provider/yayin degisiklikleriyle
bozmadan gercek sistemin veri modelini once sabitler.
