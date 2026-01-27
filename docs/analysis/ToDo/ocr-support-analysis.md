# OCR ve Taranmis Belge Destegi Analiz Dokumani

## 1. Mevcut Durum

### Desteklenen Dosya Tipleri

| Dosya Tipi | MIME Tipi | Cikarma Kutuphanesi |
|---|---|---|
| PDF | `application/pdf` | `pdf-parse` |
| DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `mammoth` |
| TXT | `text/plain` | Buffer UTF-8 decode |
| Markdown | `text/markdown` | Buffer UTF-8 decode |
| HTML | `text/html` | Buffer UTF-8 decode |

### Mobil Tarafta Desteklenen Tipler

- **iOS:** `com.adobe.pdf`, `com.microsoft.word.doc`, `org.openxmlformats.wordprocessingml.document`, `public.plain-text`
- **Android:** `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`

### Mevcut Dosya Yukleme Akisi

1. Kullanici `CreateScreen.tsx` uzerinden dosya secer (`@react-native-documents/picker`)
2. Dosya `multipart/form-data` olarak backend'e gonderilir
3. `ttsRoutes.js` icindeki multer middleware dosyayi bellek uzerinde tutar (15MB limit)
4. `ttsController.js` dosyayi `inputExtractor.js`'e iletir
5. `inputExtractor.js` MIME tipine gore uygun kutuphanede metin cikarir

---

## 2. Sorun Tanimi

Sistem su anda **yalnizca metin tabanli belgeleri** desteklemektedir:

- **Taranmis PDF'ler** icerisindeki metin, goruntu olarak goemuldugu icin `pdf-parse` tarafindan cikarilamamaktadir. `pdf-parse` yalnizca metin katmani olan PDF'lerden metin cikartabilir.
- **Fotograf/goruntu dosyalari** (JPG, PNG, HEIC vb.) multer filtresinde reddedilmektedir: `"Invalid file type. Only PDF and DOCX files are allowed"`.
- Mobil uygulama dosya secicisinde goruntu tipleri bulunmamaktadir.
- Kullanicilar kitap sayfalarini, el yazisi notlarini veya taranmis belgeleri isleyememektedir.

---

## 3. Etkilenen Dosyalar

### Backend

| Dosya | Degisiklik Sebebi |
|---|---|
| `backend/utils/ai/inputExtractor.js` | OCR metin cikarma mantigi eklenmeli. Yeni dosya tiplerini isleyecek fonksiyonlar gerekli. |
| `backend/routes/ttsRoutes.js` | Multer `allowedMimeTypes` dizisine goruntu MIME tipleri eklenmeli (`image/jpeg`, `image/png`, `image/heic`). |
| `backend/controllers/ttsController.js` | OCR islem akisi ve hata yonetimi eklenmeli. Asenkron OCR islemleri icin BullMQ entegrasyonu genisletilmeli. |

### Mobil

| Dosya | Degisiklik Sebebi |
|---|---|
| `LingRootMobile/src/screens/CreateScreen.tsx` | Dosya secici UTI/MIME tiplerine goruntu formatlari eklenmeli. Kamera erisimi ve fotograf cekme destegi eklenmeli. |

---

## 4. Cozum Alternatifleri

### Alternatif 1: Tesseract.js (Acik Kaynak, Yerel)

**Aciklama:** Tesseract OCR motorunun JavaScript implementasyonu. Sunucu uzerinde calisir.

**Avantajlar:**
- Ucretsiz ve acik kaynak
- Sunucu uzerinde calisir, disariya veri gonderilmez
- 100+ dil destegi
- npm paketi mevcut (`tesseract.js`)

**Dezavantajlar:**
- El yazisi tanimi zayif
- Dusuk kaliteli goruntulerle basarim duser
- CPU yogun islem; sunucu kaynaklarini tuketebilir
- Ilk calistirilmada dil verisini indirmesi gerekir (~15MB/dil)

**Tahmini Performans:** Orta kalite goruntuler icin sayfa basi 2-10 saniye (CPU'ya bagli).

### Alternatif 2: Google Cloud Vision API

**Aciklama:** Google'in bulut tabanli OCR ve goruntu analiz servisi.

**Avantajlar:**
- Yuksek dogruluk orani
- El yazisi tanima destegi
- 50+ dil destegi
- PDF icindeki goruntuleri otomatik algilama
- Toplu islem destegi (batch processing)

**Dezavantajlar:**
- Ucretli (aylik 1000 birim ucretsiz, sonrasi $1.50/1000 birim)
- Dis bagimlilk; Google Cloud hesabi ve API anahtari gerekli
- Veri Google sunucularina gonderilir (gizlilik/KVKK etkileri)
- Agirlik gecikmeleri (network latency)

**Tahmini Performans:** Sayfa basi 1-3 saniye.

### Alternatif 3: OpenAI Vision API (GPT-4o)

**Aciklama:** OpenAI'in goruntu anlama ve metin cikarma yetenegine sahip modeli. Proje zaten OpenAI API kullanmaktadir.

**Avantajlar:**
- Mevcut OpenAI entegrasyonu uzerine eklenir; ek hesap/API anahtari gerekmez
- Yuksek dogruluk, karmasik sayfa duzenleri icin iyi
- El yazisi tanima kapasitesi iyi
- Goruntudeki baglami anlayabilir (tablo, grafik vb.)
- Coklu dil destegi

**Dezavantajlar:**
- Token bazli ucretlendirme (goruntu boyutuna gore maliyet artar)
- GPT-4o vision maliyeti standart metin API'dan yuksek
- Hiz sinirlamasi (rate limit) mevcut API kullanimini etkileyebilir
- Buyuk dosyalarda maliyet hizla artar

**Tahmini Performans:** Sayfa basi 2-5 saniye.

### Karsilastirma Tablosu

| Kriter | Tesseract.js | Google Vision | OpenAI Vision |
|---|---|---|---|
| Maliyet | Ucretsiz | Orta | Yuksek |
| Dogruluk | Orta | Yuksek | Yuksek |
| El yazisi | Zayif | Iyi | Iyi |
| Entegrasyon zorluugu | Dusuk | Orta | Dusuk |
| Gizlilik | Yerel islem | Bulut | Bulut |
| Bakim yukuu | Orta | Dusuk | Dusuk |
| Mevcut altyapi uyumu | Yeni bagimlilk | Yeni bagimlilk | Mevcut (OpenAI) |

---

## 5. Mobil Taraf Degisiklikleri

### 5.1. Dosya Secici Guncellemesi (`CreateScreen.tsx`)

Mevcut `pickerTypes` dizisine goruntu formatlari eklenmeli:

```typescript
// iOS
const pickerTypes = Platform.OS === 'ios'
  ? [
      'com.adobe.pdf',
      'com.microsoft.word.doc',
      'org.openxmlformats.wordprocessingml.document',
      'public.plain-text',
      'public.image',        // Tum goruntu formatlari
    ]
  : [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',          // JPG
      'image/png',           // PNG
      'image/heic',          // HEIC (iOS fotograf)
    ];
```

### 5.2. Kamera Destegi

Fotograf cekme ozelligi icin ek kutuphane gerekli:

- **Kutuphane:** `react-native-image-picker` veya `expo-image-picker`
- **Gerekli izinler:**
  - iOS: `NSCameraUsageDescription` (Info.plist)
  - Android: `android.permission.CAMERA` (AndroidManifest.xml)

### 5.3. UI Degisiklikleri

- Dosya secme butonunun yanina "Fotograf Cek" butonu eklenmeli
- Secilen goruntunun on izlemesi gosterilmeli
- Goruntu sıkıstirma uygulnabilir (buyuk dosyalari kucultmek icin)

---

## 6. Backend Taraf Degisiklikleri

### 6.1. Multer Konfigurasyonu (`ttsRoutes.js`)

```javascript
const allowedMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
];
```

Dosya boyutu limiti goruntuler icin ayri tutulabilir veya mevcut 15MB limiti korunabilir.

### 6.2. OCR Pipeline (`inputExtractor.js`)

Yeni fonksiyonlar:

```
extractTextFromInput(inputType, file, ...)
  ├── Mevcut: PDF → pdf-parse
  ├── Mevcut: DOCX → mammoth
  ├── Mevcut: TXT/MD/HTML → buffer decode
  ├── Yeni: image/* → OCR Engine
  └── Yeni: Taranmis PDF → PDF sayfa → goruntu → OCR Engine
```

Taranmis PDF algilama mantigi:
1. `pdf-parse` ile metin cikar
2. Cikarilan metin bos veya cok kisaysa → taranmis PDF olarak isle
3. PDF sayfalarini goruntulere donustur (`pdf-to-img` veya `pdf-poppler`)
4. Her goruntude OCR calistir
5. Sonuclari birlestir

### 6.3. Yeni Yardimci Moduller

| Modul | Sorumluluk |
|---|---|
| `backend/utils/ai/ocrService.js` | OCR motoru soyutlamasi. Secilen API'yi sarmalar. |
| `backend/utils/ai/imageProcessor.js` | Goruntu on isleme (boyutlandirma, donusum, kalite iyilestirme). |

### 6.4. Asenkron Islem

OCR islemleri CPU/IO yogun oldugu icin mevcut BullMQ altyapisi kullanilmali:

- Goruntu yukleme ve OCR islemini asenkron is kuyruguuna ekle
- Kullaniciya is durumu bildirimi gonder (mevcut push notification altyapisi)
- Buyuk dosyalar icin ilerleme yuzdesi raporla

---

## 7. Mimari Karar

### Onerilen Yaklasim: Katmanli Strateji

**Birincil:** OpenAI Vision API (GPT-4o)

- Proje zaten OpenAI API kullaniyor; ek entegrasyon maliyeti dusuk
- `inputExtractor.js` icinde mevcut OpenAI cagrilariyla tutarli
- El yazisi ve karmasik sayfa duzenleri icin yeterli dogruluk
- Rate limit yonetimi mevcut altyapida uygulanabilir

**Yedek/Fallback:** Tesseract.js

- OpenAI API erisilemedigi veya limit asildigi durumlarda kullanim
- Basit, duz metin taranmis belgeler icin yeterli
- Ek maliyet olusturmaz

### Karar Gerekceleri

1. **Entegrasyon kolayligi:** Mevcut `openai` npm paketi kullanilarak eklenebilir
2. **Maliyet kontrolu:** Gunluk/kullanici bazli OCR limiti konulabilir
3. **Kalite:** El yazisi ve dusuk kalite goruntulerde Tesseract'tan ustun
4. **Gelecek uyumluluk:** OpenAI API guncellemeleriyle iyilesir

### Soyutlama Katmani

```
ocrService.js
  ├── extractTextFromImage(buffer, options)
  │     ├── provider: 'openai' | 'tesseract'
  │     ├── language: 'tr' | 'en' | ...
  │     └── quality: 'fast' | 'accurate'
  └── extractTextFromScannedPDF(buffer, options)
        ├── Sayfalari goruntulere donustur
        └── Her goruntude extractTextFromImage cagir
```

Bu soyutlama katmani ileride farkli bir saglayiciya gecisi kolaylastirir.

---

## 8. Uygulama Adimlari

### Adim 1: OCR Servis Modulu

- `backend/utils/ai/ocrService.js` dosyasini olustur
- OpenAI Vision API entegrasyonunu yaz
- Tesseract.js fallback mekanizmasini ekle
- Birim testleri yaz

### Adim 2: Goruntu On Isleme

- `backend/utils/ai/imageProcessor.js` dosyasini olustur
- Goruntu boyutlandirma ve format donusturme (sharp kutuphanesi)
- HEIC → JPEG donusumu
- Buyuk goruntuleri API limitlerine uygun kucult

### Adim 3: Backend Entegrasyonu

- `ttsRoutes.js` multer filtresine goruntu MIME tiplerini ekle
- `inputExtractor.js`'e goruntu ve taranmis PDF islem dallarini ekle
- `ttsController.js`'de OCR akisini asenkron isleme entegre et
- Hata yonetimi ve loglama ekle

### Adim 4: Taranmis PDF Algilama

- `pdf-parse` ciktisi bos/kisa ise taranmis olarak isle
- PDF sayfalarini goruntulere donustur
- OCR servisine ilet

### Adim 5: Mobil Uygulama Guncellemeleri

- `CreateScreen.tsx` dosya secicisine goruntu tiplerini ekle
- Kamera erisim kutuphanesi entegre et
- Fotograf cekme ve galeri secim akisi ekle
- Goruntu on izleme bilesenini ekle

### Adim 6: Test ve Dogrulama

- Farkli kalitede taranmis PDF'lerle test
- JPG, PNG, HEIC formatlarinda fotograf testi
- El yazisi metin tanima testi
- Coklu dil testi (Turkce, Ingilizce)
- Hata durumlari testi (bozuk goruntu, bos sayfa)
- Performans testi (islem suresi, bellek kullanimi)

### Adim 7: Maliyet Kontrolleri

- Kullanici bazli gunluk OCR limiti
- Goruntu boyutu sinirlamasi
- Maliyet izleme ve raporlama
- Rate limiting ayarlari
