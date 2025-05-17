const markdownpdf = require('markdown-pdf');
const fs = require('fs');
const path = require('path');

// PDF oluşturma ayarları
const options = {
  cssPath: path.join(__dirname, '../styles/pdf.css'),
  remarkable: {
    html: true,
    breaks: true,
    plugins: ['markdown-it-emoji']
  }
};

// Markdown dosyasını oku
const markdown = fs.readFileSync(path.join(__dirname, '../docs/LingRoot_User_Guide.md'), 'utf8');

// PDF oluştur
markdownpdf(options)
  .from(markdown)
  .to(path.join(__dirname, '../docs/LingRoot_User_Guide.pdf'), function () {
    console.log('PDF başarıyla oluşturuldu!');
  }); 