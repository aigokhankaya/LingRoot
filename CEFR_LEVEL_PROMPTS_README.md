# 📚 CEFR Seviye Bazlı İçerik Oluşturma Sistemi

## 🎯 Genel Bakış

Bu sistem, kullanıcının seçtiği **CEFR seviyesine** (A1, A2, B1, B2, C1, C2) göre **özelleştirilmiş içerik** oluşturur. Her seviye için ayrı bir prompt dosyası kullanılır ve kullanıcının **giriş yaptığı dil** dinamik olarak uygulanır.

---

## 📁 Prompt Dosyaları

Tüm seviye bazlı prompt dosyaları şu klasörde bulunur:
```
backend/prompts/content/
```

### Dosya Listesi:
- `content_generation_A1.txt` → A1 seviyesi için
- `content_generation_A2.txt` → A2 seviyesi için
- `content_generation_B1.txt` → B1 seviyesi için
- `content_generation_B2.txt` → B2 seviyesi için
- `content_generation_C1.txt` → C1 seviyesi için
- `content_generation_C2.txt` → C2 seviyesi için

---

## 🔧 Backend Entegrasyonu

### 1️⃣ Helper Fonksiyonu
Her iki controller'da (`topicPipelineController.js` ve `narrationController.js`) aşağıdaki helper fonksiyon eklendi:

```javascript
function getPromptFileByLevel(level) {
  switch(level) {
    case 'A1': return 'content_generation_A1.txt';
    case 'A2': return 'content_generation_A2.txt';
    case 'B1': return 'content_generation_B1.txt';
    case 'B2': return 'content_generation_B2.txt';
    case 'C1': return 'content_generation_C1.txt';
    case 'C2': return 'content_generation_C2.txt';
    default: throw new Error(`Invalid CEFR level: ${level}`);
  }
}
```

### 2️⃣ Prompt Dosyası Yükleme
Seviyeye göre doğru prompt dosyası yüklenir:

```javascript
const contentPromptFile = getPromptFileByLevel(level);
const contentPromptPath = path.join(__dirname, '../prompts/content', contentPromptFile);
let contentTemplate = fs.readFileSync(contentPromptPath, 'utf8');
```

### 3️⃣ Placeholder Değişimi
Prompt şablonundaki değişkenler, gerçek değerlerle değiştirilir:

```javascript
const prompt = contentTemplate
  .replace(/{{topic}}/g, selectedTopic)
  .replace(/{{level}}/g, level)
  .replace(/{{input_language}}/g, input_language || 'Turkish');
```

### 4️⃣ Kullanılan Değişkenler
- `{{topic}}` → Kullanıcının seçtiği konu
- `{{level}}` → CEFR seviyesi (A1-C2)
- `{{input_language}}` → Kullanıcının giriş yaptığı dil (Turkish, English, vb.)

---

## 📝 Her Seviyenin Özellikleri

### 🟢 A1 - Temel Seviye
- **Kelime sayısı:** 550-750 kelime
- **Cümle uzunluğu:** 5-9 kelime
- **Zaman:** Sadece geniş zaman
- **Özellikleri:**
  - Çok basit kelimeler
  - Tek bir fikir/cümle
  - Pasif yapı yok
  - Karmaşık bağlaçlar yok
  - Soyut kavramlar yok
  
**Örnek:** "Deniz mavidir. Güneş parlaktır. Kuşlar uçar."

---

### 🟡 A2 - Temel Seviye+
- **Kelime sayısı:** 700-900 kelime
- **Cümle uzunluğu:** 6-12 kelime
- **Zaman:** Geniş zaman + geçmiş zaman
- **Özellikleri:**
  - A1-A2 seviyesi kelimeler
  - Soyut kavramlardan kaçınılır
  - Karmaşık açıklamalar yok
  
**Örnek:** "Deniz çok mavidir. Dün denize gittim. Çok eğlenceliydi."

---

### 🔵 B1 - Orta Seviye
- **Kelime sayısı:** 900-1200 kelime
- **Cümle uzunluğu:** 8-15 kelime
- **Zaman:** Geniş, geçmiş, gelecek zaman (sınırlı)
- **Özellikleri:**
  - A1-B1 kelime hazinesi
  - Açıklayıcı ton
  - Akademik dil değil
  
**Örnek:** "Denizler gezegenimizin büyük bir bölümünü kaplar. İnsanlar denizlerden yararlanır."

---

### 🟣 B2 - Orta Seviye+
- **Kelime sayısı:** 1000-1500 kelime
- **Cümle uzunluğu:** Karmaşık ama net
- **Özellikleri:**
  - A1-B2 kelimeler
  - Orta seviye bağlaçlar kullanılabilir
  - Akıcı geçişler
  
**Örnek:** "Denizler, yalnızca su kaynağı olmakla kalmaz, aynı zamanda iklimi de etkiler. Bu nedenle korunmalıdır."

---

### 🔴 C1 - İleri Seviye
- **Kelime sayısı:** 1500-2000 kelime
- **Cümle uzunluğu:** Uzun ve karmaşık ama anlaşılır
- **Özellikleri:**
  - A1-C1 kelimeler (zengin)
  - Neden-sonuç ilişkileri
  - Karşılaştırmalar
  - Örnekler
  
**Örnek:** "Denizlerin ekolojik dengesi, yalnızca deniz canlılarını değil, karasal ekosistemleri de etkilemektedir. Dolayısıyla..."

---

### ⚫ C2 - Uzman Seviye
- **Kelime sayısı:** 1800-2200 kelime
- **Cümle uzunluğu:** Son derece gelişmiş
- **Özellikleri:**
  - Tam kelime dağarcığı
  - Soyut ve kavramsal dil
  - Eleştirel analiz
  - Retorik yapılar
  
**Örnek:** "Deniz ekosistemlerinin antropojenik müdahaleler karşısındaki kırılganlığı, sürdürülebilirlik paradigmasının yeniden değerlendirilmesini gerektirmektedir."

---

## 🌍 Çok Dilli Destek

Sistem, kullanıcının girdiği herhangi bir dilde içerik oluşturabilir:

- ✅ Türkçe (Turkish)
- ✅ İngilizce (English)
- ✅ Almanca (German)
- ✅ Fransızca (French)
- ✅ İspanyolca (Spanish)
- ✅ ... ve daha fazlası

**Nasıl çalışır?**
Frontend'den gelen `input_language` parametresi, prompt'ta `{{input_language}}` yerine geçer.

---

## 🔄 Sistem Akışı

```
1. Kullanıcı konu girer → "Küresel ısınma"
2. Kullanıcı seviye seçer → "B1"
3. Kullanıcı dil seçer → "Turkish"
   
   ↓
   
4. Backend, B1 prompt dosyasını yükler
   → content_generation_B1.txt
   
   ↓
   
5. Placeholder'lar değiştirilir:
   {{topic}} → "Küresel ısınma"
   {{level}} → "B1"
   {{input_language}} → "Turkish"
   
   ↓
   
6. OpenAI'ya gönderilir
   
   ↓
   
7. B1 seviyesinde, Türkçe, 900-1200 kelimelik içerik oluşturulur
```

---

## 📊 Değişiklik Yapılan Dosyalar

### ✅ Oluşturulan Yeni Dosyalar:
1. `backend/prompts/content/content_generation_A1.txt`
2. `backend/prompts/content/content_generation_A2.txt`
3. `backend/prompts/content/content_generation_B1.txt`
4. `backend/prompts/content/content_generation_B2.txt`
5. `backend/prompts/content/content_generation_C1.txt`
6. `backend/prompts/content/content_generation_C2.txt`

### ✅ Güncellenen Backend Dosyaları:
1. `backend/controllers/topicPipelineController.js`
   - `getPromptFileByLevel()` fonksiyonu eklendi
   - STEP 2'de seviye bazlı prompt kullanımı eklendi
   - `input_language` desteği eklendi
   
2. `backend/controllers/narrationController.js`
   - `getPromptFileByLevel()` fonksiyonu eklendi
   - Seviye bazlı prompt seçimi eklendi
   - `input_language` desteği eklendi

---

## 🎓 Kullanım Örnekleri

### Örnek 1: A1 Seviyesi, Türkçe
**İstek:**
```json
{
  "topic": "Hayvanlar",
  "level": "A1",
  "input_language": "Turkish"
}
```

**Sonuç:**
```
Hayvanlar vardır. Kediler küçüktür. Köpekler büyüktür. 
Kuşlar uçar. Balıklar yüzer. Hayvanlar güzeldir.
```

---

### Örnek 2: C1 Seviyesi, İngilizce
**İstek:**
```json
{
  "topic": "Climate Change",
  "level": "C1",
  "input_language": "English"
}
```

**Sonuç:**
```
Climate change represents one of the most pressing challenges 
of our era. The anthropogenic impact on atmospheric composition 
has triggered irreversible changes in global weather patterns, 
necessitating immediate and comprehensive policy interventions...
```

---

## ⚙️ Teknik Notlar

### Model Kullanımı:
- **Model:** `gpt-4o`
- **Temperature:** `0.7` (yaratıcı ama tutarlı)
- **System Message:** Seviyeye göre uyarlanmış

### Hata Yönetimi:
- Geçersiz seviye girilirse → Hata döner
- Prompt dosyası bulunamazsa → Hata döner
- OpenAI API hatası → 500 error + log

---

## 🚀 Avantajlar

✅ **Seviyeye Özel İçerik:** Her CEFR seviyesi için optimize edilmiş  
✅ **Çok Dilli:** Herhangi bir dilde içerik oluşturabilir  
✅ **Tutarlı Kalite:** Prompt dosyaları standartlaştırılmış  
✅ **Kolay Güncelleme:** Prompt dosyalarını düzenlemek kolay  
✅ **Ölçeklenebilir:** Yeni seviyeler eklemek basit  

---

## 📌 Önemli Hatırlatmalar

1. **Tüm prompt dosyaları `backend/prompts/content/` klasöründedir**
2. **`{{topic}}`, `{{level}}`, `{{input_language}}` değişkenleri kullanılır**
3. **Frontend'den mutlaka `level` ve `input_language` gönderilmelidir**
4. **Her seviye farklı kelime sayısı ve karmaşıklık seviyesi hedefler**

---

## 🎉 Sonuç

Artık sistem, kullanıcının seçtiği seviyeye ve diline göre **tam otomatik** ve **özelleştirilmiş** içerik oluşturuyor! 🚀
