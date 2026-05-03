# Global Per-Model Rate Limiter Plan

## Goal

`gemini-2.5-flash-tts` kullanan tüm backend akışlarını tek bir model-bazlı rate limiter üzerinden geçirmek.

Ana hedefler:

- Vertex AI request patlamasını önlemek
- `429 quota exceeded` hatalarını azaltmak
- podcast üretiminde paralel istekleri kontrollü sıraya almak
- fallback kararlarını daha tutarlı hale getirmek
- model bazlı gözlemlenebilirlik sağlamak

Bu planın mevcut kapsamı:

- queue yapısı **in-memory** olacak
- Redis veya distributed locking bu aşamada **yok**
- çözüm mevcut backend process içinde global çalışacak

Bu planda bilinçli olarak kapsam dışı bırakılanlar:

- Redis tabanlı queue
- distributed rate limiter
- instance'lar arası ortak quota koordinasyonu

## Problem Summary

Mevcut yapıda özellikle podcast üretiminde çok sayıda `gemini-2.5-flash-tts` isteği kısa sürede aynı anda tetikleniyor.

Örnek riskli akışlar:

- `Podcast V2` turn bazlı synthesis
- legacy podcast fallback akışları
- aynı anda birden fazla kullanıcıdan gelen TTS işleri

Sonuç:

- `aiplatform.googleapis.com/global_generate_content_requests_per_minute_per_project_per_base_model`
- model: `gemini-2.5-flash-tts`

kotası aşılabiliyor.

## High-Level Strategy

Tam serial çalışmak yerine:

- model bazlı tek merkezli queue
- düşük concurrency
- request arası spacing
- 429 sonrası cooldown

uygulanacak.

İlk faz için önerilen yaklaşım:

- `maxConcurrency = 2`
- `minSpacingMs = 1500`
- `429` sonrası global model cooldown

Yani aynı anda sınırlı sayıda istek çıkacak, geri kalan işler process içi queue’da bekleyecek.

## Scope

İlk aşamada sadece:

- Vertex AI
- `gemini-2.5-flash-tts`

için uygulanacak.

Daha sonra aynı altyapı başka modellere de genişletilebilir.

Örnek model anahtarları:

- `vertex:gemini-2.5-flash-tts`
- `vertex:gemini-2.5-pro-tts`

## Proposed Architecture

### 1. Central Limiter Module

Yeni modül:

- `backend/utils/infra/modelRateLimiter.js`

Bu modülün sorumlulukları:

- model bazlı queue tutmak
- aktif çalışan iş sayısını izlemek
- request spacing uygulamak
- cooldown yönetmek
- queue ve hata metriklerini toplamak

### 2. In-Memory State

Her model için process memory içinde state tutulacak.

Örnek state:

```js
{
  queue: [],
  running: 0,
  lastStartedAt: 0,
  cooldownUntil: 0,
  consecutive429Count: 0,
  stats: {
    queued: 0,
    started: 0,
    completed: 0,
    failed: 0,
    rateLimited: 0,
  }
}
```

Not:

- bu state sadece tek backend instance içinde geçerlidir
- çoklu instance senaryosunda instance'lar birbirini görmez
- mevcut aşama için bu bilinçli bir tasarım kararı olarak kabul ediliyor

### 3. Limiter Wrapper API

Önerilen ana kullanım fonksiyonu:

```js
runWithModelRateLimit({
  provider: 'vertex',
  model: 'gemini-2.5-flash-tts',
  taskName: 'podcast-v2-turn-synthesis',
  metadata: { userId, jobId, speaker: 'A' },
  fn: async () => {
    // actual API call
  }
})
```

Bu wrapper:

- işi ilgili model queue’suna ekler
- concurrency uygunsa çalıştırır
- spacing gerekiyorsa bekletir
- `429` olursa cooldown uygular
- sonucu çağırana geri döner

## Queueing Model

### Concurrency

İlk öneri:

- `gemini-2.5-flash-tts` için `maxConcurrency = 2`

Bu değer env ile değiştirilebilir.

Tam serial yerine düşük concurrency tercih edilme nedeni:

- podcast sürelerini gereksiz uzatmamak
- ama paralel patlamayı da kesmek

### Spacing

Aynı model için iki request başlangıcı arasında minimum süre bırakılacak.

Örnek:

- `minSpacingMs = 1500`

Bu, request başlatma hızını yumuşatır.

### Ordering

Queue FIFO çalışacak.

Yani:

- önce gelen iş önce çıkar
- aynı anda gelen işler sıraya alınır

## 429 Handling

`429 quota exceeded` alınırsa sadece o request retry edilmez; model düzeyinde cooldown da uygulanır.

Önerilen davranış:

- ilk `429`: `10s` cooldown
- ikinci art arda `429`: `20s`
- üçüncü: `40s`

Bu sırada:

- yeni işler queue’da bekler
- model için yeni request başlatılmaz

Bu, “her worker ayrı ayrı tekrar 429 yemesin” diye gereklidir.

## Timeout Rules

Her queued iş için iki timeout düşünülmeli:

- `maxWaitMs`
- `maxExecutionMs`

Öneri:

- `maxWaitMs = 120000`
- `maxExecutionMs = 180000`

Eğer iş çok uzun süre queue’da beklerse:

- kontrollü hata döndürmeli
- veya ilgili akış fallback’e geçmeli

## Integration Points

### Phase 1: Primary Integration

İlk uygulanacak dosyalar:

- `backend/utils/audio/podcastV2/perSpeakerSynthesizer.js`
- `backend/utils/audio/googleTTSMultiSpeaker.js`

Sebep:

- quota patlaması esas olarak burada yaşanıyor
- podcast üretimi en agresif paralel kullanım alanı

### Phase 2: Other Gemini TTS Call Sites

Sonraki adımda:

- `gemini-2.5-flash-tts` kullanan diğer backend synthesis noktaları

aynı limiter üzerinden geçmeli.

## Podcast-Specific Behavior

Mevcut `Promise.all` veya benzeri paralel orchestration tamamen kaldırılmak zorunda değil.

Daha doğru yaklaşım:

- iş mantığı aynı kalır
- ama gerçek dış API çağrısı limiter wrapper içinden geçer

Böylece:

- kod akışı minimum bozulur
- efektif concurrency kontrol altına alınır

## Fallback Strategy

Limiter sonrası da işler uzun kuyrukta bekleyebilir veya cooldown uzayabilir.

Bu durumda ikinci fazda şu geliştirme değerlendirilebilir:

- queue depth çok yükselirse
- veya cooldown çok uzarsa
- bazı podcast işleri daha erken `Neural2 fallback`e alınabilir

Bu davranış ilk faz için zorunlu değil.

## Observability

Log tag önerisi:

- `[MODEL-RATE-LIMITER]`

Her model için izlenecek alanlar:

- queue length
- running count
- cooldown until
- last started at
- total 429 count
- completed / failed counts

Örnek loglar:

```text
[MODEL-RATE-LIMITER] queued model=vertex:gemini-2.5-flash-tts queue=7 running=2
[MODEL-RATE-LIMITER] started model=vertex:gemini-2.5-flash-tts queue=6 running=2
[MODEL-RATE-LIMITER] cooldown model=vertex:gemini-2.5-flash-tts until=...
```

## Optional Debug Endpoint

Opsiyonel ama faydalı:

- `GET /api/admin/debug/model-rate-limits`

Örnek response:

```json
{
  "models": [
    {
      "key": "vertex:gemini-2.5-flash-tts",
      "queueLength": 5,
      "running": 2,
      "cooldownUntil": "2026-05-03T12:00:00.000Z",
      "stats": {
        "queued": 120,
        "started": 115,
        "completed": 108,
        "failed": 7,
        "rateLimited": 4
      }
    }
  ]
}
```

Bu endpoint ilk faz için şart değil.

## Environment Configuration

Önerilen env değişkenleri:

```env
VERTEX_TTS_MAX_CONCURRENCY=2
VERTEX_TTS_MIN_SPACING_MS=1500
VERTEX_TTS_MAX_WAIT_MS=120000
VERTEX_TTS_MAX_EXECUTION_MS=180000
VERTEX_TTS_COOLDOWN_BASE_MS=10000
```

Hardcode yerine env tercih edilmeli.

## Testing Plan

### Unit Tests

Ek test dosyası önerisi:

- `backend/tests/modelRateLimiter.test.js`

Kontrol edilecekler:

- aynı model için concurrency aşılmıyor mu
- spacing uygulanıyor mu
- FIFO sıra korunuyor mu
- 429 sonrası cooldown devreye giriyor mu
- cooldown bitince queue devam ediyor mu

### Integration Tests

Podcast benzeri burst senaryoları simüle edilmeli:

- 10+ parallel job
- limiter ile kontrollü sıraya alınıyor mu
- fallback davranışı bozuluyor mu

## Rollout Plan

### Phase 1

- `modelRateLimiter.js` oluştur
- `Podcast V2` entegrasyonu
- `googleTTSMultiSpeaker` entegrasyonu
- temel loglar

### Phase 2

- diğer Gemini TTS call site’ları aynı limiter’a taşı
- timeout/fallback kurallarını sertleştir

### Phase 3

- debug endpoint
- daha detaylı metrics

## Known Limitation

Bu çözüm şu aşamada **in-memory** olduğu için:

- sadece aynı backend process içindeki işleri koordine eder
- çoklu instance varsa quota tüketimi instance’lar arasında paylaşılmaz

Ancak şu anki gereksinime göre Redis eklenmeyecek.

Dolayısıyla bu planın bilinçli sınırı:

- tek process seviyesinde güçlü koruma
- çoklu instance seviyesinde tam global koordinasyon yok
- queue state uygulama yeniden başlatıldığında sıfırlanır

## Recommendation

Şu an için en doğru uygulama:

- process içi global per-model queue
- düşük concurrency
- spacing
- 429 sonrası cooldown

Bu çözüm:

- implementasyonu sade tutar
- mevcut backend’e minimum riskle entegre olur
- podcast üretimindeki ani request patlamasını büyük ölçüde azaltır

## Acceptance Criteria

Bu iş tamamlandı sayılabilmesi için:

- `gemini-2.5-flash-tts` çağrıları limiter üzerinden geçmeli
- podcast üretimi burst anında queue'ya düşmeli
- `429` frekansı anlamlı biçimde azalmalı
- fallback daha seyrek tetiklenmeli
- seçilen sesler normal akışta ve fallback akışında korunmalı
- queue ve cooldown durumu loglardan izlenebilmeli

## Implementation Task Breakdown

## Phase 1 - Core Limiter

### Task 1: Create Central Limiter Module

Yeni dosya:

- `backend/utils/infra/modelRateLimiter.js`

Bu modülde implement edilecek ana parçalar:

- model key bazlı in-memory state store
- FIFO queue yapısı
- concurrency kontrolü
- request spacing kontrolü
- cooldown/backoff yönetimi
- timeout yönetimi
- temel metrics sayaçları

Önerilen public API:

```js
runWithModelRateLimit({
  provider,
  model,
  taskName,
  metadata,
  fn,
  maxWaitMs,
  maxExecutionMs,
})
```

Opsiyonel yardımcılar:

```js
getModelRateLimiterSnapshot()
resetModelRateLimiterForTests()
```

### Task 2: Add Config Reader

Konum seçenekleri:

- doğrudan `modelRateLimiter.js` içinde
- veya ortak config helper içinde

İlk faz için okunacak env'ler:

- `VERTEX_TTS_MAX_CONCURRENCY`
- `VERTEX_TTS_MIN_SPACING_MS`
- `VERTEX_TTS_MAX_WAIT_MS`
- `VERTEX_TTS_MAX_EXECUTION_MS`
- `VERTEX_TTS_COOLDOWN_BASE_MS`

Varsayılanlar:

- concurrency: `2`
- spacing: `1500`
- wait: `120000`
- execution: `180000`
- cooldown base: `10000`

### Task 3: Add Structured Logging

Tüm limiter logları tek tag ile çıksın:

- `[MODEL-RATE-LIMITER]`

Minimum log event seti:

- `queued`
- `started`
- `completed`
- `failed`
- `cooldown`
- `timeout_wait`
- `timeout_execution`

Her logta mümkünse şunlar bulunsun:

- `model`
- `taskName`
- `queueLength`
- `running`
- `cooldownUntil`
- `metadata.userId`
- `metadata.jobId`

## Phase 2 - Primary Integrations

### Task 4: Integrate Podcast V2 Turn Synthesis

Dosya:

- `backend/utils/audio/podcastV2/perSpeakerSynthesizer.js`

Yapılacak:

- gerçek Vertex API çağrısını limiter wrapper içine al
- mevcut orchestration akışını bozma
- speaker bazlı metadata geçir:
  - `speaker`
  - `turnIndex`
  - `jobId`
  - `userId`

Beklenen sonuç:

- `Promise.all` kalsa bile dış API çıkışı kontrollü hale gelsin

### Task 5: Integrate Legacy Podcast Multi-Speaker Flow

Dosya:

- `backend/utils/audio/googleTTSMultiSpeaker.js`

Yapılacak:

- Gemini REST çağrılarını limiter üzerinden geçir
- multi-turn synthesis ve per-turn fallback için aynı model key'i kullan
- Neural2 fallback limiter dışı kalabilir

Beklenen sonuç:

- V2 quota aşınca legacy'ye düşse bile aynı model için ikinci bir request patlaması olmasın

## Phase 3 - Safety and Fallback Rules

### Task 6: Normalize 429 Handling

Etkilenecek yerler:

- `backend/utils/infra/modelRateLimiter.js`
- limiter'ı kullanan Gemini TTS call site'ları

Yapılacak:

- `429` algılanınca limiter state üzerinde cooldown başlat
- cooldown süresini artan şekilde hesapla
- aynı anda bekleyen işlerin kendi başına retry fırtınası yaratmasını engelle

Önerilen cooldown artışı:

- 1. kez: `10s`
- 2. kez: `20s`
- 3. kez: `40s`

### Task 7: Queue Wait Timeout Policy

Yapılacak:

- queue'da fazla bekleyen işler için net hata tipi üret
- podcast akışında bu hata özel olarak ele alınabilsin

Önerilen hata tipleri:

- `MODEL_RATE_LIMIT_WAIT_TIMEOUT`
- `MODEL_RATE_LIMIT_EXECUTION_TIMEOUT`

### Task 8: Early Fallback Decision Hook

İlk faz için zorunlu değil, ama sonraki adımda eklenebilir.

Fikir:

- queue depth belli bir eşiği aşarsa
- veya cooldown aktifse
- bazı podcast istekleri doğrudan Neural2 fallback'e yönlendirilebilir

Bu görev ikinci iterasyona bırakılabilir.

## Phase 4 - Debugging and Visibility

### Task 9: Add Snapshot Accessor for Debugging

Yeni helper:

- `getModelRateLimiterSnapshot()`

Snapshot içeriği:

- model key
- queue length
- running count
- cooldown until
- last started at
- stats

Bu helper önce sadece internal kullanım için yeterli.

### Task 10: Optional Admin Debug Endpoint

Opsiyonel endpoint:

- `GET /api/admin/debug/model-rate-limits`

İlk teslim için zorunlu değil.
Eğer prod teşhisi zorlaşırsa eklenmeli.

## Phase 5 - Test Coverage

### Task 11: Unit Tests for Limiter

Yeni test dosyası:

- `backend/tests/modelRateLimiter.test.js`

Minimum testler:

- aynı modelde concurrency limiti aşılmıyor mu
- FIFO korunuyor mu
- spacing uygulanıyor mu
- cooldown sırasında yeni iş başlamıyor mu
- cooldown bitince sıra devam ediyor mu
- wait timeout doğru hata üretiyor mu

### Task 12: Integration Tests for Podcast Burst

Mevcut test altyapısına göre:

- mock Vertex client
- 10+ parallel synthesis call
- limiter sonrası efektif sıralama beklentisi

Burada tam gerçek network gerekmez; önemli olan orchestrator davranışı.

## Recommended Delivery Order

İdeal uygulama sırası:

1. `modelRateLimiter.js`
2. unit test iskeleti
3. `perSpeakerSynthesizer.js` entegrasyonu
4. `googleTTSMultiSpeaker.js` entegrasyonu
5. structured logging
6. timeout ve cooldown sertleştirmesi
7. integration testler
8. opsiyonel debug endpoint

## Risk Notes

Başlıca riskler:

- concurrency çok düşük seçilirse podcast süresi gereksiz uzar
- spacing çok yüksek seçilirse queue latency artar
- timeout çok agresif seçilirse gereksiz fallback olur
- in-memory yapı çoklu instance'ta tam koruma sağlamaz

Bu yüzden rollout'ta ilk izlenecek metrikler:

- `429` sayısı
- ortalama podcast üretim süresi
- queue'da bekleme süresi
- fallback'e düşme oranı

## Definition of Done

Bu görev teknik olarak tamamlandı sayılabilmesi için:

1. `gemini-2.5-flash-tts` çağrıları en az podcast akışlarında limiter üzerinden geçiyor olmalı.
2. Aynı anda çok sayıda podcast üretiminde request burst yerine queue davranışı gözlenmeli.
3. `429` sonrası tüm worker'lar bağımsız saldırmak yerine ortak cooldown davranışı göstermeli.
4. Loglardan model bazında queue/running/cooldown durumu okunabilmeli.
5. En az temel limiter unit testleri yazılmış olmalı.
