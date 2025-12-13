const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const bookTextExtractor = require('../utils/bookTextExtractor');
const logger = require('../utils/logger');

// Kitap arama endpoint'i
router.get('/search', async (req, res) => {
  try {
    const { q, title, author, page = 1, per_page = 10 } = req.query;

    logger.info(`Book search request: q="${q}", title="${title}", author="${author}", page=${page}, per_page=${per_page}`);

    // En az bir arama kriteri olmalı
    if (!q?.trim() && !title?.trim() && !author?.trim()) {
      logger.warn('No search criteria provided');
      return res.status(400).json({ error: 'En az bir arama kriteri gerekli' });
    }

    const offset = (parseInt(page) - 1) * parseInt(per_page);

    // Supabase bağlantısı kontrolü
    if (!supabase) {
      logger.error('Supabase client not configured');
      return res.status(500).json({ error: 'Veritabanı bağlantısı yapılandırılmamış' });
    }

    // Arama kriterlerini belirle
    let searchQuery = q?.trim();
    let titleSearch = title?.trim();
    let authorSearch = author?.trim();

    // Ana arama terimi varsa, ondan kelimeler çıkar
    let searchWords = [];
    if (searchQuery) {
      searchWords = searchQuery.split(/\s+/).filter(word => word.length > 0);
    }

    logger.info(`Search criteria: general="${searchQuery}", title="${titleSearch}", author="${authorSearch}"`);

    // Supabase sorgusu için ilk kelimeyi belirle
    let firstSearchTerm = '';
    if (searchQuery) {
      firstSearchTerm = searchWords[0];
    } else if (titleSearch) {
      firstSearchTerm = titleSearch.split(/\s+/)[0];
    } else if (authorSearch) {
      firstSearchTerm = authorSearch.split(/\s+/)[0];
    }

    let query = supabase
      .from('books')
      .select('id, gutendex_id, title, authors, cover_url, download_count, language, copyright, subjects, text_url, created_at')
      .or(`title.ilike.%${firstSearchTerm}%,authors.ilike.%${firstSearchTerm}%`)
      .order('download_count', { ascending: false })
      .order('title', { ascending: true });

    const { data: allBooks, error } = await query;

    if (error) {
      logger.error('Supabase query error:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    // Client-side filtering: Çoklu kritere göre filtreleme
    const filteredBooks = (allBooks || []).filter(book => {
      const bookTitle = book.title?.toLowerCase() || '';
      const bookAuthors = book.authors?.toLowerCase() || '';

      let matches = true;

      // 1. Genel arama (q parametresi)
      if (searchQuery && searchWords.length > 0) {
        const generalMatch = searchWords.every(word => {
          const wordLower = word.toLowerCase();
          const wordRegex = new RegExp(`\\b${wordLower}`, 'i');
          return wordRegex.test(bookTitle) || wordRegex.test(bookAuthors);
        });
        matches = matches && generalMatch;
      }

      // 2. Kitap ismi araması (title parametresi)
      if (titleSearch) {
        const titleWords = titleSearch.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const titleMatch = titleWords.every(word => {
          const wordRegex = new RegExp(`\\b${word}`, 'i');
          return wordRegex.test(bookTitle);
        });
        matches = matches && titleMatch;
      }

      // 3. Yazar araması (author parametresi)
      if (authorSearch) {
        const authorWords = authorSearch.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const authorMatch = authorWords.every(word => {
          const wordRegex = new RegExp(`\\b${word}`, 'i');
          return wordRegex.test(bookAuthors);
        });
        matches = matches && authorMatch;
      }

      // Debug logging
      if (matches) {
        logger.info(`Book "${book.title}" by "${book.authors}" matches search criteria`);
      }

      return matches;
    });

    // Manual pagination
    const total = filteredBooks.length;
    const books = filteredBooks.slice(offset, offset + parseInt(per_page));

    logger.info(`Total books found after filtering: ${total}`);
    logger.info(`Books result count: ${books.length}`);

    const total_pages = Math.ceil((total || 0) / parseInt(per_page));

    const response = {
      books: books || [],
      total: total || 0,
      page: parseInt(page),
      per_page: parseInt(per_page),
      total_pages
    };

    logger.info(`Sending response with ${response.books.length} books`);
    res.json(response);

  } catch (error) {
    logger.error('Kitap arama hatası:', error);
    console.error('Kitap arama hatası:', error);
    res.status(500).json({ error: 'Kitap arama sırasında hata oluştu', details: error.message });
  }
});

// Admin list endpoint
router.get('/admin/list', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Veritabanı yapılandırması gerekli' });
    }

    // Fetch books first
    const { data: books, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Now fetch chapter counts for these books
    // Since we can't easily join-count in one go with the current schema/client setup that caused error,
    // we'll do a second query or just map them. For performance on large sets this should be an RPC or view,
    // but for admin panel with reasonable book count, a loop or grouped query is okay.
    // Let's try to get all chapter counts grouped by book_id if possible, or just iterate.
    // For simplicity and stability now, we can fetch counts per book or just 0.

    // Better approach: Get all distinct book_ids from chapters
    // but that's also heavy.
    // Let's start with basic book list.

    // If we really need counts, we can do:
    const bookIds = books.map(b => b.id);

    // This is optional but nice to have.
    // Let's try to fetch all chapters with just book_id to count them in memory
    // (Be careful if millions of chapters, but fine for thousands)
    const { data: chapters, error: chapterError } = await supabase
      .from('book_chapters')
      .select('book_id');

    const counts = {};
    if (chapters) {
      chapters.forEach(c => {
        counts[c.book_id] = (counts[c.book_id] || 0) + 1;
      });
    }

    const transformed = books.map(book => ({
      ...book,
      chapter_count: counts[book.id] || 0
    }));

    res.json({ success: true, data: transformed });
  } catch (error) {
    console.error('Admin kitap listesi hatası:', error);
    res.status(500).json({ error: 'Kitap listesi alınırken hata oluştu' });
  }
});

// Kitap bölümlerini getir
router.get('/:bookId/chapters', async (req, res) => {
  try {
    const { bookId } = req.params;

    // Supabase bağlantısı kontrolü
    if (!supabase) {
      return res.status(500).json({ error: 'Veritabanı bağlantısı yapılandırılmamış' });
    }

    // Önce mevcut chapter'ları kontrol et
    const { data: existingChapters, error: chaptersError } = await supabase
      .from('book_chapters')
      .select('id, book_id, chapter_index, chapter_title, chapter_text, created_at')
      .eq('book_id', bookId)
      .order('chapter_index', { ascending: true });

    if (chaptersError) {
      logger.error('Error fetching existing chapters:', chaptersError);
      throw new Error(`Supabase error: ${chaptersError.message}`);
    }

    // Eğer chapter'lar varsa direkt döndür
    if (existingChapters && existingChapters.length > 0) {
      logger.info(`Found ${existingChapters.length} existing chapters for book ${bookId}`);
      return res.json(existingChapters);
    }

    // Chapter'lar yoksa kitabın text_url'inden çek
    logger.info(`No existing chapters found for book ${bookId}, extracting from text_url`);

    // Kitap bilgilerini al
    const { data: books, error: bookError } = await supabase
      .from('books')
      .select('id, title, authors, text_url')
      .eq('id', bookId)
      .single();

    if (bookError || !books) {
      logger.error('Error fetching book:', bookError);
      return res.status(404).json({ error: 'Kitap bulunamadı' });
    }

    const book = books;

    if (!book.text_url) {
      return res.status(400).json({ error: 'Kitap için metin URL\'si bulunamadı' });
    }

    try {
      // URL'den chapter'ları çıkar
      logger.info(`Extracting chapters from URL: ${book.text_url}`);
      const extractedChapters = await bookTextExtractor.extractChaptersFromUrl(
        book.text_url,
        book.title
      );

      if (extractedChapters.length === 0) {
        return res.status(404).json({ error: 'Kitapta bölüm bulunamadı' });
      }

      // Chapter'ları veritabanına kaydet
      const chaptersToInsert = extractedChapters.map(chapter => ({
        book_id: bookId,
        chapter_index: chapter.chapter_number,
        chapter_title: chapter.title,
        chapter_text: chapter.content,
        created_at: new Date().toISOString()
      }));

      const { data: savedChapters, error: insertError } = await supabase
        .from('book_chapters')
        .insert(chaptersToInsert)
        .select('id, book_id, chapter_index, chapter_title, chapter_text, created_at');

      if (insertError) {
        logger.error('Error inserting chapters:', insertError);
        throw new Error(`Supabase error: ${insertError.message}`);
      }

      logger.info(`Successfully saved ${savedChapters?.length || 0} chapters for book ${bookId}`);
      res.json(savedChapters || []);

    } catch (extractError) {
      logger.error(`Error extracting chapters: ${extractError.message}`);
      res.status(500).json({
        error: 'Bölümler çıkarılırken hata oluştu',
        details: extractError.message
      });
    }

  } catch (error) {
    console.error('Kitap bölümleri getirme hatası:', error);
    res.status(500).json({ error: 'Bölümler getirilirken hata oluştu' });
  }
});

// Tek bölüm getir
router.get('/:bookId/chapters/:chapterId', async (req, res) => {
  try {
    const { bookId, chapterId } = req.params;

    if (!supabase) {
      return res.status(500).json({ error: 'Veritabanı yapılandırması gerekli' });
    }

    const { data: chapter, error } = await supabase
      .from('book_chapters')
      .select(`
        id, book_id, chapter_index, chapter_title, chapter_text, created_at,
        books!inner(title, authors)
      `)
      .eq('book_id', bookId)
      .eq('id', chapterId)
      .single();

    if (error || !chapter) {
      logger.error('Error fetching chapter:', error);
      return res.status(404).json({ error: 'Bölüm bulunamadı' });
    }

    // Flatten the response structure
    const response = {
      ...chapter,
      book_title: chapter.books.title,
      book_authors: chapter.books.authors
    };
    delete response.books;

    res.json(response);

  } catch (error) {
    console.error('Bölüm getirme hatası:', error);
    res.status(500).json({ error: 'Bölüm getirilirken hata oluştu' });
  }
});

// Bölüm ses dosyası cache endpoint'leri
router.get('/:bookId/chapters/:chapterId/audio', async (req, res) => {
  try {
    const { bookId, chapterId } = req.params;
    const { voice_model, speaking_rate, level } = req.query;

    if (!supabase) {
      return res.status(500).json({ error: 'Veritabanı yapılandırması gerekli' });
    }

    const { data: audio, error } = await supabase
      .from('chapter_audio')
      .select('id, chapter_id, voice_model, speaking_rate, level, mp3_url, vtt_url, created_at')
      .eq('chapter_id', chapterId)
      .eq('voice_model', voice_model)
      .eq('speaking_rate', speaking_rate)
      .eq('level', level)
      .single();

    if (error || !audio) {
      return res.status(404).json({ error: 'Ses dosyası bulunamadı' });
    }

    res.json(audio);

  } catch (error) {
    console.error('Ses dosyası getirme hatası:', error);
    res.status(500).json({ error: 'Ses dosyası getirilirken hata oluştu' });
  }
});

// Bölüm ses dosyası cache kaydetme
router.post('/:bookId/chapters/:chapterId/audio', async (req, res) => {
  try {
    const { bookId, chapterId } = req.params;
    const { voice_model, speaking_rate, level, mp3_url, vtt_url } = req.body;

    if (!supabase) {
      return res.status(500).json({ error: 'Veritabanı yapılandırması gerekli' });
    }

    // Önce mevcut kayıt var mı kontrol et
    const { data: existing } = await supabase
      .from('chapter_audio')
      .select('id')
      .eq('chapter_id', chapterId)
      .eq('voice_model', voice_model)
      .eq('speaking_rate', speaking_rate)
      .eq('level', level)
      .single();

    let result;
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('chapter_audio')
        .update({
          mp3_url,
          vtt_url,
          created_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Update error: ${error.message}`);
      }
      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('chapter_audio')
        .insert({
          chapter_id: chapterId,
          voice_model,
          speaking_rate,
          level,
          mp3_url,
          vtt_url,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Insert error: ${error.message}`);
      }
      result = data;
    }

    res.json(result);

  } catch (error) {
    console.error('Ses dosyası kaydetme hatası:', error);
    res.status(500).json({ error: 'Ses dosyası kaydedilirken hata oluştu' });
  }
});

module.exports = router;