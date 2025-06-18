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

```bash
# Backend klasörüne git
cd backend

# Migration'ı çalıştır
node run_migration.js migrations/create_books_tables.sql
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

### 2. Frontend Kullanımı

Kitap özellikleri şu sayfalardan erişilebilir:
- Kitap arama ve seçimi
- Bölüm listesi görüntüleme  
- TTS ile dinleme (mevcut TTS sistemi ile entegre)

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