# Security Hardening Test Cases - 2026-06

> Kapsam: 2026-06 güvenlik iyileştirmeleri  
> İlgili bulgular: `SBP-001`, `SBP-002`, `SBP-003`, `SBP-004`

Bu doküman, son güvenlik geliştirmelerinde dokunulan tüm yüzeyler için uygulanabilir test senaryolarını içerir.

## Kapsam

Bu turda değişen ana alanlar:

- `newDesign` tarafında istemciden Gemini API key kaldırıldı
- TTS preview backend üzerinden çalışacak hale getirildi
- Web auth akışı `localStorage` bearer token yerine `HttpOnly` cookie tabanlı oturuma geçirildi
- Auth middleware cookie-first olacak şekilde güncellendi
- Frontend API proxy route'larındaki wildcard CORS ve auth reflection kaldırıldı
- JWT secret fallback'leri fail-closed hale getirildi

## İlgili Dosyalar

### TTS / Browser Key Removal

- `backend/controllers/ttsController.js`
- `backend/routes/ttsRoutes.js`
- `newDesign/components/TTSOverlay.tsx`
- `newDesign/services/apiService.ts`
- `newDesign/vite.config.ts`
- `newDesign/index.html`
- `newDesign/package.json`

### Cookie Auth / Web Session

- `backend/controllers/authController.js`
- `backend/middleware/auth.js`
- `frontend/src/lib/auth.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/apiClient.ts`
- `packages/api-client/src/http.ts`
- `frontend/src/pages/api/auth/me.js`

### Proxy / CORS Hardening

- `frontend/src/pages/api/youtube-transcript.js`
- `frontend/pages/api/youtube-subtitle.ts`

### JWT Secret Hardening

- `backend/services/oauthService.js`
- `backend/routes/configRoutes.js`
- `backend/tests/authController.test.js`

## Test Ortamı

### Gerekli Env

Backend:

```bash
JWT_SECRET=<gercek-secret>
JWT_REFRESH_SECRET=<gercek-refresh-secret>
GOOGLE_API_KEY=<gercek-key>
NODE_ENV=development
```

Web:

```bash
BACKEND_URL=http://localhost:5001
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Çalıştırma

Backend:

```bash
cd backend
npm test
node server.js
```

Frontend:

```bash
cd frontend
npm run dev
```

newDesign:

```bash
cd newDesign
npm run dev
```

## 1. SBP-001 - newDesign Browser API Key Removal

### 1.1 Bundle içinde Gemini key kalmadı

**Amaç:** `newDesign` bundle'ında API key veya `@google/genai` referansı kalmadığını doğrulamak.

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Kaynak tarama | `rg -n "@google/genai|API_KEY|GEMINI_API_KEY" newDesign -g '!**/node_modules/**'` | Eşleşme olmamalı |
| 2 | Build output tarama | `cd newDesign && npm run build`, sonra `rg -n "AIza|GEMINI|@google/genai" dist` | Eşleşme olmamalı |
| 3 | Network davranışı | Tarayıcı devtools ile TTS preview tetikle | İstek sadece backend `/api/tts/preview` benzeri route'a gitmeli |
| 4 | Browser source check | Devtools Sources içinde compiled JS ara | Gemini SDK import'u görülmemeli |

### 1.2 TTS preview backend üzerinden çalışıyor

**Amaç:** `newDesign/components/TTSOverlay.tsx` artık doğrudan backend TTS preview endpoint'ini kullanıyor.

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Auth'lu preview | Login ol, newDesign içinde preview oynat | 200 response, ses çalar |
| 2 | Auth'suz preview | Login olmadan preview isteği yap | 401 veya auth error |
| 3 | Text validation | Boş text ile preview isteği | 400 validation error |
| 4 | Length validation | 500+ karakter ile preview isteği | 400 validation error |
| 5 | Voice selection | Farklı `voiceName` ile preview yap | Doğru sesle mp3 döner |
| 6 | Mime type | Response'u network panelde incele | JSON içinde `audioBase64`, `mimeType=audio/mpeg` |

### 1.3 Backend preview route güvenliği

**Amaç:** `backend/routes/ttsRoutes.js` ve `backend/controllers/ttsController.js` tarafının yalnızca yetkili kullanıcıya hizmet verdiğini doğrulamak.

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Auth required | Cookie veya bearer olmadan `POST /api/tts/preview` | 401 |
| 2 | Bearer compatibility | Bearer token ile preview isteği | 200 |
| 3 | Cookie compatibility | Sadece auth cookie ile preview isteği | 200 |
| 4 | Invalid voice | Geçersiz `voiceName` ile istek | 4xx veya kontrollü failure |

## 2. SBP-002 - Cookie Based Web Auth

### 2.1 Login access ve refresh cookie set ediyor

**İlgili dosyalar:** `backend/controllers/authController.js`

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Email login | `POST /api/auth/login` geçerli kullanıcı ile | `Set-Cookie` içinde access + refresh cookie |
| 2 | Google login | `POST /api/auth/google` geçerli credential ile | `Set-Cookie` içinde access + refresh cookie |
| 3 | Facebook login | `POST /api/auth/facebook-login` | Cookie set edilir |
| 4 | Apple login | `POST /api/auth/apple` | Cookie set edilir |
| 5 | Cookie flags | Response header incele | `HttpOnly`, `SameSite=Lax`, prod'da `Secure` |

### 2.2 Refresh route cookie ile çalışıyor

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Body token ile refresh | `POST /api/auth/refresh` body refresh token ile | 200, yeni cookie set edilir |
| 2 | Cookie ile refresh | Body boş, sadece refresh cookie ile `POST /api/auth/refresh` | 200 |
| 3 | Expired refresh | Expired refresh cookie ile refresh | 401 |
| 4 | Invalid refresh | Manipüle edilmiş refresh token ile refresh | 401 |

### 2.3 Logout cookie temizliyor ve token blacklist çalışıyor

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Logout clears cookies | Login ol, sonra `POST /api/auth/logout` | `Set-Cookie` ile cookie clear edilir |
| 2 | Logout after access | Logout sonrası aynı cookie ile protected route çağır | 401 |
| 3 | Blacklist with bearer | Bearer token ile login, logout, aynı bearer ile tekrar istek | 401 `TOKEN_REVOKED` veya auth fail |

### 2.4 Middleware cookie-first çalışıyor

**İlgili dosya:** `backend/middleware/auth.js`

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Cookie only | Authorization header olmadan auth cookie ile `GET /api/auth/me` | 200 |
| 2 | Bearer only | Cookie olmadan bearer ile `GET /api/auth/me` | 200 |
| 3 | Cookie + stale bearer | Geçerli cookie, geçersiz Authorization header | 200, cookie öncelikli çalışır |
| 4 | No auth | Cookie ve bearer olmadan protected route | 401 |
| 5 | Optional auth | `optionalAuth` kullanan route'larda auth yokken çağrı | route davranışı bozulmamalı |

### 2.5 Web frontend gerçek JWT saklamıyor

**İlgili dosyalar:** `frontend/src/lib/auth.tsx`, `frontend/src/lib/api.ts`, `frontend/src/lib/apiClient.ts`

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Login sonrası storage | Browser devtools `localStorage` incele | JWT yerine en fazla `cookie-session` sentinel görülür |
| 2 | Refresh token storage | `localStorage` içinde `lingroot_refresh_token` ara | Olmamalı |
| 3 | Manual me call | Sayfa yenile, auth state geri gelsin | `GET /api/auth/me` cookie ile başarılı |
| 4 | Logout | Logout sonrası `localStorage` ve cookie durumu | sentinel silinir, auth kapanır |
| 5 | Unauthorized flow | Cookie expire ettir, sayfa yenile | `isAuthenticated=false` olur |

### 2.6 Shared api-client cookie ile çalışıyor

**İlgili dosya:** `packages/api-client/src/http.ts`

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Axios credentials | Network panelde axios tabanlı bir istek yap | request `withCredentials=true` ile gider |
| 2 | Refresh without body token | Access token expire olduktan sonra otomatik refresh tetikle | refresh cookie ile çalışır |
| 3 | ClearTokens behavior | Unauthorized senaryosunda client temizlensin | in-memory tokenlar temizlenir, redirect çalışır |

### 2.7 Next auth proxy gerçek backend'e gidiyor

**İlgili dosya:** `frontend/src/pages/api/auth/me.js`

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | GET only | `POST /api/auth/me` | 405 |
| 2 | Cookie forward | Browser login sonrası `/api/auth/me` çağır | backend user payload döner |
| 3 | No demo token reflection | Response JSON'u incele | token alanı olmamalı |
| 4 | Backend down | Backend kapalıyken `/api/auth/me` çağır | 500 controlled error |

## 3. SBP-003 - Proxy / CORS / Reflection Cleanup

### 3.1 `/api/youtube-transcript` güvenli proxy

**İlgili dosya:** `frontend/src/pages/api/youtube-transcript.js`

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | POST only | `GET /api/youtube-transcript` | 405 |
| 2 | Upstream success | Geçerli body ile POST | Backend yanıtı forward edilir |
| 3 | No CORS wildcard | Response header incele | `Access-Control-Allow-Origin: *` olmamalı |
| 4 | No auth reflection | Response header/body incele | Authorization echo olmamalı |
| 5 | Cookie/header pass-through | Auth'lu istek yap | upstream'e auth forward edilir ama response'a sızmaz |
| 6 | Upstream error | Backend hata döndürsün | aynı status code + kontrollü payload dönsün |

### 3.2 `/api/youtube-subtitle` wildcard CORS kaldırıldı

**İlgili dosya:** `frontend/pages/api/youtube-subtitle.ts`

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | POST only | `GET /api/youtube-subtitle` | 405 |
| 2 | OPTIONS behavior | `OPTIONS` isteği at | artık genel wildcard CORS header dönmemeli |
| 3 | Normal subtitle fetch | Geçerli YouTube URL ile POST | 200, `success: true` |
| 4 | Invalid body | `url` olmadan POST | 400 |
| 5 | No wildcard CORS | Response header kontrolü | `Access-Control-Allow-Origin: *` yok |

### 3.3 `/api/auth/me` proxy’de token reflection yok

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Response audit | `/api/auth/me` response body kontrol et | `token`, `refreshToken`, `Authorization` alanı yok |
| 2 | Header audit | response headers kontrol et | request `Authorization` header geri yansıtılmaz |

## 4. SBP-004 - JWT Secret Hardening

### 4.1 Backend test dışında secret olmadan başlamıyor

**İlgili dosyalar:** `backend/controllers/authController.js`, `backend/middleware/auth.js`, `backend/services/oauthService.js`, `backend/routes/configRoutes.js`

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Missing JWT_SECRET | `JWT_SECRET=` ile backend başlat | process fail eder veya startup error verir |
| 2 | Missing JWT_REFRESH_SECRET | `JWT_REFRESH_SECRET=` ile backend başlat | auth controller load fail |
| 3 | Test env fallback | `NODE_ENV=test` ile test koş | test-only fallback secret ile çalışır |
| 4 | Development with real secrets | gerçek env secret ile dev başlat | normal startup |
| 5 | Production with real secrets | prod env ile başlat | normal startup |

### 4.2 Insecure default string kalıntısı yok

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Source grep | `rg -n "lingroot-secret-key-for-development|lingroot-refresh-secret-key" backend frontend packages -g '!**/node_modules/**'` | eşleşme olmamalı |
| 2 | Test fallback names | test dosyaları kontrolü | yalnızca `lingroot-test-jwt-secret` ve `lingroot-test-refresh-secret` referansları görülebilir |

### 4.3 Config environment route güvenliği

**İlgili dosya:** `backend/routes/configRoutes.js`

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Valid token | `/api/config/environment` geçerli token ile | doğru environment döner |
| 2 | Invalid token | bozuk token ile çağır | production fallback döner, secret fallback kullanılmaz |
| 3 | Missing JWT_SECRET non-test | `JWT_SECRET` olmadan route import/startup | controlled failure |

## 5. Regression Testleri

### 5.1 Web login akışı

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Email login | Web login formu ile giriş | başarılı oturum |
| 2 | Page refresh | Login sonrası sayfa yenile | oturum devam eder |
| 3 | Protected page | auth gerektiren sayfaya git | cookie ile çalışır |

### 5.2 Social login akışı

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Google web login | Google login ile giriş | kullanıcı oturumu açılır |
| 2 | Social logout | logout sonrası tekrar protected route | 401 veya login redirect |

### 5.3 newDesign TTS preview regression

| # | Case | Adım | Beklenen |
|---|------|------|----------|
| 1 | Preview play | newDesign TTS overlay preview | ses doğru oynar |
| 2 | Preview repeat | arka arkaya birkaç preview isteği | rate-limit veya playback bug olmadan çalışır |

## 6. Otomasyona Uygun Testler

Önerilen otomasyon başlıkları:

- Backend Jest/Supertest
  - auth cookie set/clear
  - refresh via cookie
  - middleware cookie-first precedence
  - missing JWT secret startup guards
- Frontend Playwright
  - login sonrası `localStorage` içinde gerçek JWT olmadığını doğrula
  - `/api/auth/me` ile session restore
  - logout sonrası cookie tabanlı oturumun kapanması
  - youtube proxy response’larında auth reflection olmadığını doğrula
- Static CI checks
  - `rg` ile browser bundle/source içinde `@google/genai`, `API_KEY`, insecure JWT default string taraması

## 7. Önerilen Test Sırası

1. Static scan testleri
2. Backend startup secret guard testleri
3. Email login + cookie set testleri
4. Refresh + logout testleri
5. Frontend session restore testleri
6. Proxy/CORS testleri
7. newDesign TTS preview testleri
8. Social login regression

## 8. Çıkış Kriteri

Bu güvenlik turu "testten geçti" sayılabilmesi için:

- Browser tarafında gerçek access/refresh token storage kalmamalı
- Auth cookie ile login, refresh, logout, session restore çalışmalı
- Proxy route'larda wildcard CORS ve auth reflection bulunmamalı
- Backend test dışında JWT secret fallback ile ayağa kalkmamalı
- newDesign TTS preview çalışırken browser bundle’da Gemini key bulunmamalı
