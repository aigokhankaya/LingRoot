# Kitaplar (Books) Özelliği Deployment Rehberi

Bu rehber, LingRoot uygulamasına kitap okuma ve TTS özelliğinin nasıl deploy edileceğini açıklar.

## 📋 Gerekli Hazırlıklar

### 1. Veritabanı Yapısı

Mevcut veritabanında aşağıdaki tablolar bulunmalıdır:

#### Books Tablosu (Mevcut)
```sql
-- Zaten mevcut tablo yapısı:
-- books tablosu kolonları: id, gutendex_id, title, authors, cover_url, download_count, language, copyright, subjects, created_at, text_url
```

#### Book Chapters Tablosu (Mevcut)
```sql
-- Zaten mevcut tablo yapısı:
-- book_chapters tablosu kolonları: id, book_id, chapter_index, chapter_title, chapter_text, created_at
```

#### Chapter Audio Cache Tablosu (Yeni - Opsiyonel)
```sql
-- Yeni tablo - ses dosyalarını cache'lemek için
CREATE TABLE IF NOT EXISTS chapter_audio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES book_chapters(id) ON DELETE CASCADE,
    voice_model VARCHAR(100) NOT NULL,
    speaking_rate DECIMAL(3,2) NOT NULL,
    level VARCHAR(10) NOT NULL,
    mp3_url VARCHAR(1000) NOT NULL,
    vtt_url VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chapter_id, voice_model, speaking_rate, level)
);
```

### 2. Migration Çalıştırma

#### a) Books / Chapters / Chapter Audio (ilk kurulum)

```bash
# Backend klasörüne git
cd backend

# Migration'ı çalıştır
node run_migration.js migrations/create_books_tables.sql
```

#### b) contenthistory.tablosuna chapter_id kolonu ekleme (kitap okuma geçmişi için)

Bu adım, kullanıcıların dinlediği kitap bölümlerinin `contenthistory` tablosuna bağlanmasını sağlar.

1. `backend/migrations/add_contenthistory_chapter_id.sql` dosyasını açın.
2. İçeriğini **Supabase Dashboard > SQL Editor** alanına kopyalayın.
3. `Run` butonuna basarak migration'ı çalıştırın.

Eklenen alan ve indexler özetle:

```sql
ALTER TABLE contenthistory
ADD COLUMN IF NOT EXISTS chapter_id INTEGER REFERENCES book_chapters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contenthistory_chapter_id
ON contenthistory(chapter_id);

CREATE INDEX IF NOT EXISTS idx_contenthistory_user_chapter
ON contenthistory(user_id, chapter_id);
```

### 3. Bağımlılık Kurulumu

```bash
# Backend dependencies
cd backend
npm install cheerio

# Frontend dependencies
cd ../frontend
npm install
```

## 🚀 Deployment Adımları

### 1. Backend Deployment

#### Environment Variables
Render/Heroku'da aşağıdaki environment variable'ların ayarlandığından emin olun:

```env
DATABASE_URL=your_postgresql_connection_string
NODE_ENV=production
PORT=8080
```

#### Package.json Dependencies
`backend/package.json` dosyasında şu dependencies'lerin olduğundan emin olun:
```json
{
  "dependencies": {
    "cheerio": "^1.1.0",
    "axios": "^1.6.2"
  }
}
```

#### Files to Deploy
Aşağıdaki dosyaların backend'de mevcut olduğundan emin olun:
- `routes/books.js` - API endpoints
- `utils/bookTextExtractor.js` - Text extraction utility
- `migrations/create_books_tables.sql` - Database migration

### 2. Frontend Deployment

#### Next.js Build
```bash
cd frontend
npm run build
```

#### Environment Variables (Vercel)
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

## 📱 Özellik Kullanımı

### 1. API Endpoints

#### Kitap Arama
```http
GET /api/books/search?q=gatsby&page=1&per_page=10
```

#### Kitap Bölümlerini Getir
```http
GET /api/books/{bookId}/chapters
```

#### Tek Bölüm Getir
```http
GET /api/books/{bookId}/chapters/{chapterId}
```

#### Ses Cache (Opsiyonel)
```http
GET /api/books/{bookId}/chapters/{chapterId}/audio?voice_model=Joanna&speaking_rate=1.0&level=A1
POST /api/books/{bookId}/chapters/{chapterId}/audio
```

#### Kullanıcı Bazlı Kitap Okuma Geçmişi (Yeni)

```http
GET /api/users/{userId}/book-history
```

Bu endpoint, `contenthistory` tablosundaki **kitap bölümü** kayıtlarını (chapter_id dolu olanlar) `book_chapters` ve `books` tabloları ile join ederek döner.

Örnek response veri alanları:

- `id` – contenthistory kaydı
- `book_id`, `book_title`, `book_authors`, `cover_url`, `subjects`
- `chapter_id`, `chapter_index`, `chapter_title`
- `level`, `mp3_url`, `created_at`, `duration`
- `words`, `timepoints` (varsa)

### 2. Frontend Kullanımı

Kitap özellikleri şu sayfalardan erişilebilir:
- **/welcome** sayfası → "Kitap" içerik türü sekmesi
  - Genel arama, kitap ismi ve yazar ismi alanları ile kitap arama
  - Kullanıcı yazdıkça (debounce'lu) arama sonuçlarının canlı güncellenmesi
  - Kitap sonuçlarının kapak görselli kart-grid yapısında listelenmesi
  - Bir kart seçildiğinde ilgili kitabın bölümlerinin altta listelenmesi
  - Seçilen bölüm için mevcut ses cache kontrolü ve TTS ile yeni ses oluşturma

- **/dashboard?tab=reading-history** → "Okuma Geçmişim" sekmesi
  - Alt sekmeler:
    - **Konularım**: Mevcut konu ağacı (TopicTree) görünümü
    - **Kitaplarım**: Kullanıcının dinlediği kitap/bölüm geçmişi
      - Son dinlenen kitaplar: kapak görselli kart-grid görünümü
      - Son dinlenen bölümler: seviye, süre ve tarih bilgisiyle liste görünümleri

## 🔧 Teknik Detaylar

### Text Extraction
- Gutenberg Project HTML formatını destekler
- Otomatik chapter detection (regex patterns)
- Fallback: Eşit parçalara bölme
- Minimum chapter length: 100 karakter

### Veritabanı Yapısı
- **books**: Mevcut Gutenberg kitap bilgileri
- **book_chapters**: Chapter'lar (index, title, text)
- **chapter_audio**: TTS cache (opsiyonel optimizasyon)
- **contenthistory.chapter_id**: Opsiyonel FK; bir ses kaydının hangi kitap bölümüne ait olduğunu tutar

### Performance
- Chapter'lar ilk erişimde extract edilir ve DB'ye kaydedilir
- Sonraki erişimlerde cache'den gelir
- Ses dosyaları opsiyonel olarak cache'lenebilir

## 🐛 Troubleshooting

### Migration Hataları
```bash
# Manual migration check
psql $DATABASE_URL -c "\dt" # List tables
psql $DATABASE_URL -c "\d books" # Check books table structure
psql $DATABASE_URL -c "\d book_chapters" # Check chapters table structure
```

### Text Extraction Hataları
- Network timeout: URL erişim problemi
- Parsing hataları: HTML yapı değişiklikleri
- Empty chapters: Regex pattern uyumsuzluğu

### Performance Issues
- Büyük kitaplar için chapter extraction yavaş olabilir
- Chapter audio cache kullanımı önerilir
- Database indexing kritik (migration'da dahil)

## ✅ Test Checklist

- [ ] Migration başarıyla çalıştı
- [ ] Backend dependencies yüklendi
- [ ] API endpoints çalışıyor
- [ ] Kitap arama fonksiyonu çalışıyor
- [ ] Chapter extraction çalışıyor
- [ ] TTS entegrasyonu çalışıyor
- [ ] contenthistory.chapter_id kolonu ve indexleri oluşturuldu
- [ ] /api/users/{userId}/book-history endpointi çalışıyor ve kitap/bölüm bilgilerini döndürüyor
- [ ] Dashboard > Okuma Geçmişim > Kitaplarım sekmesi veri gösteriyor
- [ ] Frontend build başarılı
- [ ] Production environment variables ayarlandı

## 📚 Desteklenen Kitap Formatları

- Project Gutenberg HTML formatı
- UTF-8 encoding
- İngilizce, Türkçe chapter başlıkları
- Roman numeral ve sayısal chapter numaraları

## 🔄 Update Yönergeleri

Yeni özellik eklendiğinde:

1. Backend değişiklikleri deploy et
2. Database migration varsa çalıştır  
3. Frontend build ve deploy
4. API endpoint testleri yap
5. End-to-end test yap

---

**Not**: Bu özellik mevcut TTS ve user management sistemi ile tam uyumludur. Ek configuration gerekmez. 