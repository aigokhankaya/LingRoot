const markdownpdf = require('markdown-pdf');
const fs = require('fs');
const path = require('path');

// Dosya yolları
const markdownFile = path.join(__dirname, '../docs/LingRoot_User_Guide.md');
const pdfFile = path.join(__dirname, '../docs/LingRoot_User_Guide.pdf');
const cssFile = path.join(__dirname, '../styles/pdf.css');

// Dosyaların varlığını kontrol et
console.log('Markdown dosyası kontrol ediliyor:', markdownFile);
if (!fs.existsSync(markdownFile)) {
  console.error('Markdown dosyası bulunamadı:', markdownFile);
  process.exit(1);
}

console.log('CSS dosyası kontrol ediliyor:', cssFile);
if (!fs.existsSync(cssFile)) {
  console.error('CSS dosyası bulunamadı:', cssFile);
  console.log('CSS dosyası olmadan devam ediliyor...');
}

// PDF oluşturma ayarları
const options = {
  cssPath: fs.existsSync(cssFile) ? cssFile : undefined,
  paperFormat: 'A4',
  paperOrientation: 'portrait',
  remarkable: {
    html: true,
    breaks: true
  }
};

console.log('PDF oluşturuluyor...');

// Markdown dosyasını oku
try {
  const markdown = fs.readFileSync(markdownFile, 'utf8');
  console.log('Markdown dosyası başarıyla okundu, uzunluk:', markdown.length);
  
  // PDF oluştur
  markdownpdf(options)
    .from.string(markdown)
    .to(pdfFile, function (err) {
      if (err) {
        console.error('PDF oluşturma hatası:', err);
        process.exit(1);
      }
      console.log('PDF başarıyla oluşturuldu:', pdfFile);
    });
} catch (error) {
  console.error('Dosya okuma hatası:', error);
  process.exit(1);
} 