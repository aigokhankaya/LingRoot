# Liro Main Analysis

Tarih: 2026-06-08  
Kapsam: Mevcut backend koduna göre Liro AI sohbet mimarisi, model kullanımı, veri akışı, kişiselleştirme katmanları ve teknik riskler.

## 1. Kısa Özet

Liro, LingRoot'un kullanıcı profilini, geçmiş içeriklerini, sohbet hafızasını, konu grafiğini ve öğrenme seviyesini prompt'a enjekte eden kişiselleştirilmiş AI sohbet asistanıdır. Ana çalışma hattı `/api/ai-chat` endpointleri üzerinden `backend/controllers/aiChatController.js` içinde yürür.

Mevcut yapı fonksiyonel olarak güçlüdür: kullanıcı profili, içerik geçmişi, uzun dönem hafıza, günlük öneriler, web araması ve duygu tonu analizi aynı sohbet yanıtını besler. Ancak controller çok fazla sorumluluk taşır; aynı iş mantığının bir kısmı `chatService.js` içinde ayrıştırılmış olsa da aktif ana akış halen büyük ölçüde `aiChatController.js` içinde çalışır. Bu durum bakım maliyeti, test edilebilirlik ve hata ayıklama açısından ana teknik borçtur.

## 2. Aktif API Yüzeyi

Liro route dosyası: `backend/routes/aiChat.js`  
Mount noktası: `backend/server.js` içinde `/api/ai-chat`

Başlıca endpointler:

- `GET /api/ai-chat/conversations`
- `POST /api/ai-chat/conversations`
- `PUT /api/ai-chat/conversations/:conversationId`
- `DELETE /api/ai-chat/conversations/:conversationId`
- `GET /api/ai-chat/conversations/:conversationId/messages`
- `POST /api/ai-chat/conversations/:conversationId/messages`
- `GET /api/ai-chat/suggestions`
- `GET /api/ai-chat/conversations/:conversationId/suggestions`
- `GET /api/ai-chat/daily-suggestions`
- `GET /api/ai-chat/daily-topic`
- `POST /api/ai-chat/daily-suggestions/feedback`
- `POST /api/ai-chat/mini-activity`
- `POST /api/ai-chat/recommendations/interaction`
- `GET /api/ai-chat/memories`
- `DELETE /api/ai-chat/memories/:memoryId`

Tüm route'lar `authenticate` middleware'i altındadır. AI mesaj gönderme endpointi ayrıca `chatLimiter` ve `chatDailyLimiter` ile sınırlandırılır.

## 3. Ana Sohbet Akışı

Ana akış `sendMessage` fonksiyonunda ilerler:

1. Kullanıcı ve conversation doğrulanır.
2. Son mesaj geçmişi alınır.
3. Mevcut kullanıcı mesajı history'ye eklenir.
4. `chatService.getUserProfile(userId)` ile cache destekli kullanıcı profili alınır.
5. `dynamicLevelAnalyzer` ile oturum içi seviye sinyali çıkarılır.
6. Kullanıcı mesajı DB'ye kaydedilir.
7. `liroContentGraph.getUserOverview()` ile içerik grafiği özeti hazırlanır.
8. Gerekirse `webSearchService` ile web araması sonucu prompt'a eklenir.
9. `userMemoryService.retrieveRelevantMemories()` ile uzun dönem hafıza bağlamı eklenir.
10. `liroPromptGenerator.generateSystemPrompt()` ile kişiselleştirilmiş system prompt üretilir.
11. Conversation summary, content overview, memories, dynamic level instruction ve mood instruction prompt'a eklenir.
12. Kullanıcı seviyesine göre OpenAI modeli seçilir.
13. Streaming veya non-streaming OpenAI çağrısı yapılır.
14. OpenAI başarısız olursa Claude fallback denenir.
15. Asistan yanıtı DB'ye kaydedilir.
16. Konu kilidi, topic extraction, user insight extraction, memory extraction ve proactive recommendation arka planda tetiklenir.
17. API maliyeti loglanır.

Bu akış zengin bağlam üretir, ancak aynı fonksiyon içinde çok fazla yan etki vardır: DB yazımı, SSE, prompt inşası, model seçimi, maliyet loglama, topic extraction ve öneri sistemi aynı yerde yönetilir.

## 4. Model Kullanımı

Ana Liro sohbetinde model seçimi kullanıcı seviyesine göre yapılır:

- `A1`, `A2`, `B1`: `gpt-4o-mini`
- `B2`, `C1`, `C2`: `gpt-4o`

Fallback:

- OpenAI streaming veya normal chat çağrısı hata verirse `claude-3-5-sonnet-20241022` kullanılır.

Genel OpenAI client varsayılanları:

- `OPENAI_CHAT_MODEL` env varsa o kullanılır.
- Env yoksa fallback: `gpt-4-turbo-preview`
- Embedding modeli: `text-embedding-ada-002`

Önemli ayrım: Ana Liro chat akışı `OPENAI_CHAT_MODEL` varsayılanına çoğunlukla düşmez; controller `selectedModel` değerini açıkça geçirir. Ancak topic extraction gibi bazı yardımcı fonksiyonlar model parametresi vermezse OpenAI client varsayılanı devreye girebilir.

Yardımcı Liro servislerinde yaygın model:

- Mood analysis: `gpt-4o-mini`
- Conversation summary: `gpt-4o-mini`
- Memory extraction: `gpt-4o-mini`
- User insight extraction: `gpt-4o-mini`
- Smart suggestions: `gpt-4o-mini`
- Daily suggestions: `gpt-4o-mini`
- Long text topic extraction: `gpt-4o-mini`

## 5. Prompt ve Kişiselleştirme Katmanı

Ana prompt üretimi `backend/utils/ai/liroPromptGenerator.js` içindedir. Bu sınıf şunları birleştirir:

- `backend/prompts/liro_system_personalized.txt`
- `backend/prompts/liro_system_default.txt`
- `backend/prompts/liro/character_profile.md`
- `backend/prompts/liro/cefr_adaptation_rules.json`
- `backend/prompts/liro/few_shot_examples.json`
- Kullanıcı profili
- Kullanıcı insight'ları
- Smart suggestion verisi
- Feedback loop adaptive context
- Sector English context
- Target vocabulary
- Web search sonuçları
- Knowledge profile
- Topic tree status

Prompt tasarımı Liro'yu yalnızca chat bot değil, "kişisel öğrenme arkadaşı ve içerik küratörü" olarak konumlandırır. CEFR seviyesine göre Türkçe/İngilizce oranı ve açıklama yoğunluğu değişir.

Risk: Prompt inşası çok geniş ve birçok kaynağa bağlı. Prompt uzunluğu, token maliyeti ve beklenmeyen çelişkili talimat riski düzenli ölçülmelidir.

## 6. Kullanıcı Profili

Profil üretimi `backend/utils/ai/userProfileAnalyzer.js` içinde yapılır. Profil şu alanları toplar:

- Temel kullanıcı bilgileri
- İlgi alanları
- Sohbet geçmişi
- İçerik geçmişi
- Kelime istatistikleri
- Audio tercihleri
- Davranış kalıpları
- Öğrenme ilerlemesi
- Öneriler
- Knowledge profile
- Topic tree status
- User insights
- Smart suggestions
- Adaptive context
- Sector profile
- Target vocabulary

`chatService.getUserProfile()` bu profili cache ile sunar. Cache, prompt üretim maliyetini düşürür; ancak kullanıcı yeni içerik oluşturduğunda veya önemli bir hafıza güncellendiğinde invalidation kritik hale gelir.

## 7. Hafıza Katmanları

Liro'da üç ana hafıza yaklaşımı vardır:

- Session memory: Son mesajlar doğrudan prompt'a girer.
- Conversation summary: Uzun sohbetlerde eski mesajlar özetlenir ve conversation üzerinde saklanır.
- Long-term memory: Kullanıcı hakkında kalıcı veya geçici hatırlanacak bilgiler `userMemoryService` ile çıkarılır ve saklanır.

`userMemoryService.extractMemories()` son mesajlardan kalıcı bilgi çıkarır. `retrieveRelevantMemories()` ise mevcut kullanıcı mesajına göre ilgili hafızaları getirir. Mevcut retrieval yöntemi keyword matching ağırlıklıdır; embedding tabanlı retrieval potansiyeli yorumlarda belirtilmiş ama aktif ana mekanizma değildir.

Bu yapı Liro'nun "hatırlıyor" hissini güçlendirir. Risk tarafında ise yanlış veya fazla agresif çıkarılan hafızaların prompt'a taşınması kullanıcı deneyimini bozabilir. Hafıza onayı, görünürlüğü ve silme mekanizması bu yüzden önemlidir. Silme endpointi mevcuttur.

## 8. İçerik Grafiği ve Öğrenme Devamlılığı

`backend/utils/ai/liroContentGraph.js` kullanıcının içerik ilerlemesini özetler:

- Son çalışılan içerikler
- Tamamlanmamış içerikler
- Tamamlanan içerikler
- Önerilen sıradaki içerikler
- Tercih edilen seviye
- Sesli içerik kullanımı

Öneri önceliği mantığı:

1. Tamamlanmamış içerikleri öne al.
2. Yer kalırsa tamamlanmış konuların sıradaki içeriklerini bul.
3. İçerik grafiği yoksa yeni konu veya içerik seçimi öner.

Bu katman Liro'yu yalnızca serbest sohbetten çıkarıp öğrenme yolculuğuna bağlayan en değerli parçalardan biridir.

## 9. Öneri Sistemleri

Liro'da birden fazla öneri mekanizması var:

- `getDailySuggestions`: Günlük öneri kartları üretir.
- `chatRecommendationService`: Sohbet içinde proaktif öneri tetikler.
- `userInsightService.generateSmartSuggestions`: Kullanıcı insight'ları ve içerik geçmişinden öneri çıkarır.
- `liroContentGraph`: Sıradaki içerik önerilerini üretir.
- `rag.js`: Benzer topic bulma ve topic extraction sağlar.

Bu sistemler birlikte çalışınca öneri kalitesi artabilir, ancak aynı anda çok fazla öneri kaynağı olduğunda öncelik çakışması oluşabilir. Prompt içinde "önce content graph, sonra hobi/ilgi alanı" gibi kurallar var; bu doğru yönde bir kontrol sağlar.

## 10. Web Search Entegrasyonu

`webSearchService.shouldSearch(content)` ile basit heuristik üzerinden web araması tetiklenir. Sonuçlar prompt'a formatlanarak eklenir. Bu, güncel bilgi gerektiren sorularda Liro'nun cevabını iyileştirir.

Riskler:

- Web araması maliyeti ve rate limit maliyet loglamada OpenAI kadar görünür olmayabilir.
- Search sonucu prompt'a doğrudan eklenir; kaynak güvenilirliği ve güncellik puanlaması sınırlı olabilir.
- Heuristik gereksiz arama tetikleyebilir veya gerekli aramayı kaçırabilir.

## 11. Maliyet ve Kullanım Takibi

Ana chat akışında OpenAI maliyeti `calculateOpenAiCost` ve `logApiCost` ile loglanır.

Streaming modunda usage dönmediği için token sayısı yaklaşık hesaplanır:

- Input token tahmini: prompt uzunluğu ve mesaj uzunlukları üzerinden
- Output token tahmini: asistan yanıt uzunluğu üzerinden

Claude fallback için `claudeClient` içinde maliyet loglama desteği var, ancak ana fallback çağrısında `userId` ve `feature` opsiyonları geçirilmediği için bu maliyet her durumda loglanmayabilir. Bu izleme boşluğu giderilmeli.

## 12. Güçlü Yönler

- Kullanıcı seviyesine göre model seçimi maliyet/kalite dengesini gözetiyor.
- Prompt sistemi kişiselleştirme açısından zengin.
- Content graph sayesinde Liro öğrenme devamlılığı kurabiliyor.
- Conversation summary ve long-term memory birlikte kullanılıyor.
- Web search ve mood analysis cevap kalitesini artırıyor.
- Daily suggestions ve proactive recommendations ürün deneyimini canlı tutuyor.
- API maliyet takibi OpenAI ana akışında mevcut.

## 13. Zayıf Noktalar ve Teknik Riskler

- `aiChatController.js` çok fazla sorumluluk taşıyor; controller, domain service, orchestration ve side effect yönetimi iç içe.
- `chatService.js` içinde daha temiz bir ayrıştırma başlamış, ancak ana controller halen bu ayrıştırmayı tam kullanmıyor.
- Prompt çok fazla kaynaktan beslendiği için token maliyeti ve talimat çakışması riski yüksek.
- Claude fallback maliyeti ana chat fallback yolunda eksik loglanabilir.
- Streaming kullanımında token maliyeti tahmini gerçek usage kadar güvenilir değil.
- Topic extraction bazı yollarda OpenAI client default modeline düşebilir; model politikası merkezi değil.
- Memory retrieval keyword tabanlı olduğu için semantik eşleşmeler kaçabilir.
- Background task'lar fire-and-forget çalışıyor; başarısızlıklar kullanıcı akışını bozmaz ama observability sınırlı kalabilir.
- Web search maliyet ve kaynak kalitesi takibi OpenAI kadar net görünmüyor.
- `experienceLevel` ile CEFR seviyesi kavramları bazı yerlerde karışmaya açık. Kodda `experienceLevel` bazen `B1` gibi CEFR değeri olarak kullanılıyor.

## 14. Öncelikli İyileştirme Önerileri

1. Liro orchestration katmanını `aiChatController.js` dışına taşı.
   - `LiroChatOrchestrator` veya mevcut `chatService.js` genişletilebilir.
   - Controller yalnızca request validation, SSE/HTTP response ve status code yönetmeli.

2. Model politikasını merkezi hale getir.
   - `modelPolicyService` veya `constants/modelConstants.js` altında `liro_chat`, `liro_memory`, `liro_summary`, `liro_topic_extraction` gibi feature bazlı seçim yapılmalı.
   - Env override desteği feature bazında verilmeli.

3. Prompt bütçesi ve prompt gözlemlenebilirliği ekle.
   - Her Liro çağrısında prompt karakter/token tahmini, hangi bölümlerin eklendiği ve model seçimi structured log olarak yazılmalı.
   - Çok uzun promptlarda düşük öncelikli bölümler kesilmeli.

4. Claude fallback maliyet loglamasını düzelt.
   - Fallback çağrısına `userId`, `feature`, `conversationId` metadata'sı geçirilmeli.

5. Hafıza retrieval'i embedding destekli hale getir.
   - Mevcut keyword matching kalabilir, ancak önemli hafızalar için embedding veya hybrid search eklenmeli.

6. Background task kuyruğu ekle.
   - Topic extraction, insight extraction, memory extraction ve recommendation interaction işleri queue/job sistemiyle izlenebilir hale getirilmeli.

7. CEFR ve experience alanlarını net ayır.
   - `cefrLevel` ve `engagementExperienceLevel` gibi ayrı alanlar kullanılmalı.
   - Model seçimi CEFR üzerinden yapılacaksa kaynak alan açık olmalı.

8. Web search için kaynak ve maliyet observability ekle.
   - Arama tetiklenme sebebi, kaynak sayısı, provider, latency ve maliyet ayrı loglanmalı.

## 15. Test Açıkları

Önerilen test başlıkları:

- `selectModel`: A1-B1 için `gpt-4o-mini`, B2-C2 için `gpt-4o`.
- Prompt generator: eksik profile rağmen default prompt'a düşme.
- Prompt generator: user insights, memory, content graph ve web search placeholder'larının doğru eklenmesi.
- `sendMessage`: OpenAI başarılı streaming akışı.
- `sendMessage`: OpenAI hata verdiğinde Claude fallback.
- `sendMessage`: topic lock regex ve DB update davranışı.
- `conversationSummaryService`: threshold altı/üstü davranış.
- `userMemoryService`: duplicate memory ve deactivate akışı.
- `dailySuggestions`: AI parse hatasında fallback öneri üretimi.

## 16. Genel Değerlendirme

Mevcut Liro yapısı ürün yeteneği açısından güçlü ve kişiselleştirme kapsamı geniş. Kullanıcıyı yalnızca son mesajla değil, profil, içerik geçmişi, topic graph, hafıza ve seviye sinyalleriyle ele alıyor. Bu, LingRoot için ayırt edici bir AI öğrenme asistanı temelidir.

Ana geliştirme ihtiyacı yeni özellik eklemekten çok mimari sadeleştirme ve operasyonel güvenilirliktir. Özellikle controller ayrıştırması, merkezi model politikası, prompt bütçesi, fallback maliyet takibi ve background job gözlemlenebilirliği tamamlanırsa Liro daha sürdürülebilir ve ölçülebilir bir sisteme dönüşür.
