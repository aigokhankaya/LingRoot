# 🌳 Konu Hiyerarşisi Sistemi - Kurulum ve Kullanım Kılavuzu

## 📋 Genel Bakış

LingRoot'a eklenen **Konu Hiyerarşisi Sistemi**, kullanıcıların çok katmanlı, sonsuz derinlikte konu ağaçları oluşturmasını sağlar. Her konudan sesli içerik üretilebilir ve AI destekli alt konu önerileri alınabilir.

## ✨ Özellikler

- ✅ Sonsuz derinlikte konu ağacı
- ✅ OpenAI ile otomatik alt konu üretimi
- ✅ Manuel alt konu ekleme
- ✅ Her seviyeden TTS içerik oluşturma
- ✅ Ağaç görünümü (collapse/expand)
- ✅ Konu silme (cascade delete)
- ✅ Responsive tasarım
- ✅ TypeScript tip güvenliği

---

## 🛠️ KURULUM ADIMLARI

### 1️⃣ Database Migration

**Supabase Dashboard'a git:**
1. Projenizin Supabase dashboard'unu açın
2. SQL Editor'e gidin
3. Aşağıdaki dosyayı çalıştırın:

```bash
backend/migrations/20251120_create_topic_hierarchy.sql
```

**Veya CLI ile:**
```bash
cd backend
psql $DATABASE_URL < migrations/20251120_create_topic_hierarchy.sql
```

**Doğrulama:**
```sql
-- Tabloların oluşturulduğunu kontrol et
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('topics', 'topic_contents');
```

### 2️⃣ Backend Başlatma

```bash
cd backend
npm start
```

**Kontrol:**
- Server başarıyla başladı mı?
- Console'da "✅ Server is running on http://0.0.0.0:5001" mesajını görüyor musunuz?
- `http://localhost:5001/api/health` endpoint'i çalışıyor mu?

### 3️⃣ Frontend Başlatma

```bash
cd frontend
npm run dev
```

**Kontrol:**
- Frontend `http://localhost:3000` adresinde açıldı mı?
- Console'da hata var mı?

---

## 🧪 TEST ADIMLARI

### ✅ 1. Temel Akış Testi

1. **Login olun**
   - `http://localhost:3000/welcome` sayfasına gidin
   - Kullanıcı girişi yapın

2. **Konu Ağacı sekmesini açın**
   - İçerik türü seçeneklerinde "🗺️ Konu Ağacı" butonuna tıklayın

3. **Ana konu oluşturun**
   - "Ana Konu Başlığı" alanına: **"Osmanlı Devleti"** yazın
   - "Ana Konu Oluştur" butonuna basın
   - ✅ Ana konu başarıyla oluşturulmalı

4. **AI ile alt konu oluşturun**
   - Oluşan ana konunun üzerindeki **"AI Öner"** butonuna tıklayın
   - Alt konu sayısı seçin (örn: 5)
   - Dil: Türkçe
   - **"Oluştur"** butonuna basın
   - ⏳ 5-10 saniye bekleyin
   - ✅ 5 adet alt konu oluşmalı (örn: "Kuruluş Dönemi", "Yükselme Dönemi", vb.)

5. **Alt konuyu expand/collapse edin**
   - Alt konuların gösterildiğini doğrulayın
   - Ana konunun yanındaki ok işaretine tıklayın
   - ✅ Alt konular gizlenmeli/gösterilmeli

6. **Detay alt konu oluşturun**
   - Herhangi bir alt konuya (örn: "Kuruluş Dönemi") tekrar **"AI Öner"** butonuyla tıklayın
   - ✅ Detay alt konular oluşmalı (örn: "Osman Gazi", "Orhan Gazi", vb.)

7. **Manuel alt konu ekleyin**
   - **"Manuel Ekle"** butonuna tıklayın
   - Başlık: "Özel Konu"
   - Açıklama: "Manuel eklediğim konu"
   - ✅ Manuel konu başarıyla eklenmeli

8. **Ses oluşturun**
   - Herhangi bir konunun **"🔊 Ses Oluştur"** butonuna basın
   - ✅ Konu bilgisi alınmalı ve TTS workflow'u tetiklenmeli

9. **Konu silin**
   - Herhangi bir konunun **🗑️** (çöp kutusu) ikonuna basın
   - Silme onayını verin
   - ✅ Konu ve tüm alt konuları silinmeli

### ✅ 2. API Endpoint Testleri (Postman/Thunder Client)

**Ana Konu Oluştur:**
```http
POST http://localhost:5001/api/topic-hierarchy/topics
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "title": "Test Konusu",
  "description": "Test açıklaması",
  "level": "A1"
}
```

**Alt Konu Üret:**
```http
POST http://localhost:5001/api/topic-hierarchy/topics/{TOPIC_ID}/subtopics
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "count": 5,
  "language": "Turkish"
}
```

**Konu Ağacını Getir:**
```http
GET http://localhost:5001/api/topic-hierarchy/topics/tree
Authorization: Bearer YOUR_TOKEN
```

---

## 📁 DOSYA YAPISI

```
backend/
├── controllers/
│   └── topicHierarchyController.js     # Ana controller
├── routes/
│   └── topicHierarchy.js               # Route tanımları
├── prompts/
│   └── topic_hierarchy/
│       └── generate_subtopics.txt      # OpenAI prompt
├── migrations/
│   └── 20251120_create_topic_hierarchy.sql
└── server.js                           # Route mount edildi

frontend/
├── src/
│   ├── components/
│   │   └── TopicHierarchy/
│   │       ├── TopicHierarchySection.tsx  # Ana container
│   │       ├── TopicInput.tsx             # Konu input formu
│   │       ├── TopicTree.tsx              # Ağaç görünümü
│   │       ├── TopicNode.tsx              # Tek konu node (recursive)
│   │       ├── SubtopicModal.tsx          # AI alt konu modalı
│   │       └── ManualSubtopicModal.tsx    # Manuel ekleme modalı
│   └── lib/
│       └── api.ts                      # API fonksiyonları eklendi
└── pages/
    └── welcome.tsx                     # Yeni sekme entegre edildi
```

---

## 🔧 SORUN GİDERME

### ❌ "topics tablosu bulunamadı" Hatası
**Çözüm:**
- Migration dosyasını tekrar çalıştırın
- Supabase'de manuel olarak tabloları oluşturun

### ❌ "401 Unauthorized" Hatası
**Çözüm:**
- Kullanıcı giriş yapmış mı kontrol edin
- Token'ın geçerli olduğunu doğrulayın

### ❌ "OpenAI API Error"
**Çözüm:**
- Backend `.env` dosyasında `OPENAI_API_KEY` tanımlı mı?
- OpenAI hesabınızda kredi var mı?

### ❌ Alt konular oluşmuyor
**Çözüm:**
- Backend console'da hata mesajlarına bakın
- OpenAI rate limit'e takılmış olabilir
- Prompt dosyası doğru yolda mı kontrol edin

### ❌ Frontend component'leri render olmuyor
**Çözüm:**
- `npm run dev` ile frontend'i yeniden başlatın
- Browser cache'i temizleyin (Ctrl+F5)
- Console'da TypeScript hataları var mı kontrol edin

---

## 🚀 GELİŞTİRME ÖNERİLERİ

### 🎯 Gelecek Özellikler

1. **📖 Konu Şablonları**
   - Hazır konu ağaçları (Türk Tarihi, Bilim, Sanat)
   - Tek tıkla şablon yükleme

2. **🔄 Toplu İçerik Üretimi**
   - Tüm alt konular için bir kerede ses oluştur
   - Progress bar ile ilerleme göster

3. **📊 İstatistikler**
   - Kullanıcı kaç konu oluşturmuş
   - En çok çalışılan konular
   - Toplam dinleme süresi

4. **🎨 Mind Map Görünümü**
   - Görsel konu haritası
   - Renk kodları ile seviyeleri göster

5. **🔍 Arama ve Filtreleme**
   - Konu başlıklarında arama
   - Seviye bazlı filtreleme

6. **📤 Export/Import**
   - Konu ağacını JSON olarak dışa aktar
   - Başka kullanıcılarla paylaş

---

## 📞 DESTEK

Sorun yaşıyorsanız:
1. Backend console'daki hata mesajlarını kontrol edin
2. Browser console'daki hata mesajlarını kontrol edin
3. Database'de `topics` tablosunun oluşturulduğunu doğrulayın
4. API endpoint'lerinin çalıştığını test edin

---

## ✅ ÖZET KONTROL LİSTESİ

- [ ] Database migration çalıştırıldı
- [ ] Backend başarıyla başladı
- [ ] Frontend başarıyla başladı
- [ ] "Konu Ağacı" sekmesi görünüyor
- [ ] Ana konu oluşturuldu
- [ ] AI ile alt konu oluşturuldu
- [ ] Manuel alt konu eklendi
- [ ] Ses oluşturma çalışıyor
- [ ] Konu silme çalışıyor
- [ ] Ağaç görünümü (expand/collapse) çalışıyor

**🎉 Tüm adımlar tamamlandıysa, sistem hazır!**
