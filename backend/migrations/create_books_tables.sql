-- Mevcut books ve book_chapters tablolarına yönelik migration
-- Bu dosya mevcut tablo yapısını korur ve sadece gerekli indeksler ve yeni chapter_audio tablosunu ekler

-- books tablosu zaten mevcut: id, gutendex_id, title, authors, cover_url, download_count, language, copyright, subjects, created_at, text_url

-- book_chapters tablosu zaten mevcut: id, book_id, chapter_index, chapter_title, chapter_text, created_at

-- Bölüm ses dosyaları cache tablosu (yeni)
CREATE TABLE IF NOT EXISTS chapter_audio (
    id SERIAL PRIMARY KEY,
    chapter_id INTEGER NOT NULL REFERENCES book_chapters(id) ON DELETE CASCADE,
    voice_model VARCHAR(100) NOT NULL,
    speaking_rate DECIMAL(3,2) NOT NULL,
    level VARCHAR(10) NOT NULL,
    mp3_url VARCHAR(1000) NOT NULL,
    vtt_url VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chapter_id, voice_model, speaking_rate, level)
);

-- İndeksler - mevcut tablolar için performans optimizasyonu
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_authors ON books(authors);
CREATE INDEX IF NOT EXISTS idx_books_language ON books(language);
CREATE INDEX IF NOT EXISTS idx_books_gutendex_id ON books(gutendex_id);
CREATE INDEX IF NOT EXISTS idx_books_title_authors ON books(title, authors);

CREATE INDEX IF NOT EXISTS idx_book_chapters_book_id ON book_chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_book_chapters_book_chapter ON book_chapters(book_id, chapter_index);
CREATE INDEX IF NOT EXISTS idx_book_chapters_chapter_index ON book_chapters(chapter_index);

-- Yeni chapter_audio tablosu için indeksler
CREATE INDEX IF NOT EXISTS idx_chapter_audio_chapter_id ON chapter_audio(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_audio_lookup ON chapter_audio(chapter_id, voice_model, speaking_rate, level);

-- text_url kolonu NULL olan kayıtlar için gutendex_id'den URL oluştur
UPDATE books SET text_url = CASE 
    WHEN gutendex_id IS NOT NULL AND text_url IS NULL THEN 'https://www.gutenberg.org/files/' || gutendex_id || '/' || gutendex_id || '-h/' || gutendex_id || '-h.htm'
    ELSE text_url
END 
WHERE text_url IS NULL AND gutendex_id IS NOT NULL; 