# 🎙️ TTS Varsayılan Ses Seçimi Sistemi

## 🎯 Amaç

Kullanıcı ses seçmediğinde, her TTS provider için ses listesinin **ilk sesini** otomatik olarak seçmek.

---

## ✅ Yapılan Değişiklikler

### 1. **Yeni Fonksiyon: `getDefaultVoiceForProvider()`**

**Dosya:** `backend/controllers/ttsController.js`

```javascript
// Yardımcı: Provider'a göre varsayılan sesi getir (ses listesinin ilk sesi)
async function getDefaultVoiceForProvider(ttsProvider, languageCode = 'en-US') {
  try {
    if (ttsProvider === 'polly' || ttsProvider === 'amazon') {
      // Amazon Polly için ilk sesi al
      if (isPollyAvailable()) {
        const pollyVoices = await listPollyVoices(languageCode);
        if (pollyVoices && pollyVoices.length > 0) {
          return pollyVoices[0].name;  // İlk ses
        }
      }
      return 'Joanna';  // Fallback
      
    } else if (ttsProvider === 'azure') {
      // Azure için ilk sesi al
      if (isAzureTTSAvailable()) {
        const azureVoices = await listAzureVoices(locale);
        if (azureVoices && azureVoices.length > 0) {
          return azureVoices[0].name;  // İlk ses
        }
      }
      return 'en-US-JennyNeural';  // Fallback
      
    } else {
      // Google TTS için ilk sesi al (Basic paket öncelikli)
      const googleVoices = await listGoogleVoices(languageCode);
      if (googleVoices && googleVoices.length > 0) {
        const basicVoices = googleVoices.filter(v => v.package === 'Basic');
        if (basicVoices.length > 0) {
          return basicVoices[0].name;  // Basic paket ilk ses
        }
        return googleVoices[0].name;  // Tüm seslerin ilki
      }
      return 'en-US-Standard-C';  // Fallback
    }
  } catch (error) {
    // Hata durumunda provider'a göre fallback
    if (ttsProvider === 'polly' || ttsProvider === 'amazon') return 'Joanna';
    if (ttsProvider === 'azure') return 'en-US-JennyNeural';
    return 'en-US-Standard-C';
  }
}
```

### 2. **Ses Seçimi Mantığı Güncellendi**

**Önce:**
```javascript
const requestedVoice = req.body.voice || req.body.voiceName;
let selectedVoice = requestedVoice || 'en-US-Neural2-D';  // Hardcoded default
```

**Sonra:**
```javascript
const requestedVoice = req.body.voice || req.body.voiceName;

// Eğer ses seçilmemişse, provider'a göre varsayılan sesi al
let selectedVoice;
if (!requestedVoice) {
    const ttsProvider = await getTtsProvider();
    selectedVoice = await getDefaultVoiceForProvider(ttsProvider, languageCode);
    logger.info(`No voice requested, using default for ${ttsProvider}: ${selectedVoice}`);
} else {
    selectedVoice = requestedVoice;
    logger.info(`Requested voice: ${requestedVoice}`);
}
```

### 3. **API Response'a `defaultVoice` Eklendi**

Her provider'ın ses listesi endpoint'ine `defaultVoice` alanı eklendi:

#### Amazon Polly
```javascript
return res.json({
  provider: 'polly',
  voices: pollyVoices,
  defaultVoice: pollyVoices.length > 0 ? pollyVoices[0].name : 'Joanna',
  stats: { ... }
});
```

#### Azure TTS
```javascript
return res.json({
  provider: 'azure',
  voices: azureVoices,
  defaultVoice: azureVoices.length > 0 ? azureVoices[0].name : 'en-US-JennyNeural',
  stats: { ... }
});
```

#### Google TTS
```javascript
// Basic paket öncelikli
const basicVoices = googleVoices.filter(v => v.package === 'Basic');
const defaultVoice = basicVoices.length > 0 
  ? basicVoices[0].name 
  : (googleVoices.length > 0 ? googleVoices[0].name : 'en-US-Standard-C');

return res.json({
  provider: 'google',
  voices: googleVoices,
  defaultVoice: defaultVoice,
  stats: { ... }
});
```

---

## 📊 Varsayılan Ses Seçim Stratejisi

### 1. **Amazon Polly**
```
1. Ses listesini al: listPollyVoices(languageCode)
2. İlk sesi seç: pollyVoices[0].name
3. Fallback: 'Joanna'
```

**Örnek:**
- Liste: `['Joanna', 'Matthew', 'Kendra', ...]`
- Seçilen: `'Joanna'` ✅

### 2. **Azure TTS**
```
1. Ses listesini al: listAzureVoices(locale)
2. İlk sesi seç: azureVoices[0].name
3. Fallback: 'en-US-JennyNeural'
```

**Örnek:**
- Liste: `['en-US-JennyNeural', 'en-US-GuyNeural', ...]`
- Seçilen: `'en-US-JennyNeural'` ✅

### 3. **Google TTS**
```
1. Ses listesini al: listGoogleVoices(languageCode)
2. Basic paket seslerini filtrele
3. Basic varsa ilk Basic sesini seç
4. Yoksa tüm seslerin ilkini seç
5. Fallback: 'en-US-Standard-C'
```

**Örnek:**
- Liste: `['en-US-Standard-A', 'en-US-Standard-B', 'en-US-Neural2-A', ...]`
- Basic sesler: `['en-US-Standard-A', 'en-US-Standard-B', ...]`
- Seçilen: `'en-US-Standard-A'` ✅ (Basic paket, en ucuz)

---

## 🔄 İşlem Akışı

### Senaryo 1: Kullanıcı Ses Seçmedi

```
1. Frontend → Backend: { text: "Hello", level: "B1" }
   (voice parametresi yok)

2. Backend: requestedVoice = undefined

3. Backend: getTtsProvider() → "amazon"

4. Backend: getDefaultVoiceForProvider("amazon", "en-US")
   → listPollyVoices("en-US")
   → ['Joanna', 'Matthew', 'Kendra', ...]
   → Return: 'Joanna'

5. Backend: selectedVoice = 'Joanna'

6. Backend → Amazon Polly: voiceName: 'Joanna'

7. ✅ Success!
```

### Senaryo 2: Kullanıcı Ses Seçti

```
1. Frontend → Backend: { text: "Hello", voice: "Matthew" }

2. Backend: requestedVoice = "Matthew"

3. Backend: selectedVoice = "Matthew"

4. Backend → Amazon Polly: voiceName: 'Matthew'

5. ✅ Success!
```

---

## 📝 API Response Formatı

### GET `/api/tts/voices?languageCode=en-US`

#### Amazon Polly Response
```json
{
  "provider": "polly",
  "defaultVoice": "Joanna",
  "voices": [
    {
      "name": "Joanna",
      "displayName": "Joanna (Female, US)",
      "gender": "Female",
      "languageCode": "en-US",
      "engine": "neural"
    },
    {
      "name": "Matthew",
      "displayName": "Matthew (Male, US)",
      "gender": "Male",
      "languageCode": "en-US",
      "engine": "neural"
    }
  ],
  "stats": {
    "total": 15,
    "neural": 10,
    "standard": 5
  }
}
```

#### Google TTS Response
```json
{
  "provider": "google",
  "defaultVoice": "en-US-Standard-A",
  "voices": [
    {
      "name": "en-US-Standard-A",
      "displayName": "US English Female (Standard)",
      "gender": "FEMALE",
      "languageCode": "en-US",
      "package": "Basic"
    },
    {
      "name": "en-US-Neural2-A",
      "displayName": "US English Female (Neural)",
      "gender": "FEMALE",
      "languageCode": "en-US",
      "package": "Premium"
    }
  ],
  "stats": {
    "total": 50,
    "ssmlSupported": 30,
    "categories": {
      "Basic": 10,
      "Premium": 20,
      "Gold": 15,
      "Platinum": 5
    }
  }
}
```

---

## 🧪 Test Senaryoları

### Test 1: Ses Seçilmedi (Amazon Polly)
```bash
# TTS provider: amazon
POST /api/tts/process
{
  "type": "text",
  "input": "Hello world",
  "level": "B1"
  // voice yok!
}

# Beklenen:
# - selectedVoice = "Joanna" (Polly listesinin ilk sesi)
# - Log: "No voice requested, using default for amazon: Joanna"
```

### Test 2: Ses Seçilmedi (Google TTS)
```bash
# TTS provider: google
POST /api/tts/process
{
  "type": "text",
  "input": "Hello world",
  "level": "B1"
  // voice yok!
}

# Beklenen:
# - selectedVoice = "en-US-Standard-A" (Basic paket ilk ses)
# - Log: "No voice requested, using default for google: en-US-Standard-A"
```

### Test 3: Ses Seçildi
```bash
POST /api/tts/process
{
  "type": "text",
  "input": "Hello world",
  "level": "B1",
  "voice": "Matthew"
}

# Beklenen:
# - selectedVoice = "Matthew"
# - Log: "Requested voice: Matthew"
```

### Test 4: Ses Listesi API
```bash
GET /api/tts/voices?languageCode=en-US

# Beklenen Response:
{
  "provider": "amazon",
  "defaultVoice": "Joanna",
  "voices": [...],
  "stats": {...}
}
```

---

## 📊 Varsayılan Sesler (Provider'a Göre)

| Provider | Varsayılan Ses | Fallback | Seçim Kriteri |
|----------|----------------|----------|---------------|
| **Amazon Polly** | Liste'nin ilk sesi | `Joanna` | İlk ses |
| **Azure TTS** | Liste'nin ilk sesi | `en-US-JennyNeural` | İlk ses |
| **Google TTS** | Basic paket ilk ses | `en-US-Standard-C` | Basic öncelikli, sonra ilk ses |

---

## 💡 Avantajlar

### 1. **Dinamik Varsayılan Ses**
- ✅ Her provider için ses listesinin ilk sesi otomatik seçilir
- ✅ Hardcoded değer yok
- ✅ Ses listesi değişirse varsayılan da değişir

### 2. **Maliyet Optimizasyonu (Google TTS)**
- ✅ Basic paket sesleri öncelikli
- ✅ En ucuz sesler varsayılan olarak seçilir
- ✅ Premium/Gold/Platinum sesler manuel seçilmeli

### 3. **Kullanıcı Deneyimi**
- ✅ Kullanıcı ses seçmese bile işlem başarılı
- ✅ Frontend'de `defaultVoice` bilgisi mevcut
- ✅ Ses seçimi opsiyonel

### 4. **Fallback Güvenliği**
- ✅ API hatası olsa bile fallback ses var
- ✅ Her provider için güvenli varsayılan
- ✅ Sistem çökmez

---

## 🔧 Frontend Entegrasyonu

### Ses Listesi Çekme
```javascript
const response = await fetch('/api/tts/voices?languageCode=en-US');
const data = await response.json();

console.log('Provider:', data.provider);
console.log('Default Voice:', data.defaultVoice);
console.log('Voices:', data.voices);

// Varsayılan sesi kullan
const selectedVoice = userSelectedVoice || data.defaultVoice;
```

### TTS İsteği
```javascript
// Kullanıcı ses seçmedi
await fetch('/api/tts/process', {
  method: 'POST',
  body: JSON.stringify({
    type: 'text',
    input: 'Hello world',
    level: 'B1'
    // voice yok - backend otomatik seçecek
  })
});

// Kullanıcı ses seçti
await fetch('/api/tts/process', {
  method: 'POST',
  body: JSON.stringify({
    type: 'text',
    input: 'Hello world',
    level: 'B1',
    voice: 'Matthew'  // Manuel seçim
  })
});
```

---

## 📝 Log Örnekleri

### Ses Seçilmedi
```
[requestId] 🎯 Requested voice: undefined | Initial selected: undefined
[requestId] 🎯 No voice requested, using default for amazon: Joanna
[requestId] 🎙️ Using selected voice (no pre-validation): Joanna
[requestId] 🔧 TTS Provider: amazon (Real Timing Mode)
[requestId] Using Amazon Polly for chunk 1
🎯 Amazon Polly synthesis - Voice: Joanna, Rate: 1x
```

### Ses Seçildi
```
[requestId] 🎯 Requested voice: Matthew | Selected: Matthew
[requestId] 🎙️ Using selected voice (no pre-validation): Matthew
[requestId] 🔧 TTS Provider: amazon (Real Timing Mode)
[requestId] Using Amazon Polly for chunk 1
🎯 Amazon Polly synthesis - Voice: Matthew, Rate: 1x
```

---

## 📊 Değişiklik Özeti

| Dosya | Değişiklik | Satır |
|-------|------------|-------|
| `backend/controllers/ttsController.js` | ✅ `getDefaultVoiceForProvider()` fonksiyonu eklendi | 122-171 |
| `backend/controllers/ttsController.js` | ✏️ Ses seçim mantığı güncellendi | 564-578 |
| `backend/controllers/ttsController.js` | ✅ Polly response'a `defaultVoice` eklendi | 1617 |
| `backend/controllers/ttsController.js` | ✅ Azure response'a `defaultVoice` eklendi | 1649 |
| `backend/controllers/ttsController.js` | ✅ Google response'a `defaultVoice` eklendi | 1700-1707 |

---

## ✅ Sonuç

**Önce:**
- ❌ Hardcoded varsayılan ses: `'en-US-Neural2-D'`
- ❌ Provider'dan bağımsız
- ❌ Ses listesi değişse bile sabit

**Sonra:**
- ✅ Her provider için ses listesinin ilk sesi
- ✅ Dinamik ve otomatik
- ✅ Google TTS'de Basic paket öncelikli (maliyet optimizasyonu)
- ✅ API response'da `defaultVoice` bilgisi
- ✅ Fallback güvenliği

**Backend restart edildi, şimdi test et! 🎉**

---

**Geliştirici:** Windsurf / Claude  
**Tarih:** 2025-11-06  
**Versiyon:** Default Voice Selection v1.0  
**Status:** ✅ Ready for Testing
