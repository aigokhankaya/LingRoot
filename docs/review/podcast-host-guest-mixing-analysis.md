# Podcast Host/Guest Metin Karışıklığı - Kök Neden Analizi

> **Created:** 2026-02-18 | **Updated:** 2026-02-18 | **Version:** 1.1

## Özet

Podcast oluşturma sürecinde Host ve Guest metinlerinin karıştığı rapor edildi. Bu dokümanda, MFA ve podcast kodlarının kapsamlı taraması sonucunda tespit edilen potansiyel hata noktaları analiz edilmektedir.

---

## 1. Kritik Hata Noktaları (Yüksek Öncelik)

### 1.1 Speaker Assignment Validation - Yanlış Düzeltmeler

**Dosya:** `backend/utils/audio/googleTTSMultiSpeaker.js`
**Satırlar:** 125-249

`validateAndCorrectSpeakerAssignments()` fonksiyonu, LLM'in ürettiği konuşmacı atamalarını "düzeltmeye" çalışır. Ancak heuristic kurallar yanlış düzeltmelere neden olabilir:

#### Kural 1: Kısa Tepkilerin Zorla Değiştirilmesi (Satır 155-167)
```javascript
// Rule 1: Short reactions should alternate speakers
if (isShortReaction && prevTurn && turn.speaker === prevTurn.speaker) {
  const suggestedSpeaker = turn.speaker === 'A' ? 'B' : 'A';
  // ... speaker değiştiriliyor
  turn.speaker = suggestedSpeaker;
}
```
**SORUN:** 25 karakterden kısa tepkiler (<25 chars) aynı konuşmacıdan geldiğinde zorla değiştiriliyor. Ancak gerçek podcast'lerde Host veya Guest art arda kısa tepkiler verebilir (örn: "Exactly! Right!").

#### Kural 2: Soru İşaretli Cümlelerin Host'a Atanması (Satır 169-192)
```javascript
if (text.endsWith('?') && turn.speaker !== 'A' && !isShortReaction) {
  // ... Host'a atanıyor
  turn.speaker = 'A';
}
```
**SORUN:** Guest'in sorduğu sorular (açıklama isteyen, retorik sorular) yanlışlıkla Host'a atanıyor.

#### Kural 3: Uzun Açıklamaların Guest'e Atanması (Satır 194-218)
```javascript
if (text.length > 100 && turn.speaker === 'A' && !text.endsWith('?')) {
  if (hasGuestPatterns && !hasHostPatterns && !addressesSomeone && !isLongMultiSentence) {
    turn.speaker = 'B';
  }
}
```
**SORUN:** Host'un uzun açıklamaları (özellikle "Yes", "Well", "Exactly" ile başlayanlar) yanlışlıkla Guest'e atanıyor.

#### Kural 4: Art Arda Aynı Konuşmacı Düzeltmesi (Satır 221-237)
```javascript
if (prevTurn && turn.speaker === prevTurn.speaker) {
  const suggestedSpeaker = turn.speaker === 'A' ? 'B' : 'A';
  turn.speaker = suggestedSpeaker;
}
```
**SORUN:** Gerçek diyaloglarda aynı kişi art arda birden fazla cümle söyleyebilir. Bu kural bunu engelliyor.

---

### 1.2 MFA-Based Speaker Correction (Phase 2)

**Dosya:** `backend/utils/audio/googleTTSMultiSpeaker.js`
**Satırlar:** 1509-1548

Audio sentezlendikten SONRA ikinci bir speaker düzeltme katmanı çalışıyor:

```javascript
const speakerCorrectionResponse = await axios.post(
  `${mfaServiceUrl}/mfa/correct-speakers`,
  {
    wordTimings: mfaWordTimings,
    turns: turnsForTts
  },
  { timeout: 10000 }
);

// Apply corrections to turns and turns_original
for (const correction of mfaCorrections) {
  if (turnsForTts[correction.turnIndex]) {
    turnsForTts[correction.turnIndex].speaker = correction.correctedSpeaker;
  }
  if (turnsOriginalForSave && turnsOriginalForSave[correction.turnIndex]) {
    turnsOriginalForSave[correction.turnIndex].speaker = correction.correctedSpeaker;
  }
}
```

**SORUNLAR:**
1. Audio zaten doğru seslerle sentezlenmiş durumda - düzeltme yalnızca metin etiketlerini değiştiriyor
2. MFA pause analizi hatalıysa, doğru atamalar yanlış yapılıyor
3. Bu düzeltme `turns` ve `turns_original` dizilerine uygulanıyor ama audio değişmiyor

**SONUÇ:** Audio'da Kore (Host) sesi konuşurken, metin etiketi "Guest" gösteriyor.

---

### 1.3 turns vs turns_original Senkronizasyon Sorunu

**Dosya:** `backend/utils/audio/googleTTSMultiSpeaker.js`
**Satırlar:** 579-603

GPT bazen `turns` ve `turns_original` dizileri için farklı sayıda eleman üretiyor:

```javascript
if (segmentOriginals.length !== segData.turns.length) {
  logger.warn(`Segment ${seg + 1} sync mismatch: ${segData.turns.length} turns vs ${segmentOriginals.length} translations.`);
}

// Push exactly as many original turns as English turns
for (let i = 0; i < segData.turns.length; i++) {
  if (i < segmentOriginals.length && segmentOriginals[i]?.text?.trim()) {
    allTurnsOriginal.push(segmentOriginals[i]);
  } else {
    // Fallback: Use English text as placeholder
    allTurnsOriginal.push({
      speaker: segData.turns[i].speaker,
      text: segData.turns[i].text
    });
  }
}
```

**SORUN:** Eğer `turns_original` eksik eleman içeriyorsa:
- İndeksler kayar
- Yanlış turn'ün speaker değeri kopyalanır
- UI'da Host metni Guest olarak gösterilir (veya tersi)

---

## 2. Orta Öncelikli Hata Noktaları

### 2.1 Dialogue Segments Word Matching Algoritması

**Dosya:** `backend/utils/audio/googleTTSMultiSpeaker.js`
**Satırlar:** 1590-1716

MFA word timings ile script kelimeleri eşleştirilirken:

```javascript
const findBestWindow = (tokens, startFrom, prevEndTime = null) => {
  // ... 70% eşleşme eşiği
  const minMatched = Math.min(tokens.length, Math.max(3, Math.floor(tokens.length * 0.7)));
  if (matched >= minMatched) {
    // ...
  }
}
```

**SORUNLAR:**
1. Eşleşme %70'in altında kalırsa fallback positioning kullanılıyor (satır 1663-1673)
2. Fallback, `lineIndex / turns.length` oranına göre tahmin yapıyor - bu speaker bilgisi içermiyor
3. Monotonicity violation durumunda segment ATLANIYOR (satır 1694-1697)

```javascript
if (!isMonotonic) {
  // Skip this segment if it would break monotonicity
  logger.warn(`monotonicity violation at lineIndex=${lineIndex}: skipping`);
}
```

**SONUÇ:** Atlanan segmentler nedeniyle UI'da senkronizasyon kayması oluşuyor.

---

### 2.2 Frontend Speaker Parsing Mantığı

**Dosya:** `LingRootMobile/src/components/AudioPlayer.tsx`
**Satırlar:** 396-430

Frontend, metin içindeki speaker etiketlerini parse ediyor:

```javascript
const baseSegments = dialogueLines.map(line => {
  const match = line.match(/^(Speaker\s+([A-Z])|Host|Guest):\s*(.*)$/i);
  if (match) {
    const lowerPrefix = prefix.toLowerCase();
    let speaker = '';
    // ...
  }
});
```

**SORUNLAR:**
1. `translated_text` formatı beklenen pattern'e uymuyorsa parsing başarısız olur
2. Regex case-insensitive ama "HOST" vs "Host" gibi farklılıklar sorun yaratabilir
3. Pattern eşleşmezse tüm satır `content` olarak alınır, speaker boş kalır

---

### 2.3 PodcastDialogueView Speaker Kontrolü

**Dosya:** `LingRootMobile/src/components/audio/PodcastDialogueView.tsx`
**Satırlar:** 62-63

```javascript
const speakerKey = (segment.speaker || '').toUpperCase();
const isRight = speakerKey === 'B';
```

**SORUN:** Speaker değeri "A" veya "B" olmalı. Eğer backend'den "Host" veya "Guest" string'i gelirse bu kontrol başarısız olur ve tüm balonlar sol tarafa (Host tarafına) yerleşir.

---

## 3. Düşük Öncelikli Hata Noktaları

### 3.1 Chunked Synthesis Text Splitting

**Dosya:** `backend/utils/audio/googleTTSMultiSpeaker.js`
**Satırlar:** 766-802

```javascript
const chunkLinesByByteLimit = (lines, maxBytes) => {
  // ...
  if (getUtf8ByteLength(safeLine) <= maxBytes) {
    current = safeLine;
  } else {
    // If a single line is too long, hard-split it (last resort)
    let remaining = safeLine;
    while (remaining.length > 0) {
      // Hard split...
    }
  }
};
```

**SORUN:** Tek bir satır 3000 byte'ı aşarsa zorla bölünüyor. Bu durumda speaker context kayboluyor.

### 3.2 Database Save Format

**Dosya:** `backend/utils/audio/googleTTSMultiSpeaker.js`
**Satırlar:** 1784-1788, 1798-1800

```javascript
const turnsOriginalDialogueText = Array.isArray(turnsOriginalForSave) && turnsOriginalForSave.length > 0
  ? turnsOriginalForSave
    .map(turn => `${turn?.speaker === 'A' ? 'Host' : 'Guest'}: ${turn?.text || ''}`)
    .join('\n')
  : '';

translated_text: (audioResult.dialogueText && typeof audioResult.dialogueText === 'string' && audioResult.dialogueText.trim().length > 0)
  ? audioResult.dialogueText
  : audioResult.transcript,
```

**SORUN:** Speaker düzeltmeleri (yanlış olanlar dahil) database'e kalıcı olarak yazılıyor.

---

## 4. Veri Akışı Diyagramı

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PODCAST OLUŞTURMA AKIŞI                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ 1. GPT Script   │  OpenAI gpt-4o-mini
│    Generation   │  turns: [{speaker: 'A'|'B', text: '...'}]
└────────┬────────┘  turns_original: [{speaker: 'A'|'B', text: '...'}]
         │
         ▼
┌─────────────────┐
│ 2. Speaker      │  validateAndCorrectSpeakerAssignments()
│    Validation   │  ⚠️ HATA NOKTASI: Heuristic kurallar yanlış düzeltme yapabilir
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Gemini TTS   │  synthesizeMultiSpeakerPodcast()
│    Synthesis    │  Audio sentezlenir: Host=speakerAId, Guest=speakerBId
└────────┬────────┘  ✅ Audio bu noktada DOĞRU seslerle üretilmiş
         │
         ▼
┌─────────────────┐
│ 4. MFA          │  mfaAligner.generateWordTimestamps()
│    Alignment    │  Word-level timestamps
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. MFA Speaker  │  POST /mfa/correct-speakers
│    Correction   │  ⚠️ HATA NOKTASI: Audio değişmeden metin etiketleri değişiyor!
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Dialogue     │  findBestWindow() + segment mapping
│    Segments     │  ⚠️ HATA NOKTASI: Monotonicity violation → segment atlanıyor
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Database     │  contenthistory tablosu
│    Save         │  translated_text: "Host: ...\nGuest: ..." formatında
└────────┬────────┘  dialogue_segments: [{lineIndex, speaker, startTime, endTime}]
         │
         ▼
┌─────────────────┐
│ 8. Frontend     │  AudioPlayer.tsx → PodcastDialogueView.tsx
│    Display      │  ⚠️ HATA NOKTASI: speaker === 'B' kontrolü
└─────────────────┘
```

---

## 5. En Olası Kök Nedenler (Sıralı)

| Sıra | Neden | Olasılık | Etki |
|------|-------|----------|------|
| 1 | **MFA Speaker Correction (Phase 2)** - Audio sentezlendikten sonra metin etiketlerini değiştiriyor | Çok Yüksek | Audio-metin uyumsuzluğu |
| 2 | **validateAndCorrectSpeakerAssignments** - Heuristic kurallar yanlış düzeltme yapıyor | Yüksek | Yanlış speaker ataması |
| 3 | **turns/turns_original sync** - Farklı dizi uzunlukları indeks kaymasına neden oluyor | Orta-Yüksek | Metin kayması |
| 4 | **Dialogue segment fallback** - Word matching başarısız olunca yanlış timing | Orta | Senkronizasyon hatası |
| 5 | **Frontend speaker parsing** - "B" yerine "Guest" gelirse kontrol başarısız | Orta | UI görüntüleme hatası |

---

## 6. İlgili Dosyalar ve Satırlar

### Backend
| Dosya | Satırlar | Açıklama |
|-------|----------|----------|
| `backend/utils/audio/googleTTSMultiSpeaker.js` | 125-249 | Speaker validation rules |
| `backend/utils/audio/googleTTSMultiSpeaker.js` | 329-695 | Script generation |
| `backend/utils/audio/googleTTSMultiSpeaker.js` | 579-603 | turns_original sync |
| `backend/utils/audio/googleTTSMultiSpeaker.js` | 702-1088 | Multi-speaker synthesis |
| `backend/utils/audio/googleTTSMultiSpeaker.js` | 1097-1231 | Fallback synthesis |
| `backend/utils/audio/googleTTSMultiSpeaker.js` | 1509-1548 | MFA speaker correction |
| `backend/utils/audio/googleTTSMultiSpeaker.js` | 1590-1716 | Dialogue segments mapping |
| `backend/utils/audio/googleTTSMultiSpeaker.js` | 1784-1821 | Database save |
| `backend/utils/audio/mfaAligner.js` | - | MFA client |
| `backend/utils/audio/audioMerger.js` | - | Audio merging |

### Frontend
| Dosya | Satırlar | Açıklama |
|-------|----------|----------|
| `LingRootMobile/src/components/AudioPlayer.tsx` | 333-341 | dialogueLines parsing |
| `LingRootMobile/src/components/AudioPlayer.tsx` | 391-486 | dialogueSegments creation |
| `LingRootMobile/src/components/AudioPlayer.tsx` | 1016-1070 | Dialogue highlighting |
| `LingRootMobile/src/components/audio/PodcastDialogueView.tsx` | 62-63 | Speaker side detection |
| `LingRootMobile/src/components/audio/PodcastDialogueView.tsx` | 94-156 | Bubble rendering |

---

## 7. Önerilen Araştırma Adımları

1. **Log Analizi:** Üretimde `[SPEAKER-VALIDATION]` ve `[GOOGLE-PODCAST] MFA Speaker Correction` loglarını incele
2. **Veritabanı Kontrolü:** Sorunlu podcast kayıtlarının `dialogue_segments` ve `translated_text` alanlarını karşılaştır
3. **MFA Service İncelemesi:** `/mfa/correct-speakers` endpoint'inin mantığını incele
4. **A/B Testi:** MFA speaker correction'ı devre dışı bırakarak test et
5. **turns_original Sync:** GPT response'larında dizi uzunluk farklılıklarını logla

---

## 8. Sonuç

Host/Guest karışıklığının en olası nedeni, **audio sentezlendikten sonra çalışan MFA-based speaker correction mekanizmasıdır**. Bu mekanizma:

1. Audio'yu değiştirmiyor (audio zaten doğru seslerle üretilmiş)
2. Sadece metin etiketlerini değiştiriyor
3. Pause analizi hatalıysa, doğru speaker'ı yanlış olarak işaretliyor

**İkincil neden** olarak `validateAndCorrectSpeakerAssignments()` fonksiyonundaki heuristic kurallar, GPT'nin doğru ürettiği speaker atamalarını yanlış düzeltebilir.

---

## 9. Alternatif Yaklaşım Araştırması: Ayrı Host/Guest TTS + MFA

### 9.1 Mevcut Yaklaşımın Analizi

**Mevcut Akış:**
```
┌─────────────────────────────────────────────────────────────┐
│ MEVCUT: TEK BİRLEŞİK YAKLAŞIM                               │
└─────────────────────────────────────────────────────────────┘

1. Tüm turns → Tek dialogueText string'i oluştur
   "Host: Hello...\nGuest: Thanks...\nHost: So...\nGuest: Yes..."
                    │
                    ▼
2. Gemini TTS Multi-Speaker API → TEK birleşik MP3
   (Her iki konuşmacı aynı audio'da)
                    │
                    ▼
3. MFA Alignment → Birleşik audio üzerinde word timings
   (Tüm kelimeler tek timeline'da)
                    │
                    ▼
4. Word Windowing Algorithm → Kelimeleri turn'lere eşle
   ⚠️ SORUN: %70 eşleşme eşiği, fallback, monotonicity issues
```

**Mevcut Yaklaşımın Sorunları:**
1. Gemini TTS birleşik audio üretir → konuşmacılar ayrıştırılamaz
2. MFA tüm transcript üzerinde çalışır → speaker context kaybolur
3. Word windowing algoritması %70+ eşleşme gerektirir → hata payı yüksek
4. Fallback durumunda speaker ataması tahmine dayalı

---

### 9.2 Önerilen Alternatif: Ayrı Host/Guest İşleme

**Önerilen Akış:**
```
┌─────────────────────────────────────────────────────────────┐
│ ÖNERİLEN: AYRI İŞLEME + BİRLEŞTİRME                        │
└─────────────────────────────────────────────────────────────┘

1. Turn'leri Speaker'a göre grupla:
   ┌─────────────────┐    ┌─────────────────┐
   │ HOST TURNS      │    │ GUEST TURNS     │
   │ Turn 0: "Hello" │    │ Turn 1: "Thanks"│
   │ Turn 2: "So..." │    │ Turn 3: "Yes..."│
   └────────┬────────┘    └────────┬────────┘
            │                      │
            ▼                      ▼
2. Ayrı TTS Sentezleme (paralel çalışabilir):
   ┌─────────────────┐    ┌─────────────────┐
   │ HOST AUDIO      │    │ GUEST AUDIO     │
   │ (Kore sesi)     │    │ (Charon sesi)   │
   └────────┬────────┘    └────────┬────────┘
            │                      │
            ▼                      ▼
3. Ayrı MFA Alignment:
   ┌─────────────────┐    ┌─────────────────┐
   │ HOST TIMINGS    │    │ GUEST TIMINGS   │
   │ word: 0.0-0.5s  │    │ word: 0.0-0.4s  │
   │ word: 0.5-0.8s  │    │ word: 0.4-0.9s  │
   └────────┬────────┘    └────────┬────────┘
            │                      │
            └──────────┬───────────┘
                       ▼
4. Turn Sırasına Göre Birleştirme:
   ┌─────────────────────────────────────┐
   │ [Host0][Guest1][Host2][Guest3]...   │
   │ + Timing offset hesaplama           │
   └────────┬────────────────────────────┘
            │
            ▼
5. Final Audio + Doğru Timing Data:
   ┌─────────────────────────────────────┐
   │ Birleşik MP3                        │
   │ + dialogue_segments (kesin timing)  │
   │ + Her segment kesin speaker eşlemeli│
   └─────────────────────────────────────┘
```

---

### 9.3 Avantajlar

| Avantaj | Açıklama |
|---------|----------|
| **Kesin Speaker Attribution** | Her audio segment'i kesin olarak bir speaker'a ait |
| **Basit MFA Alignment** | Tek speaker transcript → daha az word mismatch |
| **Debuggability** | Host ve Guest audio'ları ayrı incelenebilir |
| **Paralel Processing** | Host ve Guest TTS/MFA paralel çalışabilir |
| **Cache/Reuse** | Aynı topic için speaker audio'ları tekrar kullanılabilir |
| **Word Count Doğruluğu** | Tek speaker → daha az kelime sayısı uyumsuzluğu |

---

### 9.4 Teknik Zorluklar

#### 9.4.1 Timing Offset Hesaplama (ORTA KARMAŞIKLIK)

Her segment birleştirilirken offset tracking gerekli:

```javascript
// Pseudo-code
let runningTime = 0;
const finalTimings = [];

for (const turn of turnsInOrder) {
  const speakerTimings = turn.speaker === 'A' ? hostTimings : guestTimings;
  const turnTimings = extractTurnTimings(speakerTimings, turn);

  // Offset uygula
  const adjustedTimings = turnTimings.map(t => ({
    ...t,
    startTime: t.startTime + runningTime,
    endTime: t.endTime + runningTime
  }));

  finalTimings.push(...adjustedTimings);
  runningTime += getTurnDuration(turnTimings);
}
```

#### 9.4.2 Audio Interleaving (ORTA KARMAŞIKLIK)

Turn sırasına göre audio segment'lerini birleştirme:

```
Senaryo: Host, Guest, Host, Guest turns

Mevcut Yaklaşım:
  → Gemini tek seferde üretiyor (birleşik)

Yeni Yaklaşım:
  Host Audio:  [Segment0][Segment2]
  Guest Audio: [Segment1][Segment3]

  Birleştirme: [H0] + [G1] + [H2] + [G3]
               ↑offset=0  ↑offset=H0.duration  ↑offset=H0+G1  ↑offset=H0+G1+H2
```

#### 9.4.3 Art Arda Aynı Speaker Turns (DÜŞÜK KARMAŞIKLIK)

```
Senaryo: Host, Host, Guest (iki art arda Host)

Çözüm A: Pre-merge
  Host Audio: [H0+H1 birleşik]
  Guest Audio: [G2]
  → Turn sınırları korunmaz

Çözüm B: Segment-by-segment (ÖNERİLEN)
  Host Audio: [H0], [H1] (ayrı)
  Guest Audio: [G2]
  → Her turn ayrı segment, offset'ler ayrı hesaplanır
```

---

### 9.5 Mevcut Kodda Destekleyici Yapılar

| Dosya | Mevcut Fonksiyon | Kullanılabilirlik |
|-------|------------------|-------------------|
| `googleTTSMultiSpeaker.js:1097-1231` | `synthesizeFallbackPodcast()` | Per-turn synthesis şablonu |
| `audioMerger.js:176-318` | `mergeAudioSegmentsToBuffer()` | Buffer merging (yeniden kullanılabilir) |
| `mfaAligner.js` | `generateWordTimestamps()` | Ayrı audio'lar için çalışır |
| `googleTTS.js` | `synthesizeWithGoogle()` | Tek speaker synthesis |

**Not:** Fallback synthesis (satır 1097-1231) zaten per-turn yaklaşımı kullanıyor, ancak:
- MFA'yı birleşik audio üzerinde çalıştırıyor
- Timing offset tracking yapmıyor

---

### 9.6 Uygulanabilirlik Değerlendirmesi

| Kriter | Değerlendirme |
|--------|---------------|
| **Teknik Fizibilite** | ✅ YÜKSEK - Mevcut building blocks mevcut |
| **Karmaşıklık** | ORTA - Offset tracking ana zorluk |
| **Risk** | DÜŞÜK - Fallback olarak mevcut sistem kalabilir |
| **Fayda** | YÜKSEK - Speaker karışıklığı sorunu çözülür |

---

### 9.7 Uygulama Fazları (Tahmini)

| Faz | Açıklama | Tahmini Süre |
|-----|----------|--------------|
| **Faz 1** | Turn grouping + paralel TTS | 2 gün |
| **Faz 2** | Ayrı MFA alignment per-speaker | 2 gün |
| **Faz 3** | Timing offset tracking | 2 gün |
| **Faz 4** | Audio interleaving + merge | 2 gün |
| **Faz 5** | Test + edge case handling | 2 gün |
| **Toplam** | | ~10 gün |

---

### 9.8 Mevcut vs Önerilen Karşılaştırma

| Özellik | Mevcut | Önerilen |
|---------|--------|----------|
| TTS Çağrısı | 1 (birleşik) | 2 (ayrı) veya N (per-turn) |
| MFA Çağrısı | 1 (birleşik audio) | 2 (per-speaker) |
| Speaker Attribution | Tahmine dayalı | Kesin |
| Word Mismatch Riski | Yüksek | Düşük |
| Timing Doğruluğu | %70+ eşleşme gerekli | %100 (offset-based) |
| Paralel İşleme | Yok | Mümkün |
| Debugging | Zor | Kolay |
| API Maliyeti | Düşük | Benzer (veya biraz yüksek) |

---

### 9.9 Sonuç

**Ayrı Host/Guest işleme yaklaşımı:**

1. **Teknik olarak uygulanabilir** - Mevcut kod yapısı bunu destekliyor
2. **Sorunun kök nedenini çözüyor** - Speaker karışıklığı ortadan kalkıyor
3. **Risk düşük** - Mevcut sistem fallback olarak kalabilir
4. **Orta karmaşıklıkta** - Ana zorluk timing offset tracking

**Öneri:** Bu yaklaşım, mevcut host/guest karışıklığı sorununu kökten çözer. Mevcut sistem fallback olarak korunarak, yeni yaklaşım A/B test edilebilir.

---

*Bu rapor sadece analiz amaçlıdır. Kod değişikliği yapılmamıştır.*
