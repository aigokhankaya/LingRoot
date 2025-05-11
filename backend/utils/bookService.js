const fetch = require('node-fetch');

// Gutendex kitap arama fonksiyonu
async function searchBooks(query) {
  const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}&languages=en&copyright=false`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

// Gutendex kitap içeriği çekme fonksiyonu
async function fetchBookContent(bookId) {
  const detailsRes = await fetch(`https://gutendex.com/books/${bookId}`);
  const details = await detailsRes.json();
  let textUrl = null;
  if (details.formats) {
    for (const formatKey in details.formats) {
      if (formatKey.startsWith("text/plain") && details.formats[formatKey].endsWith(".txt")) {
        textUrl = details.formats[formatKey];
        break;
      }
    }
    if (!textUrl && details.formats["text/plain; charset=utf-8"]) textUrl = details.formats["text/plain; charset=utf-8"];
    else if (!textUrl && details.formats["text/plain"]) textUrl = details.formats["text/plain"];
    else {
      for (const formatKey in details.formats) {
        if (formatKey.startsWith("text/plain")) {
          textUrl = details.formats[formatKey];
          break;
        }
      }
    }
  }
  if (!textUrl) return { title: details.title, content: null };
  const textRes = await fetch(textUrl);
  const textContent = await textRes.text();
  return { title: details.title, content: textContent };
}

module.exports = { searchBooks, fetchBookContent }; 