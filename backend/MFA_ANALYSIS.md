# MFA (Montreal Forced Aligner) Analiz ve Ayrıştırma Raporu

## 1. Mevcut Yapı Analizi (Current State)

### 1.1. Genel Mimari
Şu anda MFA, `backend/` servisi içinde gömülü (embedded) olarak çalışmaktadır.
- **Konum**: `backend/utils/mfaAligner.js`
- **Çalışma Modeli**: Node.js `child_process` üzerinden yerel Docker komutları çalıştırarak hizalama (alignment) yapmaktadır.
- **Tetikleyici**: `ttsController.js` ses üretiminden sonra `mfaAligner.generateWordTimestamps` metodunu çağırır.
- **Durum**: Bu kod LingRoot içindedir ve başarılı çalışmaktadır. Ayrıştırma sürecinde bu koda DOKUNULMAYACAK, ta ki yeni sistem tamamen ayağa kalkıp doğrulanana kadar.

### 1.2. Dosya Bağımlılıkları
- **Core Logic**: `backend/utils/mfaAligner.js` (800+ satır). Hem yerel Docker yönetimini hem de Remote client mantığını içerir.
- **API Arayüzü**: `backend/routes/mfaRoutes.js`. `/api/mfa/align` ve `/api/mfa/align-async` endpointlerini sunar.
- **Controller**: `backend/controllers/ttsController.js`. MFA'yı tüketen ana modüldür.
- **Models**: `C:\Users\enesy\mfa-models-main\...` altında sabit (hardcoded) path'ler ile sözlük ve akustik modellere erişir. Bu path'lerin yeni projede ENV veya Config ile yönetilmesi gerekecek.

### 1.3. Mevcut "Remote" Yeteneği
`mfaAligner.js` dosyası halihazırda hibrit bir yapıdadır:
- `USE_REMOTE_MFA=true` ise HTTP isteği atarak başka bir servise gidebilir.
- `USE_REMOTE_MFA=false` (veya default) ise yerel Docker'ı çalıştırır.

## 2. Ayrıştırma Stratejisi (Separation Plan)

Hedef: Yerel MFA işleyen (Docker tüketen) kodu `LingRoot` projesinden tamamen çıkarmak ve ayrı bir mikroservis haline getirmek. `LingRoot` sadece bu servisin istemcisi (client) olarak kalacak.

### 2.1. Yeni Servis: `LingRoot-MFA-Service`
Bu servis ayrı bir repo olacak ve şu bileşenleri içerecek:
1.  **Express Server**: Sadece MFA işlerini dinleyen bir API.
2.  **Core MFA Logic**: Mevcut `mfaAligner.js` içindeki "Local MFA Processing" kodları buraya taşınacak.
3.  **Queue System**: `mfaRoutes.js` içindeki in-memory job queue yapısı korunacak/geliştirilecek.
4.  **Docker Wrapper**: Docker komutlarını çalıştıran logic burada yaşayacak.

### 2.2. Ana Proje (`LingRoot`) Değişiklikleri
1.  **Refactor `mfaAligner.js`**:
    -   Tüm yerel Docker çalışma kodları (corpus hazırlama, `docker run`, textgrid parse vb.) SİLİNECEK.
    -   Dosya sadece "MFA Client" olarak kalacak (Remote API'ye istek atan kodlar).
2.  **Kaldırılacak Dosyalar**:
    -   `backend/routes/mfaRoutes.js` (Artık bu proje alignment **sunmayacak**, sadece **tüketecek**).
3.  **Env Değişikliği**:
    -   `USE_REMOTE_MFA=true` zorunlu hale gelecek.
    -   `MFA_SERVICE_URL` yeni Cloudflare Tunnel adresine bakacak.

## 3. Yol Haritası (Roadmap)

1.  **[Export]**: `MFA-Service` kod paketinin hazırlanması (`LingRoot/backend/mfa_service_export` klasörüne).
2.  **[Repo Setup]**: Kullanıcı bu paketi yeni bir git reposuna taşıyıp çalıştıracak.
3.  **[Tunnel]**: Yeni servisin `cloudflared` ile dışarı açılması.
4.  **[Cleanup]**: LingRoot ana projesinden yerel MFA kodlarının temizlenmesi ve Client moduna geçilmesi.

## 4. Teknik Gereksinimler ve Kurulum (Yeni Servis İçin)

Yeni kurulacak MFA projesinin çalışması için hedef makinede (lokal veya sunucu) aşağıdaki ortamın sağlanması gerekir:

### 4.1. Runtime & Tools
-   **Node.js**: v18+ (Express sunucusu için)
-   **Docker**: Docker Desktop veya Docker Engine (Çalışır durumda olmalı)
    -   Container Image: `mmcauliffe/montreal-forced-aligner` (Kod otomatik pull eder ama manuel pull önerilir)
-   **Cloudflared**: Eğer dış dünyadan erişilecekse Tunnel servisi.

### 4.2. Dosya Sistemi Gereksinimleri
MFA akustik modelleri ve sözlük dosyaları diskte bulunmalıdır. Kod şu an hardcoded path kullanıyor, bu **Environment Variable**'a dönüştürülecek.
-   Gereken Klasör: `mfa-models-main` (İçeriği: `dictionary/english.dict`, `acoustic/english/english/final.mdl`)

### 4.3. Environment Variables (.env)
Yeni projenin kök dizininde olması gereken `.env` dosyası:

```ini
PORT=5002                        # Yeni servis portu (LingRoot 5001 ile çakışmamalı)
NODE_ENV=production

# MFA Concurrency
MFA_ASYNC_MAX_CONCURRENT=2       # Aynı anda kaç Docker job çalışsın (RAM'e bağlı)
MFA_ASYNC_JOB_MAX_AGE_MS=21600000 # Eski jobları temizleme süresi

# Model Paths (YENİ - Kodda güncellenecek)
MFA_DICT_PATH=C:\Users\enesy\mfa-models-main\mfa-models-main\dictionary\english.dict
MFA_ACOUSTIC_DIR=C:\Users\enesy\mfa-models-main\mfa-models-main\acoustic\english\english

# Logging
MFA_DEBUG_DUMP=true              # Detaylı loglama
```

### 4.4. Hardware Tavsiyesi
-   **RAM**: En az 8GB (Docker her işlemde 1-2GB yiyebilir)
-   **CPU**: Multi-core (Paralel işlem için)

