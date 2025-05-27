-- Books tablosu oluşturma SQL'i
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    gutendex_id INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    authors TEXT,
    cover_url TEXT,
    download_count INTEGER DEFAULT 0,
    language VARCHAR(10) DEFAULT 'en',
    copyright BOOLEAN DEFAULT false,
    subjects TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_books_gutendex_id ON books(gutendex_id);
CREATE INDEX IF NOT EXISTS idx_books_language ON books(language);
CREATE INDEX IF NOT EXISTS idx_books_copyright ON books(copyright);
CREATE INDEX IF NOT EXISTS idx_books_download_count ON books(download_count DESC); 