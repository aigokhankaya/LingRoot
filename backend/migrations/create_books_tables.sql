-- Kitaplar tablosu
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    author VARCHAR(300) NOT NULL,
    description TEXT,
    cover_image VARCHAR(1000),
    language VARCHAR(10) DEFAULT 'en',
    genre VARCHAR(100),
    publication_year INTEGER,
    total_chapters INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bölümler tablosu
CREATE TABLE IF NOT EXISTS chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(book_id, chapter_number)
);

-- Bölüm ses dosyaları cache tablosu
CREATE TABLE IF NOT EXISTS chapter_audio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    voice_model VARCHAR(100) NOT NULL,
    speaking_rate DECIMAL(3,2) NOT NULL,
    level VARCHAR(10) NOT NULL,
    mp3_url VARCHAR(1000) NOT NULL,
    vtt_url VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chapter_id, voice_model, speaking_rate, level)
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_title_author ON books(title, author);
CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_chapters_book_chapter ON chapters(book_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_chapter_audio_chapter_id ON chapter_audio(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_audio_lookup ON chapter_audio(chapter_id, voice_model, speaking_rate, level);

-- Örnek veri ekleme
INSERT INTO books (title, author, description, language, genre, total_chapters) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', 'A classic American novel set in the Jazz Age, exploring themes of wealth, love, and the American Dream.', 'en', 'Classic Literature', 9),
('To Kill a Mockingbird', 'Harper Lee', 'A gripping tale of racial injustice and childhood innocence in the American South.', 'en', 'Classic Literature', 31),
('1984', 'George Orwell', 'A dystopian social science fiction novel about totalitarian control and surveillance.', 'en', 'Science Fiction', 23),
('Pride and Prejudice', 'Jane Austen', 'A romantic novel that critiques the British landed gentry at the end of the 18th century.', 'en', 'Romance', 61),
('The Catcher in the Rye', 'J.D. Salinger', 'A controversial novel about teenage rebellion and alienation in post-war America.', 'en', 'Coming of Age', 26)
ON CONFLICT DO NOTHING;

-- Örnek bölümler (The Great Gatsby için)
INSERT INTO chapters (book_id, chapter_number, title, content, word_count) 
SELECT 
    b.id,
    1,
    'Chapter 1: Nick Carraway',
    'In my younger and more vulnerable years my father gave me some advice that I''ve carried with me ever since. "Whenever you feel like criticizing anyone," he told me, "just remember that all the people in this world haven''t had the advantages that you''ve had." He didn''t say any more, but we''ve always been unusually communicative in a reserved way, and I understood that he meant a great deal more than that. In consequence, I''m inclined to reserve all judgments, a habit that has opened up many curious natures to me and also made me the victim of not a few veteran bores.',
    150
FROM books b WHERE b.title = 'The Great Gatsby'
ON CONFLICT DO NOTHING;

INSERT INTO chapters (book_id, chapter_number, title, content, word_count) 
SELECT 
    b.id,
    2,
    'Chapter 2: The Valley of Ashes',
    'About half way between West Egg and New York the motor road hastily joins the railroad and runs beside it for a quarter of a mile, so as to shrink away from a certain desolate area of land. This is a valley of ashes—a fantastic farm where ashes grow like wheat into ridges and hills and grotesque gardens; where ashes take the forms of houses and chimneys and rising smoke and, finally, with a transcendent effort, of men who move dimly and already crumbling through the powdery air.',
    180
FROM books b WHERE b.title = 'The Great Gatsby'
ON CONFLICT DO NOTHING;

-- 1984 için örnek bölümler
INSERT INTO chapters (book_id, chapter_number, title, content, word_count) 
SELECT 
    b.id,
    1,
    'Part One: Chapter 1',
    'It was a bright cold day in April, and the clocks were striking thirteen. Winston Smith, his chin nuzzled into his breast in an effort to escape the vile wind, slipped quickly through the glass doors of Victory Mansions, though not quickly enough to prevent a swirl of gritty dust from entering along with him. The hallway smelt of boiled cabbage and old rag mats. At one end of it a coloured poster, too large for indoor display, had been tacked to the wall.',
    200
FROM books b WHERE b.title = '1984'
ON CONFLICT DO NOTHING;

INSERT INTO chapters (book_id, chapter_number, title, content, word_count) 
SELECT 
    b.id,
    2,
    'Part One: Chapter 2',
    'Winston made for the stairs. It was no use trying the lift. Even at the best of times it was seldom working, and at present the electric current was cut off during daylight hours. It was part of the economy drive in preparation for Hate Week. The flat was seven flights up, and Winston, who was thirty-nine and had a varicose ulcer above his right ankle, went slowly, resting several times on the way.',
    175
FROM books b WHERE b.title = '1984'
ON CONFLICT DO NOTHING; 