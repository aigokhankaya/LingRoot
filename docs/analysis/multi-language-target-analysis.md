# Coklu Hedef Dil Destegi - Kapsamli Analiz Dokumani

> **Olusturulma:** 2026-02-25 | **Guncelleme:** 2026-02-25 | **Versiyon:** 1.0

---

## Icindekiler

1. [Yonetici Ozeti](#1-yonetici-ozeti)
2. [Mevcut Durum Analizi](#2-mevcut-durum-analizi)
3. [Etkilenen Alanlar - Dosya Haritasi](#3-etkilenen-alanlar---dosya-haritasi)
4. [Veritabani Degisiklikleri](#4-veritabani-degisiklikleri)
5. [Backend Degisiklikleri](#5-backend-degisiklikleri)
6. [Mobil Uygulama Degisiklikleri](#6-mobil-uygulama-degisiklikleri)
7. [Web Frontend Degisiklikleri](#7-web-frontend-degisiklikleri)
8. [Google TTS Dil-Ses Modeli Haritasi](#8-google-tts-dil-ses-modeli-haritasi)
9. [Vocabulary Servisi Degisiklikleri](#9-vocabulary-servisi-degisiklikleri)
10. [Ses Model Isimlendirme Degisiklikleri](#10-ses-model-isimlendirme-degisiklikleri)
11. [Migration Plani](#11-migration-plani)
12. [Riskler ve Dikkat Edilecekler](#12-riskler-ve-dikkat-edilecekler)
13. [Test Stratejisi](#13-test-stratejisi)

---

## 1. Yonetici Ozeti

### Problem
LingRoot su an yalnizca **Ingilizce** hedef dil ve **Turkce** kaynak dil olarak calisiyor. Tum icerik uretimi, TTS seslendirme, kelime zenginlestirme ve prompt sablonlari bu iki dile hardcoded.

### Hedef
- **Hedef dil (ogrenilen dil):** Parametrik — Google TTS destekli 50+ dil
- **Kaynak dil (ana dil):** Parametrik — kullanicinin ana dili, ceviriler bu dile yapilir
- Her iki deger `user_settings` tablosundaki JSONB `settings` alaninda saklanacak

### Kapsam
Bu dokuman yalnizca **analiz** icermektedir. Implementasyon bu dokumanin disindadir.

### Etki Alani
| Katman | Etkilenen Dosya Sayisi | Kritiklik |
|--------|----------------------|-----------|
| Veritabani | 6 tablo (migration) | Yuksek |
| Backend | ~12 dosya | Yuksek |
| Mobil (React Native) | ~8 dosya | Orta-Yuksek |
| Web Frontend | ~5 dosya | Orta |
| Prompt Sablonlari | ~6 dosya | Yuksek |

---

## 2. Mevcut Durum Analizi

### 2.1 Hardcoded Ingilizce Referanslari

| Dosya | Satir | Hardcoded Deger | Aciklama |
|-------|-------|----------------|----------|
| `backend/utils/ai/translateAndAdapt.js` | 378 | `"translate to English"` | Icerik uretim promptu |
| `backend/utils/ai/translateAndAdapt.js` | 387 | `"EN + ${targetLanguage}"` | Bilingual icerik — EN sabit |
| `backend/controllers/topicPipelineController.js` | 169 | `targetLanguage = input_language \|\| 'Turkish'` | Varsayilan kaynak dil |
| `backend/controllers/topicPipelineController.js` | 428 | `.split('{{input_language}}').join('Turkce')` | Turkce fallback |
| `backend/services/wordEnrichmentService.js` | 22-35 | `"For the English word..."` | Kelime zenginlestirme promptu |
| `backend/services/wordEnrichmentService.js` | 29 | `"definition_tr": "Turkish definition"` | Turkce tanim sabit |
| `backend/utils/content/wordTranslationService.js` | 38 | `translateWordToTurkish()` | Fonksiyon adi bile Turkce'ye sabit |
| `backend/utils/content/wordTranslationService.js` | 44 | `translate_word_to_turkish` prompt | Ceviri prompt sablonu |
| `backend/utils/content/wordTranslationService.js` | 57 | `"Turkce-Ingilizce ceviri uzman"` | System message |
| `backend/utils/audio/lingrootVoices.js` | 7-12 | `ACCENT_MAP = { 'en-US', 'en-GB', ... }` | Sadece Ingilizce aksanlar |
| `backend/utils/audio/lingrootVoices.js` | 14-18 | `ACCENT_LABEL_TR` | Sadece Ingilizce aksan etiketleri |
| `backend/utils/audio/googleTTS.js` | 41 | `fallback = 'en-US'` | Varsayilan dil kodu |
| `backend/services/voiceModelService.js` | — | Tum `listVoices()` | Sadece Ingilizce sesleri dondurur |
| `backend/prompts/content/bilingual.hbs` | 3 | `"English (for TTS audio)"` | Prompt sablonu EN sabit |
| `backend/prompts/templates/content/bilingual.hbs` | 6 | `"English and {{targetLanguage}}"` | EN sabit |

### 2.2 Mevcut Veri Akisi

```
Kullanici Girdisi (Turkce/diger)
    |
    v
[topicPipelineController] input_language = 'Turkish' (varsayilan)
    |
    v
[translateAndAdapt] generateBilingualContent(topic, 'Turkish', level)
    |                   -> Ingilizce icerik (TTS icin) + Turkce ceviri (gosterim icin)
    v
[lingrootVoices] en-US/en-GB sesleri
    |
    v
[googleTTS] en-US languageCode ile seslendirme
    |
    v
[MFA] Ingilizce hizalama
    |
    v
contenthistory kaydedilir (adapted_text=EN, translated_text=TR)
```

### 2.3 Mevcut Dil Secim Akisi (Mobil)

- `LanguageContext.tsx`: Sadece UI dili ('tr' | 'en') yonetir
- `TopicTreeScreen.tsx` satir 273: `language === 'tr' ? 'Turkish' : 'English'` — UI dilini konu uretim dili olarak kullaniyor
- `VoiceSelector.tsx`: Aksan filtresi: american, british, australian, indian — sadece Ingilizce
- `voiceDisplayNames.ts`: "Amerikan Kadin Gold 1", "Ingiliz Erkek Silver 2" — sadece Ingilizce isimlendirme

---

## 3. Etkilenen Alanlar - Dosya Haritasi

### 3.1 Backend

| Dosya | Degisiklik Turu | Oncelik |
|-------|----------------|---------|
| `backend/utils/ai/translateAndAdapt.js` | Prompt + logic: hedef dili parametre olarak al | P0 |
| `backend/controllers/topicPipelineController.js` | `targetLanguage` kaynagini user_settings'e cevir | P0 |
| `backend/utils/audio/lingrootVoices.js` | Coklu dil ACCENT_MAP, yeni dil sesleri ekle | P0 |
| `backend/utils/audio/googleTTS.js` | `deriveLanguageCodeFromVoice()` fallback + dil destegi | P0 |
| `backend/utils/audio/googleTTSMultiSpeaker.js` | Podcast pipeline: dil parametresi, prompt degisiklikleri | P0 |
| `backend/services/voiceModelService.js` | `listVoices(languageCode)` — dil bazli filtreleme | P0 |
| `backend/services/wordEnrichmentService.js` | `enrichWord()` promptu dil-parametrik | P1 |
| `backend/utils/content/wordTranslationService.js` | `translateWord()` (generic), prompt sablonu | P1 |
| `backend/routes/userRoutes.js` | `target_language` + `native_language` GET/POST | P0 |
| `backend/controllers/vocabularyController.js` | `addWord()` dil parametresi | P1 |
| `backend/prompts/content/bilingual.hbs` | `{{target_language}}` -> `{{learning_language}}` | P0 |
| `backend/prompts/templates/content/bilingual.hbs` | Ayni degisiklik | P0 |
| `backend/prompts/translate_word_to_turkish.txt` | Generic dile cevirme promptu | P1 |

### 3.2 Mobil Uygulama

| Dosya | Degisiklik Turu | Oncelik |
|-------|----------------|---------|
| `LingRootMobile/src/screens/LibraryScreen.tsx` | Hedef dil filtresi ekle | P0 |
| `LingRootMobile/src/screens/VocabularyScreen.tsx` | Hedef dil filtresi ekle | P0 |
| `LingRootMobile/src/screens/TopicTreeScreen.tsx` | user_settings'ten hedef dil oku | P0 |
| `LingRootMobile/src/components/VoiceSelector.tsx` | Dil bazli ses listesi | P0 |
| `LingRootMobile/src/utils/voiceDisplayNames.ts` | Coklu dil ses isimlendirmesi | P0 |
| `LingRootMobile/src/contexts/LanguageContext.tsx` | `targetLanguage` + `nativeLanguage` state ekle | P0 |
| `LingRootMobile/src/services/api.ts` | Dil parametresi tum API cagirilarina ekle | P1 |
| `LingRootMobile/src/screens/ProfileScreen.tsx` | Hedef dil + kaynak dil secimi | P0 |

### 3.3 Web Frontend

| Dosya | Degisiklik Turu | Oncelik |
|-------|----------------|---------|
| `frontend/src/components/InputSection.tsx` | Hedef dil secimi + voice degisimi | P1 |
| `frontend/src/components/LanguageSelector.tsx` | Hedef dil secici | P1 |
| `frontend/src/app/dashboard/index.tsx` | Ayarlar sayfasinda dil tercihi | P2 |
| `packages/api-client/src/endpoints/tts.ts` | TTSRequest'e `targetLanguage` ekle | P1 |

### 3.4 Veritabani

| Tablo | Degisiklik | Oncelik |
|-------|-----------|---------|
| `user_settings` | JSONB'ye `target_language`, `native_language` anahtarlari | P0 |
| `contenthistory` | Yeni kolon: `target_language VARCHAR(10)` | P0 |
| `user_vocabulary` | Yeni kolon: `target_language VARCHAR(10)` | P0 |
| `vocabulary` | Kolon isimleri genisleme: `definition_native`, `example_sentence_native` | P1 |
| `topics` | Yeni kolon: `target_language VARCHAR(10)` | P1 |
| `topic_contents` | Yeni kolon: `target_language VARCHAR(10)` | P1 |

---

## 4. Veritabani Degisiklikleri

### 4.1 user_settings JSONB Yapisi (Mevcut → Yeni)

**Mevcut:**
```json
{
  "default_voice": "lr_us_chirp3hd_callirrhoe",
  "favorite_books": [1, 2, 3]
}
```

**Yeni:**
```json
{
  "default_voice": "lr_fr_chirp3hd_callirrhoe",
  "favorite_books": [1, 2, 3],
  "target_language": "fr-FR",
  "native_language": "tr"
}
```

### 4.2 Dil Kodu Formati

| Alan | Format | Ornekler |
|------|--------|---------|
| `target_language` | BCP-47 locale | `en-US`, `fr-FR`, `de-DE`, `es-ES`, `ja-JP` |
| `native_language` | ISO 639-1 (2 harf) | `tr`, `en`, `de`, `fr`, `ar` |

**Neden farkli format?**
- `target_language` TTS seslendirme icin locale gerektirir (`fr-FR` vs `fr-CA`)
- `native_language` sadece ceviri/gosterim dili icin yeterli (locale farki onemli degil)

### 4.3 contenthistory Tablosu

Yeni kolon: `target_language VARCHAR(10) DEFAULT 'en-US'`
- Mevcut tum kayitlar `en-US` olarak migrate edilecek
- Library filtrelemesi bu kolonu kullanacak

### 4.4 user_vocabulary Tablosu

Yeni kolon: `target_language VARCHAR(10) DEFAULT 'en'`
- Mevcut tum kayitlar `en` olarak migrate edilecek
- Vocabulary ekranindaki filtre bu kolonu kullanacak

### 4.5 vocabulary (Global) Tablosu

Mevcut kolonlar:
```
word, definition, example_sentence, example_sentence_turkish, level, meanings
```

Sorun: `example_sentence_turkish` kolon adi dil-spesifik. Ancak bu global bir tablo — tum kullanicilar icin ortak.

**Yaklasim:** Global `vocabulary` tablosunu degistirmek yerine, `meanings` JSONB kolonunu kullanarak coklu dil destegi saglanabilir:

```json
{
  "tr": { "definition": "kedi", "example": "Ben bir kedi gordum" },
  "de": { "definition": "Katze", "example": "Ich sah eine Katze" },
  "fr": { "definition": "chat", "example": "J'ai vu un chat" }
}
```

Bu sayede yeni dil eklendiginde kolon eklemeye gerek kalmaz.

### 4.6 topics ve topic_contents Tablolari

Yeni kolon: `target_language VARCHAR(10) DEFAULT 'en-US'`
- Konu agaci hedef dile gore icerik uretecek
- Mevcut konular `en-US` olarak migrate edilecek

---

## 5. Backend Degisiklikleri

### 5.1 Icerik Uretim Pipeline'i (translateAndAdapt.js)

**Mevcut Akis:**
```
generateBilingualContent(topic, targetLanguage='Turkish', level)
  → System: "create content in English AND ${targetLanguage}"
  → Return: { adapted_text (EN), narration_tr (TR) }
```

**Yeni Akis:**
```
generateBilingualContent(topic, nativeLanguage, learningLanguage, level)
  → System: "create content in ${learningLanguage} AND ${nativeLanguage}"
  → Return: { adapted_text (learningLanguage), translated_text (nativeLanguage) }
```

**Degisecek Fonksiyonlar:**
- `translateAndAdaptToCEFR(text, sourceLanguage, level, ...)` — `sourceLanguage` artik `nativeLanguage`, hedef `learningLanguage` parametresi eklenmeli
- `generateBilingualContent(topic, targetLanguage, level, ...)` — parametreler: `nativeLanguage`, `learningLanguage`
- Prompt sablonlari: `bilingual.hbs` ve `bilingual.hbs (templates/)` icindeki `"English (for TTS audio)"` → `"{{learning_language}} (for TTS audio)"`

### 5.2 Konu Pipeline'i (topicPipelineController.js)

**Mevcut:**
```javascript
const targetLanguage = input_language || 'Turkish';  // satir 169
```

**Yeni:**
```javascript
// user_settings'ten oku
const userSettings = await getUserSettings(userId);
const learningLanguage = userSettings.target_language || 'en-US';
const nativeLanguage = userSettings.native_language || 'tr';
```

- Konu onerilerini hedef dilde uret (su an hep Ingilizce)
- Alt konu uretimini hedef dilde yap

### 5.3 TTS Ses Pipeline'i

#### lingrootVoices.js

**Mevcut ACCENT_MAP:**
```javascript
const ACCENT_MAP = {
  'en-US': 'american', 'en-GB': 'british',
  'en-AU': 'australian', 'en-IN': 'indian'
};
```

**Yeni ACCENT_MAP (genisletilmis):**
```javascript
const LANGUAGE_MAP = {
  // Ingilizce
  'en-US': { accent: 'american', label_tr: 'Amerikan', label_en: 'American' },
  'en-GB': { accent: 'british', label_tr: 'Ingiliz', label_en: 'British' },
  'en-AU': { accent: 'australian', label_tr: 'Avustralyali', label_en: 'Australian' },
  'en-IN': { accent: 'indian', label_tr: 'Hint', label_en: 'Indian' },
  // Fransizca
  'fr-FR': { accent: 'french', label_tr: 'Fransiz', label_en: 'French' },
  'fr-CA': { accent: 'canadian_french', label_tr: 'Kanada Fransiz', label_en: 'Canadian French' },
  // Almanca
  'de-DE': { accent: 'german', label_tr: 'Alman', label_en: 'German' },
  // Ispanyolca
  'es-ES': { accent: 'spanish', label_tr: 'Ispanyol', label_en: 'Spanish' },
  'es-US': { accent: 'us_spanish', label_tr: 'ABD Ispanyol', label_en: 'US Spanish' },
  // Italyanca
  'it-IT': { accent: 'italian', label_tr: 'Italyan', label_en: 'Italian' },
  // Portekizce
  'pt-BR': { accent: 'brazilian', label_tr: 'Brezilyali', label_en: 'Brazilian' },
  'pt-PT': { accent: 'portuguese', label_tr: 'Portekiz', label_en: 'Portuguese' },
  // Felemenkce
  'nl-NL': { accent: 'dutch', label_tr: 'Hollandali', label_en: 'Dutch' },
  // Rusca
  'ru-RU': { accent: 'russian', label_tr: 'Rus', label_en: 'Russian' },
  // Japonca
  'ja-JP': { accent: 'japanese', label_tr: 'Japon', label_en: 'Japanese' },
  // Korece
  'ko-KR': { accent: 'korean', label_tr: 'Kore', label_en: 'Korean' },
  // Cince (Mandarin)
  'cmn-CN': { accent: 'chinese', label_tr: 'Cin', label_en: 'Chinese' },
  // Arapca
  'ar-XA': { accent: 'arabic', label_tr: 'Arap', label_en: 'Arabic' },
  // Hintce
  'hi-IN': { accent: 'hindi', label_tr: 'Hint', label_en: 'Hindi' },
  // Turkce
  'tr-TR': { accent: 'turkish', label_tr: 'Turk', label_en: 'Turkish' },
  // ... diger diller
};
```

#### voiceModelService.js

**Mevcut:** `listVoices(languageCode)` sadece Ingilizce sesleri dondurur.

**Yeni:**
- `listVoices(targetLanguage)` → hedef dile gore filtreli ses listesi dondur
- `getFilteredVoices({language, gender, category})` → `accent` yerine `language` parametresi
- Yeni fonksiyon: `getSupportedLanguages()` → desteklenen dil listesi dondur

#### googleTTS.js

**Mevcut:** `deriveLanguageCodeFromVoice(voiceName, fallback = 'en-US')`

**Yeni:** Fallback'i kullanicinin hedef diline gore belirle:
```javascript
deriveLanguageCodeFromVoice(voiceName, userTargetLanguage = 'en-US')
```

### 5.4 Podcast Pipeline (googleTTSMultiSpeaker.js)

Bu dosya en karmasik degisiklige sahip. Icindeki ~15 hardcoded referans:

1. Script uretim promptlari ("English conversation", "speak in English")
2. TTS `languageCode` sabitleri (`en-US`, `en-GB`)
3. Konusmaci atama kaliplari (Ingilizce cumle yapisi varsayimi)
4. MFA (Forced Alignment) Ingilizce dil modeli

**Gerekli Degisiklikler:**
- Tum script uretim promptlarina `learningLanguage` parametresi ekle
- `languageCode` degiskenini kullanicinin hedef dilinden turet
- MFA dil modelini hedef dile gore sec (MFA coklu dil destekliyor)
- Konusmaci atama kurallarini dil-bagimsiz hale getir

### 5.5 API Endpoint Degisiklikleri

#### GET/POST /api/users/:userId/settings

**Mevcut Response:**
```json
{
  "default_voice": "lr_us_chirp3hd_callirrhoe",
  "settings": { ... }
}
```

**Yeni Response:**
```json
{
  "default_voice": "lr_fr_chirp3hd_callirrhoe",
  "target_language": "fr-FR",
  "native_language": "tr",
  "settings": { ... }
}
```

#### GET /api/tts/voices

**Mevcut:** Parametre almaz, tum Ingilizce sesleri dondurur.

**Yeni:** `?language=fr-FR` query parametresi ile filtreleme.

#### POST /api/tts/process, POST /api/tts/process-async

**Yeni Body Alanlari:**
```json
{
  "target_language": "fr-FR",
  "native_language": "tr",
  ...mevcut alanlar
}
```

#### POST /api/topic-pipeline/generate

**Mevcut Body:**
```json
{
  "topic": "...", "level": "B1",
  "input_language": "Turkish"
}
```

**Yeni Body:**
```json
{
  "topic": "...", "level": "B1",
  "target_language": "fr-FR",
  "native_language": "tr"
}
```

---

## 6. Mobil Uygulama Degisiklikleri

### 6.1 LanguageContext Genisletmesi

**Dosya:** `LingRootMobile/src/contexts/LanguageContext.tsx`

**Mevcut:**
```typescript
interface LanguageContextType {
  language: 'tr' | 'en';           // Sadece UI dili
  setLanguage: (lang) => Promise<void>;
  t: (key) => string;
}
```

**Yeni:**
```typescript
interface LanguageContextType {
  language: 'tr' | 'en';           // UI dili (mevcut)
  targetLanguage: string;           // Hedef dil: 'fr-FR', 'de-DE', vb.
  nativeLanguage: string;           // Ana dil: 'tr', 'en', 'de', vb.
  setTargetLanguage: (lang: string) => Promise<void>;
  setNativeLanguage: (lang: string) => Promise<void>;
  t: (key) => string;
}
```

- `targetLanguage` ve `nativeLanguage` user_settings API'den yuklenir
- Degisiklikler aninda backend'e sync edilir
- AsyncStorage'da yerel cache tutulur

### 6.2 Library Ekrani (LibraryScreen.tsx)

**Mevcut Filtreler:** CEFR seviyesi, icerik tipi, arama
**Yeni Filtre:** Hedef dil dropdown/chip filtresi

```
[Tum Diller] [Ingilizce] [Fransizca] [Almanca] ...
```

- `getUserAudioHistory()` API cagrisina `target_language` parametresi ekle
- Backend query: `WHERE target_language = $targetLang` (contenthistory tablosu)
- Varsayilan: Kullanicinin aktif hedef dili

### 6.3 Vocabulary Ekrani (VocabularyScreen.tsx)

**Mevcut Filtreler:** CEFR seviyesi, ogrenilmis durumu, arama
**Yeni Filtre:** Hedef dil dropdown/chip filtresi

- `getVocabulary()` API cagrisina `target_language` parametresi ekle
- Kelime ekleme (`addWordWithTranslation()`) hedef dili gonderecek
- Kelime zenginlestirme hedef dile gore calisacak (ornek cumle o dilde)

### 6.4 Konu Agaci (TopicTreeScreen.tsx)

**Mevcut (satir 273):**
```typescript
generateSubtopics(aiModalTopic.id, {
  count: aiCount,
  language: language === 'tr' ? 'Turkish' : 'English'  // UI dili!
});
```

**Yeni:**
```typescript
generateSubtopics(aiModalTopic.id, {
  count: aiCount,
  target_language: targetLanguage,    // user_settings'ten
  native_language: nativeLanguage     // user_settings'ten
});
```

- Konu onerilerini hedef dilde uret
- Alt konu basliklarini hedef dilde olustur

### 6.5 VoiceSelector Bileseni (VoiceSelector.tsx)

**Mevcut Aksan Filtresi:** American, British, Australian, Indian
**Yeni:** Hedef dile gore dinamik filtre

- Hedef dil `fr-FR` ise → Fransizca sesleri goster
- Hedef dil `de-DE` ise → Almanca sesleri goster
- Aksan filtresi sadece Ingilizce icin gecerli (en-US vs en-GB)
- Diger diller icin: locale variant varsa goster (fr-FR vs fr-CA, pt-BR vs pt-PT)

### 6.6 Profil Ekrani (ProfileScreen.tsx)

Yeni secim alanlari:
- **Hedef Dil Secimi:** Dropdown/modal ile 50+ dil listesi
- **Ana Dil Secimi:** Dropdown/modal ile dil listesi
- Bu secimler `user_settings` API'ye kaydedilecek

### 6.7 voiceDisplayNames.ts Degisiklikleri

Detayli analiz bolum 10'da.

---

## 7. Web Frontend Degisiklikleri

### 7.1 InputSection.tsx

- Hedef dil secici ekle (dropdown veya mevcut LanguageSelector genislet)
- Ses secimi hedef dile gore filtrele
- TTS istegine `target_language` ve `native_language` ekle

### 7.2 LanguageSelector.tsx

**Mevcut:** 9 UI dili destekliyor (tr, en, de, fr, es, pt, hi, id, ar)

**Yeni:** Iki ayri selector:
1. **UI Dili Secici** (mevcut): Arayuz dili
2. **Hedef Dil Secici** (yeni): Ogrenilecek dil — 50+ dil

### 7.3 API Client (packages/api-client)

**TTSRequest interface:**
```typescript
interface TTSRequest {
  // ...mevcut alanlar
  target_language?: string;    // Yeni
  native_language?: string;    // Yeni
}
```

**Voice interface:**
```typescript
interface Voice {
  // ...mevcut alanlar
  language: string;            // Yeni: 'fr-FR', 'de-DE', vb.
}
```

---

## 8. Google TTS Dil-Ses Modeli Haritasi

### 8.1 Desteklenen Diller ve Ses Tipleri

Google Cloud TTS 380+ ses, 75+ dil destekler. Asagida LingRoot icin oncelikli diller ve mevcut ses tipleri:

| Dil | Locale | Standard | WaveNet | Neural2 | Studio | Chirp-HD | Chirp3-HD |
|-----|--------|----------|---------|---------|--------|----------|-----------|
| Ingilizce (ABD) | en-US | Var | Var | Var | Var | Var | Var |
| Ingilizce (Ing.) | en-GB | Var | Var | Var | Var | Var | Var |
| Fransizca | fr-FR | Var | Var | Var | Var | Var | Var |
| Almanca | de-DE | Var | Var | Var | - | Var | Var |
| Ispanyolca | es-ES | Var | Var | Var | - | Var | Var |
| Italyanca | it-IT | Var | Var | Var | - | Var | Var |
| Portekizce (BR) | pt-BR | Var | Var | Var | - | Var | Var |
| Felemenkce | nl-NL | Var | - | - | - | - | Var |
| Rusca | ru-RU | Var | Var | - | - | - | Var |
| Japonca | ja-JP | Var | Var | Var | - | Var | Var |
| Korece | ko-KR | Var | Var | Var | - | Var | Var |
| Cince (Mandarin) | cmn-CN | Var | Var | - | - | - | Var |
| Arapca | ar-XA | Var | - | - | - | - | Var |
| Hintce | hi-IN | Var | Var | Var | - | Var | Var |
| Turkce | tr-TR | Var | Var | - | - | - | Var |
| Isvecce | sv-SE | Var | Var | - | - | - | Var |
| Danca | da-DK | Var | - | - | - | - | Var |
| Fince | fi-FI | Var | Var | - | - | - | Var |
| Lehce | pl-PL | Var | Var | - | - | - | Var |
| Ukraynaca | uk-UA | Var | - | - | - | - | Var |

> **Not:** Chirp3-HD 50+ dil destekler ve 28 benzersiz ses adi (speaker) sunar. Bu sesler tum desteklenen dillerde kullanilabilir.

### 8.2 Chirp3-HD Ses Listesi (Tum Dillerde Kullanilabilir)

28 ses adi:
```
Achernar, Achird, Algenib, Algieba, Alnilam, Aoede, Autonoe,
Callirrhoe, Charon, Despina, Enceladus, Erinome, Fenrir, Gacrux,
Iapetus, Kore, Laomedeia, Leda, Orus, Pulcherrima, Puck,
Rasalgethi, Sadachbia, Sadaltager, Schedar, Sulafat, Umbriel,
Vindemiatrix, Zephyr, Zubenelgenubi
```

**Isimlendirme Formati:**
```
{locale}-Chirp3-HD-{SpeakerName}
```

**Ornekler:**
- `fr-FR-Chirp3-HD-Callirrhoe` (Fransizca kadin)
- `de-DE-Chirp3-HD-Algenib` (Almanca erkek)
- `es-ES-Chirp3-HD-Aoede` (Ispanyolca kadin)
- `ja-JP-Chirp3-HD-Kore` (Japonca kadin)

### 8.3 LingRoot Ses Kalite Katmanlari → Dil Bazli Eslestirme

| Katman | Mevcut (EN) | Yeni Yaklasim |
|--------|------------|---------------|
| Basic | Standard (en-US-Standard-F) | `{locale}-Standard-{suffix}` |
| Silver | WaveNet/Neural2 | `{locale}-WaveNet-{suffix}` veya `{locale}-Neural2-{suffix}` |
| Gold | Chirp3-HD | `{locale}-Chirp3-HD-{speaker}` |
| Platinum | Studio | `{locale}-Studio-{suffix}` (sadece desteklenen dillerde) |

**Onemli:** Tum dillerde tum katmanlar mevcut degil. Ornegin:
- Studio sadece en-US, en-GB, fr-FR icin var
- Neural2 bazi dillerde yok (nl-NL, ru-RU, cmn-CN)
- Chirp3-HD cogu dilde mevcut (50+)

**Strateji:** Her dil icin mevcut en yuksek kalite katmanini belirle. Yoksa bir alt katmana fallback yap:
```
Platinum (Studio) → Gold (Chirp3-HD) → Silver (WaveNet/Neural2) → Basic (Standard)
```

### 8.4 Dil Bazli Varsayilan Ses Secimi

| Dil | Varsayilan Kadin | Varsayilan Erkek |
|-----|-----------------|-----------------|
| en-US | lr_us_chirp3hd_callirrhoe | lr_us_chirp3hd_algenib |
| fr-FR | lr_fr_chirp3hd_callirrhoe | lr_fr_chirp3hd_algenib |
| de-DE | lr_de_chirp3hd_aoede | lr_de_chirp3hd_sadaltager |
| es-ES | lr_es_chirp3hd_laomedeia | lr_es_chirp3hd_algieba |
| it-IT | lr_it_chirp3hd_kore | lr_it_chirp3hd_iapetus |
| ja-JP | lr_ja_chirp3hd_callirrhoe | lr_ja_chirp3hd_algenib |
| ko-KR | lr_ko_chirp3hd_aoede | lr_ko_chirp3hd_sadaltager |
| tr-TR | lr_tr_chirp3hd_callirrhoe | lr_tr_chirp3hd_algenib |
| ... | Ayni pattern | Ayni pattern |

> Chirp3-HD sesleri dil-bagimsiz isimlerle calistigindan, ayni speaker name farkli dillerde kullanilabilir. Ancak her speaker'in her dildeki ses kalitesi farkli olabilir — test gereklidir.

---

## 9. Vocabulary Servisi Degisiklikleri

### 9.1 wordEnrichmentService.js

**Mevcut Prompt:**
```
For the English word "${word}", provide:
- "definition_en": "English definition"
- "definition_tr": "Turkish definition"
- "example_sentence_tr": "Turkish translation"
```

**Yeni Prompt (Parametrik):**
```
For the ${targetLanguage} word "${word}", provide:
- "definition_target": "${targetLanguage} definition"
- "definition_native": "${nativeLanguage} definition"
- "example_sentence": "Example in ${targetLanguage}"
- "example_sentence_native": "${nativeLanguage} translation"
- "ipa": "IPA transcription (${targetLanguage})"
```

### 9.2 wordTranslationService.js

**Mevcut:**
- `translateWordToTurkish(word, context)` — adi bile Turkce'ye sabit
- Prompt: `translate_word_to_turkish.txt`
- System message: "Turkce-Ingilizce ceviri uzmani"

**Yeni:**
- `translateWord(word, context, fromLanguage, toLanguage)` — generic
- Prompt sablonu: `translate_word.txt` (parametrik)
- System message: `"${fromLanguage}-${toLanguage} ceviri uzmani"` (kullanicinin UI diline gore)

### 9.3 vocabularyController.js

**Mevcut:**
- `addWord()` ve `lookupWord()` dil parametresi almaz
- Tum kelimeler Ingilizce varsayilir

**Yeni:**
- `addWord(word, definition, context, level, sourceContext, targetLanguage)`
- `lookupWord(word, targetLanguage)` — ayni kelime farkli dillerde farkli anlam
- `getDueWords(limit, targetLanguage)` — SRS tekrari dil bazli

### 9.4 Kelime Ekleme Akisi (Mobil)

**Mevcut (VocabularyScreen.tsx satir 403):**
```typescript
const result = await addWordWithTranslation(word, context, level, originalSentence);
```

**Yeni:**
```typescript
const result = await addWordWithTranslation(
  word, context, level, originalSentence,
  targetLanguage,   // Hedef dil
  nativeLanguage    // Kullanicinin ana dili
);
```

### 9.5 WordPopupModal (Dinleme sirasinda kelime ekleme)

**Dosya:** `LingRootMobile/src/components/audio/WordPopupModal.tsx`

Dinleme ekraninda bir kelimeye tiklandiginda popup acilir ve kelime vocabulary'ye eklenir. Bu bilesenin de hedef dil ve kaynak dil bilgisini almasi gerekir.

---

## 10. Ses Model Isimlendirme Degisiklikleri

### 10.1 Mevcut Isimlendirme Paterni

**Dosya:** `LingRootMobile/src/utils/voiceDisplayNames.ts`

```
{Aksan} {Cinsiyet} {Katman} {Numara}
```

Ornekler:
- `Amerikan Kadin Gold 1` (tr)
- `American Female Gold 1` (en)
- `Ingiliz Erkek Silver 2` (tr)

### 10.2 Yeni Isimlendirme Paterni

```
{Milliyet/Dil} {Cinsiyet} {Katman} {Numara}
```

Ornekler (Turkce UI):
- `Fransiz Kadin Platinum 1` → `fr-FR-Studio-A`
- `Fransiz Erkek Gold 1` → `fr-FR-Chirp3-HD-Algenib`
- `Alman Kadin Silver 1` → `de-DE-WaveNet-F`
- `Ispanyol Erkek Basic 1` → `es-ES-Standard-B`
- `Japon Kadin Gold 1` → `ja-JP-Chirp3-HD-Callirrhoe`
- `Turk Erkek Gold 1` → `tr-TR-Chirp3-HD-Sadaltager`

Ornekler (Ingilizce UI):
- `French Female Platinum 1`
- `German Male Silver 1`
- `Japanese Female Gold 1`

### 10.3 Lingroot Voice ID Formati Degisikligi

**Mevcut:**
```
lr_{locale_short}_{voiceType}_{suffix}
```
Ornekler: `lr_us_chirp3hd_callirrhoe`, `lr_gb_studio_c`

**Yeni (genisletilmis):**
```
lr_{language}_{locale_variant}_{voiceType}_{suffix}
```
Veya daha basit:
```
lr_{locale}_{voiceType}_{suffix}
```
Ornekler:
- `lr_frfr_chirp3hd_callirrhoe`
- `lr_dede_wavenet_f`
- `lr_eses_standard_b`
- `lr_jajp_chirp3hd_kore`

> **Geriye uyumluluk:** Mevcut `lr_us_*`, `lr_gb_*` ID'leri oldugu gibi kalacak. Yeni diller icin yeni ID'ler eklenir. `voiceDisplayNames.ts` her iki formati da destekleyecek.

### 10.4 voiceDisplayNames.ts Yapisal Degisiklik

**Mevcut:** Her ses icin statik `Record<string, {en: string, tr: string}>` objesi.

**Yeni Yaklasim:** Dinamik isimlendirme fonksiyonu:

```typescript
function generateVoiceDisplayName(
  locale: string,     // 'fr-FR'
  gender: 'male' | 'female',
  tier: 'basic' | 'silver' | 'gold' | 'platinum',
  number: number,
  uiLanguage: string  // 'tr' | 'en'
): string {
  const langLabel = LANGUAGE_LABELS[locale]?.[uiLanguage] || locale;
  const genderLabel = GENDER_LABELS[gender][uiLanguage];
  return `${langLabel} ${genderLabel} ${tier.charAt(0).toUpperCase() + tier.slice(1)} ${number}`;
}
```

Bu yaklasim 50+ dil x 4 katman x 2 cinsiyet x N ses kombinasyonlarini statik olarak yazmak yerine dinamik uretir.

---

## 11. Migration Plani

### 11.1 SQL Migration Dosyalari

**Migration 1: user_settings icin varsayilan deger (JSONB icinde)**
```sql
-- Mevcut kullanicilara varsayilan dil degerleri ekle
UPDATE user_settings
SET settings = settings || '{"target_language": "en-US", "native_language": "tr"}'::jsonb
WHERE settings IS NOT NULL
  AND NOT (settings ? 'target_language');

-- settings NULL olan kayitlar icin
UPDATE user_settings
SET settings = '{"target_language": "en-US", "native_language": "tr"}'::jsonb
WHERE settings IS NULL;
```

**Migration 2: contenthistory tablosuna target_language kolonu**
```sql
ALTER TABLE contenthistory
ADD COLUMN target_language VARCHAR(10) DEFAULT 'en-US';

-- Mevcut kayitlari guncelle
UPDATE contenthistory SET target_language = 'en-US' WHERE target_language IS NULL;

-- Index ekle (filtreleme performansi icin)
CREATE INDEX idx_contenthistory_target_language ON contenthistory(target_language);
CREATE INDEX idx_contenthistory_user_lang ON contenthistory(user_id, target_language);
```

**Migration 3: user_vocabulary tablosuna target_language kolonu**
```sql
ALTER TABLE user_vocabulary
ADD COLUMN target_language VARCHAR(10) DEFAULT 'en';

UPDATE user_vocabulary SET target_language = 'en' WHERE target_language IS NULL;

CREATE INDEX idx_user_vocabulary_target_lang ON user_vocabulary(target_language);
CREATE INDEX idx_user_vocabulary_user_lang ON user_vocabulary(user_id, target_language);
```

**Migration 4: topics ve topic_contents tablolarina target_language kolonu**
```sql
ALTER TABLE topics
ADD COLUMN target_language VARCHAR(10) DEFAULT 'en-US';

ALTER TABLE topic_contents
ADD COLUMN target_language VARCHAR(10) DEFAULT 'en-US';

UPDATE topics SET target_language = 'en-US' WHERE target_language IS NULL;
UPDATE topic_contents SET target_language = 'en-US' WHERE target_language IS NULL;
```

### 11.2 Migration Sirasi

1. `user_settings` JSONB guncelleme (bagimsiz, once calistirilabilir)
2. `contenthistory` kolon ekleme + index
3. `user_vocabulary` kolon ekleme + index
4. `topics` + `topic_contents` kolon ekleme

### 11.3 Dokumantasyon Guncelleme

Her migration sonrasi guncellenmesi gereken dosyalar:
- `docs/database/schema-overview.md`
- `docs/database/complete-column-reference.md`

---

## 12. Riskler ve Dikkat Edilecekler

### 12.1 Yuksek Riskler

| Risk | Etki | Azaltma |
|------|------|---------|
| **TTS kalitesi diller arasi farklilik** | Bazi dillerde Chirp3-HD sesleri dusuk kaliteli olabilir | Lansman oncesi tum oncelikli dillerde ses ornekleri test et |
| **CEFR uyumlulugu** | CEFR seviyeleri dil-spesifik — Fransizca A1 ile Ingilizce A1 farkli | GPT promptlarinda dile ozel CEFR kriterlerini belirt |
| **MFA (Forced Alignment) dil destegi** | MFA'nin tum diller icin modeli olmayabilir | MFA model listesini kontrol et, desteklenmeyen dillerde alternatif hizalama kullan |
| **Prompt kalitesi** | Tum dillerde ayni prompt kalitesini garantilemek zor | Her dil icin ornek icerikler uret ve kalite kontrol yap |
| **Geriye uyumluluk** | Mevcut kullanicilarin icerikleri bozulabilir | Mevcut tum kayitlara `en-US` default ata, eski ID'leri koru |

### 12.2 Orta Riskler

| Risk | Etki | Azaltma |
|------|------|---------|
| **API maliyet artisi** | Coklu dil cevirisi daha fazla token tuketir | Token kullanimi monitore et, onbellekleme stratejisi uygula |
| **Ses model isimlendirme karisikligi** | 50+ dil x 28 ses = 1400+ kombinasyon | Dinamik isimlendirme fonksiyonu kullan, statik map tutma |
| **SSML uyumlulugu** | Bazi dillerde SSML etiketleri farkli calisir | `<break>` etiketlerini tum hedef dillerde test et |
| **RTL dil destegi** | Arapca, Ibranice gibi sagdan-sola dillerde UI sorunlari | RTL dilleri eklenmeden once UI RTL testleri yap |

### 12.3 Dusuk Riskler

| Risk | Etki | Azaltma |
|------|------|---------|
| **AsyncStorage boyutu** | Dil cache'i buyuyebilir | Sadece aktif dili cache'le |
| **Playlist karisikligi** | Farkli dillerdeki icerikler ayni listede | Library filtresini varsayilan olarak aktif hedef dile ayarla |

### 12.4 Dikkat Edilecek Konular

1. **Audio pipeline sirasi degismemeli** (CLAUDE.md Kural 3): `Whisper → Cleanup → CEFR adaptation → TTS → Audio merge → MFA → VTT/SRT` — sadece dil parametreleri eklenir
2. **API contract** (CLAUDE.md Kural 8): Yeni alanlar opsiyonel olarak eklenmeli, mevcut alanlar korunmali
3. **`any` yasak** (CLAUDE.md Kural 9): Tum yeni tipler `unknown` veya proper type kullanmali
4. **Tek API semasi** (CLAUDE.md Kural 6): Web ve Mobile ayni endpoint/request/response kullanmali
5. **Prompt cikti formati dondurulamaz** (CLAUDE.md Kural 2): Mevcut JSON cikti yapisini koru, yeni alanlar ekle

---

## 13. Test Stratejisi

### 13.1 Birim Testleri

| Test | Kapsam |
|------|--------|
| `translateAndAdapt` fonksiyonlari | Farkli dil ciftleri icin bilingual icerik uretimi |
| `lingrootVoices` dil haritasi | Her dil icin dogru ses ID eslesmesi |
| `wordEnrichmentService` | Farkli dillerde kelime zenginlestirme |
| `wordTranslationService` | Coklu dil cevirisi |
| `voiceModelService` filtreler | Dil bazli ses filtreleme |

### 13.2 Entegrasyon Testleri

| Test | Senaryo |
|------|---------|
| Icerik uretim pipeline | Fransizca hedef dil + Turkce kaynak dil ile tam pipeline |
| TTS seslendirme | fr-FR, de-DE, es-ES, ja-JP icin ses uretimi |
| Library filtreleme | Hedef dile gore icerik listeleme |
| Vocabulary ekleme | Fransizca kelime + Turkce anlam ekleme |
| Podcast uretimi | Fransizca podcast script + TTS |

### 13.3 Uc-Uca (E2E) Testler

1. **Yeni kullanici senaryosu:**
   - Kayit → Hedef dil: Fransizca, Ana dil: Turkce sec
   - Konu gir → Fransizca icerik uretilmeli
   - TTS → Fransizca ses olmali
   - Vocabulary → Fransizca kelime + Turkce anlam
   - Library → Sadece Fransizca icerikler gorunmeli

2. **Mevcut kullanici geri uyumluluk:**
   - Giris → target_language: en-US, native_language: tr (varsayilan)
   - Eski icerikler normal gorunmeli
   - Ses secimi degismemis olmali

3. **Dil degistirme senaryosu:**
   - Hedef dili Fransizca'dan Almanca'ya degistir
   - Yeni icerikler Almanca uretilmeli
   - Library'de her iki dilin icerikleri filtrelenebilmeli
   - Vocabulary'de dil bazli filtreleme calismali

### 13.4 Performans Testleri

- Ses uretim suresi: Farkli dillerde TTS latency karsilastirmasi
- API cagri sayisi: Dil degisikliginde ek API cagrisi olmamali (tek seferde yuklenmeli)
- Bellek kullanimi: 50+ dil ses haritasi bellek etkisi

---

## Ekler

### Ek A: Desteklenen Dil Listesi (Oncelik Sirali)

| Oncelik | Dil | Locale | Neden |
|---------|-----|--------|-------|
| P0 | Ingilizce | en-US, en-GB | Mevcut (korunacak) |
| P0 | Fransizca | fr-FR | Yuksek talep, tam TTS destegi |
| P0 | Almanca | de-DE | Yuksek talep, tam TTS destegi |
| P0 | Ispanyolca | es-ES | Yuksek talep, tam TTS destegi |
| P1 | Italyanca | it-IT | Iyi TTS destegi |
| P1 | Portekizce | pt-BR | Iyi TTS destegi |
| P1 | Japonca | ja-JP | Asya pazari |
| P1 | Korece | ko-KR | Asya pazari |
| P2 | Felemenkce | nl-NL | Sinirli TTS (Standard + Chirp3-HD) |
| P2 | Rusca | ru-RU | Standard + WaveNet + Chirp3-HD |
| P2 | Cince (Mandarin) | cmn-CN | Standard + WaveNet + Chirp3-HD |
| P2 | Arapca | ar-XA | Standard + Chirp3-HD |
| P2 | Hintce | hi-IN | Standard + WaveNet + Neural2 + Chirp3-HD |
| P2 | Turkce | tr-TR | Standard + WaveNet + Chirp3-HD |
| P3 | Isvecce | sv-SE | Standard + WaveNet + Chirp3-HD |
| P3 | Danca | da-DK | Sinirli TTS |
| P3 | Fince | fi-FI | Standard + WaveNet + Chirp3-HD |
| P3 | Lehce | pl-PL | Standard + WaveNet + Chirp3-HD |
| P3 | Ukraynaca | uk-UA | Sinirli TTS |

### Ek B: Kritik Dosya Yollari

```
# Backend - Icerik Uretim
backend/utils/ai/translateAndAdapt.js
backend/controllers/topicPipelineController.js
backend/prompts/content/bilingual.hbs
backend/prompts/templates/content/bilingual.hbs

# Backend - TTS & Ses
backend/utils/audio/lingrootVoices.js
backend/utils/audio/googleTTS.js
backend/utils/audio/googleTTSMultiSpeaker.js
backend/services/voiceModelService.js

# Backend - Vocabulary
backend/services/wordEnrichmentService.js
backend/utils/content/wordTranslationService.js
backend/controllers/vocabularyController.js
backend/prompts/translate_word_to_turkish.txt

# Backend - API
backend/routes/userRoutes.js
backend/routes/ttsRoutes.js
backend/routes/topicPipelineRoutes.js

# Mobil
LingRootMobile/src/contexts/LanguageContext.tsx
LingRootMobile/src/screens/LibraryScreen.tsx
LingRootMobile/src/screens/VocabularyScreen.tsx
LingRootMobile/src/screens/TopicTreeScreen.tsx
LingRootMobile/src/screens/ProfileScreen.tsx
LingRootMobile/src/components/VoiceSelector.tsx
LingRootMobile/src/utils/voiceDisplayNames.ts
LingRootMobile/src/services/api.ts

# Web Frontend
frontend/src/components/InputSection.tsx
frontend/src/components/LanguageSelector.tsx
packages/api-client/src/endpoints/tts.ts

# Veritabani Dokumantasyonu
docs/database/schema-overview.md
docs/database/complete-column-reference.md
```

### Ek C: Kaynak Referanslar

- [Google Cloud TTS Desteklenen Diller](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types)
- [Chirp 3: HD Sesler](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd)
- [Google Cloud TTS Release Notes](https://docs.cloud.google.com/text-to-speech/docs/release-notes)
