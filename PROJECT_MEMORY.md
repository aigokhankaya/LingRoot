PROJECT_MEMORY.md
Project Name: Lingroot
Last Updated: 2025-12-04
Current Phase: Phase 2 – Intelligent Content Generation
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
Web (client) → Supabase Auth → Lingroot API → TTS Worker → MFA Processor → Storage → Frontend Display
n8n: Topic → Prompt → CEFR adaptation → TTS → SRT → Video (Veo3)
Admin panel: Prompt yönetimi + içerik onayı + kullanım istatistikleri
Design Pattern:
Clean Architecture + Modular Feature-Based Foldering
Prompt-Oriented Architecture (POA)
TTS-Pipeline Isolated Worker Pattern
Audio alignment distributed workers
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
Multi-level content generation
Video pipeline (Veo3 integration)
Full audio synchronization improvement (MFA 2.0)
Phase 3 — Experience Layer
Web player full redesign
Mobile UI polish
Topic recommendation engine
Learning analytics dashboard
Phase 4 — Scaling
GPU workers autoscaling (Hetzner)
Hybrid serverless architecture
Cloudflare R2 migration (full)
Global CDN optimization

[NEW ARCHITECTURE]
Gamified Onboarding & Progression Strategy
See: docs/architecture/gamification-strategy.md
Implements "Hero's Journey" onboarding, Quest-based roadmap, SRS vocabulary system, and Gamified quizzes.

[6. DECISION LOG & ANTI-PATTERNS]
[2025-11] MFA Kullanımı
Karar: Google TTS timepoint API yerine MFA forced aligner kullanmak.
Neden: %99 doğruluk, kelime seviyesinde senkron ihtiyacı.
[Anti-Pattern]
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
