# 🔍 Senkronizasyon Sorunu Troubleshooting

## Mevcut Durum

**Tarih:** 26 Ekim 2025  
**Sorun:** AudioPlayer'da senkronizasyon hala bozuk  
**Belirti:** Başlangıçta ses ileride, sonra eşitleniyor, sonra tekrar bozuluyor

## 📊 Log Analizi

### Backend Logları
```
✅ RESPONSE DEBUG - Timepoints in response: 301
✅ TTS Chunk 1 Success - Voice: en-GB-Wavenet-A
✅ TTS Chunk 2 Success - Voice: en-GB-Wavenet-A
❌ [FALLBACK TIMEPOINT] Received 0 timepoints for 104 words
❌ [FALLBACK LINEAR] No timepoints received, using linear estimation
```

### Sorunlar

#### 1. **Backend Yeni Kodu Çalıştırmıyor**
- Timepoint'ler response'da var (301 adet)
- Ama fallback mode'da 0 timepoint görüyor
- **Neden:** Render'da eski build hala çalışıyor

**Çözüm:**
```bash
# Render Dashboard'da:
1. Manual Deploy → Deploy latest commit
2. Veya otomatik deploy bekle (5-10 dakika)
```

#### 2. **Chunk Merge Timing Offset Sorunu**
- Her chunk'ın timing'i doğru
- Ama merge'de offset kayıyor olabilir

**Kontrol:**
```javascript
// backend/controllers/ttsController.js:806
cumulativeTimeOffset += ttsResult.totalDuration;
```

**Potansiyel Sorun:**
- `totalDuration` gerçek audio süresinden farklı olabilir
- Chunk'lar arası sessizlik (pause) hesaba katılmıyor

#### 3. **Mobile Drift Tolerance Yetersiz**
- Şu an: ±100ms
- Android'de daha fazla olabilir

**Test:**
```typescript
// AudioPlayer.tsx
const DRIFT_TOLERANCE = Platform.OS === 'android' ? 0.15 : 0.1;
```

---

## 🔧 Hızlı Çözümler

### Çözüm 1: Backend'i Yeniden Deploy Et
```bash
# Render Dashboard
1. lingloops-backend servisine git
2. Manual Deploy → Deploy latest commit
3. Logları izle: "Timepoint" araması yap
```

**Beklenen Log:**
```
🎯 Google TTS synthesis completed:
  - Marked words: 148/150 (98.7%)
  - Audio size: 245678 bytes
```

### Çözüm 2: Timing Offset'i Düzelt
```javascript
// backend/controllers/ttsController.js

// Önce: Sadece duration kullanıyoruz
cumulativeTimeOffset += ttsResult.totalDuration;

// Sonra: Gerçek audio süresini kullan
const actualDuration = ttsResult.wordTimings.length > 0 
  ? Math.max(...ttsResult.wordTimings.map(w => w.endTimeSeconds))
  : ttsResult.totalDuration;
cumulativeTimeOffset += actualDuration;
```

### Çözüm 3: Mobile Drift Tolerance Artır
```typescript
// LingRootMobile/src/components/AudioPlayer.tsx

// Android için daha yüksek tolerance
const DRIFT_TOLERANCE = Platform.OS === 'android' ? 0.2 : 0.1; // 200ms vs 100ms
```

---

## 🧪 Test Senaryoları

### Test 1: Tek Chunk (Kısa Metin)
```
Metin: "Hello world, this is a test."
Beklenen: Perfect sync
Gerçek: ?
```

### Test 2: Çoklu Chunk (Uzun Metin)
```
Metin: 500+ kelime
Chunk sayısı: 3-4
Beklenen: Her chunk'ta sync
Gerçek: İlk chunk OK, sonrakiler kayıyor
```

### Test 3: Farklı Speaking Rate
```
Rate: 0.5x, 1.0x, 1.5x, 2.0x
Beklenen: Tüm rate'lerde sync
Gerçek: ?
```

---

## 📈 Timing Quality Metrikleri

### Backend Response
```json
{
  "timingMethod": "Google TTS Timepoints",
  "timingQuality": {
    "totalWords": 150,
    "markedWords": 148,
    "markAccuracy": 98.7
  }
}
```

### Mobile'da Kontrol
```typescript
// AudioPlayer.tsx - useEffect'te log ekle
useEffect(() => {
  if (track.wordTimings) {
    console.log('🎯 Timing Quality:', {
      totalWords: track.words?.length,
      totalTimings: track.wordTimings.length,
      firstTiming: track.wordTimings[0],
      lastTiming: track.wordTimings[track.wordTimings.length - 1]
    });
  }
}, [track]);
```

---

## 🔍 Debug Checklist

### Backend
- [ ] Render'da yeni kod deploy edildi mi?
- [ ] Logda "Google TTS Timepoints" görünüyor mu?
- [ ] Timepoint sayısı kelime sayısına yakın mı? (>95%)
- [ ] Chunk merge'de offset doğru mu?

### Mobile
- [ ] Track'te `wordTimings` array'i var mı?
- [ ] `timeSeconds` ve `endTimeSeconds` değerleri mantıklı mı?
- [ ] İlk kelime 0.0s'de mi başlıyor?
- [ ] Son kelime total duration'a yakın mı?

### Network
- [ ] API response'da timepoints var mı?
- [ ] Response size normal mi? (büyük değişiklik var mı?)

---

## 💡 Alternatif Çözümler

### Plan A: Google Timepoint (Mevcut)
- ✅ %98 doğruluk
- ❌ Backend deploy gerekli
- ❌ Chunk merge hassas

### Plan B: WebVTT Subtitle
- ✅ Native player sync
- ✅ Platform bağımsız
- ❌ Custom highlight için ek iş

### Plan C: Forced Alignment
- ✅ %99 doğruluk
- ❌ Ekstra maliyet
- ❌ İşlem süresi uzun

---

## 🚀 Önerilen Aksiyon Planı

### Kısa Vadeli (Bugün)
1. **Backend'i yeniden deploy et** (Render Dashboard)
2. **Yeni bir ses oluştur** ve test et
3. **Logları kontrol et** - "Google TTS Timepoints" var mı?

### Orta Vadeli (Bu Hafta)
1. **Chunk merge algoritmasını iyileştir**
2. **Mobile drift tolerance'ı optimize et**
3. **A/B testing** - eski vs yeni sistem

### Uzun Vadeli (Gelecek)
1. **WebVTT subtitle desteği** ekle
2. **Timing quality badge** göster
3. **Real-time drift correction** implement et

---

## 📞 Destek

Sorun devam ederse:
1. Backend loglarını paylaş (tam log)
2. Mobile console loglarını paylaş
3. Test edilen track ID'sini belirt

---

**Son Güncelleme:** 26 Ekim 2025  
**Durum:** 🔴 Troubleshooting  
**Sonraki Adım:** Backend deploy + test
