const express = require('express'); 
const router = express.Router();
const contentController = require('../controllers/contentController');
const { authenticate } = require('../middleware/authMiddleware');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const epubParser = require('epub-parser');
const textract = require('textract');
const fs = require('fs');
const path = require('path');

const upload = multer({ dest: 'uploads/' });

// Process content routes
router.post('/process-link', contentController.processLink);
router.post('/process-text', contentController.processText);
router.post('/process-file', contentController.processFile);
router.post('/process-youtube', contentController.processYoutube);
router.post('/youtube-transcript', contentController.fetchYoutubeToTranscript);
router.post('/process-web', contentController.processWeb);
router.post('/process-book', contentController.processBook);
router.post('/process-spotify', contentController.processSpotify);
router.post('/process-suggestions', contentController.processSuggestions);
router.post('/process-hashtag', contentController.processHashtag);

// ✅ Yeni eklenen route:
router.post('/submit', authenticate, contentController.submitContent);

// Content history routes
router.get('/history', authenticate, contentController.getContentHistory);
router.get('/history/:id', authenticate, contentController.getContentById);
router.delete('/history/:id', authenticate, contentController.deleteContent);

router.post('/', authenticate, contentController.createContent);
// router.get('/history', authenticate, contentController.getUserContentHistory); // ÇAKIŞMA ÖNLENDİ

router.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  const ext = path.extname(file.originalname).toLowerCase();
  let text = '';
  try {
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
    console.error(err);
    res.status(500).json({ error: 'Dosya işlenirken hata oluştu.' });
  } finally {
    fs.unlinkSync(file.path);
  }
});

module.exports = router;
