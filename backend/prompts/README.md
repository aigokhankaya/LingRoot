# 🎯 LingRoot AI Prompts

Bu klasör, LingRoot'un AI sisteminde kullanılan tüm prompt'ları içerir. Her prompt belirli bir görevi yerine getirir ve bağımsız olarak düzenlenebilir.

---

## 📁 Prompt Kategorileri

### 1. **Liro System Prompts** (Sohbet Asistanı)

#### `liro_system_default.txt`
- **Kullanım:** Kullanıcı profili olmayan yeni kullanıcılar için temel Liro system prompt
- **Amaç:** Liro'nun temel kişiliğini, görevlerini ve yaklaşımını tanımlar
- **Kullanıldığı yerler:**
  - `backend/utils/openaiClient.js` → `getSystemPrompt()`
  - `backend/utils/liroPromptGenerator.js` → `getDefaultPrompt()`

#### `liro_system_personalized.txt`
- **Kullanım:** Kullanıcı profili analiz edildikten sonra kişiselleştirilmiş prompt template
- **Amaç:** Kullanıcının ilgi alanları, seviyesi ve geçmiş sohbetlerine göre dinamik prompt oluşturur
- **Placeholder'lar:**
  - `{{username}}` - Kullanıcı adı
  - `{{greetingStyle}}` - Karşılama tarzı (yeni/deneyimli)
  - `{{profileSection}}` - Kullanıcı profili özeti
  - `{{learningPreferences}}` - Öğrenme tercihleri
  - `{{suggestionStrategy}}` - Öneri stratejisi
  - `{{avoidanceNotes}}` - Tekrar önleme notları
  - `{{focusSection}}` - Odak alanları
  - `{{personalizedOpening}}` - Kişiselleştirilmiş açılış
  - `{{preferredLevel}}` - Tercih edilen CEFR seviyesi
- **Kullanıldığı yerler:**
  - `backend/utils/liroPromptGenerator.js` → `generateSystemPrompt()`

---

### 2. **Analiz ve Çıkarım Prompts**

#### `topic_extractor.txt`
- **Kullanım:** Sohbet içeriğinden ana konu, açıklama ve anahtar kelimeleri çıkarmak
- **Girdi:** Sohbet mesajları (`{{messages}}`)
- **Çıktı:** JSON formatında `{topic, description, keywords}`
- **Kullanıldığı yerler:**
  - `backend/utils/openaiClient.js` → `extractSuggestedTopic()`

#### `user_interest_analyzer.txt`
- **Kullanım:** Kullanıcının mesajlarından ilgi alanlarını analiz etmek
- **Girdi:** Kullanıcı mesajları (`{{userMessages}}`)
- **Çıktı:** JSON formatında `{interests, topics, preferredLevel, learningStyle}`
- **Kullanıldığı yerler:**
  - `backend/utils/userProfileAnalyzer.js` (gelecekte eklenecek)

#### `conversation_title_generator.txt`
- **Kullanım:** Sohbet içeriğinden kısa, açıklayıcı başlık oluşturmak
- **Girdi:** Sohbet mesajları (`{{messages}}`)
- **Çıktı:** 3-6 kelimelik Türkçe başlık
- **Kullanıldığı yerler:**
  - `backend/controllers/aiChatController.js` → `createConversation()` (gelecekte eklenecek)

---

### 3. **Kelime ve Çeviri Prompts**

#### `translate_word_to_turkish.txt`
- **Kullanım:** İngilizce kelimeleri bağlama uygun şekilde Türkçeye çevirmek
- **Placeholder'lar:** `{{word}}`, `{{context}}`
- **Kullanıldığı yerler:**
  - `backend/utils/wordTranslationService.js` → `translateWordToTurkish()`

#### `generate_example_sentence.txt`
- **Kullanım:** Verilen kelime için seviyeye uygun örnek cümle oluşturmak
- **Placeholder'lar:** `{{word}}`, `{{level}}`, `{{turkish_meaning}}`
- **Kullanıldığı yerler:**
  - `backend/utils/wordTranslationService.js` → `generateExampleSentence()`

#### `translate_sentence_to_turkish.txt`
- **Kullanım:** İngilizce cümleleri doğal Türkçeye çevirmek
- **Placeholder'lar:** `{{english_sentence}}`
- **Kullanıldığı yerler:**
  - `backend/utils/wordTranslationService.js` → `translateSentenceToTurkish()`

#### `translate_to_english.txt`
- **Kullanım:** Türkçe metinleri İngilizceye çevirmek
- **Placeholder'lar:** `{{input_text}}`
- **Kullanıldığı yerler:**
  - `backend/utils/inputExtractor.js` → `translateToEnglishWithOpenAI()`

---

### 4. **İçerik Üretim Prompts**

#### `rewrite_to_narrations.txt`
- **Kullanım:** Konu başlığından detaylı anlatım/narration üretmek
- **Placeholder'lar:** `{{input_text}}`
- **Kullanıldığı yerler:**
  - `backend/utils/inputExtractor.js` → `generateNarrationFromTopic()`

#### `rewrite_transcript_clean.txt`
- **Kullanım:** Ham transcript'i temizleyip düzenlemek
- **Kullanıldığı yerler:**
  - `backend/controllers/ttsController.js`

#### `topic_detail_suggestions.txt`
- **Kullanım:** Konu hakkında detaylı alt başlıklar ve öneriler üretmek
- **Kullanıldığı yerler:**
  - `backend/controllers/topicDetailController.js`

---

### 5. **CEFR Seviye Prompts**

#### `cefr_A1.txt` - `cefr_C2.txt`
- **Kullanım:** Her CEFR seviyesi için özel içerik üretim kuralları
- **Seviyeleri:**
  - A1: Başlangıç
  - A2: Temel
  - B1: Orta Seviye
  - B2: Orta Üstü
  - C1: İleri
  - C2: Üst Düzey
- **Kullanıldığı yerler:**
  - `backend/utils/cefrAdapter.js`

---

## 🛠️ Prompt Kullanım Şablonu

### Yeni Prompt Ekleme

```javascript
// backend/utils/myService.js
const fs = require('fs');
const path = require('path');

function loadPrompt(promptName, variables = {}) {
  try {
    const promptPath = path.join(__dirname, '../prompts', promptName);
    let prompt = fs.readFileSync(promptPath, 'utf-8');
    
    // Remove comments (lines starting with //)
    prompt = prompt
      .split('\n')
      .filter(line => !line.trim().startsWith('//'))
      .join('\n')
      .trim();
    
    // Replace placeholders
    Object.keys(variables).forEach(key => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      prompt = prompt.replace(placeholder, variables[key]);
    });
    
    return prompt;
  } catch (error) {
    logger.error(`Failed to load prompt: ${promptName}`, error);
    throw error;
  }
}

// Kullanım
const prompt = loadPrompt('my_new_prompt.txt', {
  username: 'Ali',
  topic: 'Yapay Zeka'
});
```

---

## 📝 Prompt Yazma Kuralları

### 1. **Dosya Formatı**
```txt
// 🇹🇷 Kullanım: [Prompt'un ne işe yaradığı]
// Bu prompt, [detaylı açıklama]
// Placeholder'lar: {{var1}}, {{var2}}

[Asıl prompt içeriği buraya]
```

### 2. **Placeholder Formatı**
- Çift süslü parantez kullan: `{{variableName}}`
- camelCase kullan: `{{userName}}`, `{{topicTitle}}`
- Açıklayıcı isimler: `{{messages}}` ✅, `{{m}}` ❌

### 3. **Yorum Satırları**
- Dosya başında `//` ile açıklama ekle
- Kodda otomatik olarak filtrelenir
- Kullanıcıya gösterilmez

### 4. **Çok Satırlı Değişkenler**
- Liste veya paragraf için:
```
{{profileSection}}
{{learningPreferences}}
```

### 5. **JSON Çıktı**
- Beklenen format örneği ver
- Açık ve net kurallar yaz

---

## 🔄 Güncelleme ve Versiyon

### Prompt Güncellendiğinde
1. Değişiklik notunu `//` ile dosyaya ekle
2. Test et (backend servisinde)
3. Gerekirse fallback ekle

### Yeni Prompt Eklendiğinde
1. `backend/prompts/` altına `.txt` dosyası oluştur
2. Bu README'ye ekle
3. İlgili serviste kullan

---

## 🎯 Öncelikli Geliştirmeler

- [ ] `conversation_title_generator.txt` → aiChatController'a entegre et
- [ ] `user_interest_analyzer.txt` → userProfileAnalyzer'a entegre et
- [ ] Prompt versiyonlama sistemi ekle
- [ ] A/B test altyapısı (farklı prompt varyasyonları)
- [ ] Prompt performans metrikleri (token kullanımı, başarı oranı)

---

**Son Güncelleme:** 2025-11-06  
**Toplam Prompt Sayısı:** 18  
**Durum:** ✅ Production Ready
