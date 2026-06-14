# Groq Whisper Alignment Implementation Plan

Tarih: 2026-06-09  
Kapsam: Mevcut MFA tabanlı word highlight akışına Groq + Whisper tabanlı alternatif hizalama yolu ekleme planı. Bu doküman yalnızca implementasyon tasarımıdır; kod değişikliği içermez.

## 1. Amaç

Mevcut sistemde `USE_MFA_ALIGNMENT=true` olduğunda üretilmiş ses, MFA servisine gönderiliyor ve kelime zamanlamaları `timepoints` formatında frontend/mobile player'a dönüyor. İstenen yeni davranış:

- `USE_MFA_ALIGNMENT=true` ise mevcut MFA akışı aynen çalışmalı.
- `USE_MFA_ALIGNMENT=false` ve yeni env değişkeni `groq` değerindeyse Groq + Whisper word timestamp akışı çalışmalı.
- Diğer durumlarda mevcut TTS/estimated timing fallback akışı korunmalı.

Bu değişiklik MFA'yı kaldırmamalı; yalnızca MFA kapalıyken seçilebilir yeni bir timing provider eklemeli.

## 2. Önerilen Env Tasarımı

Yeni env değişkeni:

```env
AUDIO_ALIGNMENT_PROVIDER=groq
```

Zorunlu Groq anahtarı:

```env
GROQ_API_KEY=...
```

Opsiyonel Groq ayarları:

```env
GROQ_WHISPER_MODEL=whisper-large-v3
GROQ_WHISPER_LANGUAGE=en
GROQ_WHISPER_MIN_MATCH_RATIO=0.92
GROQ_WHISPER_MAX_WORD_COUNT_DELTA_RATIO=0.12
GROQ_WHISPER_TIMEOUT_MS=60000
```

Model varsayımları:

- Kalite öncelikli varsayılan: `whisper-large-v3`
- Hız/maliyet öncelikli alternatif: `whisper-large-v3-turbo`

Groq dokümantasyonuna göre transcription endpoint `verbose_json` ve `timestamp_granularities: ["word"]` ile word-level timestamp döndürebilir. `timestamp_granularities` kullanımı için `response_format` değerinin `verbose_json` olması gerekir. Kaynak: https://console.groq.com/docs/speech-to-text

## 3. Karar Matrisi

Alignment provider seçimi merkezi bir helper ile yapılmalı.

| USE_MFA_ALIGNMENT | AUDIO_ALIGNMENT_PROVIDER | Çalışacak yol |
| --- | --- | --- |
| `true` | herhangi | MFA |
| `false` | `groq` | Groq Whisper |
| `false` | boş / farklı | Mevcut TTS estimated timing |

Önemli kural: `USE_MFA_ALIGNMENT=true` her zaman en yüksek öncelikte olmalı. Böylece prod ortamında MFA açıkken yeni Groq değişkeni yanlışlıkla davranışı değiştirmez.

## 4. Mevcut Kodda Dokunulacak Ana Noktalar

Ana TTS akışı:

- `backend/controllers/ttsController.js`
- Şu an karar noktası:
  - `const useMFA = process.env.USE_MFA_ALIGNMENT === 'true';`
  - MFA başarılıysa `mfaWordTimings` timepoints'e çevriliyor.
  - MFA yoksa `matchWordsWithTimings(allOriginalWords, allWordTimings, totalRealDuration)` kullanılıyor.

Mevcut output formatı korunmalı:

```js
{
  word: string,
  timeSeconds: number,
  endTimeSeconds: number,
  index: number,
  hasRealTiming: boolean,
  source: 'mfa' | 'groq_whisper' | 'tts'
}
```

Groq yolu, frontend/mobile tarafında değişiklik gerektirmemek için aynı `timepoints` dizisini üretmeli.

## 5. Önerilen Yeni Dosyalar

### 5.1. `backend/utils/audio/groqWhisperAligner.js`

Sorumluluklar:

- Audio dosyasını Groq transcription endpointine göndermek.
- `response_format: "verbose_json"` kullanmak.
- `timestamp_granularities: ["word"]` istemek.
- Groq response içindeki kelime timestamp'lerini normalize etmek.
- Kaynak metin (`adaptedText` veya `allOriginalWords`) ile Whisper kelimelerini fuzzy eşlemek.
- Kalite eşiği başarısızsa boş dizi döndürmek veya kontrollü hata fırlatmak.

Önerilen public method:

```js
async generateWordTimestamps(audioPath, referenceText, options = {})
```

Dönüş:

```js
[
  {
    word: 'example',
    startTime: 1.23,
    endTime: 1.55,
    sourceWord: 'Example',
    whisperWord: 'example',
    confidence: null,
    matched: true
  }
]
```

Not: Groq API response word timestamp alanları `word`, `start`, `end` şeklinde beklenmeli. Backend'in mevcut MFA formatına çevrim controller veya ortak helper içinde yapılabilir.

### 5.2. `backend/utils/audio/alignmentProvider.js`

Sorumluluk:

- Env'e göre provider seçimini tek yerde yapmak.

Önerilen helper:

```js
function getAlignmentProvider() {
  if (process.env.USE_MFA_ALIGNMENT === 'true') return 'mfa';
  if ((process.env.AUDIO_ALIGNMENT_PROVIDER || '').toLowerCase() === 'groq') return 'groq';
  return 'tts';
}
```

Bu helper hem normal TTS hem ileride podcast akışlarında ortak kullanılabilir.

### 5.3. `backend/utils/audio/wordAlignmentMapper.js`

Sorumluluk:

- Reference text kelimeleri ile Whisper kelimelerini normalize edip hizalamak.
- Basit exact match yerine fuzzy/token based matching yapmak.
- Punctuation, casing, apostrophe, contraction ve hyphen farklarını tolere etmek.

Gerekli davranış:

- Reference kelime dizisinin uzunluğu korunmalı.
- Output `timepoints.length` mümkün olduğunca `referenceWords.length` ile aynı olmalı.
- Whisper'da olmayan reference kelimeler için komşu timestamp'lerden interpolasyon yapılmalı.
- Eşleşme kalitesi düşükse provider başarısız kabul edilmeli.

## 6. Groq Whisper Akış Tasarımı

1. TTS audio üretimi tamamlanır.
2. `USE_MFA_ALIGNMENT` kontrol edilir.
3. `USE_MFA_ALIGNMENT=true` ise mevcut MFA çalışır.
4. `USE_MFA_ALIGNMENT=false` ve `AUDIO_ALIGNMENT_PROVIDER=groq` ise:
   - `mergedAudioBuffer` temp dosyaya yazılır.
   - Groq Whisper transcription çağrılır.
   - Word timestamp'ler alınır.
   - Whisper kelimeleri reference text ile eşlenir.
   - Kalite kapısından geçerse `groqWordTimings` kullanılır.
   - Geçemezse mevcut `matchWordsWithTimings` fallback'i kullanılır.
5. Response `timepoints` alanı aynı formatta döner.

Önerilen controller içi state isimleri:

```js
let alignmentTimings = null;
let alignmentSource = 'tts';
```

MFA başarılı:

```js
alignmentTimings = mfaWordTimings;
alignmentSource = 'mfa';
```

Groq başarılı:

```js
alignmentTimings = groqWordTimings;
alignmentSource = 'groq_whisper';
```

Fallback:

```js
alignmentSource = 'tts';
```

## 7. Kalite Kapısı

Groq Whisper doğrudan forced alignment değildir. Ses üzerinden yeni transcript üretir; bu yüzden reference text ile birebir aynı kelime dizisini garanti etmez. Bu nedenle kalite kapısı zorunlu olmalı.

Önerilen metrikler:

- `referenceWordCount`
- `whisperWordCount`
- `matchedWordCount`
- `matchRatio = matchedWordCount / referenceWordCount`
- `wordCountDeltaRatio = abs(referenceWordCount - whisperWordCount) / referenceWordCount`
- `interpolatedWordCount`
- `nonMonotonicTimingCount`

Varsayılan eşikler:

```env
GROQ_WHISPER_MIN_MATCH_RATIO=0.92
GROQ_WHISPER_MAX_WORD_COUNT_DELTA_RATIO=0.12
```

Başarısızlık durumları:

- Match ratio çok düşük.
- Word count farkı çok yüksek.
- Timestamp'ler monotonic değil.
- Groq response boş.
- Audio süresi ile son word timestamp arasında aşırı fark var.

Bu durumlarda kullanıcıya hata verilmemeli; mevcut TTS estimated timing fallback kullanılmalı.

## 8. Normalizasyon Stratejisi

Reference ve Whisper kelimeleri karşılaştırmadan önce normalize edilmeli:

- Lowercase
- Punctuation silme
- Unicode normalize
- Apostrophe normalize
- Hyphen split veya hyphen removal
- Çoklu boşluk temizliği
- `can't` gibi contraction'lar için tolerans

Örnek:

```txt
Reference: "don't"
Whisper: "do not"
```

Bu durumda exact match başarısız olur. İlk fazda bu tür eşleşmeler interpolasyonla tolere edilebilir; daha ileri fazda contraction dictionary eklenebilir.

## 9. Backend Response ve DB Etkisi

Mevcut response ve DB alanları korunmalı:

- `words`
- `timepoints`
- `duration_seconds`
- `timing_source`
- `timing_accuracy`

Önerilen metadata:

```js
timing_source: 'GROQ_WHISPER'
timing_accuracy: 'asr_word_timestamp'
```

Mevcut alanlar string/JSON olarak saklandığı için migration gerekmemesi beklenir. Ancak admin panelde `timing_source` filtreleme varsa enum/dokümantasyon güncellenmelidir.

## 10. Maliyet ve Observability

Groq çağrıları maliyet takibine dahil edilmeli.

Önerilen cost log alanları:

- `feature: 'audio_alignment'`
- `provider: 'groq'`
- `model: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3'`
- `inputQuantity: audioDurationSeconds`
- `metadata: { source: 'groq_whisper', matchRatio, wordCountDeltaRatio }`

Structured log önerileri:

- Provider seçimi
- Model
- Audio duration
- Groq latency
- Word count karşılaştırması
- Match ratio
- Fallback sebebi

## 11. Hata Yönetimi

Groq yolundaki tüm hatalar kontrollü fallback ile sonuçlanmalı.

Fallback zinciri:

1. MFA açık ve başarılıysa MFA.
2. MFA açık ama başarısızsa mevcut TTS fallback. Bu planda MFA açıkken Groq fallback otomatik devreye girmemeli; istenen davranış "USE_MFA_ALIGNMENT=true ise mevcut MFA çalışmalı".
3. MFA kapalı, provider `groq`, Groq başarılı ve kalite kapısından geçerse Groq.
4. Groq başarısızsa mevcut TTS estimated timing.

Groq başarısızlığı kullanıcıya 500 döndürmemeli; ses üretimi başarılıysa highlight estimated timing ile devam etmeli.

## 12. Bağımlılık Seçimi

Mevcut backend'de `axios` ve `form-data` zaten kullanılıyor. Groq için iki seçenek var:

1. Yeni SDK eklemeden `axios` + `FormData` ile OpenAI-compatible endpoint çağırmak.
2. `groq-sdk` dependency eklemek.

Öneri: İlk implementasyonda yeni dependency eklememek daha düşük riskli. Mevcut `mfaAligner.js` zaten `axios` + `form-data` kullanıyor; aynı pattern korunabilir.

Endpoint:

```txt
POST https://api.groq.com/openai/v1/audio/transcriptions
```

Form-data alanları:

```txt
file=@audio.mp3
model=whisper-large-v3
language=en
response_format=verbose_json
timestamp_granularities[]=word
temperature=0
```

## 13. Podcast Akışı İçin Not

Bu planın ilk kapsamı normal TTS `ttsController.js` olmalı. Podcast tarafında ek karmaşıklık var:

- `googleTTSMultiSpeaker.js`
- `podcastV2/perSpeakerAligner.js`
- `dialogue_segments`
- Host/Guest segment mapping

Whisper tek başına speaker diarization sağlamadığı için podcast akışında Groq provider hemen primary yapılmamalı. Podcast için ayrı faz önerilir:

1. Per-speaker audio zaten ayrı üretiliyorsa her speaker segmenti ayrı Groq'a gönder.
2. Sonra mevcut `timingMerger` mantığına uygun timepoint merge yapılır.
3. Dialogue segment eşleşmesi ayrıca kalite kapısından geçer.

## 14. Test Planı

Unit testler:

- `getAlignmentProvider()`
  - MFA true ise her zaman `mfa`
  - MFA false + provider groq ise `groq`
  - MFA false + boş provider ise `tts`

- `wordAlignmentMapper`
  - Exact match
  - Punctuation farkı
  - Case farkı
  - Whisper eksik kelime
  - Whisper fazla kelime
  - Timestamp monotonic kontrolü

- `groqWhisperAligner`
  - Valid Groq response parse
  - Empty response fallback
  - Low match ratio fallback
  - Timeout fallback

Integration testler:

- `USE_MFA_ALIGNMENT=true`, `AUDIO_ALIGNMENT_PROVIDER=groq`
  - MFA çağrılır, Groq çağrılmaz.

- `USE_MFA_ALIGNMENT=false`, `AUDIO_ALIGNMENT_PROVIDER=groq`
  - Groq çağrılır, başarılı timepoints `source: 'groq_whisper'` döner.

- `USE_MFA_ALIGNMENT=false`, `AUDIO_ALIGNMENT_PROVIDER=groq`, Groq hata
  - TTS estimated timepoints döner, request başarısız olmaz.

- `USE_MFA_ALIGNMENT=false`, provider boş
  - Mevcut davranış korunur.

Manual QA:

- 30 saniyelik kısa metin.
- 3-5 dakikalık uzun metin.
- Noktalama yoğun metin.
- Teknik kelime içeren metin.
- CEFR A1 basit metin.
- CEFR C1/C2 uzun cümleli metin.

## 15. Rollout Planı

1. Kod kapalı varsayılanla deploy edilir:

```env
USE_MFA_ALIGNMENT=false
AUDIO_ALIGNMENT_PROVIDER=
```

2. Staging'de Groq açılır:

```env
USE_MFA_ALIGNMENT=false
AUDIO_ALIGNMENT_PROVIDER=groq
```

3. 100-200 gerçek TTS çıktısı üzerinden ölçüm alınır:

- Match ratio
- Fallback oranı
- Ortalama latency
- Kullanıcı tarafı highlight drift
- Groq hata oranı
- Maliyet/audio hour

4. Prod'da küçük kullanıcı yüzdesi veya internal kullanıcılarla açılır.
5. Kalite iyi ise normal kısa TTS için Groq provider kullanılabilir.
6. MFA, yüksek kalite veya uzun/podcast içerikler için korunur.

## 16. Kabul Kriterleri

Bu geliştirme tamamlanmış sayılmak için:

- `USE_MFA_ALIGNMENT=true` mevcut MFA davranışını bozmamalı.
- `USE_MFA_ALIGNMENT=false` ve `AUDIO_ALIGNMENT_PROVIDER=groq` iken Groq Whisper çağrılmalı.
- Groq başarılı olduğunda frontend/mobile mevcut `timepoints` formatıyla çalışmalı.
- Groq başarısız olduğunda request başarısız olmamalı; mevcut TTS fallback kullanılmalı.
- `timepoints` monotonic olmalı.
- `timepoints.length` reference words sayısıyla makul uyumda olmalı.
- Timing source response/debug metadata'da ayırt edilebilir olmalı.
- Groq latency, fallback reason ve match ratio loglanmalı.

## 17. Ana Riskler

- Whisper ASR olduğu için reference text'e birebir sadık kalmayabilir.
- Word-level timestamp, MFA forced alignment kadar deterministik değildir.
- Uzun seslerde chunking ihtiyacı doğabilir.
- Groq rate limitleri ses üretim pipeline'ını yavaşlatabilir.
- Podcast/dialogue segmentleri için ayrıca speaker-aware tasarım gerekir.

## 18. Sonuç

Bu geliştirme, MFA kapalıyken mevcut estimated timing fallback yerine daha kaliteli bir Groq Whisper opsiyonu eklemek için uygundur. En güvenli yaklaşım Groq'u doğrudan MFA yerine koymak değil, env ile seçilebilir bir alignment provider olarak eklemek ve kalite kapısı başarısız olduğunda mevcut TTS timing fallback'ini korumaktır.

Önerilen ilk kapsam yalnızca normal TTS akışı olmalıdır. Podcast ve multi-speaker akışları ikinci fazda, per-speaker hizalama ve dialogue segment doğrulamasıyla ele alınmalıdır.
