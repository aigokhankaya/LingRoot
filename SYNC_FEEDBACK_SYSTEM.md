# Senkronizasyon Feedback Sistemi

## Amaç
Ses-kelime senkronizasyonundaki sorunları tespit etmek için kullanıcı feedback sistemi.

## Nasıl Çalışır?

### 1. Mobile App (AudioPlayer)
- **YES Butonu**: Senkronizasyon doğru
- **NO Butonu**: Senkronizasyon yanlış

Her butona basıldığında şu bilgiler backend'e gönderilir:
- Track ID
- Mevcut kelime index'i
- Mevcut ses pozisyonu (saniye)
- Beklenen kelime
- Feedback (YES/NO)
- Tüm word timings array'i
- Timestamp

### 2. Backend
Feedback'ler `backend/logs/sync-feedback.log` dosyasına kaydedilir.

#### Log İçeriği
```json
{
  "timestamp": "2025-10-25T20:00:00.000Z",
  "feedback": "NO",
  "trackId": "abc123",
  "currentWordIndex": 42,
  "currentTime": 15.3,
  "expectedWord": "example",
  "analysis": {
    "totalWords": 150,
    "expectedTime": 14.8,
    "timeDiff": 0.5,
    "timeDiffMs": 500,
    "isAhead": true,
    "isBehind": false,
    "previousWord": {...},
    "currentWord": {...},
    "nextWord": {...}
  },
  "wordTimings": [...]
}
```

## Test Adımları

### 1. Backend'i Başlat
```bash
cd backend
npm start
```

### 2. Mobile App'i Çalıştır
```bash
cd LingRootMobile
npm start
# veya
npx expo start
```

### 3. Ses Çal ve Test Et
1. Bir ses dosyası oluştur
2. AudioPlayer'da çal
3. Kelimeleri takip et
4. Senkronizasyon doğruysa **YES**, yanlışsa **NO** butonuna bas

### 4. Logları İncele
```bash
cd backend/logs
cat sync-feedback.log
```

## Analiz Endpoint'i

Backend'de feedback analizi için endpoint:
```
GET /api/tts/sync-feedback/analyze
```

Response:
```json
{
  "success": true,
  "stats": {
    "total": 50,
    "yes": 35,
    "no": 15,
    "accuracy": 70,
    "avgTimeDiff": 250,
    "problems": [
      {
        "timestamp": "...",
        "trackId": "...",
        "word": "example",
        "timeDiff": 500
      }
    ]
  }
}
```

## Sorun Tespiti

### Yaygın Sorunlar

#### 1. Ses Kelimeden Önde (isAhead: true)
- **Belirti**: Kelime highlight'ı geç kalıyor
- **Neden**: Word timing'ler gerçek ses süresinden uzun
- **Çözüm**: Speaking rate hesaplamasını düzelt

#### 2. Ses Kelimeden Geride (isBehind: true)
- **Belirti**: Kelime highlight'ı çok erken geliyor
- **Neden**: Word timing'ler gerçek ses süresinden kısa
- **Çözüm**: Timing hesaplamasını düzelt

#### 3. Tutarsız Senkronizasyon
- **Belirti**: Bazen doğru, bazen yanlış
- **Neden**: Chunk'lar arası timing kayması
- **Çözüm**: Chunk merge algoritmasını düzelt

## Değişiklikler

### Backend
- ✅ `controllers/syncFeedbackController.js` - Yeni controller
- ✅ `routes/ttsRoutes.js` - Yeni endpoint'ler
- ✅ `logs/sync-feedback.log` - Log dosyası

### Mobile
- ✅ `services/api.ts` - `sendSyncFeedback()` fonksiyonu
- ✅ `components/AudioPlayer.tsx` - YES/NO butonları
- ✅ `types/index.ts` - `wordTimings` field eklendi

## Sonraki Adımlar

1. **Test Et**: Farklı seslerle test yap
2. **Logları Analiz Et**: Pattern'leri tespit et
3. **Çözüm Geliştir**: Tespit edilen sorunları düzelt
4. **Doğrula**: Düzeltmeleri test et

## Notlar

- Butonlar sadece test amaçlı, production'da kaldırılabilir
- Log dosyası büyüyebilir, periyodik temizlik gerekebilir
- Analiz endpoint'i admin kullanıcılar için sınırlandırılabilir
