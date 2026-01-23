# Testing Strategy & Infrastructure Proposal

> **Oluşturulma:** 2026-01-16 | **Güncelleme:** 2026-01-16 | **Versiyon:** 1.0

## 1. Vizyon ve Hedef
LingRoot projesinin büyümesiyle birlikte, manuel testlerin sürdürülebilirliği azalmaktadır. Hedefimiz, her geliştirme (commit/PR) sonrası otomatik olarak çalışan, "Code -> Build -> Test -> Report" döngüsünü sağlayan bir **Continuous Integration (CI)** hattı kurmaktır. Bu strateji, 'Architech Test Developer' bakış açısıyla hazırlanmıştır.

## 2. Teknoloji Yığını ve Araç Önerileri (Toolchain)

Mevcut teknoloji yığınına (Next.js, React Native, Express/Node.js) en uygun, modern ve bakımı en kolay araçlar seçilmiştir.

| Katman | Teknoloji | Önerilen Test Aracı | Neden? |
| :--- | :--- | :--- | :--- |
| **Backend API** | Node.js / Express | **Jest + Supertest** | Zaten projede kurulu (`package.json`'da var). Hızlı, mock desteği güçlü ve API endpoint testleri için standart. |
| **Web Frontend** | Next.js / React | **Playwright** | Cypress'e göre daha hızlı, Next.js ile daha iyi entegre, çoklu tab/browser desteği var ve kurulumu çok daha basit. Modern web (React Server Components) için en iyisi. |
| **Mobile App** | React Native (Bare/Expo) | **Maestro** | Detox veya Appium'a göre **çok daha kararlı** ve kurulumu kolay. "Black-box" test yapar (uygulama koduna erişmez, kullanıcı gibi davranır). YAML tabanlı flowlar ile test yazmak çok hızlıdır. |
| **CI/CD** | GitHub | **GitHub Actions** | Kodun barındığı yerde (GitHub) native pipeline desteği. MacOS, Linux runner desteği var. |

## 3. Detaylı Uygulama Planı

### 3.1. Backend Otomasyonu (Mevcut İyileştirme)
Backend projesinde `jest` zaten var. Ancak kapsamın artırılması gerekiyor.
- **Unit Tests**: Servis fonksiyonlarının izole testleri.
- **Integration Tests (Supertest)**: `/api/auth/login`, `/api/content/generate` gibi kritik endpointlerin gerçek veritabanı (veya test DB) üzerinde testi.
- **Hedef**: Her PR'da backend testleri 5 dakika içinde koşup bitmeli.

### 3.2. Web E2E (Playwright)
Playwright, headless (arayüzsüz) tarayıcılarda senaryoları koşar.
- **Örnek Senaryo**:
  1. Login sayfasına git.
  2. Test kullanıcısı ile giriş yap.
  3. Dashboard'un yüklendiğini doğrula.
  4. Yeni bir içerik oluşturma butonuna tıkla.
- **Konfigürasyon**: `frontend/playwright.config.ts`

### 3.3. Mobile E2E (Maestro)
Maestro, emülatöre (iOS Simulator / Android Emulator) komut gönderir.
- **Avantaj**: Karmaşık React Native kurulumlarına (Gradle/Pods) dokunmaz. APK/APP dosyasını yükler ve ekranı okur.
- **Örnek Flow (`login.yaml`)**:
  ```yaml
  appId: com.lingroot.mobile
  ---
  - launchApp
  - tapOn: "E-posta ile giriş"
  - inputText: "testuser@lingroot.com"
  - tapOn: "Şifre"
  - inputText: "123456"
  - tapOn: "Giriş Yap"
  - assertVisible: "Hoş Geldiniz"
  ```

## 4. CI/CD Pipeline Mimarisi (GitHub Actions)

Aşağıdaki workflow dosyaları `.github/workflows/` altına eklenecektir.

### Workflow A: Backend & Sanity Check
- **Tetikleyici**: `push` to `main`, `pull_request` (backend/**)
- **Adımlar**:
  1. Checkout code
  2. Setup Node.js & Cache
  3. Install dependencies (`npm ci`)
  4. Run Lint (`npm run lint`)
  5. Run Tests (`npm test`)

### Workflow B: Web E2E (Nightly veya PR)
- **Tetikleyici**: `pull_request` (frontend/**)
- **Adımlar**:
  1. Build Next.js app
  2. Start Local Server (`npm run start`)
  3. Run Playwright Tests against localhost

### Workflow C: Mobile Sanity (Opsiyonel/İleri Seviye)
*Not: Mobil CI ortamı (MacOS runner) GitHub'da pahalıdır (dakikası x10 kredi). Başlangıçta bu testlerin lokalde geliştirici makinesinde koşulması önerilir.*
- **İdeal Senaryo**: Eas Build veya GitHub Actions MacOS runner üzerinde Maestro Cloud kullanımı.

## 5. Önerilen Yol Haritası (Implementation Roadmap)

1.  **Faz 1 (Backend - Hemen):** `backend` klasöründeki mevcut Jest testlerinin çalışır hale getirilmesi ve CI'a bağlanması.
2.  **Faz 2 (Web - Kısa Vade):** `frontend` projesine Playwright kurulumu ve kritik "Login + Ana Sayfa" döngüsünün test edilmesi.
3.  **Faz 3 (Mobile - Orta Vade):** Maestro'nun lokale kurulması ve temel "Smoke Test" (uygulama açılıyor mu?) senaryosunun yazılması.
4.  **Faz 4 (Full CI):** Tüm bu süreçlerin GitHub Actions üzerinde otomatikleşmesi.

## 6. Maliyet ve Kaynak Analizi
- **Playwright/Jest**: Ücretsiz (GitHub Actions Free tier sınırları dahilinde).
- **Maestro**: Açık kaynak (ücretsiz).
- **Build Süreleri**: E2E testleri uzun sürer. Paralel çalıştırma (Sharding) stratejisi gerekebilir.

Bu yapı kurulduğunda, "LingRoot'taki her şeyi otomatik test etsin" hedefine ulaşılmış olacaktır.
