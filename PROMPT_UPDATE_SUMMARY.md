# 🎯 Prompt Güncelleme Özeti

## 📋 Yapılan Güncellemeler

### ✅ Güncellenen Dosyalar

| Dosya | Değişiklik | Durum |
|-------|------------|-------|
| `liro_system_default.txt` | ✏️ Yorum satırları genişletildi, Türkçe kuralı eklendi | ✅ Güncellendi |
| `liro_system_personalized.txt` | ✏️ Yorum satırları detaylandırıldı, placeholder listesi eklendi | ✅ Güncellendi |
| `conversation_title_generator.txt` | ✏️ Yorum satırları, placeholder, örnekler eklendi | ✅ Güncellendi |
| `topic_extractor.txt` | 🆕 Yeniden oluşturuldu (`topic_extractor_new.txt`) | ⚠️ Yeni dosya |
| `user_interest_analyzer.txt` | 🆕 Güncellendi (`user_interest_analyzer_updated.txt`) | ⚠️ Yeni dosya |

---

## 🔧 Yapılan İyileştirmeler

### 1. **Yorum Satırları Standardizasyonu**

**Önce:**
```txt
// 🇹🇷 Kullanım: Kısa açıklama
```

**Sonra:**
```txt
// 🇹🇷 Kullanım: Detaylı açıklama
// Bu prompt, [ne işe yaradığı]
// Kullanıldığı yerler: backend/path/to/file.js → functionName()
// Placeholder'lar: {{var1}}, {{var2}}, {{var3}}
```

### 2. **Placeholder Dokümantasyonu**

Her dosyada kullanılan placeholder'lar açıkça belirtildi:

```txt
// Placeholder'lar: {{username}}, {{greetingStyle}}, {{profileSection}}, 
//                 {{learningPreferences}}, {{suggestionStrategy}}, 
//                 {{avoidanceNotes}}, {{focusSection}}, 
//                 {{personalizedOpening}}, {{preferredLevel}}
```

### 3. **Örnekler Geliştirildi**

**Önce:**
```txt
🎯 ÖRNEK:
İyi: Yapay Zeka ile Seyahat
Kötü: 🤖 Sohbet
```

**Sonra:**
```txt
💡 ÖRNEKLER:
✅ İyi başlıklar:
- "Yapay Zeka ve Etik"
- "Sürdürülebilir Enerji Kaynakları"
- "Dijital Pazarlama Stratejileri"

❌ Kötü başlıklar:
- "Konuşma" (çok genel)
- "Kullanıcı AI ile konuşuyor" (çok uzun, spesifik değil)
- "🤖 Teknoloji" (emoji içeriyor)
```

### 4. **Kurallar Netleştirildi**

**Önce:**
```txt
📌 KURALLAR:
- Türkçe yaz
- Kısa olsun
```

**Sonra:**
```txt
📌 KURALLAR:
- Başlık TÜRKÇE olmalı
- Kısa, net ve açıklayıcı olsun (3-6 kelime)
- Noktalama, emoji, tırnak kullanma
- "Sohbet", "Konuşma" gibi genel sözcükler kullanma
- Sadece başlık ver, açıklama ekleme
- Kod bloğu kullanma
```

### 5. **JSON Format Örnekleri**

Her JSON döndüren prompt için detaylı format açıklaması:

```txt
📌 BEKLENEN FORMAT:
{
  "topic": "Konu başlığı (3–6 kelime, Türkçe)",
  "description": "1–2 cümlelik Türkçe açıklama",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

📌 KURALLAR:
- SADECE geçerli JSON döndür
- Kod bloğu kullanma (```json gibi)
- Açıklama ekleme, sadece JSON
```

---

## 📊 Dosya Karşılaştırması

### `liro_system_default.txt`

| Özellik | Önce | Sonra |
|---------|------|-------|
| **Yorum satırları** | 2 satır | 4 satır (kullanım yeri + placeholder) |
| **Türkçe kuralı** | ❌ Yok | ✅ Eklendi |
| **Kurallar** | 3 madde | 6 madde |

### `conversation_title_generator.txt`

| Özellik | Önce | Sonra |
|---------|------|-------|
| **Yorum satırları** | ❌ Yok | ✅ 4 satır |
| **Placeholder** | ❌ Belirtilmemiş | ✅ `{{messages}}` |
| **Örnekler** | 2 örnek | 6 örnek (3 iyi, 3 kötü) |
| **Açıklama** | Kısa | Detaylı (neden kötü?) |

### `topic_extractor.txt`

| Özellik | Önce | Sonra |
|---------|------|-------|
| **Yorum satırları** | ❌ Yok | ✅ 4 satır |
| **Format açıklaması** | Basit | Detaylı (her alan açıklandı) |
| **Kurallar** | 2 madde | 6 madde |
| **Örnek** | 1 örnek | 1 örnek (daha açıklayıcı) |

### `user_interest_analyzer.txt`

| Özellik | Önce | Sonra |
|---------|------|-------|
| **Yorum satırları** | ❌ Yok | ✅ 4 satır |
| **preferredLevel kuralları** | ❌ Yok | ✅ Detaylı (nasıl tahmin edilir) |
| **Örnekler** | 1 örnek | 1 örnek (daha zengin) |
| **Kurallar** | 4 madde | 9 madde |

---

## 🎯 Yeni Eklenen Kurallar

### 1. **CEFR Seviye Tahmini** (`user_interest_analyzer.txt`)

```txt
- preferredLevel: CEFR seviyesi (A1, A2, B1, B2, C1, C2)
  * Belirgin değilse B1 veya B2 öner
  * Basit konular → A2/B1
  * Orta karmaşıklık → B1/B2
  * Karmaşık konular → B2/C1
```

### 2. **Türkçe Yanıt Kuralı** (`liro_system_default.txt`)

```txt
- Her zaman Türkçe yanıt ver (kullanıcı aksi belirtmedikçe)
```

### 3. **Kod Bloğu Yasağı** (Tüm JSON prompt'lar)

```txt
- Kod bloğu kullanma (```json gibi)
```

---

## ⚠️ Dikkat Edilmesi Gerekenler

### 1. **Yeni Dosyalar**

İki dosya yeniden oluşturuldu (eski dosyalarda karışıklık olduğu için):

```bash
# Eski dosyaları sil
rm backend/prompts/topic_extractor.txt
rm backend/prompts/user_interest_analyzer.txt

# Yeni dosyaları yeniden adlandır
mv backend/prompts/topic_extractor_new.txt backend/prompts/topic_extractor.txt
mv backend/prompts/user_interest_analyzer_updated.txt backend/prompts/user_interest_analyzer.txt
```

### 2. **Kod Güncellemesi Gerekmiyor**

Tüm değişiklikler sadece prompt dosyalarında. Backend kodu değişmedi çünkü:
- Placeholder'lar aynı kaldı
- Dosya isimleri aynı (yeniden adlandırma sonrası)
- Format değişmedi

### 3. **Test Edilmesi Gerekenler**

```bash
# Backend'i restart et
cd backend
npm start

# Test senaryoları:
# 1. Yeni sohbet başlat → liro_system_default.txt kullanılıyor mu?
# 2. Profilli kullanıcı → liro_system_personalized.txt placeholder'ları doğru mu?
# 3. Konu çıkarma → topic_extractor.txt JSON döndürüyor mu?
```

---

## 📝 Prompt Yazma Standartları (Güncel)

### Dosya Başlığı Formatı

```txt
// 🇹🇷 Kullanım: [Prompt'un ne işe yaradığı - 1 cümle]
// Bu prompt, [detaylı açıklama - 1-2 cümle]
// Kullanıldığı yerler: backend/path/to/file.js → functionName()
// Placeholder'lar: {{var1}}, {{var2}}, {{var3}}
```

### Kurallar Bölümü

```txt
📌 KURALLAR:
- [Kural 1] (açıklayıcı)
- [Kural 2] (örnekle)
- [Kural 3] (neden önemli?)
```

### Örnekler Bölümü

```txt
💡 ÖRNEKLER:
✅ İyi örnekler:
- "Örnek 1" (neden iyi?)
- "Örnek 2" (neden iyi?)

❌ Kötü örnekler:
- "Örnek 1" (neden kötü?)
- "Örnek 2" (neden kötü?)
```

### JSON Format

```txt
📌 BEKLENEN FORMAT:
{
  "field1": "Açıklama (tip, format)",
  "field2": "Açıklama (tip, format)",
  "field3": ["array", "açıklama"]
}

📌 KURALLAR:
- SADECE geçerli JSON döndür
- Kod bloğu kullanma
- Açıklama ekleme
```

---

## 🎯 Sonuç

**Güncellenen:** 5 dosya  
**Yeni eklenen kural:** 12 madde  
**Genişletilen örnek:** 15 örnek  
**Detaylandırılan açıklama:** 8 bölüm

**Tüm prompt'lar artık:**
- ✅ Daha açıklayıcı yorum satırlarına sahip
- ✅ Placeholder'ları belgelenmiş
- ✅ Daha fazla örnek içeriyor
- ✅ Daha net kurallar sunuyor
- ✅ Kullanım yerleri belirtilmiş

**Backend'i restart et ve test et! 🚀**

---

**Geliştirici:** Windsurf / Claude  
**Tarih:** 2025-11-06  
**Versiyon:** Prompt Update v1.1  
**Status:** ✅ Ready for Testing
