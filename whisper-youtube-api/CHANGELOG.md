# Changelog

## [2.0.0] - 2024-01-26

### ✨ Yeni Özellikler
- 🆓 **Tamamen yerel Whisper desteği** - OpenAI API artık gerekmiyor
- 💰 **Maliyet yok** - Tüm işlemler yerel bilgisayarda yapılıyor
- 🎚️ **Model seçimi** - tiny, base, small, medium, large modelleri
- 🌐 **Genişletilmiş dil desteği** - 50+ dil
- 📊 **Yeni endpoint'ler** - `/models` ve `/languages`
- 🔧 **Kurulum script'leri** - Windows ve Linux/Mac için

### 🗑️ Kaldırılan Özellikler
- ❌ OpenAI API bağımlılığı kaldırıldı
- ❌ Maliyet hesaplama özellikleri kaldırıldı
- ❌ API key gereksinimleri kaldırıldı
- ❌ `test-cost.js` dosyası kaldırıldı

### 🔧 Teknik Değişiklikler
- `WhisperService.js` tamamen yeniden yazıldı
- `server.js` maliyet hesaplama kısımları kaldırıldı
- `package.json` OpenAI bağımlılığı kaldırıldı
- Python `openai-whisper` paketi bağımlılığı eklendi
- `child_process` kullanarak yerel Whisper komutları çalıştırılıyor

### 📋 Gereksinimler
- Node.js >= 16.0.0
- Python >= 3.8
- `openai-whisper` paketi (`pip install openai-whisper`)
- FFmpeg (ses işleme için)

### 📝 Migration Guide

#### Eski Kullanım (v1.0.0):
```javascript
// OpenAI API key gerekiyordu
process.env.OPENAI_API_KEY = "sk-..."

const response = await axios.post('/transcribe', {
    url: videoUrl,
    language: 'auto'
});

// Maliyet bilgileri mevcuttu
console.log('Maliyet:', response.data.cost.currency.TRY);
```

#### Yeni Kullanım (v2.0.0):
```javascript
// API key gerekmez, pip install openai-whisper gerekli

const response = await axios.post('/transcribe', {
    url: videoUrl,
    model: 'base',     // Model seçimi eklendi
    language: 'auto',
    temperature: 0
});

// Maliyet bilgileri kaldırıldı - tamamen ücretsiz!
console.log('Ücretsiz transkript:', response.data.transcript);
```

### 🚀 Kurulum

#### Windows:
```bash
.\install-whisper.bat
npm install
npm start
```

#### Linux/Mac:
```bash
./install-whisper.sh
npm install
npm start
```

---

## [1.0.0] - 2024-01-01

### ✨ İlk Sürüm
- 🎬 YouTube video transkripsiyon
- 🎤 OpenAI Whisper API entegrasyonu
- 💰 Maliyet hesaplama özellikleri
- 🌐 Multi-language desteği
- 📊 Detaylı istatistikler 