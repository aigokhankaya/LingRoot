# LingRoot Token Optimizasyon Raporu V2
## Düzeltilmiş Analiz - Her İçerik İçin İki Dil Çıktısı

**Tarih:** 25 Kasım 2025  
**Analiz Edilen Sekmeler:** Konu Ağacı, Kitap, Doküman, Metin, Konu

---

## 1. Doğru Gereksinim Tanımı

### 1.1 Her İçerik Türü İçin Çıktılar

| Çıktı | Açıklama | Kullanım |
|-------|----------|----------|
| **CEFR İngilizce** | Kullanıcı seviyesine uygun İngilizce metin | TTS ses üretimi için |
| **Kullanıcı Dili** | Orijinal dilde metin (Türkçe vb.) | Önyüzde gösterim + DB kaydı |

### 1.2 İçerik Türlerine Göre Giriş/Çıkış

| Sekme | Kullanıcı Girdisi | Gerekli İşlem | DB'ye Kaydedilecek |
|-------|-------------------|---------------|---------------------|
| **Metin** | Türkçe metin | İngilizceye çevir (CEFR) | `original_text` (TR) + `adapted_text` (EN) |
| **Doküman** | PDF/DOCX (TR) | Çıkar + İngilizceye çevir (CEFR) | `original_text` (TR) + `adapted_text` (EN) |
| **Konu** | Konu başlığı (TR/EN) | İngilizce üret + Türkçeye çevir | `translated_text` (TR) + `adapted_text` (EN) |
| **Konu Ağacı** | Konu başlığı | Öneri + İçerik üret (İng) + Çevir (TR) | `translated_text` (TR) + `adapted_text` (EN) |
| **Kitap** | Kitap/Bölüm seçimi | Metin çek + işle | `original_text` + `adapted_text` |

---

## 2. Mevcut Süreç Analizi (Gerçek Akış)

### 2.1 Metin/Doküman Akışı (Mevcut)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Kullanıcı       │     │ İngilizceye      │     │ CEFR            │
│ Metni (TR)      │────▶│ Çeviri           │────▶│ Adaptasyonu     │
│                 │     │ (LLM Çağrı #1)   │     │ (LLM Çağrı #2)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
                                           ┌─────────────────────────┐
                                           │ DB Kayıt:               │
                                           │ - translated_text: TR   │
                                           │ - adapted_text: EN      │
                                           └─────────────────────────┘
```

**Sorun:** 2 ayrı LLM çağrısı yapılıyor. Çeviri sırasında zaten seviye belirtiliyor ama sonra tekrar adaptasyon yapılıyor.

### 2.2 Konu Akışı (Mevcut - `inputExtractor.js`)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Konu Başlığı    │     │ İngilizce İçerik │     │ Türkçeye        │
│ (TR/EN)         │────▶│ Üretimi (CEFR)   │────▶│ Çeviri          │
│                 │     │ (LLM Çağrı #1)   │     │ (LLM Çağrı #2)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
                                           ┌─────────────────────────┐
                                           │ Return:                 │
                                           │ - englishText: EN       │
                                           │ - translatedText: TR    │
                                           └─────────────────────────┘
```

**Durum:** Bu akış zaten optimize! CEFR adaptasyonu yok çünkü içerik zaten seviyede üretiliyor.

### 2.3 Konu Ağacı Akışı (Mevcut - `topicPipelineController.js`)

```
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ Konu      │    │ Öneri     │    │ Türkçe    │    │ İngilizce │    │ CEFR      │
│ Başlığı   │───▶│ Üretimi   │───▶│ İçerik    │───▶│ Çeviri    │───▶│ Adaptas.  │
│           │    │ (LLM #1)  │    │ (LLM #2)  │    │ (LLM #3)  │    │ (LLM #4)  │
└───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘
                                                                           │
                                                                           ▼
                                                            ┌─────────────────────┐
                                                            │ Return:             │
                                                            │ - narration_tr: TR  │
                                                            │ - translation_en: EN│
                                                            │ - adapted_text: EN  │
                                                            └─────────────────────┘
```

**Ciddi Sorun:** 4 LLM çağrısı! Türkçe içerik üretip sonra İngilizceye çevirip sonra tekrar CEFR adaptasyonu yapmak gereksiz.

---

## 3. Optimizasyon Önerileri

### 3.1 Metin/Doküman: Tek Çağrı ile Çeviri + Adaptasyon

#### Mevcut vs Önerilen

| Adım | Mevcut | Önerilen |
|------|--------|----------|
| 1 | Çeviri (gpt-4o) | **Çeviri + CEFR Adaptasyonu (tek çağrı)** |
| 2 | CEFR Adaptasyonu (gpt-4-turbo) | - |
| **Toplam LLM Çağrısı** | 2 | **1** |

#### Yeni Prompt: `translate_and_adapt_to_cefr_{level}.txt`

```txt
🎯 TASK:
Translate the given {{source_language}} text into CEFR {{level}} level English.

⚠️ REQUIREMENTS:
1. Translate the entire text to English
2. Apply CEFR {{level}} vocabulary and grammar rules during translation
3. Preserve ALL factual content - do not skip or summarize
4. Return ONLY the translated and leveled English text

📋 CEFR {{level}} RULES:
[A1-C2 seviyesine özel kurallar buraya]

📥 INPUT ({{source_language}}):
{{input_text}}

📤 OUTPUT:
Return only the CEFR {{level}} English translation. No explanations.
```

**Token Tasarrufu:**
- Mevcut: ~12,000 (çeviri) + ~12,000 (adaptasyon) = ~24,000 token
- Önerilen: ~14,000 token (tek çağrı)
- **Tasarruf: %42**

### 3.2 Konu Ağacı: Direkt İngilizce Üretim

#### Mevcut vs Önerilen

| Adım | Mevcut | Önerilen |
|------|--------|----------|
| 1 | Öneri Üretimi (gpt-4o) | Öneri Üretimi (değişiklik yok) |
| 2 | Türkçe İçerik Üretimi | **KALDIRILDI** |
| 3 | İngilizceye Çeviri | **İngilizce + Türkçe Üretimi (tek çağrı)** |
| 4 | CEFR Adaptasyonu | **KALDIRILDI** (zaten seviyede üretiliyor) |
| **Toplam LLM Çağrısı** | 4 | **2** |

#### Yeni Prompt: `generate_bilingual_content_{level}.txt`

```txt
🎯 TASK:
Generate educational content about "{{topic}}" for CEFR {{level}} learners.
Provide BOTH English (for audio) and {{target_language}} (for display) versions.

📋 OUTPUT FORMAT (JSON):
{
  "english_text": "...[CEFR {{level}} English content - 5500-5750 words]...",
  "{{target_language_code}}_text": "...[Same content in {{target_language}} at equivalent level]..."
}

⚠️ REQUIREMENTS:
- English must strictly follow CEFR {{level}} vocabulary and grammar
- {{target_language}} version must maintain the same simplicity level
- Both versions must contain IDENTICAL information
- Length: 5500-5750 words per language

📥 TOPIC: {{topic}}
📤 OUTPUT: Return valid JSON only.
```

**Token Tasarrufu:**
- Mevcut: ~1,000 + ~7,000 + ~13,000 + ~12,000 = ~33,000 token
- Önerilen: ~1,000 + ~14,000 = ~15,000 token
- **Tasarruf: %55**

### 3.3 Konu (inputExtractor): Zaten Optimize ✅

Mevcut akış zaten verimli:
1. İngilizce içerik üret (CEFR seviyesinde)
2. Türkçeye çevir

**Ekstra Optimizasyon:** İki çağrıyı tek JSON çıktılı çağrıya birleştir.

- Mevcut: ~7,000 + ~12,000 = ~19,000 token
- Önerilen: ~14,000 token (tek çağrı)
- **Tasarruf: %26**

---

## 4. Karşılaştırma Tabloları

### 4.1 Metin/Doküman Pipeline

| Metrik | Mevcut | Önerilen | Tasarruf |
|--------|--------|----------|----------|
| LLM Çağrısı | 2 | 1 | **-50%** |
| Input Tokens | ~12,000 | ~7,000 | **-42%** |
| Output Tokens | ~11,000 | ~6,000 | **-45%** |
| **Toplam Token** | ~23,000 | ~13,000 | **-43%** |
| Tahmini Maliyet | $0.30 | $0.17 | **-43%** |
| İşlem Süresi | 10-15s | 5-8s | **-45%** |

### 4.2 Konu Ağacı Pipeline

| Metrik | Mevcut | Önerilen | Tasarruf |
|--------|--------|----------|----------|
| LLM Çağrısı | 4 | 2 | **-50%** |
| Input Tokens | ~20,000 | ~8,000 | **-60%** |
| Output Tokens | ~18,000 | ~12,000 | **-33%** |
| **Toplam Token** | ~38,000 | ~20,000 | **-47%** |
| Tahmini Maliyet | $0.50 | $0.26 | **-48%** |
| İşlem Süresi | 15-25s | 8-12s | **-50%** |

### 4.3 Konu Pipeline

| Metrik | Mevcut | Önerilen | Tasarruf |
|--------|--------|----------|----------|
| LLM Çağrısı | 2 | 1 | **-50%** |
| Input Tokens | ~7,500 | ~1,000 | **-87%** |
| Output Tokens | ~12,000 | ~12,000 | 0% |
| **Toplam Token** | ~19,500 | ~13,000 | **-33%** |
| Tahmini Maliyet | $0.25 | $0.17 | **-32%** |
| İşlem Süresi | 8-12s | 5-7s | **-40%** |

### 4.4 Genel Özet Tablosu

| Sekme | Mevcut LLM | Önerilen LLM | Mevcut Token | Önerilen Token | Tasarruf |
|-------|------------|--------------|--------------|----------------|----------|
| Metin | 2 | 1 | 23K | 13K | **43%** |
| Doküman | 2 | 1 | 23K | 13K | **43%** |
| Konu | 2 | 1 | 19.5K | 13K | **33%** |
| Konu Ağacı | 4 | 2 | 38K | 20K | **47%** |
| **Ortalama** | - | - | - | - | **42%** |

---

## 5. Kalite Garantisi

### 5.1 CEFR Kalitesi Korunacak

| Seviye | Kelime Limiti | Gramer Kuralları | Cümle Uzunluğu |
|--------|---------------|------------------|----------------|
| A1 | NGSL 600 + CEFR A1 | Simple Present/Past | ≤9 kelime |
| A2 | NGSL 1000 + CEFR A2 | + Future, Can/Could | ≤12 kelime |
| B1 | NGSL 2000 + CEFR B1 | + Perfect tenses | ≤15 kelime |
| B2 | NGSL 3000 + CEFR B2 | + Passive, Conditionals | ≤18 kelime |
| C1 | Extended vocabulary | Full grammar | ≤22 kelime |
| C2 | Native-level | All structures | No limit |

### 5.2 Çeviri Kalitesi Korunacak

- ✅ Tüm faktüel içerik korunacak
- ✅ Paragraf yapısı aynı kalacak
- ✅ Seviyeye uygun kelime/gramer kullanılacak
- ✅ Anlam kaybı olmayacak

### 5.3 DB Çıktıları

| Alan | Açıklama | Örnek |
|------|----------|-------|
| `original_text` | Kullanıcının verdiği orijinal metin | Türkçe metin |
| `translated_text` | Kullanıcı dilindeki metin (üretilen içerikler için) | Türkçe çeviri |
| `adapted_text` | CEFR seviyesinde İngilizce metin | A1 English text |
| `level` | CEFR seviyesi | A1, B2, etc. |

---

## 6. Uygulama Planı

### Faz 1: Düşük Riskli (1 Hafta)

1. **Yeni prompt dosyaları oluştur:**
   - `translate_and_adapt_to_cefr_A1.txt`
   - `translate_and_adapt_to_cefr_A2.txt`
   - ... (her seviye için)

2. **Test ortamında dene:**
   - Kalite karşılaştırması
   - Token kullanımı ölçümü

### Faz 2: Metin/Doküman Optimizasyonu (1 Hafta)

1. `ttsController.js` güncellemesi:
   - `translateToEnglishWithOpenAI` + `adaptToCEFR` → `translateAndAdaptToCEFR`
   
2. A/B test:
   - %10 trafik yeni akışa
   - Kalite metrikleri izleme

### Faz 3: Konu Ağacı Optimizasyonu (2 Hafta)

1. `topicPipelineController.js` refaktörü:
   - 4 adımı 2 adıma düşür
   
2. `generate_bilingual_content_{level}.txt` promptları oluştur

3. Kapsamlı test

### Faz 4: Konu Optimizasyonu (1 Hafta)

1. `inputExtractor.js` güncellemesi:
   - Tek JSON çıktılı çağrı

---

## 7. Risk Analizi

| Risk | Olasılık | Etki | Azaltma |
|------|----------|------|---------|
| CEFR seviyesi bozulması | Düşük | Yüksek | Detaylı prompt engineering + A/B test |
| Çeviri kalitesi düşüşü | Düşük | Orta | Sample karşılaştırma |
| JSON parse hatası | Orta | Düşük | Fallback mekanizması |
| Uzun metin sorunları | Orta | Orta | Chunking stratejisi koruma |

---

## 8. Sonuç

### Toplam Tahmini Tasarruf

| Metrik | Mevcut | Önerilen | İyileşme |
|--------|--------|----------|----------|
| Ortalama LLM çağrısı/istek | 2.5 | 1.25 | **-50%** |
| Ortalama token/istek | 26K | 15K | **-42%** |
| Tahmini maliyet/istek | $0.34 | $0.20 | **-41%** |

### Aylık Projeksiyon (1000 istek/gün)

```
Mevcut:   26,000 × 1,000 × 30 = 780M tokens/ay ≈ $1,020/ay
Önerilen: 15,000 × 1,000 × 30 = 450M tokens/ay ≈ $600/ay

Tasarruf: 330M tokens/ay ≈ $420/ay (%41)
```

### Öncelik Sıralaması

| Öncelik | Sekme | Tasarruf | Uygulama Zorluğu | ROI |
|---------|-------|----------|------------------|-----|
| 1️⃣ | **Konu Ağacı** | 47% | Orta | ⭐⭐⭐⭐⭐ |
| 2️⃣ | **Metin/Doküman** | 43% | Düşük | ⭐⭐⭐⭐ |
| 3️⃣ | **Konu** | 33% | Düşük | ⭐⭐⭐ |

---

**Rapor Sonu**
