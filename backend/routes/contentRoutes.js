const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { authenticate } = require('../middleware/auth');
const { contentLimiter } = require('../middleware/security');
const { redisCache } = require('../middleware/redisCache');
const logger = require('../utils/common/logger.js');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const epubParser = require('epub-parser');
const textract = require('textract');
const fs = require('fs');
const path = require('path');

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.html', '.epub', '.rtf', '.odt', '.doc'];
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('Desteklenmeyen dosya formati: ' + ext));
    }
    cb(null, true);
  }
});

// Process content routes (AI API calls - require authentication)
router.post('/process-link', authenticate, contentController.processLink);
router.post('/process-text', authenticate, contentController.processText);
router.post('/process-file', authenticate, contentController.processFile);
router.post('/process-youtube', authenticate, contentController.processYoutube);
router.post('/process-web', authenticate, contentController.processWeb);
router.post('/process-book', authenticate, contentController.processBook);
router.post('/process-spotify', authenticate, contentController.processSpotify);
router.post('/process-suggestions', authenticate, contentController.processSuggestions);
router.post('/process-hashtag', authenticate, contentController.processHashtag);

// Haber detayı için özel endpoint
router.post('/article-details', authenticate, contentController.fetchArticleDetails);

// ✅ Yeni eklenen route:
router.post('/submit', authenticate, contentController.submitContent);

// Supabase connection test route
router.get('/test-db', contentController.testSupabaseConnection);

// Count route
router.get('/count', authenticate, contentController.getContentCount);
router.get('/audio-count', authenticate, contentController.getContentCount);

// Content history routes (600s cache - 10 minutes)
router.get('/history', authenticate, contentLimiter, redisCache('content:history', 600), contentController.getContentHistory);
router.get('/history/:id', authenticate, contentLimiter, contentController.getContentById);
router.delete('/history/:id', authenticate, contentLimiter, contentController.deleteContent);

// Progress tracking & Resume
router.get('/in-progress', authenticate, contentLimiter, contentController.getInProgress);
router.put('/:id/progress', authenticate, contentLimiter, contentController.updateProgress);

// Content Quizzes
router.get('/:id/quiz', authenticate, contentLimiter, contentController.generateQuiz);
router.post('/:id/quiz/submit', authenticate, contentLimiter, contentController.submitQuiz);

router.post('/', authenticate, contentController.createContent);
// router.get('/history', authenticate, contentController.getUserContentHistory); // ÇAKIŞMA ÖNLENDİ

router.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  const ext = path.extname(file.originalname).toLowerCase();
  let text = '';
  try {
    // Magic bytes validation for binary file types
    const MAGIC_TYPES = {
      '.pdf': ['application/pdf'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
      '.epub': ['application/epub+zip', 'application/zip'],
      '.odt': ['application/zip'],
      '.doc': ['application/msword', 'application/x-cfb'],
    };
    if (MAGIC_TYPES[ext]) {
      const FileType = require('file-type');
      const detected = await FileType.fromFile(file.path);
      if (detected && !MAGIC_TYPES[ext].includes(detected.mime)) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Dosya icerigi uzantiyla uyusmuyor' });
      }
    }
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(file.path);
      const data = await pdfParse(dataBuffer);
      text = data.text;
    } else if (ext === '.docx') {
      const data = await mammoth.extractRawText({ path: file.path });
      text = data.value;
    } else if (ext === '.txt' || ext === '.md') {
      text = fs.readFileSync(file.path, 'utf8');
    } else if (ext === '.rtf') {
      text = await new Promise((resolve, reject) => {
        textract.fromFileWithPath(file.path, (err, txt) => {
          if (err) reject(err);
          else resolve(txt);
        });
      });
    } else if (ext === '.html') {
      const raw = fs.readFileSync(file.path, 'utf8');
      const $ = cheerio.load(raw);
      text = $('body').text();
    } else if (ext === '.epub') {
      text = await new Promise((resolve, reject) => {
        epubParser(fs.createReadStream(file.path), (err, epubData) => {
          if (err) reject(err);
          else resolve(epubData && epubData.text ? epubData.text : '');
        });
      });
    } else if (ext === '.odt' || ext === '.doc') {
      text = await new Promise((resolve, reject) => {
        textract.fromFileWithPath(file.path, (err, txt) => {
          if (err) reject(err);
          else resolve(txt);
        });
      });
    } else {
      return res.status(400).json({ error: 'Desteklenmeyen dosya formatı.' });
    }
    if (!text.trim()) {
      return res.status(400).json({ error: 'Belge boş görünüyor.' });
    }
    res.json({ text });
  } catch (err) {
    logger.error('[CONTENT-ROUTES] File processing error:', err);
    res.status(500).json({ error: 'Dosya işlenirken hata oluştu.' });
  } finally {
    fs.unlinkSync(file.path);
  }
});

module.exports = router;
