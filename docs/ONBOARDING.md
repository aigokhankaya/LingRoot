# LingRoot Developer Onboarding Guide

**Hoş geldiniz!** Bu rehber, LingRoot projesine yeni katılan geliştiriciler için hazırlanmıştır.

## 🎯 Gün 1: Ortam Kurulumu

**Süre:** ~1.5 saat

### 1. Projeyi Tanıyın (15 dakika)
- [ ] `README.md` dosyasını okuyun - Projenin ne olduğunu anlayın
- [ ] Proje yapısına göz atın (`backend/`, `frontend/`, `docs/`)

### 2. Geliştirme Ortamını Kurun (30 dakika)
- [ ] `SETUP.md` veya `docs/devops/local-setup.md` dosyasını takip edin
- [ ] Gerekli yazılımları kurun:
  - Node.js v20.x
  - FFmpeg
  - Git
- [ ] Gerekli hesapları oluşturun:
  - Supabase (database)
  - OpenAI (AI features)
  - Google Cloud (TTS - opsiyonel)

### 3. Backend'i Çalıştırın (20 dakika)
```bash
cd backend
npm install
cp env.example.txt .env
# .env dosyasını düzenleyin (credentials ekleyin)
npm run dev
```

### 4. Frontend'i Çalıştırın (15 dakika)
```bash
cd frontend
npm install
# .env.local oluşturun
npm run dev
```

### 5. İlk Test (10 dakika)
- [ ] `http://localhost:3000` adresini açın
- [ ] Kayıt olun ve giriş yapın
- [ ] Basit bir metin TTS işlemi deneyin

**✅ Gün 1 Tamamlandı!** Backend ve frontend çalışıyor olmalı.

---

## 🏗️ Gün 2: Mimari Anlayışı

**Süre:** ~1.5 saat

### 1. Sistem Mimarisini Öğrenin (20 dakika)
- [ ] `docs/architecture/system-overview.md` - Genel mimari
- [ ] Diyagramları inceleyin (client-server-database akışı)

### 2. Frontend Yapısını Anlayın (20 dakika)
- [ ] `docs/architecture/frontend-structure.md`
- [ ] `frontend/src/` klasör yapısını keşfedin:
  - `app/` - Next.js sayfaları
  - `components/` - React bileşenleri
  - `lib/` - Utilities ve API client

### 3. API Mimarisini İnceleyin (15 dakika)
- [ ] `docs/architecture/api-architecture.md`
- [ ] `backend/routes/` klasörüne göz atın

### 4. Veritabanı Şemasını Öğrenin (20 dakika)
- [ ] `docs/database/schema-overview.md`
- [ ] ER diyagramını inceleyin
- [ ] Supabase dashboard'unda tabloları görün

### 5. Kod Standartlarını Okuyun (15 dakika)
- [ ] `README.md` → "MCP Uyumlu Kod Standartları" bölümü
- [ ] TypeScript tip tanımları (`frontend/src/types/`)
- [ ] API mapping kuralları

**✅ Gün 2 Tamamlandı!** Projenin mimarisini anlıyorsunuz.

---

## 🔌 Gün 3: API ve Kod İncelemeleri

**Süre:** ~1.5 saat

### 1. API Endpoint'lerini Öğrenin (30 dakika)
- [ ] `docs/api/endpoints.md` - Tüm endpoint'lerin listesi
- [ ] Postman/Thunder Client ile birkaç endpoint test edin:
  - `POST /api/auth/login`
  - `POST /api/tts/process-text`
  - `GET /api/books`

### 2. Frontend Utilities'i İnceleyin (20 dakika)
- [ ] `docs/codebase/hooks-utils.md`
- [ ] `frontend/src/lib/api.ts` - API client
- [ ] `frontend/src/lib/auth.tsx` - Auth context
- [ ] `frontend/src/lib/i18n.ts` - Internationalization

### 3. Örnek Kod Akışını Takip Edin (30 dakika)
**Senaryo:** Kullanıcı metin gönderir, TTS işlenir

1. Frontend: `pages/welcome.tsx` → Input form
2. API call: `lib/api.ts` → `processText()`
3. Backend: `routes/ttsRoutes.js` → `POST /api/tts/process-text`
4. Controller: `controllers/ttsController.js` → İşleme mantığı
5. Utilities: `utils/cefrAdapter.js`, `utils/googleTts.js`
6. Response: MP3 URL frontend'e döner

### 4. Test Dosyalarını İnceleyin (10 dakika)
- [ ] `docs/testing/test-plan.md`
- [ ] Mevcut testlere göz atın (varsa)

**✅ Gün 3 Tamamlandı!** Kod akışlarını anlıyorsunuz.

---

## 🎨 Gün 4: Özel Modüller (İlgi Alanınıza Göre)

**Süre:** ~2 saat

Aşağıdaki modüllerden ilginizi çekenleri seçin:

### Frontend Geliştirme
- [ ] `docs/codebase/web.md` - Web bileşenleri
- [ ] `docs/ui/web-ui-flows.md` - Kullanıcı akışları
- [ ] `docs/codebase/hooks-utils.md` - Custom hooks

### AI/Chat (Liro)
- [ ] `LIRO_SYSTEM_GUIDE.md` - Liro sistemi detayları
- [ ] `LIRO_USER_PROFILING_SYSTEM.md` - Kullanıcı profilleme
- [ ] `backend/utils/liroPromptGenerator.js` - Prompt oluşturma

### Test ve QA
- [ ] `docs/testing/test-plan.md` - Test stratejisi
- [ ] `docs/testing/qa-checklist.md` - QA kontrol listesi
- [ ] `docs/testing/worst-case-scenarios.md` - Edge case'ler

### Admin Panel
- [ ] `docs/architecture/admin-structure.md` - Admin yapısı
- [ ] `docs/codebase/admin.md` - Admin kod detayları
- [ ] `frontend/src/app/admin/` - Admin sayfaları

### Deployment & DevOps
- [ ] `docs/devops/production-deploy.md` - Production deployment
- [ ] `docs/devops/scaling-strategy.md` - Ölçeklendirme
- [ ] `CLOUDFLARE_TUNNEL_SETUP.md` - Cloudflare tunnel

**✅ Gün 4 Tamamlandı!** Özel modülleri keşfettiniz.

---

## 🚀 Gün 5: İlk Katkı

**Süre:** ~3 saat

### 1. İyi Bir İlk Issue Bulun (30 dakika)
- [ ] GitHub Issues'da `good first issue` etiketli görevlere bakın
- [ ] Veya küçük bir doküman düzeltmesi yapın
- [ ] Veya basit bir bug fix seçin

### 2. Branch Oluşturun ve Geliştirin (1.5 saat)
```bash
git checkout -b feature/my-first-contribution
# Değişikliklerinizi yapın
git add .
git commit -m "feat: açıklayıcı commit mesajı"
git push origin feature/my-first-contribution
```

### 3. Pull Request Açın (30 dakika)
- [ ] GitHub'da PR oluşturun
- [ ] PR template'i doldurun (`.github/pull_request_template.md`)
- [ ] Checklist'teki tüm maddeleri kontrol edin
- [ ] Reviewer atayın (varsa)

### 4. Code Review Sürecini Öğrenin (30 dakika)
- [ ] Feedback'leri okuyun
- [ ] Gerekli değişiklikleri yapın
- [ ] PR merge edilene kadar takip edin

**✅ Gün 5 Tamamlandı!** İlk katkınızı yaptınız! 🎉

---

## 📚 Ek Kaynaklar

### Sık Kullanılan Dokümanlar
- `README.md` - Genel bakış
- `docs/api/endpoints.md` - API referansı
- `docs/database/schema-overview.md` - Veritabanı şeması
- `docs/testing/test-plan.md` - Test stratejisi

### Yardım Alın
- **Slack/Discord:** [Ekip iletişim kanalı]
- **GitHub Issues:** Sorularınızı issue olarak açabilirsiniz
- **Code Review:** PR'larda soru sorabilirsiniz

### Kod Standartları Hatırlatıcı
- ✅ Her zaman TypeScript kullanın (frontend)
- ✅ API'den gelen snake_case → camelCase'e map edin
- ✅ Merkezi tip tanımları kullanın (`src/types/`)
- ✅ i18n için `t()` fonksiyonunu kullanın
- ✅ Commit mesajları: `feat:`, `fix:`, `docs:`, `refactor:` vb.

---

## 🎯 Sonraki Adımlar

Onboarding'i tamamladıktan sonra:

1. **Daha Büyük Görevler:** Orta seviye issue'lara geçin
2. **Kod İncelemeleri:** Diğer PR'ları review edin
3. **Dokümantasyon:** Eksik gördüğünüz yerleri dokümante edin
4. **Mentorluk:** Yeni gelenlere yardım edin

---

**Başarılar!** Sorularınız için ekip ile iletişime geçmekten çekinmeyin.
