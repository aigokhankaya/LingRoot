# LingRoot İçerik Üretim Pipeline Token Optimizasyon Raporu

**Tarih:** 25 Kasım 2025  
**Analiz Edilen Sekmeler:** Konu Ağacı, Kitap, Doküman, Metin, Konu

---

## 1. Mevcut Pipeline Analizi

### 1.1 İşaretli Sekmelerin Mevcut Süreçleri

| Sekme | Mevcut Adımlar | LLM Çağrı Sayısı | Kullanılan Promptlar |
|-------|----------------|------------------|----------------------|
| **Konu** | 1. İngilizce İçerik Üretimi (CEFR seviyesinde) → 2. Hedef Dile Çeviri | 2 | `content_generation_{level}.txt`, `translate_from_english_{level}.txt` |
| **Konu Ağacı** | 1. Öneri Üretimi → 2. Türkçe İçerik → 3. İngilizceye Çeviri → 4. CEFR Adaptasyonu → 5. Post-Processing → 6. Daily Patterns | 4-5 | `topic_detail_suggestions.txt`, `content_generation_{level}.txt`, `translate_to_english.txt`, `cefr_{level}.txt` |
| **Metin** | 1. Metin Çıkarma → 2. İngilizceye Çeviri → 3. CEFR Adaptasyonu → 4. Daily Patterns | 2-3 | `translate_to_english.txt`, `cefr_{level}.txt` |
| **Doküman** | 1. PDF/DOCX Çıkarma → 2. İngilizceye Çeviri → 3. CEFR Adaptasyonu → 4. Daily Patterns | 2-3 | `translate_to_english.txt`, `cefr_{level}.txt` |
| **Kitap** | Placeholder (Henüz aktif değil) | - | - |

---

## 2. Token Kullanım Analizi

### 2.1 Mevcut Modeller ve Tahmini Token Kullanımı

| Adım | Model | Tahmini Input Token | Tahmini Output Token | Maliyet/1K Token |
|------|-------|---------------------|----------------------|------------------|
| Content Generation | gpt-4o | ~500-800 | ~5500-6000 | $0.0025 / $0.01 |
| Translation (TR→EN) | gpt-4o | ~6000-7000 | ~5500-6500 | $0.0025 / $0.01 |
| Translation (EN→TR) | gpt-4o | ~6000-7000 | ~5500-6500 | $0.0025 / $0.01 |
| CEFR Adaptation | gpt-4-turbo | ~6000-7000 | ~5000-6000 | $0.01 / $0.03 |
| Topic Suggestions | gpt-4o | ~300-500 | ~200-400 | $0.0025 / $0.01 |
| Daily Patterns | gpt-4o-mini | ~6000-7000 | ~500-1000 | $0.00015 / $0.0006 |

### 2.2 Konu Ağacı için Toplam Tahmini Token (Tam Akış)

```
Mevcut: ~35,000-45,000 total tokens per request
- Suggestions: ~700-1200 tokens
- Content Generation: ~6500-7000 tokens  
- Translation to English: ~12,000-14,000 tokens
- CEFR Adaptation: ~12,000-14,000 tokens
- Daily Patterns: ~7000-8000 tokens
```

---

## 3. Tespit Edilen Sorunlar

### 3.1 🔴 Kritik: Gereksiz Çift İşleme (Konu Ağacı)

**Sorun:** `topicPipelineController.js` şu akışı kullanıyor:
1. Türkçe içerik üret (`content_generation_{level}.txt`)
2. İngilizceye çevir (`translate_to_english.txt`)
3. CEFR seviyesine adapte et (`cefr_{level}.txt`)

**Neden Gereksiz:**
- `content_generation_{level}.txt` zaten CEFR seviyesine uygun içerik üretiyor
- Ardından çeviri yapıp tekrar CEFR adaptasyonu yapmak token israfı

### 3.2 🟠 Orta: Çeviri + Adaptasyon Tekrarı

**Metin/Doküman akışında:**
- Kullanıcı Türkçe metin giriyor
- Metin İngilizceye çevriliyor
- Sonra CEFR seviyesine adapte ediliyor

**Sorun:** Çeviri sırasında seviye belirtilmesine rağmen, sonra tekrar adaptasyon yapılıyor.

### 3.3 🟡 Düşük: Chunking Stratejisi

- Her LLM çağrısı için metin chunk'lara bölünüyor
- Her chunk ayrı API çağrısı gerektiriyor
- Chunk sayısı arttıkça token maliyeti katlanıyor

---

## 4. Önerilen Optimizasyonlar

### 4.1 Konu Ağacı Pipeline Optimizasyonu

| Adım | Mevcut Süreç | Önerilen Süreç | Token Tasarrufu |
|------|--------------|----------------|-----------------|
| 1 | Topic Suggestions (Türkçe) | Topic Suggestions (Türkçe) - Değişiklik yok | 0% |
| 2 | Türkçe İçerik Üretimi | **Kaldır** - Gereksiz | ~6500 token (%18) |
| 3 | İngilizceye Çeviri | **Doğrudan İngilizce İçerik Üretimi** (CEFR seviyesinde) | ~12000 token (%35) |
| 4 | CEFR Adaptasyonu | **Kaldır** - Zaten seviyede üretiliyor | ~12000 token (%35) |
| 5 | Post-Processing | Post-Processing - Değişiklik yok | 0% |
| 6 | Daily Patterns | Daily Patterns - Değişiklik yok (zaten optimize) | 0% |

**Toplam Tahmini Tasarruf: %50-60 (Konu Ağacı için)**

### 4.2 Metin/Doküman Pipeline Optimizasyonu

| Adım | Mevcut Süreç | Önerilen Süreç | Token Tasarrufu |
|------|--------------|----------------|-----------------|
| 1 | Metin Çıkarma | Metin Çıkarma - Değişiklik yok | 0% |
| 2 | İngilizceye Çeviri | **Tek Adımda Çeviri + CEFR Adaptasyonu** | ~30-40% |
| 3 | CEFR Adaptasyonu | **Birleştirildi (Adım 2 ile)** | Dahil |
| 4 | Daily Patterns | Daily Patterns - Değişiklik yok | 0% |

**Toplam Tahmini Tasarruf: %30-40 (Metin/Doküman için)**

### 4.3 Konu Pipeline Optimizasyonu

| Adım | Mevcut Süreç | Önerilen Süreç | Token Tasarrufu |
|------|--------------|----------------|-----------------|
| 1 | İngilizce İçerik Üretimi (CEFR) | İngilizce İçerik Üretimi (CEFR) - Değişiklik yok | 0% |
| 2 | Hedef Dile Çeviri | Hedef Dile Çeviri - Değişiklik yok | 0% |

**Not:** Konu akışı zaten optimize. Değişiklik önerilmiyor.

---

## 5. Detaylı Uygulama Önerileri

### 5.1 Yeni Birleşik Prompt: `unified_content_generation_{level}.txt`

```txt
🎯 TASK:
Generate educational content about the given topic in English at CEFR {{level}} level.
Also provide a {{input_language}} translation maintaining the same CEFR level.

INPUT:
Topic: "{{topic}}"
Level: {{level}}
Target Translation Language: {{input_language}}

OUTPUT FORMAT (JSON):
{
  "english_text": "...",
  "translated_text": "..."
}
```

**Avantajları:**
- Tek API çağrısı
- ~50% token tasarrufu
- Tutarlı CEFR seviyesi
- Hem İngilizce hem çeviri aynı anda

### 5.2 Yeni Birleşik Prompt: `translate_and_adapt_{level}.txt`

```txt
🎯 TASK:
Translate the given {{source_language}} text into English at CEFR {{level}} level.

REQUIREMENTS:
1. Translate to English
2. Adapt to CEFR {{level}} vocabulary and grammar
3. Preserve all factual content
4. Do both in a single pass

INPUT:
{{input_text}}

OUTPUT:
Return only the translated and adapted English text.
```

**Avantajları:**
- Çeviri ve adaptasyon tek adımda
- ~30-40% token tasarrufu

---

## 6. Karşılaştırma Tablosu

### 6.1 Konu Ağacı (Topic Tree) Karşılaştırması

| Metrik | Mevcut | Önerilen | Fark |
|--------|--------|----------|------|
| LLM Çağrı Sayısı | 4-5 | 2-3 | **-50%** |
| Tahmini Input Tokens | ~20,000 | ~8,000 | **-60%** |
| Tahmini Output Tokens | ~18,000 | ~12,000 | **-33%** |
| Toplam Token | ~38,000 | ~20,000 | **-47%** |
| Tahmini Maliyet (USD) | ~$0.50 | ~$0.25 | **-50%** |
| İşlem Süresi | ~15-20s | ~8-12s | **-40%** |

### 6.2 Metin/Doküman Karşılaştırması

| Metrik | Mevcut | Önerilen | Fark |
|--------|--------|----------|------|
| LLM Çağrı Sayısı | 2-3 | 1-2 | **-50%** |
| Tahmini Input Tokens | ~12,000 | ~7,000 | **-42%** |
| Tahmini Output Tokens | ~11,000 | ~6,000 | **-45%** |
| Toplam Token | ~23,000 | ~13,000 | **-43%** |
| Tahmini Maliyet (USD) | ~$0.30 | ~$0.17 | **-43%** |
| İşlem Süresi | ~10-15s | ~5-8s | **-45%** |

### 6.3 Konu Karşılaştırması

| Metrik | Mevcut | Önerilen | Fark |
|--------|--------|----------|------|
| LLM Çağrı Sayısı | 2 | 1 | **-50%** |
| Tahmini Input Tokens | ~7,000 | ~800 | **-89%** |
| Tahmini Output Tokens | ~12,000 | ~12,000 | 0% |
| Toplam Token | ~19,000 | ~12,800 | **-33%** |
| Tahmini Maliyet (USD) | ~$0.25 | ~$0.15 | **-40%** |
| İşlem Süresi | ~8-12s | ~5-7s | **-40%** |

---

## 7. Kalite Korunması Stratejileri

### 7.1 CEFR Kalitesi Garantisi

| Strateji | Açıklama |
|----------|----------|
| **Seviye-Spesifik Promptlar** | Her CEFR seviyesi için ayrı, detaylı kurallar içeren promptlar kullanılmaya devam edilecek |
| **Kelime Listesi Referansı** | A1-A2 için NGSL Core 600, B1+ için genişletilmiş listeler |
| **Gramer Kısıtlamaları** | A1: Simple Present/Past, 9 kelime limit; B2+: Karmaşık yapılara izin |
| **Post-Processing** | Lexical simplification ve semantic audit devam edecek |

### 7.2 Çeviri Kalitesi Garantisi

| Strateji | Açıklama |
|----------|----------|
| **Seviye-Uyumlu Çeviri** | Çeviri sırasında hedef dilin CEFR seviyesi korunacak |
| **Anlam Bütünlüğü** | Tüm faktüel içerik korunacak, özetleme yapılmayacak |
| **Doğal Akış** | Hedef dilde doğal, akıcı cümleler |

---

## 8. Uygulama Yol Haritası

### Faz 1: Düşük Riskli Optimizasyonlar (1-2 Hafta)

1. ✅ `dailyPatternExtractor.js` - Zaten optimize (threshold check var)
2. 🔄 Model downgrade testi: CEFR adaptasyonu için `gpt-4o-mini` denemeleri
3. 🔄 Chunk boyutu optimizasyonu

### Faz 2: Orta Riskli Optimizasyonlar (2-3 Hafta)

1. 🔄 `translate_and_adapt_{level}.txt` birleşik prompt oluşturma
2. 🔄 Metin/Doküman akışında test
3. 🔄 A/B test ile kalite karşılaştırması

### Faz 3: Yüksek Etkili Optimizasyonlar (3-4 Hafta)

1. 🔄 `topicPipelineController.js` refaktörü
2. 🔄 `unified_content_generation_{level}.txt` prompt oluşturma
3. 🔄 Konu Ağacı akışında test
4. 🔄 Production deployment

---

## 9. Risk Analizi

| Risk | Olasılık | Etki | Azaltma Stratejisi |
|------|----------|------|---------------------|
| CEFR seviyesi bozulması | Orta | Yüksek | Kapsamlı A/B test, semantic audit |
| Çeviri kalitesi düşüşü | Düşük | Orta | Sample karşılaştırma, kullanıcı feedback |
| Anlam kaybı | Düşük | Yüksek | Semantic preservation check |
| API hataları | Düşük | Orta | Retry mekanizması, fallback |

---

## 10. Sonuç ve Öneriler

### Özet Tasarruf Tahmini

| Sekme | Mevcut Token/İstek | Önerilen Token/İstek | Tasarruf |
|-------|-------------------|---------------------|----------|
| Konu Ağacı | ~38,000 | ~20,000 | **47%** |
| Metin/Doküman | ~23,000 | ~13,000 | **43%** |
| Konu | ~19,000 | ~12,800 | **33%** |

### Aylık Tahmini Tasarruf (1000 istek/gün varsayımı)

```
Mevcut: ~80,000 x 1000 x 30 = 2.4B tokens/ay
Önerilen: ~46,000 x 1000 x 30 = 1.38B tokens/ay

Tahmini Tasarruf: ~1B tokens/ay (%42)
Tahmini Maliyet Tasarrufu: ~$500-800/ay
```

### Öncelik Sıralaması

1. **Yüksek Öncelik:** Konu Ağacı pipeline refaktörü (%47 tasarruf)
2. **Orta Öncelik:** Metin/Doküman birleşik çeviri (%43 tasarruf)
3. **Düşük Öncelik:** Konu akışı birleştirme (%33 tasarruf, risk/fayda oranı düşük)

---

**Rapor Sonu**
