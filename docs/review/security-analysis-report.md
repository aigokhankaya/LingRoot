# LingRoot Kapsamlı Güvenlik Analizi
## DevSecOps SDLC Çerçevesi

> **Oluşturulma:** 2026-01-24 | **Güncelleme:** 2026-01-24 | **Versiyon:** 2.0

---

## 📋 Özet

| Kategori | Kontrol Edilen | Sorunlu | Kapsam |
|----------|----------------|---------|--------|
| 1. Tasarım & Mimari | 3 | 3 | ⚠️ |
| 2. Geliştirme (Kodlama) | 3 | 1 | ✅ |
| 3. Test & Doğrulama | 3 | 3 | ❌ |
| 4. Altyapı & Dağıtım | 3 | 3 | ❌ |
| 5. Zorunlu Kontroller | 4 | 2 | ⚠️ |
| **Kod Analizi Bulguları** | 26 | - | ✅ |

---

## 1️⃣ TASARIM VE MİMARİ AŞAMASI (Shift Left)

### 1.1 Tehdit Modellemesi (STRIDE) ❌ MEVCUT DEĞİL

**Durum:** Dokümante edilmiş bir tehdit modeli bulunamadı.

**STRIDE Analizi (Önerilen):**

| Tehdit | Açıklama | LingRoot Risk Alanı |
|--------|----------|---------------------|
| **S**poofing | Kimlik taklidi | Social login doğrulama, JWT |
| **T**ampering | Veri değiştirme | API request manipulation |
| **R**epudiation | İnkar | Log yetersizliği |
| **I**nformation Disclosure | Bilgi sızıntısı | Error messages, debug routes |
| **D**enial of Service | Hizmet engelleme | Rate limit bypass |
| **E**levation of Privilege | Yetki yükseltme | Admin route koruması |

**Aksiyon:** `docs/security/threat-model.md` oluşturulmalı.

---

### 1.2 Saldırı Yüzeyi Analizi ⚠️ KISMİ

**Tespit Edilen Saldırı Yüzeyi:**

| Yüzey | Endpoint Sayısı | Koruma | Risk |
|-------|-----------------|--------|------|
| Public API | ~50 route | Rate limit (kısmi) | ORTA |
| Auth Endpoints | 12 | Rate limit (kısmi) | YÜKSEK |
| Admin Endpoints | 25 | Auth + Admin MW | DÜŞÜK |
| Debug Endpoints | 4 | Auth (prod'da açık) | KRİTİK |
| Webhook Endpoints | 4 | Signature verify | DÜŞÜK |
| Static Files | 2 dizin | Açık erişim | ORTA |

**Kritik Bulgular:**
- `/api/debug/*` production'da erişilebilir
- `/uploads/*` directory listing açık olabilir
- Social login endpoint'leri rate limit yok

---

### 1.3 En Az Yetki Prensibi ⚠️ KISMİ

| Bileşen | Durum | Sorun |
|---------|-------|-------|
| Supabase RLS | ⚠️ | Service key ile bypass |
| Admin Routes | ✅ | Düzgün korumalı |
| Docker Container | ❌ | Root user ile çalışıyor |
| DB Connection | ⚠️ | Tek pooled user |

**Dockerfile Sorunu:** [Dockerfile:2](file:///Users/gokhankaya/Documents/GitHub/LingRoot/backend/Dockerfile#L2)
```dockerfile
FROM node:20-alpine AS base
# ❌ Non-root user tanımlı değil
```

**Çözüm:**
```dockerfile
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs
```

---

## 2️⃣ GELİŞTİRME (KODLAMA) AŞAMASI

### 2.1 Girdi Doğrulama ✅ MEVCUT

| Mekanizma | Dosya | Durum |
|-----------|-------|-------|
| Joi Validation | `middleware/validation.js` | ✅ |
| express-validator | `middleware/validators.js` | ✅ |
| XSS-Clean | `middleware/security.js` | ✅ |
| HPP | `server.js` | ✅ |

**Eksik:** Bazı route'larda validation uygulanmamış.

---

### 2.2 Bağımlılık Yönetimi (SCA) ⚠️ SORUNLU

**npm audit Sonuçları:**

| Paket | Açık | Seviye | Düzeltilebilir |
|-------|------|--------|----------------|
| form-data ≤2.5.3 | Unsafe random | KRİTİK | `--force` |
| mime <1.4.1 | ReDoS | YÜKSEK | `--force` |
| nodemailer ≤7.0.10 | DoS, Interpretation | ORTA | ✅ |
| lodash 4.x | Prototype Pollution | ORTA | ✅ |
| jszip ≤3.7.1 | Path Traversal | ORTA | `--force` |
| marked ≤4.0.9 | ReDoS | YÜKSEK | ✅ |
| nth-check <2.0.1 | ReDoS | YÜKSEK | ✅ |

**Aksiyon:**
```bash
cd backend && npm audit fix
npm update nodemailer lodash marked
```

---

### 2.3 Sır Yönetimi ✅ MEVCUT

| Kontrol | Durum |
|---------|-------|
| .env gitignore'da | ✅ |
| Hardcoded API key yok | ✅ |
| Production JWT check | ✅ (`authController.js:17-25`) |
| Vault kullanımı | ❌ (Değil ama env yeterli) |

**Sorun:** JWT default fallback hala var (`auth.js:11`).

---

## 3️⃣ TEST VE DOĞRULAMA AŞAMASI

### 3.1 SAST (Static Analysis) ❌ MEVCUT DEĞİL

**Durum:** Otomatik statik kod analizi yapılmıyor.

**Önerilen Araçlar:**
- **ESLint Security Plugin**: `eslint-plugin-security`
- **Semgrep**: Open source SAST
- **SonarQube**: Enterprise seviye

**CI/CD Entegrasyonu (.github/workflows/security.yml):**
```yaml
- name: Run Semgrep
  uses: returntocorp/semgrep-action@v1
  with:
    config: p/security-audit
```

---

### 3.2 DAST (Dynamic Analysis) ❌ MEVCUT DEĞİL

**Durum:** Çalışan uygulamaya karşı güvenlik testi yapılmıyor.

**Önerilen Araçlar:**
- **OWASP ZAP**: Açık kaynak, CI/CD entegrasyonu
- **Burp Suite**: Manuel test için
- **Nuclei**: Template-based scanner

---

### 3.3 IAST ❌ MEVCUT DEĞİL

**Durum:** Interactive test aracı kullanılmıyor.

**Öneri:** Staging ortamında Contrast Security veya Hdiv.

---

## 4️⃣ ALTYAPI VE DAĞITIM AŞAMASI

### 4.1 IaC Taraması ⚠️ SORUNLU

**render.yaml Bulguları:** [render.yaml](file:///Users/gokhankaya/Documents/GitHub/LingRoot/backend/render.yaml)

| Satır | Sorun | Seviye |
|-------|-------|--------|
| 16 | DB_HOST hardcoded | DÜŞÜK |
| 29-32 | JWT 10 yıl expire | ORTA |
| 9 | healthCheckPath: / (bilgi sızıntısı) | DÜŞÜK |

**Önerilen Araç:** `checkov`, `tfsec` (Terraform için)

---

### 4.2 Konteyner Güvenliği ⚠️ SORUNLU

**Dockerfile Analizi:** [Dockerfile](file:///Users/gokhankaya/Documents/GitHub/LingRoot/backend/Dockerfile)

| Sorun | Satır | Risk |
|-------|-------|------|
| Root user | - | YÜKSEK |
| Alpine base (iyi) | 2 | ✅ |
| pip install no-hash | 16 | ORTA |
| npm ci production | 25 | ✅ |

**Tarama Önerisi:**
```bash
docker scan lingroot-backend:latest
# veya
trivy image lingroot-backend:latest
```

---

### 4.3 WAF (Web Application Firewall) ❌ MEVCUT DEĞİL

**Durum:** Uygulama önünde WAF yok.

**Öneriler:**
- **Cloudflare WAF**: Zaten Cloudflare Tunnel kullanılıyor
- **AWS WAF**: AWS kullanılıyorsa
- **ModSecurity**: Self-hosted

---

## 5️⃣ ZORUNLU KONTROLLER (OWASP Top 10)

### 5.1 Authentication & Authorization ⚠️ KISMİ

| Kontrol | Durum | Detay |
|---------|-------|-------|
| Şifre hash (bcrypt) | ✅ | 10 rounds |
| JWT Authentication | ✅ | |
| Refresh Token | ✅ | |
| **MFA** | ❌ | **MEVCUT DEĞİL** |
| Session Management | ⚠️ | Token-based, revocation yok |
| Password Policy | ⚠️ | Min 6 karakter (zayıf) |

**Kritik Eksik: MFA (Multi-Factor Authentication)**

---

### 5.2 HTTPS/TLS Şifreleme ✅ MEVCUT

| Katman | Durum |
|--------|-------|
| Cloudflare → Client | ✅ (Cloudflare TLS) |
| Backend SSL | ⚠️ `rejectUnauthorized: false` |
| DB SSL | ✅ (Supabase) |

**Sorun:** [db.js:64](file:///Users/gokhankaya/Documents/GitHub/LingRoot/backend/config/db.js#L64)
```javascript
ssl: useSSL ? { rejectUnauthorized: false } : false
// ❌ Production'da true olmalı
```

---

### 5.3 Loglama ve İzleme ⚠️ KISMİ

**Mevcut Sistem:** [logger.js](file:///Users/gokhankaya/Documents/GitHub/LingRoot/backend/utils/common/logger.js)

| Özellik | Durum |
|---------|-------|
| Winston Logger | ✅ |
| File + Console | ✅ |
| Log Rotation | ✅ (5MB, 5 files) |
| Sensitive Data Masking | ✅ (`sanitizeLogContent`) |
| Centralized Logging | ❌ |
| Alerting | ❌ |
| SIEM Entegrasyonu | ❌ |

**Kritik Eksikler:**
- Centralized log aggregation (ELK, Datadog, Supabase Logs)
- Anomali tespiti ve alerting
- Login attempt monitoring

---

### 5.4 Veri Yedekleme ❓ BİLİNMİYOR

**Supabase:**
- Otomatik günlük yedekleme (Supabase tarafı)
- Point-in-time recovery (Pro plan)

**Uygulama Dosyaları:**
- Cloudflare R2 yedekleme stratejisi? ❓

**Aksiyon:** Backup policy dokümante edilmeli.

---

## 📊 KOD ANALİZİ BULGULARI (Önceki Rapordan)

### Kritik (5)
1. JWT Default Secret - `auth.js:11`
2. CORS Bypass - `server.js:108-111`
3. npm Vulnerabilities (7 paket)
4. Supabase Service Key RLS Bypass
5. Social Login Rate Limiting Eksik

### Yüksek (8)
6. Debug Routes Production'da Aktif
7. JWT 10 Yıl Ömür
8. Error Response Bilgi Sızıntısı
9. Stripe Webhook Body Parsing
10. File Upload Magic Bytes Eksik
11. Google JSON Parse Error Handling
12. Request Body 50MB Limit
13. Static File Directory Listing

### Orta (9)
14-22. Auth middleware duplicate, rate limit skip, vb.

### Düşük (4)
23-26. HSTS, CSP, Cookie flags

---

## 🎯 ÖNCELİKLİ AKSİYON PLANI

### Faz 1: Acil (Bu Hafta)
| # | Aksiyon | Dosya |
|---|---------|-------|
| 1 | CORS bypass düzeltme | server.js:110 |
| 2 | JWT fallback kaldırma | auth.js:11 |
| 3 | npm audit fix | backend/ |
| 4 | Social login rate limit | authRoutes.js |
| 5 | Debug routes prod disable | server.js |

### Faz 2: Kısa Vade (2 Hafta)
| # | Aksiyon |
|---|---------|
| 6 | JWT expire süreleri düzenleme |
| 7 | Docker non-root user |
| 8 | Google token signature verify |
| 9 | SAST (Semgrep) CI/CD |
| 10 | Centralized logging |

### Faz 3: Orta Vade (1 Ay)
| # | Aksiyon |
|---|---------|
| 11 | Tehdit modeli dokümantasyonu |
| 12 | WAF aktivasyonu (Cloudflare) |
| 13 | DAST (ZAP) staging |
| 14 | Password policy güçlendirme |
| 15 | Backup policy dokümantasyonu |

### Faz 4: Uzun Vade (3 Ay)
| # | Aksiyon |
|---|---------|
| 16 | MFA implementasyonu |
| 17 | SIEM entegrasyonu |
| 18 | Penetration test |
| 19 | Security awareness training |
| 20 | Incident response plan |

---

## ✅ UYUMLULUK MATRİSİ

| DevSecOps Maddesi | Durum | Not |
|-------------------|-------|-----|
| **Tasarım** | | |
| Tehdit Modellemesi | ❌ | Oluşturulmalı |
| Saldırı Yüzeyi | ⚠️ | Kısmi analiz |
| En Az Yetki | ⚠️ | Docker/Supabase sorunları |
| **Geliştirme** | | |
| Girdi Doğrulama | ✅ | Joi + express-validator |
| SCA (Bağımlılık) | ⚠️ | npm audit sorunları |
| Sır Yönetimi | ✅ | .env kullanımı |
| **Test** | | |
| SAST | ❌ | CI/CD'ye eklenmeli |
| DAST | ❌ | Staging'de başlatılmalı |
| IAST | ❌ | Opsiyonel |
| **Altyapı** | | |
| IaC Taraması | ❌ | checkov önerilir |
| Konteyner Güvenliği | ⚠️ | Trivy taraması gerekli |
| WAF | ❌ | Cloudflare WAF önerilir |
| **Zorunlu** | | |
| AuthN/AuthZ | ⚠️ | MFA eksik |
| HTTPS/TLS | ✅ | Cloudflare |
| Loglama | ⚠️ | Centralized eksik |
| Yedekleme | ❓ | Dokümante değil |

---

> [!CAUTION]
> **Bu rapor 26 kod seviyesi + 12 DevSecOps yaşam döngüsü açığı tespit etmiştir.**
> Faz 1 aksiyonları production deploy öncesi ZORUNLUDUR.
