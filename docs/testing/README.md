# LingRoot Test Rehberi

> **Oluşturulma:** 2026-01-16 | **Güncelleme:** 2026-01-17 | **Versiyon:** 3.0

Bu doküman, projeye kurulan otomatik test altyapısının kapsamlı kullanım rehberidir.

---

## 📊 Test Altyapısı Özeti

| Katman | Araç | Test Sayısı | Kapsam |
|--------|------|-------------|--------|
| **Backend** | Jest + Supertest | 382+ | Auth, Admin, Content, TTS, Gaming, Profile, Topics |
| **Web** | Playwright | 300+ | Auth, Navigation, Dashboard, Checkout, Settings |
| **Mobile** | Maestro | 6 Flow | Login, Register, Smoke, Home, Create, Profile |

---

## 1. Backend Testleri (Jest)

### Hızlı Başlangıç
```bash
cd backend
npm test
```

### Sadece Belirli Bir Test Dosyasını Çalıştırma
```bash
npm test -- tests/authController.test.js
```

### Coverage Raporu Görüntüleme
```bash
npm test
# Rapor: backend/coverage/lcov-report/index.html
```

### Coverage Eşikleri
- **Statements:** %50 minimum
- **Branches:** %30 minimum
- **Functions:** %50 minimum
- **Lines:** %50 minimum

---

## 2. Web E2E Testleri (Playwright)

### İlk Kurulum (Bir kez)
```bash
cd frontend
npm install
npx playwright install --with-deps
```

### Tüm Testleri Çalıştırma
```bash
cd frontend
npx playwright test
```

### Görsel Modda Çalıştırma (Debug için)
```bash
npx playwright test --ui
```

### Sadece Chrome'da Çalıştırma
```bash
npx playwright test --project=chromium
```

### Başarısız Testlerin Raporunu Görüntüleme
```bash
npx playwright show-report
```

### Test Dosyaları
- `tests/e2e/auth.spec.ts` - Login, Register, Forgot Password testleri
- `tests/e2e/navigation.spec.ts` - Sayfa navigasyonu ve responsive testleri
- `tests/e2e/example.spec.ts` - Temel örnek test

### Özellikler
- ✅ Multi-browser (Chrome, Firefox, Safari)
- ✅ Mobile viewport testleri (iPhone 12, Pixel 5)
- ✅ Screenshot on failure
- ✅ Video recording on failure
- ✅ Auto-retry (CI'da 2 deneme)

---

## 3. Mobil E2E Testleri (Maestro)

### Maestro Kurulumu (macOS)
```bash
brew install maestro
```

### Emülatör Hazırlığı
1. Android: `npx react-native run-android`
2. iOS: `npx react-native run-ios`

### Testleri Çalıştırma
```bash
cd LingRootMobile

# Smoke test (uygulama açılıyor mu?)
maestro test .maestro/smoke.yaml

# Login flow testi
maestro test .maestro/login.yaml

# Register flow testi
maestro test .maestro/register.yaml

# Tüm testleri çalıştır
maestro test .maestro/
```

### Test Flowları
- `.maestro/smoke.yaml` - Uygulama açılış testi
- `.maestro/login.yaml` - Login ekranı testi
- `.maestro/register.yaml` - Kayıt ekranı testi

---

## 4. CI/CD Entegrasyonu (GitHub Actions)

### Otomatik Tetikleme
- **Backend:** `backend/**` değişikliklerinde
- **Frontend:** `frontend/**` değişikliklerinde

### Workflow Dosyaları
- `.github/workflows/backend.yml`
- `.github/workflows/frontend.yml`

### CI Özellikleri
- ✅ Node.js 20
- ✅ npm cache (hızlı build)
- ✅ Multi-browser Playwright testleri
- ✅ Coverage threshold enforcement

---

## 5. Sorun Giderme

### "Test Timeout" Hatası
```bash
# Timeout süresini artır
npx playwright test --timeout=60000
```

### "Cannot find module" Hatası
```bash
cd backend && npm install
cd frontend && npm install
```

### Maestro "Element not found" Hatası
- Emülatörün açık olduğundan emin ol
- Uygulamanın yüklendiğini kontrol et
- `maestro studio` ile canlı debug yap

---

## 6. Test Yazma Kuralları

### Backend (Jest)
- Mock'ları `jest.doMock()` ile `beforeEach` içinde tanımla
- Her test izole olmalı (`resetModules()`)
- Async işlemlerde `await` kullan

### Web (Playwright)
- Page Object Model tercih et
- `data-testid` attribute'ları kullan
- Network idle bekle: `waitForLoadState('networkidle')`

### Mobile (Maestro)
- Çoklu dil desteği için `optional: true` kullan
- Animation bekleme: `waitForAnimationToEnd`
- Clear state ile başla: `clearState: true`

---

**Son Güncelleme:** 2026-01-17 | **Maintainer:** LingRoot Team






özet: 
🚀 Nasıl Test Edilir?
bash
# Backend testleri
cd backend && npm test
# Web testleri
cd frontend && npx playwright test
# Mobile testleri (emülatör açıkken)
cd LingRootMobile && maestro test .maestro/smoke.yaml