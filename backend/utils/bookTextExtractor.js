const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('./logger');

/**
 * URL'den kitap metnini çeker ve chapter'lara böler
 */
class BookTextExtractor {
  
  /**
   * URL'den HTML içeriği çeker
   */
  async fetchBookText(url) {
    try {
      logger.info(`Fetching book text from: ${url}`);
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.data;
    } catch (error) {
      logger.error(`Error fetching book text: ${error.message}`);
      throw error;
    }
  }

  /**
   * HTML'den temiz metin çıkarır
   */
  extractTextFromHtml(html) {
    try {
      const $ = cheerio.load(html);
      
      // Gereksiz elementleri kaldır
      $('script, style, nav, header, footer, .navigation, .toc').remove();
      
      // Ana içerik alanını bul
      let content = '';
      const possibleSelectors = [
        '.chapter', '.text', '.content', '.main', 'body', 
        '#content', '#main', '#text', '.book-content'
      ];
      
      for (const selector of possibleSelectors) {
        const element = $(selector);
        if (element.length > 0 && element.text().trim().length > 1000) {
          content = element.text();
          break;
        }
      }
      
      // Eğer hiçbir selector çalışmazsa body'yi al
      if (!content) {
        content = $('body').text();
      }
      
      // Metni temizle
      content = content
        .replace(/\s+/g, ' ') // Çoklu boşlukları tek boşluğa çevir
        .replace(/\n\s*\n/g, '\n\n') // Çoklu satır sonlarını düzenle
        .trim();
      
      return content;
    } catch (error) {
      logger.error(`Error extracting text from HTML: ${error.message}`);
      throw error;
    }
  }

  /**
   * Metni chapter'lara böler
   */
  splitIntoChapters(text, bookTitle = '') {
    try {
      logger.info(`Splitting text into chapters for: ${bookTitle}`);
      
      // Chapter başlıklarını tespit etmek için regex patterns
      const chapterPatterns = [
        /CHAPTER\s+([IVXLCDM]+|\d+)[:\.\s]/gi,
        /Chapter\s+(\d+)[:\.\s]/gi,
        /PART\s+([IVXLCDM]+|\d+)[:\.\s]/gi,
        /Part\s+(\d+)[:\.\s]/gi,
        /Book\s+(\d+)[:\.\s]/gi,
        /BOOK\s+([IVXLCDM]+|\d+)[:\.\s]/gi,
        /^\s*([IVXLCDM]+|\d+)\.\s/gm, // Roman rakamları veya sayılar
        /^\s*([IVXLCDM]+|\d+)\s*$/gm // Tek başına roman rakamları
      ];
      
      let chapters = [];
      let bestPattern = null;
      let bestMatches = [];
      
      // En iyi pattern'i bul
      for (const pattern of chapterPatterns) {
        const matches = [...text.matchAll(pattern)];
        if (matches.length > bestMatches.length && matches.length > 1) {
          bestMatches = matches;
          bestPattern = pattern;
        }
      }
      
      if (bestMatches.length > 1) {
        logger.info(`Found ${bestMatches.length} chapters using pattern`);
        
        // Chapter'ları böl
        for (let i = 0; i < bestMatches.length; i++) {
          const currentMatch = bestMatches[i];
          const nextMatch = bestMatches[i + 1];
          
          const startIndex = currentMatch.index;
          const endIndex = nextMatch ? nextMatch.index : text.length;
          
          const chapterText = text.substring(startIndex, endIndex).trim();
          const chapterNumber = this.extractChapterNumber(currentMatch[0]);
          const chapterTitle = this.extractChapterTitle(chapterText);
          
          if (chapterText.length > 100) { // Minimum chapter length
            chapters.push({
              chapter_number: chapterNumber,
              title: chapterTitle,
              content: chapterText,
              word_count: chapterText.split(/\s+/).length
            });
          }
        }
      } else {
        // Pattern bulunamazsa metni eşit parçalara böl
        logger.info('No chapter pattern found, splitting into equal parts');
        const wordsPerChapter = 2000;
        const words = text.split(/\s+/);
        const totalChapters = Math.ceil(words.length / wordsPerChapter);
        
        for (let i = 0; i < totalChapters; i++) {
          const startWord = i * wordsPerChapter;
          const endWord = Math.min((i + 1) * wordsPerChapter, words.length);
          const chapterWords = words.slice(startWord, endWord);
          const chapterText = chapterWords.join(' ');
          
          chapters.push({
            chapter_number: i + 1,
            title: `Part ${i + 1}`,
            content: chapterText,
            word_count: chapterWords.length
          });
        }
      }
      
      logger.info(`Successfully split into ${chapters.length} chapters`);
      return chapters;
      
    } catch (error) {
      logger.error(`Error splitting text into chapters: ${error.message}`);
      throw error;
    }
  }

  /**
   * Chapter numarasını çıkarır
   */
  extractChapterNumber(chapterHeader) {
    const romanToNumber = {
      'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
      'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20
    };
    
    // Sayı ara
    const numberMatch = chapterHeader.match(/\d+/);
    if (numberMatch) {
      return parseInt(numberMatch[0]);
    }
    
    // Roman rakamı ara
    const romanMatch = chapterHeader.match(/[IVXLCDM]+/i);
    if (romanMatch) {
      const roman = romanMatch[0].toUpperCase();
      return romanToNumber[roman] || 1;
    }
    
    return 1;
  }

  /**
   * Chapter başlığını çıkarır
   */
  extractChapterTitle(chapterText) {
    const lines = chapterText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return 'Untitled Chapter';
    
    const firstLine = lines[0].trim();
    
    // İlk satır çok uzunsa kısalt
    if (firstLine.length > 100) {
      return firstLine.substring(0, 97) + '...';
    }
    
    return firstLine;
  }

  /**
   * URL'den chapter'ları çıkarır ve veritabanına uygun formatta döndürür
   */
  async extractChaptersFromUrl(url, bookTitle = '') {
    try {
      // HTML içeriğini çek
      const html = await this.fetchBookText(url);
      
      // HTML'den temiz metin çıkar
      const text = this.extractTextFromHtml(html);
      
      if (!text || text.length < 100) {
        throw new Error('Yeterli metin içeriği bulunamadı');
      }
      
      // Metni chapter'lara böl
      const chapters = this.splitIntoChapters(text, bookTitle);
      
      if (chapters.length === 0) {
        throw new Error('Hiçbir chapter bulunamadı');
      }
      
      // Veritabanı yapısına uygun formatta döndür
      return chapters.map(chapter => ({
        chapter_number: chapter.chapter_number,
        title: chapter.title,
        content: chapter.content
      }));
      
    } catch (error) {
      logger.error(`Error extracting chapters from URL: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new BookTextExtractor(); 