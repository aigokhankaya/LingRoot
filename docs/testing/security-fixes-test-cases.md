# Guvenlik Duzeltmeleri Test Caseleri

> **Created:** 2026-02-02 | **Updated:** 2026-02-02 | **Version:** 2.0

Bu dokuman, `fixed-security-issues` branch'indeki Faz 1, Faz 2 ve Faz 3 guvenlik duzeltmelerinin test planini icerir.

---

## Icindekiler

- [Faz 1 Test Caseleri](#faz-1-test-caseleri)
  - [K4 — CORS](#k4--cors)
  - [K6 — Reset Kodu Log](#k6--reset-kodu-log)
  - [K7 — Debug Route'lar](#k7--debug-routelar)
  - [Y1 — JWT Secret Guard](#y1--jwt-secret-guard)
  - [Y5 — Social Login Rate Limit](#y5--social-login-rate-limit)
- [Faz 2 Test Caseleri](#faz-2-test-caseleri)
  - [K1 — Google JWT Verification](#k1--google-jwt-verification)
  - [K2 — Apple JWT Verification](#k2--apple-jwt-verification)
  - [K3 — Apple Server Notifications](#k3--apple-server-notifications)
  - [K5 — iyzico Callback Verification](#k5--iyzico-callback-verification)
  - [Y2 — JWT Expire Times](#y2--jwt-expire-times)
  - [Y4 — Reset Code crypto.randomBytes](#y4--reset-code-cryptorandombytes)
  - [Y7 — Access Token Header](#y7--access-token-header)
  - [Y8 — Response Sanitizer](#y8--response-sanitizer)
  - [Y9 — Body Parser Limit](#y9--body-parser-limit)
- [Faz 3 Test Caseleri](#faz-3-test-caseleri)
  - [Y3 — Token Blacklist / Logout](#y3--token-blacklist--logout)
  - [Y6 — Refresh Token Rate Limit](#y6--refresh-token-rate-limit)
  - [Y10 — File Upload Magic Bytes](#y10--file-upload-magic-bytes)
  - [O1 — SSL rejectUnauthorized](#o1--ssl-rejectunauthorized)
  - [O2 — JWT Algorithm Enforcement](#o2--jwt-algorithm-enforcement)
  - [O4 — Password Policy](#o4--password-policy)
  - [O5 — Reset Code Expire 15 dk](#o5--reset-code-expire-15-dk)
  - [O6 — Helmet CSP](#o6--helmet-csp)
  - [O7 — Static File Directory Listing](#o7--static-file-directory-listing)
  - [O8 — DB Username from Env](#o8--db-username-from-env)
  - [O9 — Logger Masking](#o9--logger-masking)
- [Genel Regression](#genel-regression)
- [Yeni Env Degiskenleri](#yeni-env-degiskenleri)

---

## Faz 1 Test Caseleri

### K4 — CORS

**Dosya:** `backend/server.js:116`
**Degisiklik:** Izinsiz origin'ler artik `callback(new Error(...))` ile reddediliyor.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Izinli origin | `curl -H "Origin: https://lingroot.com" http://localhost:5001/api/health` | 200 OK, `Access-Control-Allow-Origin` header mevcut | [ ] |
| 2 | Izinsiz origin | `curl -H "Origin: https://evil.com" http://localhost:5001/api/health` | CORS error, `Access-Control-Allow-Origin` header YOK | [ ] |
| 3 | Origin yok (mobile/curl) | `curl http://localhost:5001/api/health` | 200 OK (origin olmadan gecmeli) | [ ] |
| 4 | Development mode | `NODE_ENV=development` ile izinsiz origin gonder | 200 OK (dev modda hepsi gecerli) | [ ] |
| 5 | Preflight OPTIONS | `curl -X OPTIONS -H "Origin: https://lingroot.com" -H "Access-Control-Request-Method: POST" http://localhost:5001/api/auth/login` | 204, CORS header'lari mevcut | [ ] |
| 6 | Frontend uzerinden | Web frontend'den normal navigasyon | Calisiyor, CORS hatasi yok | [ ] |

---

### K6 — Reset Kodu Log

**Dosya:** `backend/controllers/authController.js:1272-1283`
**Degisiklik:** Production loglarinda reset kodu gorunmuyor.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Prod'da forgot-password | `NODE_ENV=production` + POST `/api/auth/forgot-password` body: `{"email":"test@test.com"}` | Log'da `Reset code generated for email=...` mesaji, `code=` icermiyor | [ ] |
| 2 | Dev'de forgot-password | `NODE_ENV=development` + POST `/api/auth/forgot-password` body: `{"email":"test@test.com"}` | Log'da debug seviyesinde kod gorunur | [ ] |
| 3 | Mail basarisiz (prod) | SMTP kapatilmis + `NODE_ENV=production` + forgot-password | Log'da sadece `Reset email send failed for ...`, kod yok | [ ] |
| 4 | Mail basarisiz (dev) | SMTP kapatilmis + `NODE_ENV=development` + forgot-password | Log'da debug seviyesinde kod gorunur, warn mesaji | [ ] |
| 5 | Grep kontrolu | `grep -r "code=" logs/` (prod log dosyasi) | Reset kodu iceren satir OLMAMALI | [ ] |

---

### K7 — Debug Route'lar

**Dosya:** `backend/server.js:192`
**Degisiklik:** Debug route'lar sadece `NODE_ENV=development` ise mount ediliyor.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Prod'da debug GET | `NODE_ENV=production` + GET `/api/debug/tts-debug` | 404 Not Found | [ ] |
| 2 | Prod'da debug POST | `NODE_ENV=production` + POST `/api/debug/tts-debug` body: `{"test":1}` | 404 Not Found | [ ] |
| 3 | Prod'da user-profile | `NODE_ENV=production` + GET `/api/debug/user-profile` | 404 Not Found | [ ] |
| 4 | Dev'de debug GET | `NODE_ENV=development` + GET `/api/debug/tts-debug` | 200 OK (calisiyor) | [ ] |
| 5 | Dev'de debug POST | `NODE_ENV=development` + POST `/api/debug/tts-debug` body: `{"test":1}` | 200 OK | [ ] |
| 6 | Startup logu (prod) | `NODE_ENV=production` ile sunucuyu baslat | `[SECURITY] Debug routes disabled in production` log mesaji | [ ] |

---

### Y1 — JWT Secret Guard

**Dosya:** `backend/middleware/auth.js:10-14`
**Degisiklik:** Production'da JWT_SECRET yoksa veya default ise process.exit(1).

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Prod + JWT_SECRET yok | `NODE_ENV=production JWT_SECRET= node server.js` | Process exit (1), `SECURITY_CRITICAL` log mesaji | [ ] |
| 2 | Prod + default key | `NODE_ENV=production JWT_SECRET=lingroot-secret-key-for-development node server.js` | Process exit (1) | [ ] |
| 3 | Prod + gercek key | `NODE_ENV=production JWT_SECRET=my-real-secret-key-here node server.js` | Normal baslangic | [ ] |
| 4 | Dev + JWT_SECRET yok | `NODE_ENV=development` + JWT_SECRET bos | Calisiyor, warn logu gorunur | [ ] |
| 5 | Dev + JWT_SECRET var | `NODE_ENV=development JWT_SECRET=test-key` | Calisiyor, warn yok | [ ] |

---

### Y5 — Social Login Rate Limit

**Dosya:** `backend/routes/authRoutes.js:27-31`
**Degisiklik:** Tum social login route'larina `authLimiter` eklendi.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Normal Google login | POST `/api/auth/google` body: `{"credential":"..."}` | Normal response (200/400) | [ ] |
| 2 | Rate limit asimi (Google) | Ayni IP'den hizla arda arda 20+ istek POST `/api/auth/google` | 429 Too Many Requests | [ ] |
| 3 | Rate limit asimi (Apple) | Ayni IP'den hizla arda arda 20+ istek POST `/api/auth/apple` | 429 Too Many Requests | [ ] |
| 4 | Rate limit asimi (Facebook) | Ayni IP'den hizla arda arda 20+ istek POST `/api/auth/facebook-login` | 429 Too Many Requests | [ ] |
| 5 | Rate limit reset | Limit asildiktan sonra window suresi bekle | Yeniden istek gonderebilir | [ ] |
| 6 | Farkli IP'ler | Farkli IP'lerden ayni endpoint'e istek | Her IP kendi limiti icinde calisiyor | [ ] |

---

## Faz 2 Test Caseleri

### K1 — Google JWT Verification

**Dosya:** `backend/controllers/authController.js:696`
**Degisiklik:** `google-auth-library` ile `verifyIdToken()` kullaniliyor.
**Gerekli Env:** `GOOGLE_CLIENT_ID`

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Gecerli Google One Tap JWT | Frontend'den Google One Tap ile giris | Basarili login, `JWT verification successful` logu | [ ] |
| 2 | Gecerli Google Access Token | Frontend'den Google OAuth popup ile giris | Basarili login, `Access token user info received` logu | [ ] |
| 3 | Sahte/bozuk JWT | `curl -X POST /api/auth/google -H "Content-Type: application/json" -d '{"credential":"fake.jwt.token"}'` | 400, `Credential decode failed` | [ ] |
| 4 | Baska app'in JWT'si | Farkli Google Client ID ile uretilmis token | 400 (audience mismatch hatasi) | [ ] |
| 5 | Suresi dolmus JWT | Eski bir Google JWT token | 400, verification hatasi | [ ] |
| 6 | GOOGLE_CLIENT_ID eksik | Env'den sil, login dene | Login basarisiz, anlamli hata logu | [ ] |
| 7 | Mobile Google login | React Native'den Google login | Basarili login | [ ] |

---

### K2 — Apple JWT Verification

**Dosya:** `backend/controllers/authController.js:898`
**Degisiklik:** `apple-signin-auth` ile `verifyIdToken()` kullaniliyor.
**Gerekli Env:** `APPLE_CLIENT_ID`

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Gecerli Apple identity token | iOS uygulamadan Apple Sign In | Basarili login, `Token verification successful` logu | [ ] |
| 2 | Suresi dolmus token | Eski bir Apple identity token ile deneme | 400, `INVALID_TOKEN` | [ ] |
| 3 | Sahte token | Manuel olusturulmus JWT gonder | 400, `INVALID_TOKEN` | [ ] |
| 4 | APPLE_CLIENT_ID yanlis | Env'de hatali deger | Apple login basarisiz (audience mismatch) | [ ] |
| 5 | Ilk giris (email var) | Yeni Apple kullanici, email paylasarak | Hesap olusur, email kaydedilir | [ ] |
| 6 | Tekrar giris (email yok) | Mevcut Apple kullanici, email paylasmadan | `sub` ile mevcut hesap bulunur, giris basarili | [ ] |

---

### K3 — Apple Server Notifications

**Dosya:** `backend/controllers/appleNotificationsController.js`
**Degisiklik:** JWS imza dogrulamasi (x5c sertifika zinciri ile).

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Gecerli Apple notification | Apple Sandbox'tan gelen bildirim (test subscription) | 200, payload dogrulandi ve islendi | [ ] |
| 2 | Sahte signedPayload | `curl -X POST /api/apple-notifications -H "Content-Type: application/json" -d '{"signedPayload":"fake.payload.here"}'` | 403, `Signature verification failed` | [ ] |
| 3 | Gecersiz sertifika | Apple disinda bir issuer ile imzalanmis JWS | 403, `Certificate not issued by Apple` | [ ] |
| 4 | Bozuk JWS formati | `curl -X POST /api/apple-notifications -H "Content-Type: application/json" -d '{"signedPayload":"not-a-jws"}'` | 403, `Invalid JWS format` | [ ] |
| 5 | signedPayload eksik | `curl -X POST /api/apple-notifications -H "Content-Type: application/json" -d '{}'` | 400, `Missing signedPayload` | [ ] |
| 6 | DID_RENEW bildirimi | Apple Sandbox'ta subscription yenilenmesi | Subscription expiry guncellenir | [ ] |
| 7 | EXPIRED bildirimi | Apple Sandbox'ta subscription suresi dolmasi | Subscription `expired` olarak isaretlenir | [ ] |
| 8 | Sandbox endpoint | POST `/api/apple-notifications/sandbox` | Ayni dogrulama, farkli log prefix | [ ] |

---

### K5 — iyzico Callback Verification

**Dosya:** `backend/controllers/iyzicoController.js:283`
**Degisiklik:** Callback'te `/payment/detail` ile sunucu tarafli dogrulama eklendi.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Basarili 3D Secure odeme | iyzico sandbox'ta test karti ile odeme tamamla | Odeme tamamlanir, `Server-side payment verified` logu | [ ] |
| 2 | Sahte callback | `curl -X POST /api/iyzico/callback -d "status=success&paymentId=FAKE123&conversationId=FAKE456&mdStatus=1"` | `Payment_verification_failed` redirect'i | [ ] |
| 3 | mdStatus basarisiz | 3D Secure basarisiz test karti ile odeme | `3D_verification_failed` redirect'i, transaction `failed` | [ ] |
| 4 | Gecersiz conversationId | Olmayan conversationId ile callback | `Transaction_not_found` redirect'i | [ ] |
| 5 | iyzico API erisim hatasi | iyzico sandbox down iken callback | 500 veya verification failed | [ ] |
| 6 | Basarili odeme sonrasi plan | Odeme tamamlandiktan sonra profil kontrol | `plan: 'pro'` olarak guncellenmis | [ ] |

---

### Y2 — JWT Expire Times

**Dosya:** `backend/controllers/authController.js:37`
**Degisiklik:** Access token: `3650d` → `15m`, Refresh token: `3650d` → `7d`

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Access token suresi | Login sonrasi access token'i decode et (jwt.io) | `exp` simdiden ~15 dakika sonra | [ ] |
| 2 | Refresh token suresi | Login sonrasi refresh token'i decode et | `exp` simdiden ~7 gun sonra | [ ] |
| 3 | Access token expire | 16 dk bekle, access token ile API cagir | 401, `TOKEN_EXPIRED` | [ ] |
| 4 | Refresh ile yenileme | Expire olmus access token sonrasi POST `/api/auth/refresh` | Yeni access token alinir (15m expire) | [ ] |
| 5 | Refresh token expire | 8 gun bekle (veya test icin kisa sure ayarla), refresh dene | 401, yeni login gerekli | [ ] |
| 6 | Mevcut kullanicilar | Eski 10-yillik token ile API cagir | Token hala gecerli (expire dolmamis) | [ ] |
| 7 | Env override | `JWT_EXPIRES_IN=1h JWT_REFRESH_EXPIRES_IN=30d` ile baslat | Override degerleri uygulanir | [ ] |
| 8 | Mobile remember me | Mobil'de "Beni hatirla" ile giris | Refresh token ile oturum devam eder | [ ] |

**Onemli Not:** Bu degisiklik mevcut kullanicilarin token'larini invalidate ETMEZ. Mevcut uzun sureli token'lar expire'larina kadar gecerli kalir. Yeni login yapan kullanicilar yeni sureleri alir.

---

### Y4 — Reset Code crypto.randomBytes

**Dosya:** `backend/controllers/authController.js:1223`
**Degisiklik:** `Math.random()` → `crypto.randomBytes(4)`

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Forgot password | POST `/api/auth/forgot-password` body: `{"email":"test@test.com"}` | 6 haneli kod uretilir, DB'ye yazilir | [ ] |
| 2 | Kod formati | 10 kez arka arkaya forgot-password cagir, kodlari kontrol et | Her zaman 6 hane, 100000-999999 arasi | [ ] |
| 3 | Reset flow end-to-end | Kod al → POST `/api/auth/reset-password` ile sifre degistir | Basarili sifre degisikligi | [ ] |
| 4 | Yanlis kod denemesi | Yanlis 6 haneli kod ile reset-password | Basarisiz, sifre degismez | [ ] |
| 5 | Kod tekrarsizligi | 100 kod uretip duplicate kontrol | Duplicate orani dusmeli (istatistiksel) | [ ] |

---

### Y7 — Access Token Header

**Dosya:** `backend/controllers/authController.js:707,540`
**Degisiklik:** Google ve Facebook access token'lari URL query yerine `Authorization` header ile gonderiliyor.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Google access token login | Google OAuth popup ile giris | Basarili, sunucu loglarinda URL'de token gorulmez | [ ] |
| 2 | Facebook login | Facebook ile giris | Basarili, token header'da gonderilir | [ ] |
| 3 | Log inceleme | Sunucu loglarinda `access_token=` aranmasi | URL'de access token iceren log satiri YOK | [ ] |

---

### Y8 — Response Sanitizer

**Dosya:** `backend/server.js` (global middleware)
**Degisiklik:** Production'da `{ success: false, ..., error: "..." }` response'larindaki `error` field'i strip ediliyor.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Dev'de hata response | `NODE_ENV=development`, bir hata tetikle (orn: gecersiz endpoint) | Response'da `error` field'i gorunur | [ ] |
| 2 | Prod'da hata response | `NODE_ENV=production`, ayni hatayi tetikle | Response'da `error` field'i YOK, sadece `message` var | [ ] |
| 3 | Basarili response | Normal basarili API cagirisi (orn: GET `/api/auth/me`) | Degisiklik yok, `success: true` doner | [ ] |
| 4 | Basarili + error field | `{ success: true, error: 'some info' }` donen endpoint (nadir) | Strip edilMEZ (sadece `success: false` strip edilir) | [ ] |
| 5 | iyzico hata | iyzico baglanti hatasi tetikle | Prod: `error.message` gorulmez, dev: gorulur | [ ] |
| 6 | Auth hatasi | Gecersiz token ile istek | 401 response, `error` field'i yok (prod'da) | [ ] |

---

### Y9 — Body Parser Limit

**Dosya:** `backend/server.js:144`
**Degisiklik:** Genel JSON body limiti `50mb` → `1mb`.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Normal API istegi | Kucuk JSON body ile herhangi bir API cagir | 200 OK | [ ] |
| 2 | 1MB ustu JSON | `python3 -c "print('{\"data\":\"' + 'x'*2000000 + '\"}')" \| curl -X POST -H "Content-Type: application/json" -d @- http://localhost:5001/api/auth/login` | 413 Payload Too Large | [ ] |
| 3 | Tam 1MB JSON | 1MB boyutunda JSON body gonder | 200 OK (kabul edilir) | [ ] |
| 4 | Dosya yukleme (multer) | POST `/api/content/upload` ile dosya yukle | Calisiyor (multer JSON limitinden bagimsiz) | [ ] |
| 5 | TTS istegi | Normal uzunlukta metin ile TTS islemi | Calisiyor (metin 1MB altinda) | [ ] |
| 6 | Buyuk admin upload | Admin panelinden dosya yukleme | Calisiyor (multer uzerinden) | [ ] |

---

## Faz 3 Test Caseleri

### Y3 — Token Blacklist / Logout

**Dosya:** `backend/middleware/auth.js:17-27`, `backend/controllers/authController.js` (logout)
**Degisiklik:** Logout'ta token Redis'e blacklist olarak ekleniyor. Auth middleware blacklist kontrolu yapiyor.
**Gerekli:** Redis baglantisi aktif

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Logout sonrasi token gecersiz | Login → token al → POST `/api/auth/logout` → ayni token ile GET `/api/auth/me` | 401, `TOKEN_REVOKED` | [ ] |
| 2 | Logout response | POST `/api/auth/logout` (gecerli token ile) | 200, `{ success: true }` | [ ] |
| 3 | Farkli token gecerli | User A logout → User B token ile API cagir | 200 OK (B etkilenmez) | [ ] |
| 4 | Redis down durumu | Redis kapatilmis + logout + ayni token ile istek | Fail-open: istek gecerli (Redis yoksa blacklist kontrolu atlanir) | [ ] |
| 5 | Token TTL | Logout sonrasi Redis'te `bl:<token>` key'ini kontrol et | Key var, TTL token'in kalan expire suresi kadar | [ ] |
| 6 | Expire olmus token + blacklist | Suresi dolmus token ile istek | 401, `TOKEN_EXPIRED` (blacklist'ten once expire kontrolu) | [ ] |
| 7 | Optional auth + blacklisted | Blacklisted token ile optionalAuth endpoint'ine istek | `req.user = null`, 200 OK | [ ] |

---

### Y6 — Refresh Token Rate Limit

**Dosya:** `backend/middleware/security.js:119-129`, `backend/routes/authRoutes.js:13`
**Degisiklik:** `/api/auth/refresh` endpoint'ine `refreshLimiter` (15 dk / 30 istek) eklendi.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Normal refresh | POST `/api/auth/refresh` body: `{"refreshToken":"..."}` | 200, yeni token'lar | [ ] |
| 2 | Rate limit asimi | Ayni IP'den 31+ hizli refresh istegi | 429, `RATE_LIMIT_EXCEEDED` | [ ] |
| 3 | Window sonrasi reset | 15 dk bekle, tekrar dene | 200 OK | [ ] |
| 4 | Farkli IP | Farkli IP'den refresh | Her IP bagimsiz limitte | [ ] |
| 5 | Headers kontrolu | Response header'larini incele | `RateLimit-*` header'lari mevcut | [ ] |

---

### Y10 — File Upload Magic Bytes

**Dosya:** `backend/routes/contentRoutes.js:16-26` (multer config), `contentRoutes.js:74-88` (magic bytes)
**Degisiklik:** Multer'a `fileFilter` eklendi (izin verilen uzantilar), upload handler'a `file-type` ile magic bytes dogrulamasi eklendi.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Gecerli PDF yukleme | POST `/api/content/upload` ile gercek PDF dosyasi | 200, metin cikarilir | [ ] |
| 2 | Gecerli DOCX yukleme | POST `/api/content/upload` ile gercek DOCX dosyasi | 200, metin cikarilir | [ ] |
| 3 | Gecerli TXT yukleme | POST `/api/content/upload` ile .txt dosyasi | 200, metin cikarilir | [ ] |
| 4 | Izinsiz uzanti | `.exe` dosya yukle | 400, `Desteklenmeyen dosya formati: .exe` | [ ] |
| 5 | Uzanti spoofing | `.jpg` dosyasini `.pdf` olarak yeniden adlandir ve yukle | 400, `Dosya icerigi uzantiyla uyusmuyor` | [ ] |
| 6 | Bos dosya | Bos `.txt` dosyasi yukle | 400, `Belge bos gorunuyor` | [ ] |
| 7 | 10MB ustu dosya | 11MB'lik dosya yukle | 400, multer limit hatasi | [ ] |
| 8 | Gecerli EPUB yukleme | POST `/api/content/upload` ile gercek EPUB dosyasi | 200, metin cikarilir | [ ] |

---

### O1 — SSL rejectUnauthorized

**Dosya:** `backend/config/db.js:64`
**Degisiklik:** SSL `rejectUnauthorized` production'da `true`, dev'de `false`.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Prod + gecerli cert | `NODE_ENV=production` + Supabase baglantisi | Basarili baglanti (gecerli SSL cert) | [ ] |
| 2 | Prod + gecersiz cert | `NODE_ENV=production` + self-signed cert ile DB | Baglanti reddedilir (SSL hatasi) | [ ] |
| 3 | Dev + herhangi cert | `NODE_ENV=development` + herhangi bir DB | Basarili baglanti (cert dogrulanmaz) | [ ] |
| 4 | Startup logu | DB baglanti log mesajini kontrol | `ssl: true/false` bilgisi mevcut | [ ] |

---

### O2 — JWT Algorithm Enforcement

**Dosya:** `backend/middleware/auth.js:61,151`
**Degisiklik:** `jwt.verify()` cagirilarina `{ algorithms: ['HS256'] }` parametresi eklendi.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | HS256 token | Normal login ile alinan token | Dogrulama basarili | [ ] |
| 2 | None algorithm | `alg: "none"` ile olusturulmus token | 401, `INVALID_TOKEN` | [ ] |
| 3 | RS256 token | RS256 ile imzalanmis token gonder | 401, `INVALID_TOKEN` (algorithm mismatch) | [ ] |
| 4 | HS384 token | HS384 ile imzalanmis token gonder | 401, `INVALID_TOKEN` | [ ] |

---

### O4 — Password Policy

**Dosya:** `backend/controllers/authController.js` (register + changePassword)
**Degisiklik:** Sifre min 8 karakter, en az 1 buyuk harf, en az 1 rakam icermeli.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Gecerli sifre | Register: `{"password":"Secure1234"}` | Basarili kayit | [ ] |
| 2 | Cok kisa (7 char) | Register: `{"password":"Abc123!"}` | 400, sifre politikasi hatasi | [ ] |
| 3 | Buyuk harf yok | Register: `{"password":"secure1234"}` | 400, sifre politikasi hatasi | [ ] |
| 4 | Rakam yok | Register: `{"password":"Securepass"}` | 400, sifre politikasi hatasi | [ ] |
| 5 | change-password | PUT `/api/auth/change-password` body: `{"newPassword":"weak"}` | 400, sifre politikasi hatasi | [ ] |
| 6 | Sinir deger (tam 8) | Register: `{"password":"Abcdefg1"}` | Basarili | [ ] |
| 7 | Mevcut kullanicilar | Mevcut zayif sifreli kullanici ile login | Login basarili (retroaktif degil) | [ ] |

---

### O5 — Reset Code Expire 15 dk

**Dosya:** `backend/controllers/authController.js`
**Degisiklik:** Reset kodu expire suresi 60 dk → 15 dk.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | 5 dk icinde kullan | Forgot → 5 dk sonra reset-password | Basarili sifre degisimi | [ ] |
| 2 | 14 dk icinde kullan | Forgot → 14 dk sonra reset-password | Basarili | [ ] |
| 3 | 16 dk sonra kullan | Forgot → 16 dk sonra reset-password | 400, kod suresi dolmus | [ ] |
| 4 | DB kaydi | Forgot sonrasi DB'de `reset_code_expires` degerini kontrol | Simdiden ~15 dk sonra | [ ] |

---

### O6 — Helmet CSP

**Dosya:** `backend/server.js:87-103`
**Degisiklik:** Helmet CSP directives acikca tanimlanmis (defaultSrc, scriptSrc, connectSrc, frameAncestors, HSTS).

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | CSP header | `curl -I http://localhost:5001/api/health` | `Content-Security-Policy` header mevcut, `default-src 'self'` iceriyor | [ ] |
| 2 | HSTS header | `curl -I http://localhost:5001/api/health` | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` | [ ] |
| 3 | X-Frame-Options | Response header'lari kontrol | `X-Frame-Options` mevcut | [ ] |
| 4 | COOP header | Response header'lari kontrol | `Cross-Origin-Opener-Policy: same-origin-allow-popups` | [ ] |
| 5 | CORP header | Response header'lari kontrol | `Cross-Origin-Resource-Policy: cross-origin` | [ ] |
| 6 | Iframe engelleme | Frontend'de `<iframe src="backend-url">` dene | Engellenir (frameAncestors: none) | [ ] |

---

### O7 — Static File Directory Listing

**Dosya:** `backend/server.js:160-161`
**Degisiklik:** `/uploads` ve `/public` static serve'a `{ index: false, dotfiles: 'deny' }` eklendi.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Directory listing | GET `/uploads/` | 403/404 (dizin listeleme yok) | [ ] |
| 2 | Gecerli dosya | GET `/uploads/var-olan-dosya.mp3` | 200, dosya indirilir | [ ] |
| 3 | Dotfile erisimi | GET `/uploads/.env` veya GET `/uploads/.gitkeep` | 403, dotfile reddedilir | [ ] |
| 4 | Public directory | GET `/public/` | 403/404 (dizin listeleme yok) | [ ] |

---

### O8 — DB Username from Env

**Dosya:** `backend/config/db.js:60`
**Degisiklik:** Hardcoded Supabase username kaldirildi, sadece env degiskenlerinden okuyor.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | PGUSER tanimli | `PGUSER=postgres` ile baslat | Basarili baglanti | [ ] |
| 2 | DB_USER tanimli | `DB_USER=myuser` ile baslat | Basarili baglanti | [ ] |
| 3 | Default fallback | PGUSER ve DB_USER ikisi de bos | `postgres` default kullanilir | [ ] |
| 4 | Yanlis kullanici | `PGUSER=wrong_user` ile baslat | Baglanti hatasi (auth failed) | [ ] |

---

### O9 — Logger Masking

**Dosya:** `backend/utils/common/logger.js:28-52`
**Degisiklik:** `sanitizeLogContent()` fonksiyonuna token, code, credential, Bearer, password maskeleme pattern'leri eklendi.

| # | Case | Komut / Yontem | Beklenen Sonuc | Durum |
|---|------|----------------|----------------|-------|
| 1 | Token maskeleme | Log icinde `token=eyJhbGciOiJIUzI1NiJ9...` | `token=******` olarak gorunur | [ ] |
| 2 | Bearer maskeleme | Log icinde `Bearer eyJhbGciOiJIUzI1NiJ9...` | `Bearer ******` olarak gorunur | [ ] |
| 3 | Code maskeleme | Log icinde `code=123456` | `code=******` olarak gorunur | [ ] |
| 4 | Password maskeleme | Log icinde `password=test123` | `password=******` olarak gorunur | [ ] |
| 5 | Uzun icerik kisaltma | 500 karakterlik log mesaji | 300 karaktere kisaltilir + `...` | [ ] |
| 6 | Base64 temizleme | Log icinde `/long-base64-string...` (100+ karakter) | `[BINARY_DATA]` olarak gorunur | [ ] |
| 7 | Normal mesaj | `logger.info("Server started on port 5001")` | Degisiklik yok, normal gorunur | [ ] |
| 8 | Object loglama | `logger.info({ mp3_url: "https://..." })` | `mp3_url: [CONTENT_REMOVED]` olarak gorunur | [ ] |

---

## Genel Regression

Tum fix'ler uygulandiktan sonra asagidaki temel akislarin calistigini dogrulayin:

| # | Akim | Test Yontemi | Beklenen Sonuc | Durum |
|---|------|--------------|----------------|-------|
| 1 | Email/password register | Yeni hesap olustur | Basarili kayit + verification email | [ ] |
| 2 | Email/password login | Mevcut hesap ile giris | Basarili giris, token alinir | [ ] |
| 3 | Google login (web) | Web frontend'den Google ile giris | Basarili (imza dogrulamasi ile) | [ ] |
| 4 | Google login (mobile) | React Native'den Google ile giris | Basarili | [ ] |
| 5 | Apple login (iOS) | iOS uygulamadan Apple Sign In | Basarili (imza dogrulamasi ile) | [ ] |
| 6 | Facebook login | Facebook ile giris | Basarili | [ ] |
| 7 | Password reset flow | Forgot → Kod al → Reset | Sifre degisir | [ ] |
| 8 | Token refresh | Access token expire → Refresh | Yeni token alinir | [ ] |
| 9 | Logout | POST `/api/auth/logout` | Basarili response | [ ] |
| 10 | iyzico odeme (full flow) | Odeme basla → 3D Secure → Callback → Tamamla | Odeme basarili, plan guncellenir | [ ] |
| 11 | Apple subscription | iOS'ta abonelik satinal | Subscription olusur | [ ] |
| 12 | Apple subscription renewal | Sandbox'ta yenileme | Bildirim alinir, dogrulanir, DB guncellenir | [ ] |
| 13 | Admin panel | Admin ile giris, CRUD islemleri | Calisiyor | [ ] |
| 14 | Content islemleri | Icerik isleme (link, text, file) | Calisiyor | [ ] |
| 15 | TTS islemi | Metin → ses donusumu | Calisiyor | [ ] |
| 16 | Dosya yukleme | PDF/DOCX/TXT yukleme | Calisiyor | [ ] |
| 17 | Backend startup (dev) | `NODE_ENV=development npm run dev` | Hatasiz baslar | [ ] |
| 18 | Backend startup (prod) | Tum env degiskenleri ile prod baslat | Hatasiz baslar | [ ] |
| 19 | Logout + tekrar login | Logout → Login → API cagir | Yeni token ile basarili | [ ] |
| 20 | Dosya yukleme (tum formatlar) | PDF, DOCX, TXT, EPUB yukle | Hepsi basarili | [ ] |
| 21 | Redis baglantisi | Redis aktif + logout + blacklist kontrolu | Token blacklist calisiyor | [ ] |
| 22 | Sifre degistirme (policy) | Eski sifre + yeni guclu sifre | Basarili degisiklik | [ ] |

---

## Yeni Env Degiskenleri

Faz 1-3 sonrasinda asagidaki env degiskenlerinin tanimli olmasi gerekir:

| Degisken | Zorunluluk | Aciklama | Ornek |
|----------|------------|----------|-------|
| `GOOGLE_CLIENT_ID` | Zorunlu (Google login icin) | Google OAuth 2.0 Client ID | `123456789.apps.googleusercontent.com` |
| `APPLE_CLIENT_ID` | Zorunlu (Apple login icin) | Apple Service ID veya Bundle ID | `com.lingroot.app` |
| `JWT_SECRET` | Zorunlu (prod) | JWT imzalama anahtari | Rastgele 64+ karakter |
| `JWT_REFRESH_SECRET` | Zorunlu (prod) | Refresh token imzalama anahtari | Rastgele 64+ karakter |
| `JWT_EXPIRES_IN` | Opsiyonel | Access token suresi (default: `15m`) | `15m`, `1h`, `1d` |
| `JWT_REFRESH_EXPIRES_IN` | Opsiyonel | Refresh token suresi (default: `7d`) | `7d`, `30d` |
| `REDIS_URL` | Tavsiye (Faz 3) | Redis baglanti URL'i (token blacklist icin) | `redis://localhost:6379` |
| `PGUSER` | Tavsiye (Faz 3) | PostgreSQL kullanici adi | `postgres` |
| `DB_USER` | Alternatif | PostgreSQL kullanici adi (PGUSER yoksa) | `postgres` |

---

## Referans: Bulgu-Fix Eslestirmesi

| Bulgu ID | Seviye | Faz | Fix | Degisen Dosyalar |
|----------|--------|-----|-----|-----------------|
| K1 | Kritik | 2 | Google JWT verify | `authController.js` |
| K2 | Kritik | 2 | Apple JWT verify | `authController.js` |
| K3 | Kritik | 2 | Apple notif JWS verify | `appleNotificationsController.js` |
| K4 | Kritik | 1 | CORS reject | `server.js` |
| K5 | Kritik | 2 | iyzico server-side verify | `iyzicoController.js` |
| K6 | Kritik | 1 | Reset kodu logdan cikar | `authController.js` |
| K7 | Kritik | 1 | Debug routes prod disable | `server.js` |
| Y1 | Yuksek | 1 | JWT secret prod guard | `auth.js` |
| Y2 | Yuksek | 2 | JWT expire 15m/7d | `authController.js` |
| Y3 | Yuksek | 3 | Token blacklist + logout | `auth.js`, `authController.js` |
| Y4 | Yuksek | 2 | crypto.randomBytes | `authController.js` |
| Y5 | Yuksek | 1 | Social login rate limit | `authRoutes.js` |
| Y6 | Yuksek | 3 | Refresh token rate limit | `security.js`, `authRoutes.js` |
| Y7 | Yuksek | 2 | Token URL → header | `authController.js` |
| Y8 | Yuksek | 2 | Response sanitizer | `server.js` |
| Y9 | Yuksek | 2 | Body limit 1mb | `server.js` |
| Y10 | Yuksek | 3 | File upload magic bytes | `contentRoutes.js` |
| O1 | Orta | 3 | SSL rejectUnauthorized | `db.js` |
| O2 | Orta | 3 | JWT algorithm enforcement | `auth.js` |
| O4 | Orta | 3 | Password policy | `authController.js` |
| O5 | Orta | 3 | Reset expire 15dk | `authController.js` |
| O6 | Orta | 3 | Helmet CSP | `server.js` |
| O7 | Orta | 3 | Static directory listing | `server.js` |
| O8 | Orta | 3 | DB username from env | `db.js` |
| O9 | Orta | 3 | Logger masking | `logger.js` |
