# Google TTS Noktalama Duraklaması Düzeltmesi

## Sorun
Google TTS ile üretilen seslerde cümle sonlarında ve noktalama işaretlerinde yeterli duraklama yapılmıyordu. Ses sanki cümle sonu değilmiş gibi durmaksızın ilerliyordu.

## Kök Neden
SSML (Speech Synthesis Markup Language) kullanılıyordu ama noktalama işaretlerinden sonra **açık duraklama tag'leri (`<break>`)** eklenmiyordu. Google TTS noktalama işaretlerini görüyor ama varsayılan duraklamaları yeterince uzun değil.

## Çözüm

### 1. SSML Break Tag'leri Eklendi
`generateSSMLWithOptimizedMarks()` fonksiyonuna noktalama işaretlerine göre duraklama eklendi:

```javascript
// Noktalama işaretlerine göre duraklama ekle
if (originalWord.includes('.') || originalWord.includes('!') || originalWord.includes('?')) {
  // Cümle sonu: 500ms duraklama
  ssml += '<break time="500ms"/>';
} else if (originalWord.includes(',') || originalWord.includes(';') || originalWord.includes(':')) {
  // Virgül/noktalı virgül: 300ms duraklama
  ssml += '<break time="300ms"/>';
}
```

### 2. Duraklama Süreleri
- **Cümle sonu** (`.`, `!`, `?`): **500ms** duraklama
- **Virgül/Noktalı virgül** (`,`, `;`, `:`): **300ms** duraklama

Bu süreler doğal konuşma ritmine uygun olarak ayarlandı.

### 3. Fallback Modu Düzeltildi
SSML desteklemeyen sesler için fallback modunda:
- Noktalama işaretleri artık korunuyor (önceden `cleanWords.join(' ')` ile kaldırılıyordu)
- Plain text olarak gönderildiğinde Google TTS kendi doğal duraklamalarını yapıyor

## Değişiklikler

### Dosya: `backend/utils/googleTTS.js`

1. **generateSSMLWithOptimizedMarks()** - SSML break tag'leri eklendi
2. **Fallback mode** - Noktalama işaretleri korunuyor

## Test Etme

1. Backend'i yeniden başlatın
2. Yeni bir ses oluşturun (noktalama işaretleri içeren metin ile)
3. Örnek metin:
   ```
   Hello, my name is John. How are you today? I hope you're doing well! 
   This is a test, and it should pause naturally.
   ```

## Beklenen Sonuç

- Cümle sonlarında (`.`, `!`, `?`) belirgin 500ms duraklama
- Virgüllerde (`,`, `;`, `:`) 300ms duraklama
- Daha doğal ve anlaşılır konuşma ritmi

## Özelleştirme

Duraklama sürelerini ayarlamak için `googleTTS.js` dosyasındaki değerleri değiştirebilirsiniz:

```javascript
// Daha uzun duraklamalar için:
ssml += '<break time="700ms"/>';  // Cümle sonu
ssml += '<break time="400ms"/>';  // Virgül

// Daha kısa duraklamalar için:
ssml += '<break time="300ms"/>';  // Cümle sonu
ssml += '<break time="200ms"/>';  // Virgül
```

## Notlar

- SSML break tag'leri sadece SSML destekleyen seslerle çalışır
- Chirp, Journey, Studio gibi sesler SSML desteklemez, fallback mode kullanır
- Fallback mode'da Google TTS'nin kendi doğal duraklamaları kullanılır

## Optimizasyonlar

### 1. Studio Sesleri İçin Otomatik Fallback
Studio, Chirp ve Journey sesleri SSML desteklemediği için direkt fallback moduna geçiyor. Bu normal bir davranıştır.

**Önemli:** Studio sesleri artık değiştirilmiyor, plain text modunda orijinal ses kullanılıyor.

**Log Örneği:**
```
🔄 Voice en-GB-Studio-C doesn't support SSML, using fallback mode (plain text)
🔄 Using fallback configuration (plain text + compatible gender)...
🔄 [FALLBACK] Using original voice en-GB-Studio-C with plain text mode
```

**Not:** Sadece permission/quota hataları durumunda ses değiştirilir (Neural2/Standard'a geçilir).

### 2. Voice Gender Cache
Aynı ses için tekrarlı API çağrılarını önlemek için gender bilgisi cache'leniyor. Bu özellikle çok chunk'lı işlemlerde performansı artırıyor.

**Faydası:**
- İlk chunk: API'den gender bilgisi alınır
- Sonraki chunk'lar: Cache'den okunur (API çağrısı yok)
- 7 chunk için 1 API çağrısı (önceden 7 çağrı yapılıyordu)
