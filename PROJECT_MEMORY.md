PROJECT_MEMORY.md
Project Name: Lingroot
Last Updated: 2026-01-16
Current Phase: Phase 2 – Intelligent Content Generation (Refactoring & Security Hardening)
Active Context: CEFR-based content engine, prompt governance, audio pipeline stability, mobile/web harmonization.

[1. PROJECT VISION & GOALS]
Core Concept:
Lingroot, kullanıcıların ilgi duyduğu içerikleri (kitap, makale, podcast, rapor vb.) onların İngilizce seviyesine uyarlayarak, doğal seslendirilmiş ve senkronize altyazılı hale getiren bir yapay zeka destekli "kişiselleştirilmiş dinleme" platformudur.
Target Audience:
İngilizce öğrenmek isteyen 13–65 yaş arası kullanıcılar
Öğrenme için ekstra zaman ayıramayan kişiler
Orta seviye motivasyonda ama düzenli içerik tüketen kullanıcılar
Yabancı dil öğrenirken işitsel içerikten beslenen kitle
"Meraklı Entelektüel" (The Curious Mind): İngilizce kaynakları anlamakta zorlanan ama öğrenme isteği yüksek kitle.
"Meşgul Profesyonel": İş dokümanlarını veya sektörel raporları dinleyerek zaman kazanmak isteyenler.
"Kitap Severler": Orijinal kitapları dil bariyeri olmadan dinlemek isteyenler.
Success Criteria:
30 gün boyunca günlük aktif kullanıcı oranı %40+
Kullanıcıların %70’inin seviyesine göre içerik anlayabilmesi
Aylık abonelik dönüşüm oranı %3+
Level-adapted içeriklerin hata oranının < %1 olması
TTS senkron kaymalarının < %3 olması
MFA alignment doğruluk oranı > %95

[2. TECH STACK & CONSTRAINTS]
Language/Frameworks:
Web: Next.js (React)
Admin Panel: React
Mobil: React Native (Expo)
Backend: Express.js (Node.js) API + ayrı TTS / Whisper worker servisleri
Edge Workers: Supabase Functions
Automation: n8n
AI: OpenAI (GPT-5.1, GPT-4o, GPT-4o-mini), Gemini 2.0 Pro (bazı görevlerde)
Audio: Google TTS + MFA Forced Aligner
Storage: Supabase Storage + Cloudflare R2
Database:
PostgreSQL (Supabase)
Redis (Job Queue & Caching)
RLS zorunlu
Multi-tenancy opsiyonlu
Prompt logs + CEFR scoring tabloları ayrı tutulur
State Management:
Web: React Query
Mobile: Zustand
Admin: Zustand + Server State
Constraints:
API key’ler kesinlikle koda gömülmez; .env zorunludur
Prompt output formatları değiştirilemez
Google TTS için en az 2. bölümde SSML zorunludur
MFA compute işlemleri GPU’da çalışır
Audio pipeline asla lokal diske bağımlı olmamalı (geçici cache hariç)
Mobil uygulamada offline mod gereksiz; tüm içerik streaming
Web + Mobile arasında aynı API sözleşmesi kullanılmalıdır

[3. ARCHITECTURE & PATTERNS]
System-Level Architecture:
Web (client) → Supabase Auth → Lingroot API → Redis Queue → TTS/Podcast Workers → Storage → Frontend
n8n: Topic → Prompt → CEFR adaptation → TTS → SRT → Video (Veo3)
Admin panel: Prompt yönetimi + içerik onayı + kullanım istatistikleri
Design Pattern:
Clean Architecture + Modular Feature-Based Foldering
Prompt-Oriented Architecture (POA)
Persistent Job Queue Pattern (BullMQ + Redis)
Isolated Worker Pattern (TTS, Podcast, MFA)
Folder Structure Standard:
/src
   /app (web routes)
   /components
   /modules
   /hooks
   /utils
   /services
   /ai
   /audio
   /state
   /config
   /types
/admin
   /components
   /modules
   /state
   /utils
/backend
   /api
   /tts-worker
   /mfa-worker
   /models
   /utils
      /ai
      /audio
      /content
      /storage
      /infra
      /notifications
      /common
/docs
   /architecture
   /codebase
   /api
/packages
   /api-client         # Shared TypeScript API client for Web + Mobile
   /database
   /prompts
   /marketing       # Instagram, Launch Plan, Ads Strategy
   /gamification    # Gamification documentation  
   /integrations    # Apple IAP, Google Play, Stripe docs
   /testing         # Test documentation
   /templates
   /ui
/prompts
   /tts
   /translation
   /cefr
   /topics
   /liro

Naming Conventions:
Variables: camelCase
Components: PascalCase
Database tables: snake_case
AI prompt files: kebab-case
Env variables: UPPER_SNAKE_CASE

[4. ACTIVE RULES (The "Laws")]
Bu kurallar AI tarafından asla ihlal edilemez.
Asla API key veya private key önerme, yazma, kullanma.
Prompt output formatını asla değiştirme.
CEFR seviyesine uygun olmayan İngilizce üretme.
TTS isimlerini keyfi değiştirme.
Audio pipeline sıradüzenini değiştirme:
Whisper → Clean → Adapt → TTS → MFA → VTT
Supabase tablo kolonlarını varsayma — sadece hafızadaki yapıyı kullan.
Dosya & klasör yapısını onay almadan değiştirme.
Deployment kurallarını ihlal etme:
Cloudflare Tunnel → Backend Only
MFA alignment hesaplamalarında tahmini formüller yazma.
Mobil ve Web API’larını birbirinden ayırma; tek şema üzerinden kullan.
Kullanıcı ile iletişim dili (cevaplar, raporlar, açıklamalar) kesinlikle TÜRKÇE olmalıdır. İngilizce sadece kod içinde ve loglarda kullanılabilir.
NO AGENTIC MODE: `task_boundary` tool'unu kullanma, artifact oluşturma, planlama moduna girme. Doğrudan kod değişikliğine odaklan.
NO BROWSER AUTOMATION: `browser_subagent` aracını kullanma. Tarayıcıda test gerekiyorsa kullanıcıdan manuel test yapmasını iste.
DB OPERATIONS MANUEL: Supabase veritabanı işlemleri (tablo/kolon ekleme, güncelleme) ASLA otomatik yapılmaz ve Supabase’e doğrudan bağlanılmaz. AI sadece SQL migration dosyasını hazırlar ve kullanıcıya "Bu SQL'i Supabase SQL Editor'de çalıştırın" talimatı verir.
AUTO-EXECUTE TERMINAL: Terminal komutları (npm, git, fs işlemleri) için kullanıcı onayı beklenmez. `SafeToAutoRun: true` parametresi varsayılan olarak kabul edilir. Sadece yıkıcı (silme, resetleme) işlemlerde onay istenir.
DB SCHEMA SYNC: Her migration dosyası oluşturulduğunda veya veritabanı şemasında değişiklik yapıldığında (tablo oluşturma, kolon ekleme/çıkarma, FK ilişkileri), aşağıdaki dokümanlar MUTLAKA güncellenir:
  - `docs/database/schema-overview.md` — Tablo listesi, ER diyagramı, kategori güncellemesi
  - `docs/database/complete-column-reference.md` — Etkilenen tablonun tam kolon detayları (tip, nullable, default, PK/FK)
  - Güncelleme formatı: Versiyon numarası artırılır, güncelleme tarihi yazılır
  - Migration dosyası oluşturulduktan HEMEN SONRA bu dokümanlar güncellenir, ayrı bir adım olarak bırakılmaz
DOCUMENT VERSIONING: Oluşturulan veya güncellenen her doküman dosyasında (*.md) başlık satırının hemen altında şu format kullanılır:
  ```
  > **Oluşturulma:** YYYY-MM-DD | **Güncelleme:** YYYY-MM-DD | **Versiyon:** X.Y
  ```
  - İlk oluşturmada Oluşturulma ve Güncelleme tarihi aynıdır, Versiyon 1.0'dır.
  - Her güncellemede Güncelleme tarihi ve Versiyon numarası artırılır (minor: 1.1, 1.2... major: 2.0).
CODE-FIRST DOCUMENTATION: Dokümantasyon yazmadan ÖNCE ilgili kaynak kodları okunmalıdır. Varsayım yaparak veya hafızadan doküman yazılmaz. Gerçek kod yapısı, fonksiyon isimleri, parametreler ve iş akışları kaynak dosyalardan doğrulanmalıdır.

[5. PROGRESS & ROADMAP]
✓ Phase 1 — Foundation
✓ Web & API foundational setup
✓ Supabase schema
✓ Basic CEFR pipeline
✓ TTS + MFA prototype
✓ Admin panel initial version
🔥 Phase 2 — Intelligent Content Engine (ACTIVE)
Prompt governance structure
CEFR adaptation accuracy
✅ Liro Assistant architecture (v2.0 - User Profiling + Persona Learning)
✅ User Insight System (Likes/Dislikes/Habits/Goals extraction)
✅ Smart Feedback Loop (Adaptive level & content suggestion)
Multi-level content generation
Video pipeline (Veo3 integration)
Full audio synchronization improvement (MFA 2.0)
Phase 3 — Experience Layer (ACTIVE)
Web player full redesign
Mobile UI polish
✅ SRS (Spaced Repetition) System (SM-2 Algorithm + word_reviews)
Topic recommendation engine
Learning analytics dashboard
Phase 4 — Topic Mastery & Detailed Feedback
✅ user_topic_mastery tablosu (Migration 057)
✅ Topic bazlı detaylı progress tracking
✅ Phase 5 — Visual Progression & Stability
✅ Visualized Progression (MasteryProgressCard, StreakCelebration)
✅ Self-Healing Services (retryUtils.js - Retry, CircuitBreaker, GracefulDegradation)
✅ Phase 6 — Scaling & Embedding
✅ User Insight Embedding (Migration 058 + pgvector)
✅ Benzer kullanıcı önerileri (cosine similarity)
✅ AI-powered recommendations API
✅ Phase 7 — Marketing & Launch Preparation
✅ Instagram content strategy (100 posts pack)
✅ Paid ads strategy (Google, Meta, TikTok)
✅ Launch execution guide
✅ Marketing analytics integration

[NEW ARCHITECTURE]
Refactored Backend Utils Structure:
See: docs/codebase/api-services.md
Implemented domain-driven grouping for utility functions: /ai, /audio, /content, /storage, etc.

[NEW ARCHITECTURE]
Gamified Onboarding & Progression Strategy
See: docs/architecture/gamification-strategy.md
Implements "Hero's Journey" onboarding, Quest-based roadmap, SRS vocabulary system, and Gamified quizzes.

[NEW ARCHITECTURE - 2026-01-23]
Sector English - Gamification Full Integration
See: docs/architecture/gamification-strategy.md (Section 10)
Implements:
- Onboarding sector step with position form (job title, experience)
- Sector-specific XP rewards (15-200 XP per activity)
- Per-sector streak tracking with milestone bonuses
- Dynamic sector daily quests (%SECTOR% template system)
- Context-aware SRS with vocabulary injection
- 16+ new sector achievements (streak, roleplay, podcast, multi-sector)
- SectorProgressCard for dashboard visualization
- Sector Skill Tree (Roadmap) visualization
Files: sectorGamificationService.js, 0074_sector_gamification_full_integration.sql, SectorProgressCard.tsx, SectorSkillTree.tsx


[6. DECISION LOG & ANTI-PATTERNS]
[2026-01] Backend Utils Refactoring
Karar: `backend/utils` klasörünü domain bazlı alt klasörlere ayırmak (ai, audio, infra, string...).
Neden: God Folder anti-pattern'i oluşmuştu (60+ dosya). Bakım ve navigasyon zorlaşıyordu.

[2026-01] Production Security Hardening
Karar: Production ortamında varsayılan JWT secret'lar varsa uygulamayı başlatmamak (Crash on insecure config).
Neden: Güvenlik açığını kaynağında engellemek.

[2026-01] Shared API Client (@lingroot/api-client)
Karar: Web ve Mobile için ortak TypeScript API client paketi oluşturmak.
Neden: Kod tekrarını ortadan kaldırmak (~4000 satır→~100 satır), tip güvenliği sağlamak, token yönetimini merkezileştirmek.

[2025-11] MFA Kullanımı
Karar: Google TTS timepoint API yerine MFA forced aligner kullanmak.
Neden: %99 doğruluk, kelime seviyesinde senkron ihtiyacı.
[Anti-Pattern]
God Object Controller: `ttsController.js` gibi 2000+ satırlık controller dosyaları.
Çözüm: Service layer'a business logic taşıma (örn: `voiceModelService.js`, `subtitleService.js`).
Ham YouTube altyazılarını direkt kullanmak.
Neden yanlış: Çeviri kalitesi düşük ve seviye uyarlaması (CEFR) yok.
[Anti-Pattern]
Whisper'ın basic transcript'inden direkt İngilizce üretmek.
Neden yanlış: CEFR seviyesine uygunluk bozuluyor.
[Anti-Pattern]
n8n içinden direkt TTS yapmak.
Neden yanlış: uzun metinlerde timeout ve ses bozulması.
[Anti-Pattern]
Prompt dizisini tek seferde çok uzun yollamak.
Neden: token drift + consistency kaybı.

[7. PROMPT MEMORY & PIPELINE RULES]
7.1. Pipeline Katmanları
Translation Prompt
CEFR Adaptation Prompt
Daily Patterns Prompt
TTS Prompt (SSML generator)
Subtitle Prompt (gerektiğinde)
Liro Assistant Prompt
7.2. Prompt Format Kuralları
Tüm çıktı JSON olmalı (belirtilmişse)
CEFR-A1 için basit cümle
CEFR-C2 için doğallaşmış anlatım
Renk kodları, emoji, markdown yasak
Sözler okunabilir olmalı (numbers → words)
7.3. Prompt Versionlama
prompts/{category}/v1/
prompts/{category}/v2/
Output diffs Supabase’de tutulur

7.4. Advanced Prompt Engineering Rules
Bu kurallar tüm LingRoot promptlarında uygulanmalıdır.

7.4.1. Persona + Expertise Context (Kimlik Yükleme)
Promptlara sadece rol değil, uzmanlık geçmişi de yükle:
- ❌ YANLIŞ: "You are a language expert"
- ✅ DOĞRU: "You are a CEFR-certified language methodologist with 15 years of ESL teaching experience, specialized in second language acquisition (SLA) and pedagogical content adaptation."
- Her CEFR seviyesi için uygun uzmanlık profili tanımla.
- Liro Assistant için tutarlı bir kişilik ve iletişim tarzı belirle.

7.4.2. Reference Context (Few-shot Prompting)
AI'ya örnek göstererek kalite standardını belirle:
- Her CEFR seviyesi için 2-3 "altın standart" input/output örneği sağla.
- Örnekler, istenen stilin, tonun ve karmaşıklığın somut gösterimi olmalı.
- Format: "Referans Örnek 1: [Input] → [Beklenen Output]"

7.4.3. Constraint Context (Sınırlama ve Bariyerler)
Ne yapılacağı kadar, ne yapıLMAYACAĞI da belirtilmeli:
- Prohibited patterns açıkça listele.
- Örnek: "Pasif cümle kurma", "Teknik jargon kullanma", "Cevabı X kelime ile sınırla"
- Bu bariyerler hallucination'ı önler ve yaratıcılığı doğru kanala yönlendirir.

7.4.4. Audience Context (Hedef Kitle Tanımı)
İçeriği kimin tüketeceği bağlamın parçasıdır:
- PROJECT_MEMORY'deki persona tanımlarını promptlara enjekte et:
  - "Meraklı Entelektüel" → Öğrenme merakı yüksek, zaman kısıtlı
  - "Meşgul Profesyonel" → İş odaklı, verimlilik öncelikli
  - "Kitap Sevler" → Derinlik ve zenginlik arayan
- Kullanıcının CEFR seviyesi + persona kombinasyonu içerik tonunu belirler.

7.4.5. Chain-of-Thought Context (Düşünme Silsilesi)
Karmaşık görevlerde AI'dan adım adım analiz iste:
- CEFR dönüşümlerinde: "Önce cümle uzunluklarını analiz et → Zor kelimeleri listele → Gramer yapılarını değerlendir → Alternatifler öner → Çıktı oluştur"
- Topic önerilerinde: "Kullanıcı profilini analiz et → İlgi alanlarını eşleştir → Uygun zorluk seviyesi belirle → Öneri listesi oluştur"
- CoT, modelin işlem kapasitesini optimize eder ve tutarlı sonuçlar üretir.

7.4.6. Output Format Context (Çıktı Mimarisi)
Çıktı formatını tesadüfe bırakma:
- Yapısal çıktılar için JSON Schema tanımla.
- Tablo, liste, paragraf formatlarını açıkça belirt.
- Örnek: "Çıktıyı JSON objesi olarak ver: {text: string, difficulty_score: number, key_vocabulary: string[]}"
- Format tutarlılığı, downstream işlemleri (TTS, MFA) kolaylaştırır.

[8. AUDIO PIPELINE MEMORY]
8.1. Zorunlu Akış
Whisper → Cleanup → CEFR adaptation → TTS (Google) → Audio merge → MFA → VTT/SRT
8.2. Seslendirme Kuralları
Speed default: 1.05
Pitch: -2 → +2 arasında
Max segment length: 1500 chars
SSML <break time="300ms"/> default
Sesler: en-US → “Aria”, en-GB → “Libby”
8.3. MFA Kuralları
Word-level timestamp
Tolerans aralığı: ±0.3s
Outlier > 1.5s → yeniden hizalama
Silent chunk > 450ms → noise removal

[9. DEPLOYMENT RULES]
9.1. Backend
Run behind Cloudflare Tunnel
Port 4000–9000 range allowed
Domain: *.aiprojeleri.online + booklevel.store
9.2. Storage
Cloudflare R2 → TTS outputs
Supabase → user-generated data
9.3. GPU Workers
Hetzner CX + GPU node (40–48 GB VRAM)
MFA tasks queue-based
Whisper threads auto-balanced
9.4. CI/CD
GitHub Actions → Lint + Build
Deployment → Manual triggered
Prompts → separate repo

[10. ERROR SIGNATURES & FAILSAFE RULES]
10.1. Audio Hataları
“silent audio detected”: Re-run MFA with boosted energy threshold
“alignment drift”: resegment → re-align → merge
“google TTS latency high”: chunk size = 700 chars
10.2. Prompt Hataları
Output format bozulursa: “retry with strict template”
CEFR uygunsuzsa: “regenerate with corrected difficulty constraints”
10.3. API Hataları
Supabase 429: 2s exponential retry
Cloudflare 525: automatic fallback → local API
MFA timeout: redispatch to Worker #2

[11. TESTING & VERIFICATION PROTOCOL]
11.1. Interactive Screen Tests Rule
Geliştirme tamamlandığında agent, kullanıcıyı test etmeye yönlendirmek ZORUNDADIR.
- Kullanıcıdan ilgili ekranın ekran görüntüsünü iste.
- Kullanıcıdan bir aksiyon (buton tıklama, akış başlatma) iste.
- Arka planda logları kontrol ederek işlemin başarısını doğrula.

11.2. Verification Workflow
Her "EXECUTION" fazının sonunda "VERIFICATION" moduna geçildiğinde:
1) Değişen bileşenleri listele.
2) Kullanıcıya "Şu adımları takip ederek X ekranına gidin ve ekran görüntüsü paylaşın" talimatı ver.
3) Kullanıcı aksiyonu sonrası backend/frontend loglarını analiz et.
4) Hata varsa düzelt ve 1. adıma dön; yoksa görevi tamamla.

[12. DESIGN & UI RULES]
12.1. Renk Paleti (Strict Color Palette)
LingRoot marka kimliği "Organik Öğrenme" üzerinedir. "Yapay Zeka" klişelerinden kaçınılmalıdır.
- **Onaylı Renkler (Approved):**
  - **Primary:** Teal / Turkuaz (`--primary`, `teal-*`, `cyan-*`) - Güven ve sakinlik.
  - **Accent:** Orange / Amber (`--accent`, `orange-*`, `amber-*`) - Enerji ve motivasyon.
  - **Neutral:** Slate / Gray (`slate-*`) - Okunabilirlik.
- **YASAKLI RENKLER (BANNED):**
  - **"AI Purple" / "Generic Tech Violet":**
  - `purple-*`, `violet-*`, `fuchsia-*` renkleri ve bu renkleri içeren gradientlar KESİNLİKLE YASAK.
  - Sebeb: Kullanıcıda "samimiyetsiz yapay zeka ürünü" algısı yaratıyor.
  - Mevcut "Secondary" (Lavender) rengini UI bileşenlerinde baskın kullanma.

12.2. Görsel Stil
- Gradient kullanıyorsan: `from-teal-500 to-emerald-500` veya `from-orange-400 to-amber-500` gibi doğal geçişler kullan.
- "Neon" veya "Cyberpunk" estetiğinden kaçın. "Clean & Modern Textbook" havasını hedefle.

OPERATIONAL DIRECTIVE
Yapay zeka için zorunlu talimatlar:
Read First:
Her işlemden önce PROJECT_MEMORY.md içeriğini oku.
Update Often:
Yeni bir mimari karar, prompt değişimi, tablo ekleme, yapı güncellemesi olduğunda dosyayı güncelle.
Stay Consistent:
Active Rules bölümünü asla ihlal etme.
If Uncertain:
Varsayım yapma; önce sor.
