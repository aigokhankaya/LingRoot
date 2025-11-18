# GknWeb Branch Analiz Raporu

**Rapor Tarihi:** 17 Kasım 2025  
**Karşılaştırma:** `main` branch vs `GknWeb` branch

---

## 📋 Hızlı Özet

```
┌─────────────────────────────────────────────────────────────┐
│  GknWeb Branch: Büyük Temizleme ve Sadeleştirme Operasyonu │
├─────────────────────────────────────────────────────────────┤
│  📊 Toplam Değişiklik: 427 dosya                            │
│  ➕ Eklenen: ~4,491 satır                                   │
│  ➖ Silinen: ~45,378 satır                                  │
│  📉 Net: -40,887 satır (%90 azalma)                         │
└─────────────────────────────────────────────────────────────┘

🎯 Ana Hedef: Minimal, odaklanmış, production-ready versiyon

✅ Kalan Özellikler:
   • Temel TTS (Amazon Polly)
   • İçerik yönetimi
   • Kullanıcı yönetimi
   • IAP sistemi
   • Basit audio player

❌ Kaldırılan Özellikler:
   • AI Chat (OpenAI, Claude)
   • Topic Pipeline
   • MFA Sync
   • Azure & Google TTS
   • YouTube entegrasyonu
   • Skia rendering
   • Docker desteği
   • Tüm dokümantasyon
```

---

## 📊 Genel İstatistikler

- **Toplam Değişen Dosya:** 427 dosya
- **Eklenen Satır:** ~4,491 satır
- **Silinen Satır:** ~45,378 satır
- **Net Değişim:** -40,887 satır (büyük bir temizleme/sadeleştirme yapılmış)

### Proje Bazında Detaylı İstatistikler

#### Backend
- **Değişen Dosya:** 104 dosya
- **Eklenen Satır:** 319 satır
- **Silinen Satır:** 9,943 satır
- **Net Değişim:** -9,624 satır ⬇️

#### Frontend
- **Değişen Dosya:** 44 dosya
- **Eklenen Satır:** 334 satır
- **Silinen Satır:** 10,310 satır
- **Net Değişim:** -9,976 satır ⬇️

#### LingRootMobile
- **Değişen Dosya:** 215 dosya
- **Eklenen Satır:** 3,832 satır
- **Silinen Satır:** 7,424 satır
- **Net Değişim:** -3,592 satır ⬇️

**Analiz:** Her üç projede de büyük oranda kod silme işlemi yapılmış. Frontend en fazla etkilenen proje (-9,976 satır).

---

## 🗑️ Silinen Özellikler ve Modüller

### Backend Tarafında Silinen Özellikler

#### 1. **AI Chat Sistemi (Tamamen Kaldırıldı)**
- `backend/controllers/aiChatController.js` ❌
- `backend/routes/aiChat.js` ❌
- `backend/migrations/create_chat_tables.sql` ❌
- `backend/utils/claudeClient.js` ❌
- `backend/utils/openaiClient.js` ❌
- `backend/utils/liroPromptGenerator.js` ❌
- İlgili prompt dosyaları:
  - `conversation_title_generator.txt` ❌
  - `liro_system_default.txt` ❌
  - `liro_system_personalized.txt` ❌

#### 2. **Topic Pipeline Sistemi (Kaldırıldı)**
- `backend/controllers/topicPipelineController.js` ❌
- `backend/routes/topicPipelineRoutes.js` ❌
- `backend/migrations/create_topics_table.sql` ❌
- İlgili prompt dosyaları:
  - `topic_extractor.txt` ❌
  - `topic_extractor_new.txt` ❌
  - `user_interest_analyzer.txt` ❌
  - `user_interest_analyzer_updated.txt` ❌

#### 3. **Hobby Suggestions Sistemi (Kaldırıldı)**
- `backend/controllers/hobbySuggestionsController.js` ❌
- `backend/routes/hobbySuggestionsRoutes.js` ❌
- `backend/migrations/create_hobby_suggestions.sql` ❌
- `backend/prompts/hobby_200_suggestions.txt` ❌

#### 4. **YouTube Entegrasyonu (Kaldırıldı)**
- `backend/routes/youtubeRoutes.js` ❌

#### 5. **Azure TTS Desteği (Kaldırıldı)**
- `backend/utils/azureTTS.js` ❌

#### 6. **MFA (Montreal Forced Aligner) Sistemi (Kaldırıldı)**
- `backend/utils/mfaAligner.js` ❌
- `backend/utils/audioAnalyzer.js` ❌

#### 7. **Semantic & Lexical Sistemler (Kaldırıldı)**
- `backend/utils/semanticAudit.js` ❌
- `backend/utils/lexicalSimplifier.js` ❌
- `backend/utils/userProfileAnalyzer.js` ❌
- `backend/lib/embedding.js` ❌
- `backend/lib/rag.js` ❌

#### 8. **Apple Notifications (Kaldırıldı)**
- `backend/controllers/appleNotificationsController.js` ❌
- `backend/routes/appleNotificationsRoutes.js` ❌

#### 9. **Debug & Config Routes (Kaldırıldı)**
- `backend/routes/debugRoutes.js` ❌
- `backend/routes/configRoutes.js` ❌

#### 10. **Docker Desteği (Kaldırıldı)**
- `backend/Dockerfile` ❌
- `backend/docker-compose.yml` ❌
- `backend/.dockerignore` ❌

#### 11. **Tüm SQL Scripts (Kaldırıldı)**
- `backend/scripts/` klasöründeki tüm SQL ve JS dosyaları ❌
  - Google Play IAP script'leri
  - Subscription fix script'leri
  - Environment setup script'leri
  - Migration script'leri
  - Test script'leri

---

### Frontend Tarafında Silinen Özellikler

#### 1. **Chat Sistemi (Tamamen Kaldırıldı)**
- `frontend/pages/chat/[id].tsx` ❌
- `frontend/pages/chat/assistant.tsx` ❌
- `frontend/src/components/chat/` klasörünün tamamı:
  - `ActionConfirmModal.tsx` ❌
  - `ChatCTAButtons.tsx` ❌
  - `ChatInput.tsx` ❌
  - `ChatMessage.tsx` ❌
  - `SmartPromptSuggester.tsx` ❌
  - `TypingIndicator.tsx` ❌
- `frontend/src/components/sidebar/` klasörünün tamamı:
  - `ConversationList.tsx` ❌
  - `Sidebar.tsx` ❌
- `frontend/src/components/layout/MainNav.tsx` ❌

#### 2. **Settings & Admin Sayfaları (Kaldırıldı)**
- `frontend/pages/settings.tsx` ❌
- `frontend/src/components/admin/EnvironmentSelector.tsx` ❌
- `frontend/src/components/admin/PaymentEnvironmentSelector.tsx` ❌
- `frontend/src/components/admin/TtsProviderSettings.tsx` ❌

#### 3. **Eski Welcome Sayfaları (Kaldırıldı)**
- `frontend/pages/welcome2.tsx` ❌
- `frontend/pages/welcome3.tsx` ❌
- `frontend/pages/index-backup-2025-11-01.tsx` ❌

#### 4. **Topic Pipeline Component (Kaldırıldı)**
- `frontend/src/components/TopicPipelineComponent.tsx` ❌

#### 5. **UI Components (Kaldırıldı)**
- `frontend/src/components/ui/dropdown-menu.tsx` ❌
- `frontend/src/components/AudioPlayer_bck.tsx` ❌ (backup dosyası)

---

### Mobile (LingRootMobile) Tarafında Silinen Özellikler

#### 1. **Skia Rendering Sistemi (Kaldırıldı)**
- `LingRootMobile/src/components/SkiaSentenceHighlight.tsx` ❌
- `LingRootMobile/src/components/SkiaWordHighlight.tsx` ❌

#### 2. **TTS Provider Settings (Kaldırıldı)**
- `LingRootMobile/src/screens/TtsProviderSettingsScreen.tsx` ❌

#### 3. **Environment Config (Kaldırıldı)**
- `LingRootMobile/src/services/environmentConfig.ts` ❌

#### 4. **React Native Config (Kaldırıldı)**
- `LingRootMobile/react-native.config.js` ❌

---

### Dokümantasyon Silmeleri

Tüm dokümantasyon dosyaları kaldırılmış:

- `MFA_CLOUDFLARE_TUNNEL_SETUP.md` ❌
- `MFA_KURULUM_TR.md` ❌
- `MFA_LOGGING_GUIDE.md` ❌
- `MIGRATION_SUMMARY.md` ❌
- `PIPELINE_IMPLEMENTATION_SUMMARY.md` ❌
- `PROMPT_REFACTOR.md` ❌
- `PROMPT_UPDATE_SUMMARY.md` ❌
- `RENDER_GOOGLE_PLAY_SETUP.md` ❌
- `RENDER_SETUP_COMPARISON.md` ❌
- `SETUP_MFA.md` ❌
- `SIDEBAR_CHATGPT_STYLE.md` ❌
- `SMART_CHAT_SETUP.md` ❌
- `SMART_CHAT_TAMAMLANDI.md` ❌
- `SYNC_FEEDBACK_SYSTEM.md` ❌
- `TOPIC_PIPELINE_COMPLETE.md` ❌
- `TOPIC_TO_ENGLISH_PIPELINE.md` ❌
- `TTS_DEFAULT_VOICE_SELECTION.md` ❌
- `TTS_PUNCTUATION_PAUSE_FIX.md` ❌
- `analiz/MFA-Analiz.md` ❌
- `backend/CEFR_MODEL_UPDATE.md` ❌
- `backend/Dockerfile` ❌
- `backend/GOOGLE_PLAY_IAP_README.md` ❌
- `backend/README_MFA.md` ❌
- `backend/prompts/README.md` ❌
- `docs/` klasöründeki tüm dosyalar:
  - `AUDIOPLAYER_SYNC_ANALYSIS.md` ❌
  - `GOOGLE_CLOUD_RUN_REMOVAL_GUIDE.md` ❌
  - `GOOGLE_PLAY_IAP_SETUP.md` ❌
  - `GOOGLE_TIMEPOINT_IMPLEMENTATION.md` ❌
  - `HYBRID_APPROACH_IMPLEMENTATION.md` ❌
  - `KULLANICI_KILAVUZU.md` ❌
  - `SYNC_ISSUE_TROUBLESHOOTING.md` ❌
  - `To-Do List.md` ❌
  - `YOUTUBE_SUBTITLE_SYSTEM_ANALYSIS.md` ❌
  - `azure.md` ❌

---

### Cloudflare Tunnel Scripts (Kaldırıldı)

- `setup-cloudflare-tunnel.ps1` ❌
- `test-cloudflare-tunnel.ps1` ❌
- `test-suggestions.js` ❌

---

## ✅ Değiştirilen/Güncellenen Dosyalar

### Backend Güncellemeleri

#### Controllers
- ✏️ `backend/controllers/accountController.js` - Değiştirildi
- ✏️ `backend/controllers/adminController.js` - Değiştirildi
- ✏️ `backend/controllers/appleIAPController.js` - Değiştirildi
- ✏️ `backend/controllers/authController.js` - Değiştirildi
- ✏️ `backend/controllers/contentController.js` - Değiştirildi
- ✏️ `backend/controllers/iapController.js` - Değiştirildi
- ✏️ `backend/controllers/narrationController.js` - Değiştirildi
- ✏️ `backend/controllers/planController.js` - Değiştirildi
- ✏️ `backend/controllers/podcastController.js` - Değiştirildi
- ✏️ `backend/controllers/topicDetailController.js` - Değiştirildi
- ✏️ `backend/controllers/ttsController.js` - Değiştirildi

#### Routes
- ✏️ `backend/routes/adminRoutes.js` - Değiştirildi
- ✏️ `backend/routes/contentRoutes.js` - Değiştirildi
- ✏️ `backend/routes/iapRoutes.js` - Değiştirildi
- ✏️ `backend/routes/ttsRoutes.js` - Değiştirildi

#### Utils
- ✏️ `backend/utils/amazonPolly.js` - Değiştirildi
- ✏️ `backend/utils/audioMerger.js` - Değiştirildi
- ✏️ `backend/utils/cefrAdapter.js` - Değiştirildi
- ✏️ `backend/utils/costTracker.js` - Değiştirildi
- ✏️ `backend/utils/googleTTS.js` - Değiştirildi
- ✏️ `backend/utils/inputExtractor.js` - Değiştirildi
- ✏️ `backend/utils/usageLimiter.js` - Değiştirildi

#### Prompts (CEFR Güncellemeleri)
- ✏️ `backend/prompts/cefr_A1.txt` - Değiştirildi
- ✏️ `backend/prompts/cefr_A2.txt` - Değiştirildi
- ✏️ `backend/prompts/cefr_B1.txt` - Değiştirildi
- ✏️ `backend/prompts/cefr_B2.txt` - Değiştirildi
- ✏️ `backend/prompts/cefr_C1.txt` - Değiştirildi
- ✏️ `backend/prompts/cefr_C2.txt` - Değiştirildi
- ✏️ `backend/prompts/rewrite_to_narrations.txt` - Değiştirildi
- ✏️ `backend/prompts/topic_detail_suggestions.txt` - Değiştirildi (binary dosya)
- ✏️ `backend/prompts/translate_to_english.txt` - Değiştirildi

#### Diğer Backend Dosyaları
- ✏️ `backend/server.js` - Değiştirildi
- ✏️ `backend/middleware/security.js` - Değiştirildi
- ✏️ `backend/package.json` - Bağımlılıklar güncellendi
- ✏️ `backend/package-lock.json` - Bağımlılıklar güncellendi
- ✏️ `backend/.gitignore` - Değiştirildi

---

### Frontend Güncellemeleri

#### Pages
- ✏️ `frontend/pages/index.tsx` - Değiştirildi
- ✏️ `frontend/pages/welcome.tsx` - Değiştirildi
- ✏️ `frontend/pages/profile.tsx` - Değiştirildi
- ✏️ `frontend/pages/dashboard.tsx` - Değiştirildi

#### App Router Pages
- ✏️ `frontend/src/app/admin/dashboard/page.tsx` - Değiştirildi
- ✏️ `frontend/src/app/admin/users/[id]/audio/page.tsx` - Değiştirildi
- ✏️ `frontend/src/app/admin/users/[id]/layout.tsx` - Değiştirildi
- ✏️ `frontend/src/app/register/page.tsx` - Değiştirildi

#### Components
- ✏️ `frontend/src/components/AudioPlayer.tsx` - Değiştirildi
- ✏️ `frontend/src/components/InputForm.tsx` - Değiştirildi
- ✏️ `frontend/src/components/InputSection.tsx` - Değiştirildi
- ✏️ `frontend/src/components/NewSyncedTextPlayer.tsx` - Değiştirildi
- ✏️ `frontend/src/components/OutputSection.tsx` - Değiştirildi
- ✏️ `frontend/src/components/admin/TtsProviderSelector.tsx` - Değiştirildi

#### Hooks & Utils
- ✏️ `frontend/src/hooks/useWordSync.ts` - Değiştirildi
- ✏️ `frontend/src/lib/admin.ts` - Değiştirildi
- ✏️ `frontend/src/lib/api.ts` - Değiştirildi
- ✏️ `frontend/src/lib/auth.tsx` - Değiştirildi

#### Config & Styles
- ✏️ `frontend/src/app/globals.css` - Değiştirildi
- ✏️ `frontend/tailwind.config.js` - Değiştirildi
- ✏️ `frontend/package.json` - Bağımlılıklar güncellendi
- ✏️ `frontend/package-lock.json` - Bağımlılıklar güncellendi
- ✏️ `frontend/.env.local` - Değiştirildi

---

### Mobile (LingRootMobile) Güncellemeleri

#### Screens
- ✏️ `LingRootMobile/src/screens/ChatScreen.tsx` - Değiştirildi
- ✏️ `LingRootMobile/src/screens/CreateScreen.tsx` - Değiştirildi
- ✏️ `LingRootMobile/src/screens/LibraryScreen.tsx` - Değiştirildi
- ✏️ `LingRootMobile/src/screens/LoginScreen.tsx` - Değiştirildi
- ✏️ `LingRootMobile/src/screens/PackagesScreen.tsx` - Değiştirildi
- ✏️ `LingRootMobile/src/screens/ProfileScreen.tsx` - Değiştirildi

#### Components
- ✏️ `LingRootMobile/src/components/AudioPlayer.tsx` - Değiştirildi

#### Services
- ✏️ `LingRootMobile/src/services/api.ts` - Değiştirildi
- ✏️ `LingRootMobile/src/services/audioService.ts` - Değiştirildi
- ✏️ `LingRootMobile/src/services/iap.ts` - Değiştirildi
- ✏️ `LingRootMobile/src/services/notificationService.android.ts` - Değiştirildi
- ✏️ `LingRootMobile/src/services/notificationService.ios.ts` - Değiştirildi
- ✏️ `LingRootMobile/src/services/socialAuth.ts` - Değiştirildi
- ✏️ `LingRootMobile/src/services/supabase.ts` - Değiştirildi

#### Contexts & Navigation
- ✏️ `LingRootMobile/src/contexts/AuthContext.tsx` - Değiştirildi
- ✏️ `LingRootMobile/src/contexts/LanguageContext.tsx` - Değiştirildi
- ✏️ `LingRootMobile/src/navigation/AppNavigator.tsx` - Değiştirildi

#### Types & Config
- ✏️ `LingRootMobile/src/types/env.d.ts` - Değiştirildi
- ✏️ `LingRootMobile/src/types/index.ts` - Değiştirildi
- ✏️ `LingRootMobile/tsconfig.json` - Değiştirildi
- ✏️ `LingRootMobile/package.json` - Bağımlılıklar güncellendi
- ✏️ `LingRootMobile/package-lock.json` - Bağımlılıklar güncellendi

#### iOS Specific
- ✏️ `LingRootMobile/ios/LingRootMobile/Info.plist` - Değiştirildi
- ✏️ `LingRootMobile/ios/Podfile.lock` - Değiştirildi
- ➕ `LingRootMobile/ios/LingRootMobile/Images.xcassets/AppIcon.appiconset/icon.png` - Eklendi

#### Android Specific
- ✏️ `LingRootMobile/android/app/build.gradle` - Değiştirildi
- ✏️ `LingRootMobile/android/app/src/main/AndroidManifest.xml` - Değiştirildi
- ✏️ `LingRootMobile/android/build.gradle` - Değiştirildi
- ✏️ `LingRootMobile/android/gradle.properties` - Değiştirildi

---

## 🆕 Yeni Eklenen Dosyalar

### LingRootMobile
- ➕ `LingRootMobile/ios/LingRootMobile/Images.xcassets/AppIcon.appiconset/icon.png`

---

## 📦 Bağımlılık Değişiklikleri

### Backend Package.json - Kaldırılan Bağımlılıklar

- ❌ `googleapis` - Google API entegrasyonu kaldırıldı
- ❌ `microsoft-cognitiveservices-speech-sdk` - Azure TTS SDK kaldırıldı

**Analiz:** Backend'den Google ve Azure TTS servisleri tamamen kaldırılmış. Muhtemelen sadece Amazon Polly kullanılıyor.

### Frontend Package.json - Kaldırılan Bağımlılıklar

- ❌ `@ai-sdk/openai` - OpenAI SDK kaldırıldı
- ❌ `@assistant-ui/react` - AI Assistant UI kaldırıldı
- ❌ `@radix-ui/react-dropdown-menu` - Dropdown menu bileşeni kaldırıldı
- ❌ `ai` - Vercel AI SDK kaldırıldı
- ❌ `zod` - Schema validation kaldırıldı

**Analiz:** Frontend'den tüm AI chat özellikleri ve ilgili UI bileşenleri kaldırılmış.

---

## 📝 Diğer Değişiklikler

- ✏️ `README.md` - Ana README güncellendi
- ✏️ `terminal codes` - Terminal komutları güncellendi

---

## 🎯 Özet ve Değerlendirme

### Ana Temalar

1. **Büyük Temizleme Operasyonu**
   - 40,000+ satır kod silindi
   - Kullanılmayan özellikler kaldırıldı
   - Proje sadeleştirildi ve odaklandı

2. **Kaldırılan Ana Sistemler**
   - AI Chat sistemi (Claude, OpenAI entegrasyonları)
   - Topic Pipeline ve kullanıcı ilgi analizi
   - MFA (Montreal Forced Aligner) ses senkronizasyonu
   - Skia rendering sistemi (mobile)
   - Azure TTS desteği
   - YouTube entegrasyonu
   - Hobby suggestions sistemi
   - Semantic ve lexical analiz araçları

3. **Kaldırılan Altyapı**
   - Docker desteği
   - Cloudflare Tunnel setup
   - Tüm SQL migration ve fix script'leri
   - Debug ve config route'ları
   - Environment selector'lar

4. **Kaldırılan UI Bileşenleri**
   - Tüm chat UI bileşenleri
   - Sidebar ve navigation bileşenleri
   - Settings sayfaları
   - Admin environment selector'ları

5. **Dokümantasyon Temizliği**
   - Tüm setup, migration ve feature dokümantasyonu kaldırıldı
   - Sadece kod kaldı, dokümantasyon yok

### Sonuç

GknWeb branch'i, projenin **minimal ve odaklanmış bir versiyonu** olarak görünüyor. Tüm gelişmiş özellikler, AI entegrasyonları ve karmaşık sistemler kaldırılmış. Proje muhtemelen:

- ✅ Daha basit bir TTS (Text-to-Speech) sistemi (sadece Amazon Polly)
- ✅ Temel içerik yönetimi
- ✅ Basit kullanıcı yönetimi
- ✅ IAP (In-App Purchase) sistemi
- ✅ Temel audio player

özelliklerine odaklanmış durumda.

Bu branch, **production-ready minimal bir versiyon** veya **yeni bir başlangıç noktası** olarak kullanılmak üzere hazırlanmış olabilir.

---

## 🔍 Kritik Bulgular

### 1. AI Özelliklerinin Tamamen Kaldırılması
- OpenAI, Claude, ve tüm AI chat özellikleri kaldırılmış
- Smart prompt suggester, conversation title generator gibi AI destekli özellikler yok
- Topic extraction ve user interest analysis sistemleri kaldırılmış

### 2. TTS Sağlayıcı Azaltması
- Azure TTS tamamen kaldırılmış
- Google TTS kodu hala var ama googleapis dependency kaldırılmış
- Muhtemelen sadece Amazon Polly kullanılıyor

### 3. MFA (Montreal Forced Aligner) Kaldırılması
- Gelişmiş ses-metin senkronizasyonu sistemi kaldırılmış
- Skia rendering sistemi (mobile) kaldırılmış
- Daha basit bir senkronizasyon yöntemi kullanılıyor olabilir

### 4. Altyapı Basitleştirmesi
- Docker desteği kaldırılmış
- Cloudflare Tunnel setup kaldırılmış
- Environment selector'lar kaldırılmış
- Debug route'ları kaldırılmış

### 5. Dokümantasyon Eksikliği
- Tüm setup, migration ve feature dokümantasyonu kaldırılmış
- Bu, yeni geliştiriciler için zorluk yaratabilir
- Kod yorumları ve inline dokümantasyon önem kazanıyor

### 6. UI Sadeleşmesi
- Chat interface tamamen kaldırılmış
- Sidebar ve navigation bileşenleri kaldırılmış
- Settings sayfaları basitleştirilmiş veya kaldırılmış

---

## ⚠️ Potansiyel Riskler ve Öneriler

### Riskler
1. **Dokümantasyon Eksikliği:** Tüm setup ve migration dokümanları kaldırılmış
2. **Geriye Dönük Uyumluluk:** Eski özellikler kullanan kullanıcılar için migration planı gerekli
3. **Test Coverage:** Bu kadar büyük bir değişiklik sonrası kapsamlı test gerekli
4. **Bağımlılık Yönetimi:** Kaldırılan paketlerin başka yerlerde kullanılmadığından emin olunmalı

### Öneriler
1. **Dokümantasyon Oluşturulması:** Yeni minimal yapı için dokümantasyon yazılmalı
2. **Migration Guide:** Main'den GknWeb'e geçiş için rehber hazırlanmalı
3. **Feature Comparison:** Hangi özelliklerin kaldırıldığı kullanıcılara açıklanmalı
4. **Testing:** Kapsamlı regression testing yapılmalı
5. **Backup:** Main branch'in yedeklenmesi ve korunması önemli

---

## 📊 Özet Tablo

| Kategori | Main Branch | GknWeb Branch | Değişim |
|----------|-------------|---------------|---------|
| **Backend Dosya** | ~104 dosya | Daha az | -9,624 satır |
| **Frontend Dosya** | ~44 dosya | Daha az | -9,976 satır |
| **Mobile Dosya** | ~215 dosya | Daha az | -3,592 satır |
| **AI Features** | ✅ Var | ❌ Yok | Kaldırıldı |
| **TTS Providers** | 3 (Polly, Azure, Google) | 1 (Polly) | -2 provider |
| **Chat System** | ✅ Var | ❌ Yok | Kaldırıldı |
| **MFA Sync** | ✅ Var | ❌ Yok | Kaldırıldı |
| **Docker** | ✅ Var | ❌ Yok | Kaldırıldı |
| **Dokümantasyon** | Kapsamlı | Minimal | Kaldırıldı |

---

**Not:** Bu rapor otomatik olarak git diff analizi ile oluşturulmuştur. Detaylı kod değişikliklerini görmek için ilgili dosyaları inceleyebilirsiniz.

**Rapor Oluşturma Tarihi:** 17 Kasım 2025  
**Oluşturan:** Cascade AI Assistant
