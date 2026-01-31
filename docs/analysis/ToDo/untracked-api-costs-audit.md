# İzlenmeyen API Maliyetleri Denetim Raporu

> **Oluşturulma:** 2026-01-31 | **Güncelleme:** 2026-01-31 | **Sürüm:** 3.0

## Özet

Backend taraması sonucunda `logApiCost()` ile takip edilmeyen **16 ücretli API çağrı noktası** tespit edildi. Bu çağrılar Admin → Maliyet Takibi panelinde görünmüyor. Şu an **17 özellik** takip ediliyor.

### Elenen Kalemler

Aşağıdaki kalemler mükerrer sayım riski veya ölü kod nedeniyle listeden çıkarıldı:

| Çıkarılan | Neden |
|-----------|-------|
| `translateAndAdaptToCEFR()` | `ttsController` zaten `standard_tts_openai` / `content_preview` olarak logluyor. İçine eklenirse aynı OpenAI çağrısı 2 kez sayılır. |
| `generateBilingualContent()` | `topicPipelineController` zaten `topic_pipeline_bilingual` olarak logluyor. İçine eklenirse mükerrer olur. |
| `chatService.getAIResponse()` | Kod tabanında hiçbir yerden çağrılmıyor (ölü kod). |
| `pipeline.js → processTextPipeline()` | Hiçbir dosyadan import edilmiyor (ölü kod). |
| `lib/rag.js → storeTopic() / findSimilarTopics()` | `embedding.js` üzerinden çağrı yapıyor; `embedding.js`'e eklenmesi yeterli. |

---

## Mevcut Takip Edilen Özellikler (17)

| Özellik | Sağlayıcı | Dosya |
|---------|-----------|-------|
| `mood_analysis` | openai | `services/directorAgentService.js` |
| `podcast_script` | openai | `utils/audio/googleTTSMultiSpeaker.js` |
| `podcast_tts` | google_tts | `utils/audio/googleTTSMultiSpeaker.js` |
| `narration_rewrite` | openai | `controllers/narrationController.js` |
| `vocabulary_word_add` | openai | `utils/content/wordTranslationService.js` |
| `topic_detail_suggestions` | openai | `controllers/topicDetailController.js` |
| `topic_subtopics` | openai | `controllers/topicHierarchyController.js` |
| `topic_pipeline_suggestions` | openai | `controllers/topicPipelineController.js` |
| `topic_pipeline_bilingual` | openai | `controllers/topicPipelineController.js` |
| `topic_pipeline_daily_patterns` | openai | `controllers/topicPipelineController.js` |
| `topic_suggest` | openai | `controllers/topicSuggestController.js` |
| `liro_chat_streaming` | openai | `controllers/aiChatController.js` |
| `liro_chat` | openai | `controllers/aiChatController.js` |
| `content_preview` | openai | `controllers/ttsController.js` |
| `standard_tts_openai` | openai | `controllers/ttsController.js` |
| `standard_tts` | google_tts | `controllers/ttsController.js` |
| `hobby_suggestions_generation` | openai | `controllers/hobbySuggestionsController.js` |

---

## İzlenmeyen Maliyet Noktaları (16)

### A. OpenAI Sohbet Tamamlamaları — 9 çağrı

| # | Dosya | Fonksiyon | Model | Önerilen Özellik Adı | Maliyet Etkisi |
|---|-------|-----------|-------|----------------------|----------------|
| 1 | `utils/ai/inputExtractor.js` | `translateToEnglishWithOpenAI()` | gpt-4o | `input_extract_translate` | YÜKSEK — gpt-4o fiyatlandırması |
| 2 | `utils/ai/inputExtractor.js` | `cleanTranscriptWithPrompt()` | gpt-4o-mini | `input_extract_clean` | ORTA |
| 3 | `utils/ai/inputExtractor.js` | `translateToEnglishWithPrompt()` | gpt-4o-mini | `input_extract_translate_prompt` | ORTA |
| 4 | `utils/ai/inputExtractor.js` | `rewriteTranscriptClean()` | gpt-4o-mini | `input_extract_rewrite` | ORTA |
| 5 | `utils/ai/translateFromEnglish.js` | `translateFromEnglish()` | gpt-4o | `translate_from_english` | YÜKSEK — gpt-4o fiyatlandırması |
| 6 | `utils/ai/cefrAdapter.js` | `adaptToCEFR()` | gpt-4-turbo | `cefr_adapt` | YÜKSEK — bağımsız endpoint, gpt-4-turbo |
| 7 | `controllers/llmPatternController.js` | `generateBatch()` | gpt-4o-mini | `pattern_generation` | ORTA |
| 8 | `services/onboardingService.js` | `assessLevel()` | gpt-4o-mini | `onboarding_assessment` | DÜŞÜK — kullanıcı başına 1 kez |
| 9 | `services/sectorRoleplayService.js:216` | `_generateDialogueWithAI()` | gpt-4o-mini | `sector_roleplay_dialogue` | ORTA |

### B. OpenAI Gömme (Embedding) — 2 çağrı

| # | Dosya | Fonksiyon | Model | Önerilen Özellik Adı | Maliyet Etkisi |
|---|-------|-----------|-------|----------------------|----------------|
| 10 | `lib/embedding.js` | `embedText()` / `embedTexts()` | text-embedding-ada-002 | `rag_embedding` | DÜŞÜK |
| 11 | `services/userEmbeddingService.js` | `createEmbedding()` | text-embedding-3-small | `user_embedding` | DÜŞÜK |

### C. OpenAI TTS — Sektör Servisleri — 3 çağrı

| # | Dosya | Fonksiyon | Model | Önerilen Özellik Adı | Maliyet Etkisi |
|---|-------|-----------|-------|----------------------|----------------|
| 12 | `services/sectorContentTTSService.js` | TTS sentezi | tts-1 / tts-1-hd | `sector_content_tts` | ORTA |
| 13 | `services/sectorRoleplayService.js:324` | Rol yapma sesi | tts-1 | `sector_roleplay_tts` | ORTA |
| 14 | `services/sectorRoleplayService.js:566` | Podcast sesi | tts-1 | `sector_podcast_tts` | ORTA |

### D. Claude (Anthropic) API — 1 çağrı

| # | Dosya | Fonksiyon | Model | Önerilen Özellik Adı | Maliyet Etkisi |
|---|-------|-----------|-------|----------------------|----------------|
| 15 | `utils/ai/claudeClient.js` → `services/chatService.js` | `generateResponse()` | claude-3-5-sonnet | `liro_chat_claude` | YÜKSEK — Claude fiyatlandırması ($3/$15 / 1M token) |

Not: `chatService.js` içinde OpenAI fallback olarak kullanılıyor. `aiChatController` OpenAI maliyetini logluyor ama Claude'a düşüldüğünde bu maliyet loglanmıyor.

### E. Google Özel Arama — 1 çağrı

| # | Dosya | Fonksiyon | Sağlayıcı | Önerilen Özellik Adı | Maliyet Etkisi |
|---|-------|-----------|-----------|----------------------|----------------|
| 16 | `utils/content/webSearchService.js` | `searchWeb()` | google_custom_search | `web_search` | DÜŞÜK-ORTA (~$5/1K sorgu) |

Not: `aiChatController` Liro sohbeti sırasında web araması tetikleyebilir. OpenAI maliyeti loglanıyor ama arama maliyeti loglanmıyor.

---

## Tahmini Aylık Kör Nokta

| Kategori | Çağrı Sayısı | Tahmini Aylık İzlenmeyen Maliyet |
|----------|-------------|----------------------------------|
| OpenAI Sohbet Tamamlamaları | 9 | $50–$200+ (gpt-4o/turbo pahalı) |
| OpenAI TTS (Sektör) | 3 | $10–$50 |
| Claude (Anthropic) | 1 | $20–$100 (fallback sıklığına bağlı) |
| OpenAI Gömme | 2 | $1–$5 |
| Google Özel Arama | 1 | $1–$10 |
| **TOPLAM** | **16** | **~$80–$365+/ay izlenmiyor** |

---

## Önerilen Uygulama Sırası

### Faz 1 — Yüksek maliyet etkisi
1. `inputExtractor.js` (4 çağrı) — içerik hattının parçası
2. `cefrAdapter.js` (1 çağrı) — gpt-4-turbo, bağımsız endpoint
3. `translateFromEnglish.js` (1 çağrı) — gpt-4o fiyatlandırması
4. `claudeClient.js` (1 çağrı) — Claude fiyatlandırması yüksek

### Faz 2 — Orta maliyet etkisi
5. `sectorRoleplayService.js` (2 çağrı — diyalog + TTS)
6. `sectorContentTTSService.js` (1 çağrı)
7. `llmPatternController.js` (1 çağrı)
8. `sectorRoleplayService.js:566` (1 çağrı — podcast TTS)

### Faz 3 — Düşük maliyet etkisi
9. `embedding.js` (2 çağrı)
10. `userEmbeddingService.js` (1 çağrı)
11. `onboardingService.js` (1 çağrı)
12. `webSearchService.js` (1 çağrı)

### Ön Koşullar
- `costTracker.js`'e `calculateClaudeCost()`, `calculateEmbeddingCost()` ve `calculateGoogleSearchCost()` fonksiyonları eklenmeli
- Claude ve Embedding fiyat sabitleri tanımlanmalı
