# Google Cloud Run YouTube Altyazı Servisi Kaldırma Rehberi

## 📋 Genel Bakış

Bu doküman, YouTube altyazı çekme için kullanılan Google Cloud Run servisini (`yt-subtitle-api-na5bfjgtjq-ew.a.run.app`) kaldırıp yerel Playwright/FastAPI servisine geçiş sürecini açıklar.

---

## 🎯 Mevcut Durum

### Google Cloud Run Servisi
- **URL:** `https://yt-subtitle-api-na5bfjgtjq-ew.a.run.app/api/subtitle`
- **Kullanım Yerleri:**
  - Mobile App: `LingRootMobile/src/screens/CreateScreen.tsx` (Satır 95)
  - Web Frontend: `frontend/pages/api/youtube-subtitle.ts` (Satır 22)

### Yerel Alternatif
- **Servis:** Playwright/FastAPI (`backend/youtubetranscriptservice/main.py`)
- **URL:** `http://localhost:8000/scrape-transcript`
- **Durum:** Zaten mevcut ve çalışır durumda

---

## 📝 Kaldırma Adımları

### ADIM 1: Kod Değişiklikleri

#### 1.1. Mobile App Güncellemesi

**Dosya:** `LingRootMobile/src/screens/CreateScreen.tsx`

**Değişiklik:** Satır 95'teki Cloud Run URL'ini backend proxy'ye yönlendir

**Eski Kod:**
```typescript
const resp = await fetch('https://yt-subtitle-api-na5bfjgtjq-ew.a.run.app/api/subtitle', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: youtubeUrl, temizle: true, dil: 'tr' })
});
```

**Yeni Kod:**
```typescript
// Backend API üzerinden yerel servise istek at
const resp = await fetch(`${API_URL}/api/youtube-transcript`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}` // Eğer auth gerekiyorsa
  },
  body: JSON.stringify({ url: youtubeUrl })
});
```

#### 1.2. Web Frontend Güncellemesi

**Dosya:** `frontend/pages/api/youtube-subtitle.ts`

**Değişiklik:** Cloud Run yerine backend'deki yerel servise proxy yap

**Eski Kod:**
```typescript
const base = `https://yt-subtitle-api-na5bfjgtjq-ew.a.run.app/api/subtitle`;
```

**Yeni Kod:**
```typescript
// Backend'deki yerel Playwright servisine yönlendir
const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
const base = `${backendUrl}/api/youtube-transcript-local`;
```

#### 1.3. Backend Route Ekleme

**Dosya:** `backend/routes/ttsRoutes.js` (veya yeni `youtubeRoutes.js`)

**Yeni Endpoint Ekle:**
```javascript
const express = require('express');
const router = express.Router();
const { fetchYoutubeTranscript } = require('../utils/youtubeTranscriptService');

// Yerel Playwright servisi için endpoint
router.post('/youtube-transcript-local', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Geçerli bir YouTube URL\'si gerekli' 
      });
    }

    // Yerel Playwright servisini çağır
    const transcript = await fetchYoutubeTranscript(url, 'tr');
    
    if (!transcript) {
      return res.status(404).json({ 
        success: false, 
        errorCode: 'NO_SUBTITLES',
        message: 'Bu videoda altyazı bulunmamaktadır' 
      });
    }

    return res.status(200).json({ 
      success: true, 
      text: transcript 
    });
    
  } catch (error) {
    console.error('YouTube transcript error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Altyazı çekilirken bir hata oluştu',
      details: error.message 
    });
  }
});

module.exports = router;
```

**server.js'e ekle:**
```javascript
const youtubeRoutes = require('./routes/youtubeRoutes');
app.use('/api', youtubeRoutes);
```

---

### ADIM 2: Yerel Playwright Servisini Başlatma

#### 2.1. Bağımlılıkları Yükle

```bash
cd backend/youtubetranscriptservice
pip install -r requirements.txt
python -m playwright install
```

**requirements.txt içeriği:**
```txt
fastapi==0.104.1
uvicorn==0.24.0
playwright==1.40.0
pydantic==2.5.0
```

#### 2.2. Servisi Başlat

**Manuel Başlatma:**
```bash
cd backend
uvicorn youtubetranscriptservice.main:app --host 0.0.0.0 --port 8000 --reload
```

**PM2 ile Başlatma (Önerilen):**
```bash
# PM2 yükle
npm install -g pm2

# ecosystem.config.js oluştur
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'youtube-transcript-service',
      script: 'uvicorn',
      args: 'youtubetranscriptservice.main:app --host 0.0.0.0 --port 8000',
      cwd: './backend',
      interpreter: 'python3',
      watch: false,
      env: {
        PORT: 8000
      }
    }
  ]
};
EOF

# Servisi başlat
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 2.3. Servis Sağlık Kontrolü

```bash
# Health check
curl http://localhost:8000/health

# Beklenen yanıt:
# {"status":"ok","service":"youtube-transcript-service"}
```

---

### ADIM 3: Google Cloud Run Servisini Kaldırma

#### 3.1. Google Cloud Console'dan Kaldırma

1. **Google Cloud Console'a giriş yapın:**
   - https://console.cloud.google.com/

2. **Cloud Run sayfasına gidin:**
   - Sol menüden "Cloud Run" seçin
   - Veya: https://console.cloud.google.com/run

3. **Servisi bulun:**
   - `yt-subtitle-api` servisini listede bulun
   - Region: `europe-west1 (ew)`

4. **Servisi silin:**
   - Servisin yanındaki checkbox'ı işaretleyin
   - Üstteki "DELETE" butonuna tıklayın
   - Onay dialogunda "DELETE" yazın ve onaylayın

#### 3.2. gcloud CLI ile Kaldırma

```bash
# Servisleri listele
gcloud run services list --region=europe-west1

# Servisi sil
gcloud run services delete yt-subtitle-api \
  --region=europe-west1 \
  --quiet

# Onay mesajı:
# Service [yt-subtitle-api] will be deleted.
# Do you want to continue (Y/n)? Y
```

#### 3.3. Container Image'ları Temizleme (Opsiyonel)

```bash
# Container Registry'deki image'ları listele
gcloud container images list

# İlgili image'ı sil
gcloud container images delete gcr.io/PROJECT_ID/yt-subtitle-api --quiet

# Veya Artifact Registry kullanıyorsanız:
gcloud artifacts docker images delete \
  REGION-docker.pkg.dev/PROJECT_ID/REPO/yt-subtitle-api \
  --quiet
```

---

### ADIM 4: Deployment Yapılandırması

#### 4.1. Production Ortamı için Yapılandırma

**Render.com için:**

`render.yaml` dosyasına ekle:
```yaml
services:
  - type: web
    name: youtube-transcript-service
    env: python
    region: frankfurt
    buildCommand: "pip install -r backend/youtubetranscriptservice/requirements.txt && python -m playwright install"
    startCommand: "uvicorn backend.youtubetranscriptservice.main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: PORT
        value: 8000
```

**Docker ile:**

`Dockerfile.youtube-transcript`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Playwright bağımlılıkları
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Python bağımlılıkları
COPY backend/youtubetranscriptservice/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright browser'ları yükle
RUN python -m playwright install --with-deps chromium

# Uygulama kodları
COPY backend/youtubetranscriptservice/ .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**docker-compose.yml'e ekle:**
```yaml
services:
  youtube-transcript:
    build:
      context: .
      dockerfile: Dockerfile.youtube-transcript
    ports:
      - "8000:8000"
    environment:
      - PORT=8000
    restart: unless-stopped
```

#### 4.2. Nginx Reverse Proxy (Opsiyonel)

```nginx
# /etc/nginx/sites-available/lingroot
server {
    listen 80;
    server_name api.lingroot.com;

    location /api/youtube-transcript {
        proxy_pass http://localhost:8000/scrape-transcript;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### ADIM 5: Test ve Doğrulama

#### 5.1. Yerel Test

```bash
# Backend'i başlat
cd backend
npm run dev

# Playwright servisini başlat (başka terminal)
uvicorn youtubetranscriptservice.main:app --port 8000 --reload

# Test isteği
curl -X POST http://localhost:5001/api/youtube-transcript-local \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

#### 5.2. Frontend Test

```bash
# Frontend'i başlat
cd frontend
npm run dev

# Browser'da test et:
# http://localhost:3000
# YouTube URL ile içerik oluşturmayı dene
```

#### 5.3. Mobile Test

```bash
cd LingRootMobile
npm start

# Expo Go veya simulator'da test et
# YouTube URL girişi yaparak altyazı çekmeyi test et
```

---

### ADIM 6: Monitoring ve Logging

#### 6.1. Log Dosyaları

**Playwright servisi logları:**
```bash
# PM2 logları
pm2 logs youtube-transcript-service

# Manuel başlatma logları
tail -f backend/logs/transcript_service.log
```

#### 6.2. Health Check Endpoint'i

**Backend'e health check ekle:**
```javascript
// routes/healthRoutes.js
router.get('/health/youtube-transcript', async (req, res) => {
  try {
    const response = await fetch('http://localhost:8000/health');
    const data = await response.json();
    
    res.json({
      service: 'youtube-transcript',
      status: data.status === 'ok' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      service: 'youtube-transcript',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

---

## 🔄 Rollback Planı

Eğer sorun yaşarsanız, geçici olarak Cloud Run'a geri dönebilirsiniz:

### Hızlı Rollback

**Mobile App:**
```typescript
// CreateScreen.tsx - Satır 95
const CLOUD_RUN_URL = 'https://yt-subtitle-api-na5bfjgtjq-ew.a.run.app/api/subtitle';
const USE_CLOUD_RUN = true; // Acil durumda true yap

const resp = await fetch(
  USE_CLOUD_RUN ? CLOUD_RUN_URL : `${API_URL}/api/youtube-transcript`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: youtubeUrl, temizle: true, dil: 'tr' })
  }
);
```

**Web Frontend:**
```typescript
// youtube-subtitle.ts
const USE_CLOUD_RUN = process.env.USE_CLOUD_RUN === 'true';
const base = USE_CLOUD_RUN 
  ? 'https://yt-subtitle-api-na5bfjgtjq-ew.a.run.app/api/subtitle'
  : `${backendUrl}/api/youtube-transcript-local`;
```

---

## 💰 Maliyet Tasarrufu

### Google Cloud Run Maliyetleri (Kaldırıldıktan Sonra)

**Önceki Tahmini Maliyet:**
- Requests: ~$0.40/million requests
- CPU/Memory: ~$1-2/ay
- **Toplam: ~$2-5/ay**

**Yeni Maliyet:**
- Yerel/VPS hosting: $0 (mevcut sunucu içinde)
- **Tasarruf: %100**

---

## ✅ Kontrol Listesi

Kaldırma işlemi tamamlandıktan sonra kontrol edin:

- [ ] Mobile app yerel servisi kullanıyor
- [ ] Web frontend yerel servisi kullanıyor
- [ ] Playwright servisi çalışıyor ve erişilebilir
- [ ] YouTube altyazı çekme testi başarılı
- [ ] Google Cloud Run servisi silindi
- [ ] Container image'ları temizlendi (opsiyonel)
- [ ] Dokümantasyon güncellendi
- [ ] Monitoring/logging aktif
- [ ] Production deployment yapılandırıldı

---

## 📚 İlgili Dosyalar

### Değiştirilecek Dosyalar:
1. `LingRootMobile/src/screens/CreateScreen.tsx` (Satır 95)
2. `frontend/pages/api/youtube-subtitle.ts` (Satır 22)
3. `backend/routes/` (Yeni route ekle)
4. `backend/server.js` (Route'u import et)

### Mevcut Dosyalar:
1. `backend/youtubetranscriptservice/main.py` (Zaten hazır)
2. `backend/utils/youtubeTranscriptService.js` (Zaten hazır)

---

## 🆘 Sorun Giderme

### Playwright Servisi Başlamıyor

```bash
# Browser'ları yeniden yükle
python -m playwright install --force

# Bağımlılıkları kontrol et
pip list | grep playwright
```

### "Connection Refused" Hatası

```bash
# Servisin çalıştığını kontrol et
ps aux | grep uvicorn

# Port'un açık olduğunu kontrol et
netstat -tuln | grep 8000

# Firewall kontrolü
sudo ufw status
sudo ufw allow 8000
```

### Altyazı Çekilemiyor

```bash
# Servisi debug mode'da başlat
uvicorn youtubetranscriptservice.main:app --port 8000 --reload --log-level debug

# Test isteği gönder
curl -X POST http://localhost:8000/scrape-transcript \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","language_code":"tr"}'
```

---

## 📞 Destek

Sorun yaşarsanız:
1. Logları kontrol edin: `pm2 logs youtube-transcript-service`
2. Health endpoint'i kontrol edin: `curl http://localhost:8000/health`
3. GitHub Issues'da sorun bildirin

---

**Son Güncelleme:** 2025-01-21  
**Doküman Versiyonu:** 1.0  
**Hazırlayan:** LingRoot Development Team
