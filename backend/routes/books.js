const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// PostgreSQL bağlantısı
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Kitap arama endpoint'i
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, per_page = 10 } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Arama sorgusu gerekli' });
    }
    
    const offset = (parseInt(page) - 1) * parseInt(per_page);
    const searchQuery = `%${q.trim()}%`;
    
    // Toplam kitap sayısını al
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM books 
      WHERE title ILIKE $1 OR author ILIKE $1
    `;
    const countResult = await pool.query(countQuery, [searchQuery]);
    const total = parseInt(countResult.rows[0].total);
    
    // Kitapları al
    const booksQuery = `
      SELECT 
        id, title, author, description, cover_image, 
        language, genre, publication_year, total_chapters
      FROM books 
      WHERE title ILIKE $1 OR author ILIKE $1
      ORDER BY title ASC
      LIMIT $2 OFFSET $3
    `;
    const booksResult = await pool.query(booksQuery, [searchQuery, parseInt(per_page), offset]);
    
    const total_pages = Math.ceil(total / parseInt(per_page));
    
    res.json({
      books: booksResult.rows,
      total,
      page: parseInt(page),
      per_page: parseInt(per_page),
      total_pages
    });
    
  } catch (error) {
    console.error('Kitap arama hatası:', error);
    res.status(500).json({ error: 'Kitap arama sırasında hata oluştu' });
  }
});

// Kitap bölümlerini getir
router.get('/:bookId/chapters', async (req, res) => {
  try {
    const { bookId } = req.params;
    
    const query = `
      SELECT 
        id, book_id, chapter_number, title, content, word_count
      FROM chapters 
      WHERE book_id = $1
      ORDER BY chapter_number ASC
    `;
    const result = await pool.query(query, [bookId]);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Bölüm yükleme hatası:', error);
    res.status(500).json({ error: 'Bölümler yüklenirken hata oluştu' });
  }
});

// Mevcut ses dosyasını kontrol et
router.get('/chapters/:chapterId/audio', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { voice, rate, level } = req.query;
    
    if (!voice || !rate || !level) {
      return res.status(400).json({ error: 'Ses modeli, hız ve seviye parametreleri gerekli' });
    }
    
    const query = `
      SELECT 
        id, chapter_id, voice_model, speaking_rate, level, 
        mp3_url, vtt_url, created_at
      FROM chapter_audio 
      WHERE chapter_id = $1 AND voice_model = $2 AND speaking_rate = $3 AND level = $4
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [chapterId, voice, parseFloat(rate), level]);
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Mevcut ses dosyası bulunamadı' });
    }
    
  } catch (error) {
    console.error('Mevcut ses kontrolü hatası:', error);
    res.status(500).json({ error: 'Ses dosyası kontrolü sırasında hata oluştu' });
  }
});

// Bölüm ses dosyasını kaydet
router.post('/chapters/:chapterId/audio', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { voice_model, speaking_rate, level, mp3_url, vtt_url } = req.body;
    
    if (!voice_model || !speaking_rate || !level || !mp3_url) {
      return res.status(400).json({ error: 'Gerekli parametreler eksik' });
    }
    
    const query = `
      INSERT INTO chapter_audio (chapter_id, voice_model, speaking_rate, level, mp3_url, vtt_url, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (chapter_id, voice_model, speaking_rate, level) 
      DO UPDATE SET mp3_url = EXCLUDED.mp3_url, vtt_url = EXCLUDED.vtt_url, created_at = NOW()
      RETURNING *
    `;
    const result = await pool.query(query, [chapterId, voice_model, speaking_rate, level, mp3_url, vtt_url]);
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Ses dosyası kaydetme hatası:', error);
    res.status(500).json({ error: 'Ses dosyası kaydedilirken hata oluştu' });
  }
});

module.exports = router; 