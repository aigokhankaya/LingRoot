# Podcast V2: Ayrı Speaker İşleme Sistemi - Geliştirme Planı

> **Created:** 2026-02-18 | **Updated:** 2026-02-18 | **Version:** 1.1 (Implemented)

## 1. Proje Özeti

### 1.1 Amaç

Mevcut podcast sisteminde yaşanan Host/Guest metin karışıklığı sorununu çözmek için yeni bir podcast oluşturma pipeline'ı geliştirmek. Yeni sistem, Host ve Guest audio'larını ayrı ayrı sentezleyip, ayrı MFA alignment uygulayarak kesin speaker attribution sağlayacak.

### 1.2 Kapsam

- **Mevcut sistem korunacak** (`PODCAST_TYPE=old`)
- **Yeni sistem paralel geliştirilecek** (`PODCAST_TYPE=new`)
- Environment variable ile runtime'da seçim yapılabilecek
- Rollback her zaman mümkün olacak

### 1.3 Environment Variable

```bash
# .env dosyasına eklenecek
PODCAST_TYPE=old    # Mevcut sistem (varsayılan)
PODCAST_TYPE=new    # Yeni ayrı speaker sistemi
```

---

## 2. Mevcut Sistem Analizi (PODCAST_TYPE=old)

### 2.1 Mevcut Akış

```
┌─────────────────────────────────────────────────────────────┐
│ MEVCUT SİSTEM (PODCAST_TYPE=old)                            │
└─────────────────────────────────────────────────────────────┘

1. GPT Script Generation
   └─→ turns: [{speaker: 'A', text: '...'}, {speaker: 'B', text: '...'}]

2. Speaker Validation (validateAndCorrectSpeakerAssignments)
   └─→ Heuristic kurallarla düzeltme ⚠️ SORUNLU

3. Gemini TTS Multi-Speaker
   └─→ Tüm dialogue → TEK birleşik MP3
   └─→ "Host: ...\nGuest: ...\nHost: ..." formatı

4. MFA Alignment (birleşik audio üzerinde)
   └─→ Tüm kelimeler için timing

5. MFA Speaker Correction ⚠️ SORUNLU
   └─→ Pause analizi ile speaker düzeltme
   └─→ Audio değişmiyor, sadece etiketler değişiyor

6. Word Windowing Algorithm
   └─→ %70 eşleşme eşiği ile turn mapping ⚠️ SORUNLU

7. Database Save
   └─→ dialogue_segments, translated_text, mp3_url, vtt_url
```

### 2.2 Mevcut Dosyalar

| Dosya | Satır | Fonksiyon |
|-------|-------|-----------|
| `backend/utils/audio/googleTTSMultiSpeaker.js` | 125-249 | `validateAndCorrectSpeakerAssignments()` |
| `backend/utils/audio/googleTTSMultiSpeaker.js` | 329-695 | `generatePodcastScript()` |
| `backend/utils/audio/googleTTSMultiSpeaker.js` | 702-1088 | `synthesizeMultiSpeakerPodcast()` |
| `backend/utils/audio/googleTTSMultiSpeaker.js` | 1097-1231 | `synthesizeFallbackPodcast()` |
| `backend/utils/audio/googleTTSMultiSpeaker.js` | 1277-1914 | `createGoogleTTSPodcast()` |
| `backend/utils/audio/mfaAligner.js` | - | MFA client |
| `backend/utils/audio/audioMerger.js` | - | Audio merging |

---

## 3. Yeni Sistem Tasarımı (PODCAST_TYPE=new)

### 3.1 Yeni Akış

```
┌─────────────────────────────────────────────────────────────┐
│ YENİ SİSTEM (PODCAST_TYPE=new)                              │
└─────────────────────────────────────────────────────────────┘

1. GPT Script Generation (AYNI)
   └─→ turns: [{speaker: 'A', text: '...'}, {speaker: 'B', text: '...'}]

2. Speaker Validation KALDIRILDI ✅
   └─→ GPT output'una güvenilecek
   └─→ Artık heuristic düzeltme yok

3. Turn Grouping by Speaker
   ┌─────────────────────┐    ┌─────────────────────┐
   │ HOST TURNS          │    │ GUEST TURNS         │
   │ [{idx:0, text:...}] │    │ [{idx:1, text:...}] │
   │ [{idx:2, text:...}] │    │ [{idx:3, text:...}] │
   └──────────┬──────────┘    └──────────┬──────────┘
              │                          │
              ▼                          ▼
4. Parallel TTS Synthesis
   ┌─────────────────────┐    ┌─────────────────────┐
   │ HOST AUDIO          │    │ GUEST AUDIO         │
   │ Per-turn segments   │    │ Per-turn segments   │
   │ + duration tracking │    │ + duration tracking │
   └──────────┬──────────┘    └──────────┬──────────┘
              │                          │
              ▼                          ▼
5. Parallel MFA Alignment
   ┌─────────────────────┐    ┌─────────────────────┐
   │ HOST TIMINGS        │    │ GUEST TIMINGS       │
   │ Per-turn word times │    │ Per-turn word times │
   └──────────┬──────────┘    └──────────┬──────────┘
              │                          │
              └───────────┬──────────────┘
                          ▼
6. Turn-Order Interleaving with Offset Tracking
   ┌─────────────────────────────────────────────────┐
   │ Turn 0 (Host):   offset=0,      duration=3.2s   │
   │ Turn 1 (Guest):  offset=3.2s,   duration=2.8s   │
   │ Turn 2 (Host):   offset=6.0s,   duration=4.1s   │
   │ Turn 3 (Guest):  offset=10.1s,  duration=3.5s   │
   └─────────────────────────────────────────────────┘
                          │
                          ▼
7. Audio Merge (FFmpeg concat in turn order)
   └─→ Final merged MP3

8. Timing Data Merge
   └─→ All word timings with applied offsets
   └─→ dialogue_segments with exact timing

9. VTT Generation
   └─→ Word-level subtitles

10. Database Save (AYNI format)
    └─→ dialogue_segments, translated_text, mp3_url, vtt_url
```

### 3.2 Yeni Dosya Yapısı

```
backend/utils/audio/
├── googleTTSMultiSpeaker.js          # Mevcut (değiştirilmeyecek)
├── podcastV2/                         # YENİ KLASÖR
│   ├── index.js                       # Ana orchestrator
│   ├── turnGrouper.js                 # Turn'leri speaker'a göre grupla
│   ├── perSpeakerSynthesizer.js       # Speaker başına TTS
│   ├── perSpeakerAligner.js           # Speaker başına MFA
│   ├── turnInterleaver.js             # Turn sırasına göre birleştir
│   ├── offsetCalculator.js            # Timing offset hesaplama
│   └── timingMerger.js                # Final timing data oluştur
├── mfaAligner.js                      # Mevcut (yeniden kullanılacak)
└── audioMerger.js                     # Mevcut (yeniden kullanılacak)
```

---

## 4. Detaylı Modül Tasarımları

### 4.1 Turn Grouper (`turnGrouper.js`)

**Amaç:** Turn'leri speaker'a göre grupla, orijinal indeksleri koru

```javascript
/**
 * Input:
 * turns = [
 *   { speaker: 'A', text: 'Hello everyone...' },      // idx 0
 *   { speaker: 'B', text: 'Thanks for having me...' }, // idx 1
 *   { speaker: 'A', text: 'So tell us about...' },    // idx 2
 *   { speaker: 'B', text: 'Well, it started...' },    // idx 3
 * ]
 *
 * Output:
 * {
 *   hostTurns: [
 *     { originalIndex: 0, speaker: 'A', text: 'Hello everyone...' },
 *     { originalIndex: 2, speaker: 'A', text: 'So tell us about...' },
 *   ],
 *   guestTurns: [
 *     { originalIndex: 1, speaker: 'B', text: 'Thanks for having me...' },
 *     { originalIndex: 3, speaker: 'B', text: 'Well, it started...' },
 *   ],
 *   turnOrder: [0, 1, 2, 3],  // Original order for interleaving
 *   turnSpeakerMap: { 0: 'A', 1: 'B', 2: 'A', 3: 'B' }
 * }
 */
function groupTurnsBySpeaker(turns) {
  // Implementation
}
```

### 4.2 Per-Speaker Synthesizer (`perSpeakerSynthesizer.js`)

**Amaç:** Her speaker için ayrı audio segment'leri üret

```javascript
/**
 * Input:
 * - speakerTurns: Array of turns for one speaker
 * - speakerId: Gemini voice ID (e.g., 'Kore' for Host)
 * - options: { model, stylePrompt }
 *
 * Output:
 * {
 *   segments: [
 *     {
 *       originalIndex: 0,
 *       audioBuffer: Buffer,
 *       duration: 3.2,  // seconds
 *       text: 'Hello everyone...',
 *       wordCount: 5
 *     },
 *     {
 *       originalIndex: 2,
 *       audioBuffer: Buffer,
 *       duration: 4.1,
 *       text: 'So tell us about...',
 *       wordCount: 8
 *     }
 *   ],
 *   totalDuration: 7.3,
 *   totalCharacters: 150
 * }
 */
async function synthesizeSpeakerTurns(speakerTurns, speakerId, options) {
  // Per-turn Gemini TTS calls
  // Track duration for each segment
}
```

### 4.3 Per-Speaker Aligner (`perSpeakerAligner.js`)

**Amaç:** Her speaker'ın audio'su için ayrı MFA alignment

```javascript
/**
 * Input:
 * - speakerSegments: Output from perSpeakerSynthesizer
 * - locale: 'en-US'
 *
 * Output:
 * {
 *   alignedSegments: [
 *     {
 *       originalIndex: 0,
 *       wordTimings: [
 *         { word: 'Hello', startTime: 0.0, endTime: 0.4 },
 *         { word: 'everyone', startTime: 0.5, endTime: 1.1 },
 *         ...
 *       ],
 *       duration: 3.2
 *     },
 *     ...
 *   ]
 * }
 */
async function alignSpeakerSegments(speakerSegments, locale) {
  // Option A: Merge all speaker segments, run MFA once, then split timings
  // Option B: Run MFA per-segment (more accurate but more API calls)
}
```

### 4.4 Turn Interleaver (`turnInterleaver.js`)

**Amaç:** Turn sırasına göre audio ve timing'leri birleştir

```javascript
/**
 * Input:
 * - hostAligned: Output from perSpeakerAligner (Host)
 * - guestAligned: Output from perSpeakerAligner (Guest)
 * - turnOrder: [0, 1, 2, 3]
 * - turnSpeakerMap: { 0: 'A', 1: 'B', 2: 'A', 3: 'B' }
 *
 * Output:
 * {
 *   orderedSegments: [
 *     { originalIndex: 0, speaker: 'A', audioBuffer, wordTimings, duration },
 *     { originalIndex: 1, speaker: 'B', audioBuffer, wordTimings, duration },
 *     { originalIndex: 2, speaker: 'A', audioBuffer, wordTimings, duration },
 *     { originalIndex: 3, speaker: 'B', audioBuffer, wordTimings, duration },
 *   ]
 * }
 */
function interleaveByTurnOrder(hostAligned, guestAligned, turnOrder, turnSpeakerMap) {
  // Reconstruct original turn order
}
```

### 4.5 Offset Calculator (`offsetCalculator.js`)

**Amaç:** Her segment için timing offset hesapla

```javascript
/**
 * Input:
 * - orderedSegments: Output from turnInterleaver
 *
 * Output:
 * {
 *   segmentsWithOffsets: [
 *     {
 *       originalIndex: 0,
 *       speaker: 'A',
 *       offset: 0,
 *       duration: 3.2,
 *       adjustedWordTimings: [
 *         { word: 'Hello', startTime: 0.0, endTime: 0.4 },  // No change
 *         ...
 *       ]
 *     },
 *     {
 *       originalIndex: 1,
 *       speaker: 'B',
 *       offset: 3.2,
 *       duration: 2.8,
 *       adjustedWordTimings: [
 *         { word: 'Thanks', startTime: 3.2, endTime: 3.6 },  // +3.2s offset
 *         ...
 *       ]
 *     },
 *     ...
 *   ],
 *   totalDuration: 13.6
 * }
 */
function calculateOffsets(orderedSegments) {
  let runningOffset = 0;
  return orderedSegments.map(segment => {
    const adjusted = {
      ...segment,
      offset: runningOffset,
      adjustedWordTimings: segment.wordTimings.map(wt => ({
        ...wt,
        startTime: wt.startTime + runningOffset,
        endTime: wt.endTime + runningOffset
      }))
    };
    runningOffset += segment.duration;
    return adjusted;
  });
}
```

### 4.6 Timing Merger (`timingMerger.js`)

**Amaç:** Final timing data ve dialogue_segments oluştur

```javascript
/**
 * Input:
 * - segmentsWithOffsets: Output from offsetCalculator
 *
 * Output:
 * {
 *   timepoints: [
 *     { word: 'Hello', timeSeconds: 0.0, endTimeSeconds: 0.4, index: 0 },
 *     { word: 'everyone', timeSeconds: 0.5, endTimeSeconds: 1.1, index: 1 },
 *     ...
 *   ],
 *   dialogueSegments: [
 *     {
 *       lineIndex: 0,
 *       speaker: 'Host',
 *       startTimeSeconds: 0.0,
 *       endTimeSeconds: 3.2,
 *       startWordIndex: 0,
 *       endWordIndex: 4
 *     },
 *     {
 *       lineIndex: 1,
 *       speaker: 'Guest',
 *       startTimeSeconds: 3.2,
 *       endTimeSeconds: 6.0,
 *       startWordIndex: 5,
 *       endWordIndex: 12
 *     },
 *     ...
 *   ],
 *   words: ['Hello', 'everyone', ...]
 * }
 */
function mergeTimingData(segmentsWithOffsets) {
  // Flatten all word timings
  // Create dialogue_segments with exact boundaries
}
```

### 4.7 Main Orchestrator (`index.js`)

**Amaç:** Tüm modülleri koordine et

```javascript
/**
 * Main entry point for Podcast V2
 */
async function createPodcastV2(options) {
  const {
    topic,
    level,
    duration,
    hostSpeakerId,
    guestSpeakerId,
    styleType,
    userId,
  } = options;

  // Step 1: Generate script (reuse existing)
  const scriptResult = await generatePodcastScript({ topic, level, duration, ... });

  // Step 2: Group turns by speaker
  const grouped = groupTurnsBySpeaker(scriptResult.turns);

  // Step 3: Parallel TTS synthesis
  const [hostSegments, guestSegments] = await Promise.all([
    synthesizeSpeakerTurns(grouped.hostTurns, hostSpeakerId, options),
    synthesizeSpeakerTurns(grouped.guestTurns, guestSpeakerId, options),
  ]);

  // Step 4: Parallel MFA alignment
  const [hostAligned, guestAligned] = await Promise.all([
    alignSpeakerSegments(hostSegments, 'en-US'),
    alignSpeakerSegments(guestSegments, 'en-US'),
  ]);

  // Step 5: Interleave by turn order
  const interleaved = interleaveByTurnOrder(
    hostAligned,
    guestAligned,
    grouped.turnOrder,
    grouped.turnSpeakerMap
  );

  // Step 6: Calculate offsets
  const withOffsets = calculateOffsets(interleaved.orderedSegments);

  // Step 7: Merge audio buffers
  const audioBuffers = withOffsets.segmentsWithOffsets.map(s => s.audioBuffer);
  const mergedAudio = await mergeAudioSegmentsToBuffer(audioBuffers);

  // Step 8: Merge timing data
  const timingData = mergeTimingData(withOffsets);

  // Step 9: Generate VTT
  const vttContent = createWordLevelVTTFromTimings(timingData.timepoints);

  // Step 10: Upload and save
  // ... (same as existing)

  return {
    success: true,
    audio_url: ...,
    vtt_url: ...,
    dialogue_segments: timingData.dialogueSegments,
    // ...
  };
}
```

---

## 5. Environment Variable Entegrasyonu

### 5.1 Değiştirilecek Dosya: `backend/routes/ttsRoutes.js`

```javascript
// Mevcut endpoint: POST /api/tts/create-podcast

const PODCAST_TYPE = process.env.PODCAST_TYPE || 'old';

router.post('/create-podcast', async (req, res) => {
  try {
    let result;

    if (PODCAST_TYPE === 'new') {
      // Yeni sistem
      const { createPodcastV2 } = require('../utils/audio/podcastV2');
      result = await createPodcastV2(req.body);
    } else {
      // Mevcut sistem (varsayılan)
      const { createGoogleTTSPodcast } = require('../utils/audio/googleTTSMultiSpeaker');
      result = await createGoogleTTSPodcast(req.body);
    }

    res.json(result);
  } catch (error) {
    // Error handling
  }
});
```

### 5.2 Değiştirilecek Dosya: `backend/routes/ttsRoutes.js` (Async endpoint)

```javascript
// Mevcut endpoint: POST /api/tts/create-podcast-async

router.post('/create-podcast-async', async (req, res) => {
  const PODCAST_TYPE = process.env.PODCAST_TYPE || 'old';

  // Job data'ya podcast type ekle
  const jobData = {
    ...req.body,
    podcastType: PODCAST_TYPE,  // Worker'a ilet
  };

  // Queue'ya ekle
  await podcastQueue.add('create-podcast', jobData);

  res.json({ success: true, message: 'Podcast job queued' });
});
```

### 5.3 Değiştirilecek Dosya: `backend/workers/podcastWorker.js`

```javascript
async function processPodcastJob(job) {
  const { podcastType = 'old', ...options } = job.data;

  if (podcastType === 'new') {
    const { createPodcastV2 } = require('../utils/audio/podcastV2');
    return await createPodcastV2(options);
  } else {
    const { createGoogleTTSPodcast } = require('../utils/audio/googleTTSMultiSpeaker');
    return await createGoogleTTSPodcast(options);
  }
}
```

---

## 6. API Response Format (Değişmeyecek)

Yeni sistem, mevcut sistemle aynı response format'ını döndürecek:

```json
{
  "success": true,
  "status": "success",
  "message": "Podcast created: Episode Title",
  "podcast_url": "https://...",
  "audio_url": "https://...",
  "mp3_url": "https://...",
  "vtt_url": "https://...",
  "transcript": "Full transcript text...",
  "dialogue": "Host: ...\nGuest: ...",
  "dialogue_segments": [
    {
      "lineIndex": 0,
      "speaker": "Host",
      "startTimeSeconds": 0.0,
      "endTimeSeconds": 3.2,
      "startWordIndex": 0,
      "endWordIndex": 4
    }
  ],
  "turns": [...],
  "turns_original": [...],
  "title": "Episode Title",
  "topic": "...",
  "level": "B1",
  "duration_seconds": 180,
  "content_id": "uuid"
}
```

---

## 7. Database Schema (Değişiklik Yok)

Mevcut `contenthistory` tablosu kullanılacak:

| Column | Type | Usage |
|--------|------|-------|
| `mp3_url` | TEXT | Merged audio URL |
| `vtt_url` | TEXT | Word-level subtitles |
| `translated_text` | TEXT | "Host: ...\nGuest: ..." format |
| `dialogue_segments` | JSONB | Speaker timing data |
| `words` | JSONB | Word array |
| `timepoints` | JSONB | Word timing array |
| `tts_provider` | TEXT | 'google-gemini' |
| `entry_source` | TEXT | 'google-podcast-v2' (yeni için) |

**Yeni alan önerisi:** `entry_source = 'google-podcast-v2'` ile yeni sistemle oluşturulan podcast'ler ayırt edilebilir.

---

## 8. Test Planı

### 8.1 Unit Tests

| Modül | Test Case |
|-------|-----------|
| `turnGrouper` | Empty turns, single speaker, alternating, consecutive same speaker |
| `perSpeakerSynthesizer` | Single turn, multiple turns, long text chunking |
| `perSpeakerAligner` | MFA success, MFA failure fallback |
| `turnInterleaver` | Correct ordering, missing segments |
| `offsetCalculator` | Offset accumulation, zero-duration edge case |
| `timingMerger` | Word index continuity, dialogue_segments boundaries |

### 8.2 Integration Tests

1. **Kısa podcast (2 dakika):** 4-6 turn, alternating speakers
2. **Orta podcast (5 dakika):** 10-15 turn, mixed patterns
3. **Uzun podcast (10 dakika):** 20+ turn, chunking test
4. **Edge case:** Tüm Host, tüm Guest, tek turn

### 8.3 A/B Test

```bash
# Test environment
PODCAST_TYPE=new npm run dev

# Production (rollback ready)
PODCAST_TYPE=old npm run start
```

---

## 9. Geliştirme Fazları

### Faz 1: Altyapı (2 gün) ✅ TAMAMLANDI
- [x] `backend/utils/audio/podcastV2/` klasör yapısı
- [x] Environment variable entegrasyonu (`PODCAST_TYPE`)
- [x] Router switch logic (`ttsRoutes.js`)

### Faz 2: Turn Grouping (1 gün) ✅ TAMAMLANDI
- [x] `turnGrouper.js` implementasyonu
- [ ] Unit tests (sonraki aşamada)

### Faz 3: Per-Speaker TTS (2 gün) ✅ TAMAMLANDI
- [x] `perSpeakerSynthesizer.js` implementasyonu
- [x] Gemini per-turn API calls
- [x] Duration tracking (ffprobe)
- [x] Retry logic with exponential backoff

### Faz 4: Per-Speaker MFA (2 gün) ✅ TAMAMLANDI
- [x] `perSpeakerAligner.js` implementasyonu
- [x] MFA client integration (reusing existing mfaAligner.js)
- [x] Word timing splitting and interpolation

### Faz 5: Interleaving & Offset (2 gün) ✅ TAMAMLANDI
- [x] `turnInterleaver.js` implementasyonu
- [x] `offsetCalculator.js` implementasyonu
- [x] Audio buffer ordering
- [x] Timing overlap fixing

### Faz 6: Timing Merge & Output (1 gün) ✅ TAMAMLANDI
- [x] `timingMerger.js` implementasyonu
- [x] VTT generation
- [x] Response formatting

### Faz 7: Integration & Testing (2 gün) ✅ TAMAMLANDI
- [x] Main orchestrator (`index.js`)
- [ ] Integration tests (sonraki aşamada)
- [x] Edge case handling

### Faz 8: Database & Monitoring (1 gün) ✅ TAMAMLANDI
- [x] `entry_source: 'google-podcast-v2'` marking
- [x] Logging enhancements
- [x] Cost tracking (`podcast_script_v2`, `podcast_tts_v2`)

**Durum: TEMEL İMPLEMENTASYON TAMAMLANDI**

Eksik kalan:
- Unit tests
- Integration tests
- Production test

---

## 10. Risk ve Mitigasyon

| Risk | Olasılık | Etki | Mitigasyon |
|------|----------|------|------------|
| MFA per-segment daha yavaş | Orta | Düşük | Paralel processing |
| Gemini API rate limit | Düşük | Orta | Pacing, retry logic |
| Offset drift | Düşük | Yüksek | Tolerance check, logging |
| FFmpeg merge failure | Düşük | Yüksek | Fallback to old system |

---

## 11. Rollback Planı

```bash
# Sorun durumunda anında rollback
export PODCAST_TYPE=old
pm2 restart backend

# Veya .env dosyasında
PODCAST_TYPE=old
```

Mevcut sistem tamamen korunduğu için rollback riski minimal.

---

## 12. Başarı Kriterleri

| Kriter | Ölçüm |
|--------|-------|
| Speaker attribution doğruluğu | %100 (kesin mapping) |
| Word timing doğruluğu | MFA output ile birebir |
| API response uyumluluğu | Mevcut format ile %100 uyumlu |
| Performans | Mevcut sistemin ±20% dahilinde |
| Rollback süresi | < 1 dakika |

---

## 13. Dosya Listesi (Oluşturulacak)

```
backend/utils/audio/podcastV2/
├── index.js                    # Ana orchestrator
├── turnGrouper.js              # Turn grouping
├── perSpeakerSynthesizer.js    # TTS per speaker
├── perSpeakerAligner.js        # MFA per speaker
├── turnInterleaver.js          # Turn-order merge
├── offsetCalculator.js         # Timing offsets
├── timingMerger.js             # Final data merge
└── __tests__/
    ├── turnGrouper.test.js
    ├── perSpeakerSynthesizer.test.js
    ├── perSpeakerAligner.test.js
    ├── turnInterleaver.test.js
    ├── offsetCalculator.test.js
    └── timingMerger.test.js
```

---

## 14. Sonuç

Bu plan, mevcut podcast sistemini koruyarak yeni bir ayrı-speaker işleme sistemi geliştirmeyi hedefliyor. Environment variable ile runtime'da seçim yapılabilecek, böylece:

1. **Risk minimal** - Mevcut sistem her zaman fallback olarak mevcut
2. **A/B test mümkün** - Aynı anda her iki sistem test edilebilir
3. **Kademeli geçiş** - Yeni sistem stabilize olduktan sonra varsayılan yapılabilir

**Geliştirme başlamadan önce bu doküman onaylanmalıdır.**

---

*Bu doküman sadece analiz ve planlama amaçlıdır. Kod değişikliği yapılmamıştır.*
