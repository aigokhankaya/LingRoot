---
trigger: always_on
---

# LINGROOT – PROJECT RULES FOR CODE AGENTS

1. PROJECT MEMORY ÖNCELİĞİ
   - Bu repoda çalışmaya başlamadan ÖNCE daima [PROJECT_MEMORY.md](cci:7://file:///c:/Users/USER/Documents/GitHub/LingRootM/PROJECT_MEMORY.md:0:0-0:0) dosyasını oku.
   - Yeni bir görevde, mevcut bağlamı anlamak için ilk referans: [PROJECT_MEMORY.md](cci:7://file:///c:/Users/USER/Documents/GitHub/LingRootM/PROJECT_MEMORY.md:0:0-0:0).
   - Mimari, pipeline, prompt kuralları veya deployment ile ilgili bir çelişki varsa, öncelik: [PROJECT_MEMORY.md](cci:7://file:///c:/Users/USER/Documents/GitHub/LingRootM/PROJECT_MEMORY.md:0:0-0:0).

2. DOKÜMANTASYON ÖNCELİĞİ
   - Değişiklik yapmadan önce aşağıdaki sırayla dokümantasyona bak:
     1) [PROJECT_MEMORY.md](cci:7://file:///c:/Users/USER/Documents/GitHub/LingRootM/PROJECT_MEMORY.md:0:0-0:0)
     2) İlgili `docs/architecture/*.md`
     3) İlgili `docs/codebase/*.md`
     4) Gerekirse `docs/api/*.md` ve [docs/database/schema-overview.md](cci:7://file:///c:/Users/USER/Documents/GitHub/LingRootM/docs/database/schema-overview.md:0:0-0:0)
   - Dokümantasyon ile kod çelişirse, önce çelişkiyi not et, varsayım yapma.

3. BUSINESS LOGIC DOKUNMA KURALI
   - Kullanıcı açıkça istemedikçe business logic’i DEĞİŞTİRME.
   - Tercih sırası:
     - Önce dokümantasyon ekle/güncelle
     - Sonra küçük, lokal, geri alınabilir refactor (gerekliyse)
   - API sözleşmesini (request/response şekli) tek taraflı değiştirme.

4. PROJECT_MEMORY “LAWS” UYGULAMA
   - [PROJECT_MEMORY.md](cci:7://file:///c:/Users/USER/Documents/GitHub/LingRootM/PROJECT_MEMORY.md:0:0-0:0) içindeki [4. ACTIVE RULES (The "Laws")] bölümü HER ZAMAN GEÇERLİDİR.
   - Özellikle:
     - API key veya secret önermeme/yazmama.
     - Prompt output formatını değiştirmeme.
     - Audio pipeline sırasını değiştirmeme: Whisper → Clean → Adapt → TTS → MFA → VTT.
     - Supabase tablo kolonlarını uydurmama; sadece bilinen şemayı kullan.
     - Dosya & klasör yapısını onay almadan taşımama/yeniden adlandırmama.
     - Web ve Mobile için TEK bir ortak API şemasına sadık kal.

5. KARARSIZLIK DURUMU
   - Mimaride veya kurallarda belirsizlik varsa:
     - Varsayım yapma.
     - Kullanıcıya soru sor ve yanıt gelene kadar kritik mimari kararlar alma.

6. DOCUMENTATION SYNC (CODE ↔ DOCS)

   - Her kod değişikliğinde şu sırayı uygula:
     1) İlgili mimari / codebase dokümanını kontrol et:
        - `docs/architecture/*.md`
        - `docs/codebase/*.md`
        - `docs/api/*.md`
        - [docs/database/schema-overview.md](cci:7://file:///c:/Users/USER/Documents/GitHub/LingRootM/docs/database/schema-overview.md:0:0-0:0)
        - `docs/prompts/*.md` (prompt değişiyorsa)
     2) Değişiklik, bu dokümanlardan birinin içeriğini etkiliyorsa:
        - Aynı PR / commit içinde ilgili dokümanı da güncelle.
     3) Yeni bir endpoint, tablo, prompt veya önemli feature ekleniyorsa:
        - Uygun `docs/**` dosyasını YA güncelle YA da yeni bir doc dosyası oluştur.
   - “Kod güncellendi ama doküman eski kaldı” durumu kabul edilemez:
     - Dokümanlar, production kodu ile MÜMKÜN OLDUĞUNCA senkron tutulmalıdır.
   - Emin değilsen:
     - En azından [docs/review/validation-report.md](cci:7://file:///c:/Users/USER/Documents/GitHub/LingRootM/docs/review/validation-report.md:0:0-0:0) içinde “Developer Validation” altına not bırak.