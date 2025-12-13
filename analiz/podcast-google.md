# PODCAST GOOGLE – Bağımsız MFA Tabanlı Podcast Pipeline Tasarım Dokümanı

Bu doküman, mevcut n8n tabanlı podcast yapısından tamamen bağımsız, Google TTS + MFA tabanlı yeni bir "PODCAST GOOGLE" pipeline'ının tasarımını anlatır. Bu sadece analiz/dizayn dokümanıdır; uygulama adımları onay sonrası yapılacaktır.

---

## 1. Hedef ve Kısıtlar

### 1.1. Hedefler

- Mevcut **n8n tabanlı `/api/tts/create-podcast`** akışına **hiç dokunmamak**, olduğu gibi bırakmak.
- Baştan sona **yeni bir pipeline** kurmak:
  - Prompt → LLM ile iki konuşmacılı diyalog senaryosu
  - Google TTS ile **iki farklı ses** kullanarak ses üretimi
  - Merge edilmiş tek MP3 üzerinde **MFA ile word-level timepoints** üretimi
  - MP3 + VTT dosyalarının Supabase'e yüklenmesi
  - `contenthistory` tablosuna uygun bir kayıt ile entegrasyon
- Web ve mobil istemcilerde bu pipeline'a **"PODCAST GOOGLE"** isimli **ayrı bir kart** üzerinden erişim sağlamak.

### 1.2. Kısıtlar ve Kararlar

- Mevcut `/api/tts/create-podcast` + n8n webhook **değiştirilmeyecek**.
- Yeni pipeline:
  - Kendi endpoint'ine sahip olacak: `POST /api/tts/google-podcast`.
  - Kendi controller/service katmanı olacak (ör: `googlePodcastController`).
  - Mümkün olduğunca mevcut util'ler kullanılacak:
    - `googleTTS.synthesizeWithGoogle`
    - `mergeAudioSegments` (veya mevcut TTS merge helper)
    - `uploadToSupabase`
    - `mfaAligner.generateWordTimestamps`
- **Timepoints ana kaynağı MFA olacak.**
  - Google TTS'in kendi timepoint'leri sadece fallback/debug amaçlı düşünülebilir.
  - API çıktısındaki `timepoints` normal durumda **tamamen MFA'dan gelecek**.

---

## 2. Yüksek Seviye Mimari

### 2.1. Backend Genel Akış

Yeni endpoint: `POST /api/tts/google-podcast`

1. **Input validasyonu + auth/plan kontrolü**
2. **LLM ile diyalog senaryosu üretimi** (iki konuşmacılı, JSON formatta)
3. **Google TTS ile ses üretimi**
   - Speaker A ve Speaker B için ayrı Google sesleri
   - Her replik için ayrı TTS çağrısı
   - Audio segmentlerinin tek MP3'e merge edilmesi
4. **Transcript & transcriptPlain üretimi**
   - UI için Speaker A/B etiketli transcript
   - MFA için label'sız düz transcript
5. **MFA ile timepoints üretimi**
   - Girdi: merge edilmiş MP3 + transcriptPlain
   - Çıktı: word-level timepoints dizisi
6. **VTT üretimi** (MFA timepoints'e göre)
7. **Supabase'e upload** (MP3 + VTT)
8. **`contenthistory` kaydı**
   - `input_type: 'podcast'`
   - `entry_source: 'podcast_google'`
   - `words`, `timepoints` kolonlarına MFA verisi
9. **Normalize response**
   - Web ve mobil için mevcut podcast/tts yapısına benzer alanlar

### 2.2. Web ve Mobil Genel Akış

- **Web (Next.js)**
  - `welcome.tsx` içinde yeni içerik türü kartı: **"PODCAST GOOGLE"**
  - Yeni form:
    - Konu, seviye, süre, stil parametreleri
    - Speaker A / Speaker B için voice seçimi
  - Yeni client fonksiyonu: `createGooglePodcast(params)` → `POST /api/tts/google-podcast`

- **Mobil (React Native)**
  - `HomeScreen`'de yeni kart: "Podcast Google"
  - `CreateScreen`'de yeni `mode: 'podcast_google'`
  - `api.ts`'te yeni fonksiyon: `createGooglePodcast(...)`

---

## 3. Backend – Detaylı Pipeline Tasarımı

### 3.1. Endpoint ve Controller

#### 3.1.1. Route

- Dosya: `backend/routes/ttsRoutes.js`
- Yeni kayıt:

```js
router.post('/google-podcast', authenticate, createGooglePodcast);
```

#### 3.1.2. Controller

- Yeni dosya: `backend/controllers/googlePodcastController.js`
- Export edilecek ana fonksiyon: `createGooglePodcast(req, res)`

#### 3.1.3. Request Body (İlk Sürüm)

Zorunlu alanlar:

- `topic: string`
- `level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'`
- `durationMinutes: number`  
  Örn: `3`, `5`, `10` gibi sabit seçenekler

Opsiyonel alanlar:

- `speakerAVoice?: string`  
  - Google voice name veya ileride Lingroot ID; ilk sürümde direkt Google name
  - Varsayılan: `en-US-Neural2-H` (ABD İngilizcesi kadın, A konuşmacı)
- `speakerBVoice?: string`  
  - Varsayılan: `en-GB-Neural2-B` (İngiliz İngilizcesi erkek, B konuşmacı)
- `style?: 'friendly_chat' | 'educational' | 'professional' | 'storytelling' | ...`
- `includeHumor?: boolean`
- `includeFiller?: boolean`

#### 3.1.4. Response Formatı

Mevcut podcast/tts akışlarına benzer bir yapı hedeflenir. Örnek response alanları:

- `success: boolean`
- `message: string`
- `mp3_url: string`
- `podcast_url: string` (mp3_url ile aynı)
- `audio_url: string` (mp3_url ile aynı)
- `vtt_url: string`
- `vtt_subtitles: string`
- `duration_seconds: number`
- `topic: string`
- `level: string`
- `transcript: string`  
  - Satır satır `Speaker A: ...`, `Speaker B: ...`
- `words: string[]`
- `timepoints: Array<{
    word: string;
    timeSeconds: number;
    endTimeSeconds?: number;
    index: number;
    source: 'mfa' | 'fallback';
    hasRealTiming: boolean;
  }>`
- `contenthistory_id?: string`
- `data?: any` (ek debug / maliyet / LLM metrikleri)

---

### 3.2. LLM Prompt ve İki Konuşmacılı Senaryo

#### 3.2.1. Prompt Dosyaları

Yeni prompt dosyaları oluşturulacak:

- `backend/prompts/podcast_google_system.txt`
- (Gerekirse) `backend/prompts/podcast_google_user_template.txt`

#### 3.2.2. LLM Çıktı Formatı

Hedef JSON formatı (örnek):

```json
{
  "topic": "Internetin tarihi",
  "level": "B1",
  "estimated_duration_minutes": 5,
  "turns": [
    { "speaker": "A", "text": "..." },
    { "speaker": "B", "text": "..." }
  ]
}
```

- `speaker` sadece `"A"` veya `"B"` olacak.
- `turns` dizisi diyalog sırasını temsil edecek.

#### 3.2.3. Backend Adımları

1. LLM çağrısı, mevcut LLM util'leri (chat/rag tarafında kullanılan) reuse edilerek yapılır.
2. Dönen metin güvenli bir şekilde JSON'a parse edilir.
3. Schema validasyonu:
   - `turns` bir dizi mi?
   - Her eleman `{ speaker: 'A' | 'B', text: string }` formatında mı?
4. Tahmini süre/karakter kontrolü:
   - Çok uzun diyaloglarda kısaltma / stop mekanizması (gerekirse).

---

### 3.3. Google TTS – İki Farklı Ses ile Üretim

#### 3.3.1. Ses Seçim Stratejisi

- Request'te `speakerAVoice` / `speakerBVoice` varsa:
  - Bu değerler doğrudan Google voice name olarak kullanılır.
- Yoksa varsayılanlar:
  - **Speaker A**: `en-US-Neural2-H`
  - **Speaker B**: `en-GB-Neural2-B`

İleride bu değerler Lingroot voice abstraction'a map edilebilir; ilk fazda doğrudan Google isimleriyle ilerlenebilir.

#### 3.3.2. TTS Adımları

1. LLM'den gelen `turns` dizisi üzerinden sırayla dönülür.
2. Her `turn` için:
   - `voiceName = (speaker === 'A') ? speakerAVoice : speakerBVoice`
   - `languageCode` voiceName'den türetilir (örn. `en-US`, `en-GB`).
   - `synthesizeWithGoogle({ text: turn.text, voiceName, languageCode, speakingRate })` çağrısı yapılır.
3. Her çağrıdan elde edilen:
   - `audioContent` (buffer)
   - Toplam süre (log amaçlı)
   - (İçeride üretilen `wordTimings` sadece opsiyonel fallback/debug amaçlı; ana timepoints MFA'dan gelecek.)
4. Tüm replikler için audio segmentleri dizide tutulur:
   - `{ audioContent, duration, speaker: 'A' | 'B', index }`
5. Tüm segmentler sırayla **tek bir MP3 dosyasında merge edilir**:
   - Mevcut `mergeAudioSegments` util'i veya eşdeğer mantık kullanılır.

---

### 3.4. Transcript ve TranscriptPlain

#### 3.4.1. Transcript (UI için)

- `turns` dizisinden okunabilir diyalog çıktısı üretilir:
  - Her satır: `Speaker A: ...` veya `Speaker B: ...`
  - Aralara boş satır bırakılabilir (mevcut podcast UI yapısına uygun şekilde).

Bu transcript:
- Web ve mobilde diyalog balonları/altyazı için kullanılacak.

#### 3.4.2. TranscriptPlain (MFA için)

- `Speaker` label'ları atılmış, daha düz bir metin kullanılacak:

```text
turns.map(t => t.text).join(' ')
```

- MFA aligner için ana girdi bu metin olacak.
- Böylece alignment işlemi label'lardan etkilenmeden sadece konuşma içeriğiyle çalışacak.

---

### 3.5. MFA ile Timepoints Üretimi

Bu bölüm, gereksinim olarak özellikle vurgulanan kısım: Timepoints ana kaynağı **MFA** olacaktır.

#### 3.5.1. MFA Adımları

1. Merge edilmiş MP3 buffer'ı geçici dosyaya yazılır:
   - `tempAudioPath = path.join(os.tmpdir(), 'podcast_google_<timestamp>.mp3')`
2. MFA için kullanılacak metin seçilir:
   - `transcriptForMFA = transcriptPlain`
3. Locale belirlenir (ilk sürüm basit kural):
   - Eğer Speaker A veya B sesi Google voice name olarak `en-GB` içeriyorsa → `locale = 'en_GB'`
   - Aksi halde → `locale = 'en_US'`
4. MFA aligner çağrısı:

```js
const mfaWordTimings = await mfaAligner.generateWordTimestamps(
  tempAudioPath,
  transcriptForMFA,
  locale
);
```

5. Beklenen `mfaWordTimings` formatı (varsayım):
   - `{ word, startTime, endTime }[]`

6. Backend tarafında normalize edilir:

```js
const wordsForTiming = transcriptForMFA
  .split(/\s+/)
  .filter(w => w.length > 0);

const timepoints = mfaWordTimings.map((t, index) => ({
  word: t.word,
  timeSeconds: t.startTime,
  endTimeSeconds: t.endTime,
  index,
  hasRealTiming: true,
  source: 'mfa',
}));
```

7. İş bittikten sonra geçici ses dosyası silinir.

#### 3.5.2. Fallback Stratejisi (Sadece Zorunlu Durumlarda)

Normalde:
- `USE_MFA_ALIGNMENT` benzeri bir env parametresi **açık** olacak.
- MFA aligner düzgün çalışıyorsa **her zaman** MFA timepoints kullanılacak.

Fallback yalnızca şu durumlarda devreye girer:
- MFA kapalı (env ile disable edilmiş) veya
- `mfaAligner.generateWordTimestamps` beklenmedik bir hata fırlatırsa.

Bu durumda:

1. `wordsForTiming = transcriptForMFA.split(/\s+/).filter(Boolean)`
2. Toplam süre tahmini:
   - Ya merge edilmiş audio süresinden ölçülür,
   - Ya da basit tahmin: `estimatedDuration = wordsForTiming.length * (0.5 / speakingRate)`
3. Linear dağılım ile timepoints üretilir:

```js
const timepoints = wordsForTiming.map((word, index) => ({
  word,
  timeSeconds: (index / wordsForTiming.length) * estimatedDuration,
  endTimeSeconds: ((index + 1) / wordsForTiming.length) * estimatedDuration,
  index,
  hasRealTiming: false,
  source: 'fallback',
}));
```

- Bu fallback sadece sistemin tamamen kırılmasını engellemek için eklenir; normal işletim modunda **MFA zorunlu kaynaktır**.

---

### 3.6. VTT Üretimi

Girdi:
- `transcript` veya `transcriptPlain` (diyalog yapısına göre seçilir)
- MFA'dan gelen `timepoints`

Basit strateji (ilk sürüm):
- Kelime-level değil, cümle/segment-level bloklar oluşturmak makul olabilir.
- Timepoints üzerinden cümle sınırları tahmin edilerek her blok için başlangıç/bitiş zamanları belirlenir.

VTT üretildikten sonra:
- Metin buffer'ı `uploadToSupabase(vttBuffer, vttFilename)` ile Supabase'e yüklenir.
- Dönen public URL response ve `contenthistory` kaydında kullanılır.

---

### 3.7. Supabase ve contenthistory Entegrasyonu

#### 3.7.1. Dosya Upload

- **MP3**
  - Dosya adı: `google_podcast_<slug_topic>_<level>_<timestamp>.mp3`
  - `audioPublicUrl = await uploadToSupabase(audioBuffer, audioFilename)`

- **VTT**
  - Dosya adı: `google_podcast_<slug_topic>_<level>_<timestamp>.vtt`
  - `vttPublicUrl = await uploadToSupabase(vttBuffer, vttFilename)`

#### 3.7.2. contenthistory Kaydı

Örnek insert:

```js
const insertData = {
  user_id: userId,
  input: topic,
  translated_text: transcript,
  adapted_text: transcript,
  mp3_url: audioPublicUrl,
  vtt_url: vttPublicUrl,
  level: level,
  input_type: 'podcast',
  entry_source: 'podcast_google',
  tts_provider: 'google',
  tts_category: 'Premium', // voice kalitesine göre belirlenecek
  words: JSON.stringify(wordsForTiming),
  timepoints: JSON.stringify(timepoints),
  audio_duration_seconds: totalDuration,
  created_at: new Date().toISOString(),
};
```

- `input_type: 'podcast'` bırakılarak mevcut filtreleme/raporlama bozulmaz.
- `entry_source: 'podcast_google'` ile bu pipeline'dan gelen kayıtlar net şekilde ayrılır.

---

## 4. Web – "PODCAST GOOGLE" Kartı ve UI

### 4.1. Yeni Kart

- Dosya: `frontend/pages/welcome.tsx`
- `contentTypeOptions` dizisine eklenecek yeni eleman:

```ts
{ id: 'podcast_google', name: 'Podcast Google', icon: <FaPodcast /> }
```

### 4.2. Form ve State

Yeni state'ler (örnek):

- `podcastGoogleTopic: string`
- `podcastGoogleDuration: number`
- `podcastGoogleSpeakerAVoice: string`
- `podcastGoogleSpeakerBVoice: string`
- `isCreatingGooglePodcast: boolean`
- `podcastGoogleError: string | null`

Form alanları:
- Konu girişi
- Süre seçimi (3 / 5 / 10 dk)
- Seviye (mevcut `englishLevel` state'i reuse edilir)
- Stil opsiyonları (opsiyonel)
- Speaker A / Speaker B için voice dropdown'ları (sabit Google voice listesi ile başlanabilir)

Buton:
- "Podcast Google Oluştur" → `handleCreateGooglePodcast`

### 4.3. API Katmanı

- Dosya: `frontend/src/lib/api.ts`

Yeni tipler:

```ts
interface GooglePodcastParams {
  topic: string;
  level: string;
  durationMinutes: number;
  speakerAVoice?: string;
  speakerBVoice?: string;
  style?: string;
  includeHumor?: boolean;
  includeFiller?: boolean;
}

interface GooglePodcastResponse {
  success: boolean;
  message?: string;
  podcast_url?: string;
  audio_url?: string;
  mp3_url?: string;
  vtt_url?: string;
  vtt_subtitles?: string;
  duration_seconds?: number;
  topic?: string;
  level?: string;
  transcript?: string;
  words?: string[];
  timepoints?: Array<{
    word: string;
    timeSeconds: number;
    endTimeSeconds?: number;
    index: number;
    source: 'mfa' | 'fallback';
    hasRealTiming: boolean;
  }>;
  contenthistory_id?: string;
  data?: any;
}
```

Yeni fonksiyon:

```ts
export const createGooglePodcast = async (
  params: GooglePodcastParams
): Promise<GooglePodcastResponse> => {
  // getApiUrl('tts/google-podcast') üzerinden POST
};
```

`welcome.tsx` içinde `handleCreateGooglePodcast` fonksiyonu:
- Input validasyonu yapar.
- `createGooglePodcast(params)` çağrısını yapar.
- Dönen sonucu mevcut `audioResult` yapısına map ederek player'da kullanır.

---

## 5. Mobil – "Podcast Google" Kartı ve Akışı

### 5.1. HomeScreen Kartı

- Dosya: `LingRootMobile/src/screens/HomeScreen.tsx`
- Mevcut podcast kartına ek olarak yeni bir kart:

```ts
{
  id: X,
  title: language === 'tr' ? 'Podcast Google' : 'Podcast Google',
  description: language === 'tr'
    ? 'Google sesleriyle çift konuşmacılı podcast oluştur'
    : 'Create a dual-speaker podcast with Google voices',
  icon: 'podcasts',
  color: '#8E44AD',
  screenName: 'Create',
  params: { mode: 'podcast_google' as const },
  featureKey: 'podcast_google',
}
```

### 5.2. CreateScreen – Yeni Mode

- Dosya: `LingRootMobile/src/screens/CreateScreen.tsx`

Yeni mode:

```ts
if (mode === 'podcast_google') {
  // Podcast Google UI
}
```

UI elemanları:
- Konu girişi
- Süre seçimi (3 / 5 / 10 dk)
- Seviye (mevcut level state'leri reuse edilir)
- Speaker A / Speaker B voice picker'ları (sabit Google voice listesi)
- "Podcast Google Oluştur" butonu

Buton davranışı:
- `apiService.createGooglePodcast({ ... })` çağrısı
- Başarılı response sonrasında `setAudioResult(response)` ile player'a aktarım

### 5.3. API Servisi

- Dosya: `LingRootMobile/src/services/api.ts`

Yeni fonksiyon:

```ts
async createGooglePodcast(params: {
  topic: string;
  level: string;
  durationMinutes: number | string;
  speakerAVoice?: string;
  speakerBVoice?: string;
  style?: string;
  includeHumor?: boolean;
  includeFiller?: boolean;
}): Promise<any> {
  // POST /api/tts/google-podcast
}
```

- `wakeBackendIfNeeded()` reuse edilebilir.
- Uzun sürebileceği için timeout yüksek tutulur.

### 5.4. Chat / LiroScreen (Opsiyonel Faz)

İlk fazda:
- Chat içinden sadece mevcut `type: 'podcast'` TTS akışı devam eder.

Sonraki fazda (istersen):
- Ek bir CTA: `type: 'podcast_google'`
- Onay sonrası `POST /api/tts/google-podcast` çağrısı yapılır.

---

## 6. Uygulama Sırası (Önerilen)

1. **Backend iskeleti**
   - `googlePodcastController` dosyasını oluştur.
   - `/api/tts/google-podcast` route'unu ekle.
   - Şimdilik mock bir response dön (geliştirme sırasında adım adım doldurulacak).

2. **LLM senaryo üretimi**
   - Prompt dosyalarını ekle.
   - Controller içinde JSON diyalog senaryosu üreten kısmı yaz.

3. **Google TTS entegrasyonu (iki sesli)**
   - LLM senaryosundan `turns` al.
   - Her replik için doğru voice ile `synthesizeWithGoogle` çağrıları yap.
   - Audio segmentlerini tek MP3'e merge et.

4. **Transcript & transcriptPlain üretimi**
   - Speaker A/B etiketli transcript
   - MFA için düz transcriptPlain

5. **MFA ile timepoints üretimi**
   - Merge edilmiş MP3 + transcriptPlain ile `mfaAligner.generateWordTimestamps` çağrısı
   - MFA çıktısından normalized `timepoints` ve `wordsForTiming` üretimi
   - Fallback stratejisinin eklenmesi (sadece hata durumunda)

6. **VTT üretimi + Supabase upload + contenthistory**
   - VTT dosyasını oluştur
   - MP3 + VTT'yi Supabase'e yükle
   - `contenthistory` kaydını MFA verileriyle beraber ekle

7. **Web tarafı**
   - "PODCAST GOOGLE" kartının eklenmesi
   - Form + `createGooglePodcast` client fonksiyonu + loading/hata yönetimi

8. **Mobil tarafı**
   - "Podcast Google" kartının eklenmesi
   - `mode: 'podcast_google'` için UI + `apiService.createGooglePodcast`

9. **Testler**
   - Mevcut podcast akışının bozulmadığını doğrula (regression)
   - PODCAST GOOGLE akışında:
     - İki farklı sesin gerçekten kullanıldığını
     - Transcript & diyalog balonlarının doğru çalıştığını
     - MFA timepoints ile web/mobil player senkronizasyonunu
     - `contenthistory` kayıtlarının doğru alanlarla oluşturulduğunu kontrol et

---

## 7. Nihai Kararlar (Özet)

- **Endpoint ismi**: `POST /api/tts/google-podcast`  
  → Kullanılacak ve mevcut `create-podcast` akışından tamamen bağımsız.

- **Timepoints kaynağı**:  
  → Ana kaynak **MFA** (`mfaAligner.generateWordTimestamps`), sadece hata durumunda linear fallback.

- **contenthistory ayrımı**:  
  → `input_type: 'podcast'`, `entry_source: 'podcast_google'` ile yeni pipeline'dan gelen kayıtlar ayrılacak.

- **Kapsam (ilk faz)**:
  - Backend: yeni pipeline (LLM → Google TTS (iki ses) → MFA → VTT → Supabase → contenthistory → response)
  - Web: yeni "PODCAST GOOGLE" kartı ve form
  - Mobil: yeni "Podcast Google" kartı ve mode

Bu doküman, implementasyona başlamadan önce tasarım referansı olarak kullanılacaktır.
