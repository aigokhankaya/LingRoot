# Kitap Özelliği Deployment Rehberi

## 📚 Özellik Özeti

Bu deployment, Welcome sayfasına kitap arama ve bölüm seçimi özelliği ekler:

- Kitap adı ve yazar ile arama
- Sayfalama desteği
- Bölüm listeleme ve seçimi
- Mevcut ses dosyası kontrolü
- Otomatik ses cache sistemi

## 🗄️ Veritabanı Değişiklikleri

### Yeni Tablolar

1. **books** - Kitap bilgileri
2. **chapters** - Bölüm içerikleri  
3. **chapter_audio** - Ses dosyası cache

### Migration

Production'da otomatik migration çalışır. Manuel çalıştırmak için:

```bash
npm run migrate
```

## 🔧 Environment Variables

Render'da aşağıdaki environment variable'ı ekleyin:

```
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

## 📁 Yeni Dosyalar

### Backend
- `routes/books.js` - Kitap API endpoint'leri
- `migrations/create_books_tables.sql` - Veritabanı migration
- `scripts/migrate.js` - Production migration script

### Frontend
- Welcome sayfasında kitap sekmesi eklendi
- Yeni interface'ler: Book, Chapter, BookSearchResult, ExistingAudio

## 🚀 Deployment Adımları

### 1. Backend Deployment (Render)

```bash
# Render otomatik deployment yapacak
# Migration otomatik çalışacak
```

### 2. Frontend Deployment

```bash
# Frontend değişiklikleri otomatik deploy olacak
```

### 3. Verification

Production'da test edin:

```bash
# Kitap arama
curl "https://your-backend.onrender.com/api/books/search?q=gatsby"

# Bölüm listeleme
curl "https://your-backend.onrender.com/api/books/1/chapters"
```

## 🔍 API Endpoints

### Kitap Arama
```
GET /api/books/search?q={query}&page={page}&per_page={limit}
```

### Bölüm Listeleme
```
GET /api/books/{bookId}/chapters
```

### Mevcut Ses Kontrolü
```
GET /api/books/chapters/{chapterId}/audio?voice={voice}&rate={rate}&level={level}
```

### Ses Kaydetme
```
POST /api/books/chapters/{chapterId}/audio
```

## 🎯 Kullanım

1. Welcome sayfasında "Kitap" sekmesini seçin
2. Kitap adı veya yazar adı ile arama yapın
3. Listeden bir kitap seçin
4. Bölüm listesinden bir bölüm seçin
5. Mevcut ses varsa kullanın, yoksa yeni ses oluşturun

## 🐛 Troubleshooting

### Migration Hatası
```bash
# Manuel migration çalıştırın
node scripts/migrate.js
```

### Veritabanı Bağlantı Hatası
- DATABASE_URL environment variable'ını kontrol edin
- PostgreSQL bağlantısını test edin

### API Hatası
- Render logs'ları kontrol edin
- CORS ayarlarını kontrol edin

## 📊 Monitoring

Production'da izlenecek metrikler:

- Kitap arama response time
- Bölüm yükleme başarı oranı
- Ses cache hit rate
- Database connection pool durumu

## 🔄 Rollback

Gerekirse önceki versiona dönmek için:

1. Render'da önceki deployment'ı restore edin
2. Veritabanı değişiklikleri geri alınmayacak (güvenli)
3. Frontend'i önceki versiona deploy edin 