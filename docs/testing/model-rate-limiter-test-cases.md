# Model Rate Limiter Test Senaryolari

**Son Guncelleme:** 3 Mayis 2026  
**Kapsam:** Backend Gemini TTS rate limiter, podcast uretim akislari, fallback davranisi

Bu dokuman, `vertex:gemini-2.5-flash-tts` icin eklenen yeni **in-memory global per-model rate limiter** gelistirmesinin test kapsamlarini tanimlar.

---

## 1. Ne Degisti

Yeni limiter ile ayni modele giden tum Gemini TTS cagrilari ortak bir in-memory queue icinden geciyor.

Ana hedefler:

- `429 quota exceeded` patlamalarini azaltmak
- Gemini TTS cagrilarini model bazinda sira ve hiz kontrolune almak
- rate-limit sonrasinda ortak cooldown uygulamak
- podcast uretimini yuk altinda daha kararlı hale getirmek

---

## 2. Etkilenen Alanlar

### Dogrudan Etkilenen Dosyalar

- [backend/utils/infra/modelRateLimiter.js](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/backend/utils/infra/modelRateLimiter.js)
- [backend/utils/audio/podcastV2/perSpeakerSynthesizer.js](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/backend/utils/audio/podcastV2/perSpeakerSynthesizer.js)
- [backend/utils/audio/podcastV2/index.js](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/backend/utils/audio/podcastV2/index.js)
- [backend/utils/audio/googleTTSMultiSpeaker.js](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/backend/utils/audio/googleTTSMultiSpeaker.js)
- [backend/tests/modelRateLimiter.test.js](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/backend/tests/modelRateLimiter.test.js)

### Kullaniciya Yansiyan Akislar

- Podcast V2 uretimi
- Legacy podcast uretimi
- Gemini multi-speaker chunked synthesis
- Gemini per-turn fallback synthesis
- Neural2 son-care fallback tetiklenme zamani

### Regresyon Riski Olan Alanlar

- podcast uretim suresi
- secilen speaker seslerinin korunmasi
- quota sonrasinda fallback kalitesi
- ayni anda birden fazla kullanicidan gelen podcast istekleri
- burst trafik altinda queue bekleme davranisi

---

## 3. Nerelerde Test Yapilmali

### Otomatik Test

- unit test: `backend/tests/modelRateLimiter.test.js`
- ileride genisletilirse podcast ile ilgili mevcut backend testleri

### Manuel Test - Lokal / Test Ortami

- mobil uygulamada podcast olusturma akisi
- gerekiyorsa web veya admin uzerinden podcast olusturma akisi
- burst trafik sirasinda backend loglari
- Railway veya lokal backend uzerinde quota ve fallback davranisi

### Takip Edilecek Loglar

Limiter loglari:

- `[MODEL-RATE-LIMITER] queued`
- `[MODEL-RATE-LIMITER] started`
- `[MODEL-RATE-LIMITER] completed_slot`
- `[MODEL-RATE-LIMITER] cooldown`
- `[MODEL-RATE-LIMITER] timeout_wait`
- `[MODEL-RATE-LIMITER] timeout_execution`

Podcast loglari:

- `[PODCAST-V2] ...`
- `[GOOGLE-PODCAST] ...`

---

## 4. Gerekli Otomatik Test Senaryolari

### TC-A1: Ayni Modelde Concurrency Limiti

**Amac:** ayni model icin aktif calisan is sayisinin config edilen concurrency degerini asmamasini dogrulamak.

**Kapsam:**

- `vertex:gemini-2.5-flash-tts` icin birden fazla queued is
- ayni anda sadece belirlenen sayida aktif is

**Beklenen Sonuc:**

- aktif calisma sayisi hicbir anda config edilen concurrency degerini gecmez

### TC-A2: Request Spacing

**Amac:** isteklerin baslama zamanlarinin `VERTEX_TTS_MIN_SPACING_MS` kuralina uydugunu dogrulamak.

**Beklenen Sonuc:**

- ikinci istek, gerekli spacing suresi dolmadan baslamaz

### TC-A3: 429 Sonrasi Ortak Cooldown

**Amac:** bir `429` hatasinin ayni model icin kuyrukta bekleyen sonraki isleri de etkiledigini dogrulamak.

**Beklenen Sonuc:**

- sonraki queued is hemen baslamaz
- cooldown gecikmesi loglarda ve zaman farkinda gorulur

### TC-A4: Queue Wait Timeout

**Amac:** kuyrukta cok uzun bekleyen islerin deterministic bir limiter hatasi ile dondugunu dogrulamak.

**Beklenen Sonuc:**

- hata kodu `MODEL_RATE_LIMIT_WAIT_TIMEOUT` olur

---

## 5. Manuel Fonksiyonel Test Senaryolari

## 5.1 Podcast V2 Basarili Akis

### TC-M1: Tekil Podcast V2 Istegi

**On Kosul:**

- backend calisiyor olmali
- `PODCAST_TYPE=new`
- gecerli Gemini credentials olmali

**Adimlar:**

1. Mobil veya API uzerinden bir podcast istegi gonderin.
2. Tamamlanmasini bekleyin.
3. Backend loglarini inceleyin.

**Beklenen Sonuc:**

- podcast basariyla tamamlanir
- limiter loglari gorulur
- beklenmeyen timeout veya cooldown olmaz
- secilen host/guest sesleri kullanilir

## 5.2 Paralel Podcast Burst

### TC-M2: Ayni Anda Iki veya Daha Fazla Podcast Istegi

**Amac:** burst yuk altinda queue davranisini dogrulamak.

**Adimlar:**

1. Birbirine cok yakin anda 2-5 podcast isi baslatin.
2. Limiter loglarini izleyin.
3. Queue uzunlugu ve baslama sirasini karsilastirin.

**Beklenen Sonuc:**

- istekler queue'ya girer
- butun istekler ayni anda dis API'ye cikmaz
- `running` sayisi concurrency degerini gecmez
- onceki davransa gore daha az veya hic ani `429` patlamasi gorulur

## 5.3 Ses Seciminin Korunmasi

### TC-M3: Normal Akista Secilen Sesler Korunuyor mu

**Adimlar:**

1. Belirli host ve guest sesleri secerek podcast olusturun.
2. Loglari ve son cikan sesi kontrol edin.

**Beklenen Sonuc:**

- normal Gemini akisinda secilen sesler kullanilir
- saglikli akista default sese dusulmez

### TC-M4: Neural2 Fallback'te Sesler Mümkün Oldugunca Korunuyor mu

**On Kosul:**

- mumkunse Gemini hata veya quota yolu tetiklenebilmeli

**Adimlar:**

1. Neural2 fallback'e dusen bir podcast uretimi tetikleyin.
2. Asagidaki logu kontrol edin:
   - `Neural2 fallback voice map`
3. Gerekirse cikan sesi dinleyin.

**Beklenen Sonuc:**

- fallback her zaman ayni sabit sesleri kullanmaz
- secilen Gemini speaker'a en yakin Neural2 sesi map edilir

---

## 6. Rate Limit ve Fallback Test Senaryolari

### TC-R1: Podcast V2 Turn Synthesis Sirasinda Gemini 429

**Amac:** bir turn istegi rate-limit aldiginda ortak cooldown uygulanmasini dogrulamak.

**Beklenen Sonuc:**

- limiter `cooldown` logu uretir
- sonraki queued Gemini istekleri bekler
- sistem ayni anda tekrar tekrar 429 yemeye saldirmaz

### TC-R2: Legacy Multi-Speaker Synthesis Sirasinda Gemini 429

**Amac:** legacy Gemini yolunun da ayni limiter ile korundugunu dogrulamak.

**Beklenen Sonuc:**

- legacy Gemini istegi de limiter icinden gecer
- burada da cooldown uygulanir

### TC-R3: Per-Turn Fallback Sirasinda Gemini 429

**Amac:** per-turn fallback yolunun da ikinci bir kontrolsuz request patlamasi yaratmadigini dogrulamak.

**Beklenen Sonuc:**

- per-turn fallback cagrilari da ayni model key ile queue'lanir
- ikinci bir bagimsiz burst olusmaz

### TC-R4: Son Neural2 Fallback Hala Calisiyor mu

**Amac:** limiter'in son care fallback davranisini bozmadigini dogrulamak.

**Beklenen Sonuc:**

- Gemini yollarinin hepsi fail olsa bile Neural2 fallback calisir
- uygun durumda kullanici yine podcast ciktisi alabilir

---

## 7. Regresyon Test Senaryolari

### TC-G1: Podcast Uretim Suresi Kabul Edilebilir mi

**Amac:** throttling sonrasinda podcast uretim suresinin kullanilamaz seviyeye cikmadigini dogrulamak.

**Adimlar:**

1. Tek bir normal podcast olusturun.
2. Burst senaryosunda bir podcast olusturun.
3. Onceki davranisla uretim surelerini karsilastirin.

**Beklenen Sonuc:**

- belirli bir yavaslama kabul edilebilir
- asiri gecikme veya sik timeout kabul edilmez

### TC-G2: Start Onboarding Podcast Akisinda Regresyon Var mi

**Neden:** onboarding podcast uretimi ayni audio yoluna dolayli olarak giriyor olabilir.

**Adimlar:**

1. Start onboarding icindeki podcast adimini kullanin.
2. Uretimi tamamlayin.
3. Basari durumunu ve icerik erisilebilirligini kontrol edin.

**Beklenen Sonuc:**

- onboarding podcast akisi calismaya devam eder
- limiter completion akislarini bozmaz

### TC-G3: Podcast Disi TTS Akislarinda Regresyon Var mi

**Neden:** bu fazda limiter esas olarak podcast tarafindaki Gemini TTS cagrilarina baglandi.

**Adimlar:**

1. Standart text-to-speech uretimi yapin.
2. Normal akis davranisini kontrol edin.

**Beklenen Sonuc:**

- limiter'a baglanmayan standart akislar eskisi gibi davranir

---

## 8. Hata ve Edge Case Senaryolari

### TC-E1: Queue Wait Timeout

**Amac:** kuyrukta cok uzun bekleyen bir istekte kullaniciya ve loglara ne oldugunu gormek.

**Kontroller:**

- backend deterministic hata donmeli
- loglarda `MODEL_RATE_LIMIT_WAIT_TIMEOUT` net gorunmeli
- kuyrukta asili is kalmamali

### TC-E2: Execution Timeout

**Amac:** takilan veya asiri yavas dis API istegine karsi korumayi dogrulamak.

**Kontroller:**

- backend `timeout_execution` logu yazar
- running slot sonunda serbest kalir
- sonraki queued isler devam edebilir

### TC-E3: App / Backend Restart

**Amac:** in-memory sinirin beklenen davranisini dogrulamak.

**Adimlar:**

1. Queue'da bekleyen isler varken backend'i yeniden baslatin.

**Beklenen Sonuc:**

- in-memory queue state sifirlanir
- bu mevcut faz icin beklenen davranistir
- restart sonrasinda bozuk limiter state kalmaz

---

## 9. Onerilen Manuel Test Matrisi

| Alan | Senaryo | Oncelik |
|------|----------|---------|
| Podcast V2 | 1 normal istek | P0 |
| Podcast V2 | 2-5 paralel istek | P0 |
| Legacy podcast | 1 normal istek | P0 |
| Legacy fallback | quota veya zorlanmis hata yolu | P1 |
| Secilen sesler | normal Gemini yolu | P0 |
| Secilen sesler | Neural2 fallback yolu | P1 |
| Onboarding podcast | start flow icinden uretim | P1 |
| Queue timeout | kisitli env config ile test | P1 |
| Backend restart | in-memory queue reset | P2 |

---

## 10. Onerilen Komutlar

### Unit Test

```bash
cd backend
npx jest --watchman=false --runInBand tests/modelRateLimiter.test.js
```

### Regresyon Kontrolu

```bash
cd backend
npx jest --watchman=false --runInBand tests/startGeneration.test.js
```

### Sentaks Kontrolu

```bash
node -c backend/utils/infra/modelRateLimiter.js
node -c backend/utils/audio/podcastV2/perSpeakerSynthesizer.js
node -c backend/utils/audio/googleTTSMultiSpeaker.js
node -c backend/utils/audio/podcastV2/index.js
```

---

## 11. Cikis Kriterleri

Bu gelistirme daha genis rollout icin hazir sayilabilmesi icin:

- unit testler gecmeli
- en az bir Podcast V2 istegi uctan uca basariyla tamamlanmali
- burst trafik altinda kontrolsuz paralel patlama yerine queue davranisi gorulmeli
- `429` sonrasinda ortak cooldown davranisi net izlenmeli
- secilen speaker davranisinda regresyon olmamali
- onboarding podcast akisinda regresyon olmamali

