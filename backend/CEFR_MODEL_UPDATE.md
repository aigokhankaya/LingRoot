# 🎯 CEFR Model Güncelleme - GPT-4-Turbo

## 📋 Özet

CEFR seviye adaptasyonları (A1-C2) için **GPT-4-Turbo** modeli kullanılacak şekilde güncellendi.

---

## 🔧 Yapılan Değişiklikler

### 1. **cefrAdapter.js** - Model Değişikliği

**Dosya:** `backend/utils/cefrAdapter.js`

**Eski:**
```javascript
const model = process.env.OPENAI_MODEL || "gpt-4o";
```

**Yeni:**
```javascript
// Use GPT-4-Turbo for CEFR adaptations (A1-C2)
const model = process.env.OPENAI_CEFR_MODEL || "gpt-4-turbo";
```

---

### 2. **costTracker.js** - Fiyatlandırma Eklendi

**Dosya:** `backend/utils/costTracker.js`

**Eklenen:**
```javascript
const defaultOpenAiPricing = {
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },           // ✅ YENİ
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },   // ✅ YENİ
  'o4-mini': { input: 0.0025, output: 0.005 },
};
```

---

## 🎯 Hangi İşlemler Etkilenir?

### ✅ GPT-4-Turbo Kullanacak:
- **CEFR A1** adaptasyonu (`cefr_A1.txt`)
- **CEFR A2** adaptasyonu (`cefr_A2.txt`)
- **CEFR B1** adaptasyonu (`cefr_B1.txt`)
- **CEFR B2** adaptasyonu (`cefr_B2.txt`)
- **CEFR C1** adaptasyonu (`cefr_C1.txt`)
- **CEFR C2** adaptasyonu (`cefr_C2.txt`)

### ❌ Değişmeyen (gpt-4o kullanmaya devam eder):
- Konu önerileri (`topicSuggestController.js`)
- Konu detayları (`topicDetailController.js`)
- Narration rewrite (`narrationController.js`)
- Metin çevirisi (`inputExtractor.js`)
- Transkript temizleme (`inputExtractor.js`)

### ❌ Değişmeyen (gpt-4o-mini kullanmaya devam eder):
- Kelime çevirisi (`wordTranslationService.js`)
- Örnek cümle oluşturma (`wordTranslationService.js`)
- CEFR seviye tahmini (`wordTranslationService.js`)

---

## 💰 Maliyet Karşılaştırması

| Model | Input (1K token) | Output (1K token) | Toplam Örnek* |
|-------|------------------|-------------------|---------------|
| **gpt-4o** | $0.005 | $0.015 | $0.020 |
| **gpt-4-turbo** | $0.010 | $0.030 | $0.040 |
| **gpt-4o-mini** | $0.00015 | $0.0006 | $0.00075 |

*Örnek: 1K input + 1K output token için toplam maliyet

### 📊 CEFR Adaptasyonu Maliyet Artışı:
- **Önceki:** gpt-4o → ~$0.020 / 1K token
- **Yeni:** gpt-4-turbo → ~$0.040 / 1K token
- **Artış:** 2x (100% daha pahalı)

---

## 🔄 Environment Variable (Opsiyonel)

Backend `.env` dosyasına ekleyebilirsin:

```bash
# CEFR adaptasyonları için özel model (varsayılan: gpt-4-turbo)
OPENAI_CEFR_MODEL=gpt-4-turbo

# Diğer işlemler için genel model (varsayılan: gpt-4o)
OPENAI_MODEL=gpt-4o
```

---

## 🧪 Test

### 1. Backend'i Restart Et
```bash
cd backend
npm start
```

### 2. Beklenen Log
```
🎯 CEFR Adapter - Selected prompt file: cefr_A1.txt for level: A1
Sending request to OpenAI (model: gpt-4-turbo) for CEFR level A1 adaptation.
```

### 3. Konu Oluştur
- Level: A1, A2, B1, B2, C1 veya C2 seç
- Log'da `model: gpt-4-turbo` göreceksin

---

## 📝 Neden GPT-4-Turbo?

### ✅ Avantajlar:
1. **Daha iyi prompt takibi:** Karmaşık CEFR kurallarını daha iyi anlar
2. **Daha tutarlı çıktı:** A1 seviyesi için gerçekten basit cümleler üretir
3. **Daha az hallüsinasyon:** Prompt'taki kısıtlamalara daha sadık kalır
4. **Daha uzun context:** 128K token context window

### ❌ Dezavantajlar:
1. **2x daha pahalı:** $0.04 vs $0.02 (1K input+output için)
2. **Biraz daha yavaş:** ~2-3 saniye daha uzun response time

---

## 🎯 Sonuç

CEFR adaptasyonları artık **GPT-4-Turbo** kullanıyor. Daha kaliteli ve tutarlı seviye adaptasyonları bekliyoruz! 🚀

Maliyet 2x arttı ama kalite artışı buna değer. 💎
