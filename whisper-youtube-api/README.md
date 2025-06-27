# YouTube Whisper API (Local)

🎯 **Tamamen yerel çalışan**, OpenAI API gerektirmeyen YouTube video transkripsiyon servisi.

## ✨ Özellikler

- 🆓 **Tamamen ücretsiz** - OpenAI API gerekmez
- 🔒 **Gizlilik** - Veriler bilgisayarınızdan çıkmaz
- 🚀 **Hızlı** - Doğrudan yerel Whisper kullanır
- 🎬 **YouTube desteği** - yt-dlp ile video/ses indirme
- 🌐 **Çoklu dil** - 50+ dil desteği
- 🎚️ **Model seçimi** - tiny'dan large'a kadar
- 📊 **Detaylı çıktı** - Segmentler, zaman damgaları, istatistikler

## 📋 Gereksinimler

### Sistem Gereksinimleri
- **Node.js** >= 16.0.0
- **Python** >= 3.8
- **FFmpeg** (ses işleme için)

### Python Bağımlılıkları
```bash
pip install openai-whisper
# veya
pip install -r requirements.txt
```

### Node.js Bağımlılıkları
```bash
npm install
```

## 🚀 Kurulum

1. **Projeyi klonlayın:**
```bash
git clone <repo-url>
cd whisper-youtube-api
```

2. **Python Whisper'ı kurun:**
```bash
npm run install-whisper
# veya manuel
pip install openai-whisper
```

3. **Node.js bağımlılıklarını kurun:**
```bash
npm install
```

4. **FFmpeg kurulumunu kontrol edin:**
   - Windows: `winget install ffmpeg` veya chocolatey ile
   - macOS: `brew install ffmpeg`
   - Linux: `apt install ffmpeg` veya `yum install ffmpeg`

## 🎯 Kullanım

### Sunucuyu Başlatma
```bash
npm start
# veya development için
npm run dev
```

Sunucu `http://localhost:3005` adresinde çalışacak.

### Test Etme
```bash
npm test
```

### API Endpoints

#### 🏥 Health Check
```bash
GET /health
```

#### 📹 Video Bilgisi
```bash
POST /video-info
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

#### 🎤 Transkripsiyon
```bash
POST /transcribe
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "model": "base",        // tiny, base, small, medium, large
  "language": "tr",       // tr, en, auto, vs.
  "temperature": 0        // 0-1 arası
}
```

#### 🤖 Desteklenen Modeller
```bash
GET /models
```

#### 🌐 Desteklenen Diller
```bash
GET /languages
```

## 🎚️ Whisper Modelleri

| Model | Boyut | Hız | Kalite | Kullanım |
|-------|-------|-----|--------|----------|
| `tiny` | ~39 MB | En hızlı | Düşük | Hızlı test |
| `base` | ~74 MB | Hızlı | Orta | **Önerilen** |
| `small` | ~244 MB | Orta | İyi | Kalite/hız dengesi |
| `medium` | ~769 MB | Yavaş | Yüksek | Yüksek kalite |
| `large` | ~1550 MB | En yavaş | En yüksek | En iyi kalite |

## 🌐 Desteklenen Diller

Whisper 50+ dili destekler:
- `tr` - Türkçe
- `en` - İngilizce
- `de` - Almanca
- `fr` - Fransızca
- `es` - İspanyolca
- `auto` - Otomatik algılama

Tam liste için `/languages` endpoint'ini kullanın.

## 📊 Örnek Çıktı

```json
{
  "success": true,
  "videoId": "hFZFjoX2cGg",
  "title": "Example Video",
  "transcript": "Merhaba, bu bir test videosu...",
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.5,
      "text": "Merhaba, bu bir test videosu",
      "confidence": -0.25
    }
  ],
  "language": "turkish",
  "duration": {
    "seconds": 120,
    "minutes": "2.00",
    "formatted": "2:00"
  },
  "statistics": {
    "wordCount": 245,
    "characterCount": 1456,
    "segmentCount": 15
  },
  "processing": {
    "model": "base",
    "whisperVersion": "local",
    "extractedAt": "2024-01-01T12:00:00Z"
  }
}
```

## 🔧 Performans İpuçları

1. **Model Seçimi:**
   - Hızlı test: `tiny` veya `base`
   - Prodüksiyon: `small` veya `medium`
   - En yüksek kalite: `large-v3`

2. **Dil Belirtme:**
   - Bilinen dil için dil kodunu belirtin
   - Belirsizlik durumunda `auto` kullanın

3. **Donanım:**
   - GPU varsa CUDA desteği otomatik aktif
   - RAM: Büyük modeller için 4GB+ önerilir

## ❗ Sorun Giderme

### "whisper: command not found"
```bash
pip install openai-whisper
# PATH'e eklendiğinden emin olun
```

### FFmpeg hatası
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
winget install ffmpeg
```

### Python/pip hatası
- Python 3.8+ gerekli
- Virtual environment kullanın
- Admin yetkileri gerekebilir

## 📝 Lisans

MIT License - tamamen ücretsiz kullanım.

## 🔄 Sürüm Geçmişi

- **v2.0.0** - Yerel Whisper desteği, OpenAI API kaldırıldı
- **v1.0.0** - OpenAI API ile ilk versiyon

---

💰 **Artık hiçbir API ücreti yok!** Tamamen yerel çalışır. 🎉 