## 1) Web Admin - Parametrik Paket Yönetimi Sistemi

### Genel Yapı
- **Paket Detay Sayfası**: Her paket için ayrı bir detay sayfası oluşturulacak (popup yerine)
- **URL Yapısı**: `/admin/packages/:packageId` formatında olacak
- **Navigasyon**: Paket listesinden tıklandığında detay sayfasına yönlendirilecek

### Paket Detay Sayfası İçeriği

#### 1.1. Temel Paket Bilgileri
- Paket Adı (düzenlenebilir)
- Paket Açıklaması (düzenlenebilir)
- Fiyat Bilgisi
- Süre (aylık/yıllık)
- Aktif/Pasif Durumu
- Oluşturulma ve Güncellenme Tarihleri

#### 1.2. Parametrik Özellikler

##### A) Anasayfa Özellikleri (Homepage Features)
Kullanıcının anasayfasında hangi butonların/özelliklerin görüneceğini belirler:

**Checkbox Listesi:**
- [ ] Metin Girişi (Text Input)
- [ ] YouTube URL
- [ ] Dosya Yükleme (File Upload)
- [ ] Podcast
- [ ] Konu Önerileri (Topic Suggestions)
- [ ] Kitap (Book)

**Veritabanı Yapısı:**
```json
{
  "homepage_features": {
    "text_input": true,
    "youtube": true,
    "file_upload": false,
    "podcast": true,
    "topic_suggestions": true,
    "book": false
  }
}
```

**Frontend Entegrasyonu:**
- Kullanıcı login olduğunda paket bilgisi çekilecek
- `homepage_features` objesine göre anasayfada ilgili butonlar gösterilecek/gizlenecek
- Eğer özellik false ise buton render edilmeyecek

##### B) Ses Modelleri (Voice Models)
Create ekranındaki "Ses Seçimi" alanında hangi modellerin gösterileceğini belirler:

**Checkbox Listesi (Mevcut Modeller):**
- [ ] OpenAI TTS (tts-1, tts-1-hd)
- [ ] ElevenLabs
- [ ] Google Cloud TTS
- [ ] Azure TTS
- [ ] Diğer özel modeller

**Veritabanı Yapısı:**
```json
{
  "voice_models": {
    "openai_tts": true,
    "elevenlabs": false,
    "google_tts": true,
    "azure_tts": false
  }
}
```

**Frontend Entegrasyonu:**
- Create ekranında ses seçimi dropdown'ı render edilirken paket bilgisi kontrol edilecek
- Sadece `voice_models` objesinde `true` olan modeller listelenecek
- Model yoksa varsayılan olarak en temel model gösterilecek

##### C) Cümle Kalıpları (Sentence Patterns)
**Durum:** Henüz backend geliştirmesi yapılmadı, sadece UI hazırlığı yapılacak

**Planlanan Yapı:**
- Checkbox: "Cümle Kalıpları Özelliği Aktif" (şimdilik disabled)
- Açıklama metni: "Bu özellik yakında eklenecektir"
- Gelecekte: Kullanıcının hazır cümle kalıplarını kullanabilmesi

**Veritabanı Yapısı (Gelecek için):**
```json
{
  "sentence_patterns": {
    "enabled": false,
    "max_patterns": 0
  }
}
```

#### 1.3. Kullanım Limitleri (Mevcut Yapıya Ek)
Parametrik özelliklerin yanında mevcut limitler de gösterilecek:
- Günlük TTS Limiti
- Aylık TTS Limiti
- Maksimum Karakter Sayısı
- Maksimum Dosya Boyutu

### Teknik Uygulama

#### Backend Değişiklikleri
1. **Veritabanı Şeması Güncellemesi:**
   - `plans` tablosuna `features` JSONB kolonu eklenecek
   - Migration dosyası oluşturulacak

2. **API Endpoint'leri:**
   - `GET /api/admin/plans/:id` - Paket detaylarını getir
   - `PUT /api/admin/plans/:id` - Paket özelliklerini güncelle
   - `GET /api/plans/my-features` - Kullanıcının paket özelliklerini getir

3. **Middleware Güncellemesi:**
   - `usageLimiter.js` içine feature kontrolü eklenecek
   - Her özellik için ayrı kontrol fonksiyonu

#### Frontend Değişiklikleri
1. **Admin Panel:**
   - `/admin/packages/:id` sayfası oluşturulacak
   - Form yapısı: React Hook Form + Yup validation
   - Checkbox grupları için reusable component

2. **User Dashboard:**
   - Anasayfa butonları dinamik render
   - Create ekranı ses modelleri filtreleme
   - Context/State management ile paket özellikleri global erişim

3. **Mobile App:**
   - Aynı API'ler kullanılacak
   - Anasayfa ve Create ekranı aynı mantıkla güncellenecek

### Örnek Kullanım Senaryosu

**Senaryo:** "Temel Paket" için özellikler ayarlanıyor

1. Admin, paket listesinden "Temel Paket"e tıklar
2. Detay sayfasında şu özellikleri seçer:
   - ✅ Metin Girişi
   - ✅ YouTube URL
   - ❌ Dosya Yükleme (Premium özellik)
   - ❌ Podcast (Premium özellik)
   - ✅ Konu Önerileri
   - ❌ Kitap (Premium özellik)
   - ✅ OpenAI TTS
   - ❌ ElevenLabs (Premium özellik)
3. "Kaydet" butonuna tıklar
4. Temel Paket kullanıcıları artık sadece seçilen özellikleri görebilir

### Öncelik Sırası
1. **Yüksek:** Veritabanı şeması ve migration
2. **Yüksek:** Backend API endpoint'leri
3. **Yüksek:** Admin panel detay sayfası
4. **Orta:** Anasayfa dinamik buton render
5. **Orta:** Create ekranı ses modeli filtreleme
6. **Düşük:** Cümle kalıpları UI (placeholder)
2)
3)