const express = require('express');
const router = express.Router();
const { searchBooks, fetchBookContent } = require('../utils/bookService');

// /api/books/search?query=...
router.get('/search', async (req, res) => {
  const query = req.query.query;
  if (!query || query.length < 3) {
    return res.status(400).json({ success: false, message: 'Query parametresi gerekli ve en az 3 karakter olmalı.' });
  }
  try {
    const results = await searchBooks(query);
    res.json({ success: true, results });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// /api/books/content/:id
router.get('/content/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ success: false, message: 'Kitap ID gerekli.' });
  try {
    const result = await fetchBookContent(id);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router; 