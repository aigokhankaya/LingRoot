require('dotenv').config();
console.log({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

const fetch = require('node-fetch');
const { Pool } = require('pg');

// PostgreSQL bağlantı ayarları (gerekirse .env'den alabilirsin)
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'lingroot',
  password: process.env.PGPASSWORD || 'postgres',
  port: process.env.PGPORT || 5432,
});

async function createTableIfNotExists() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS books (
      id SERIAL PRIMARY KEY,
      gutendex_id INTEGER UNIQUE,
      title TEXT,
      authors TEXT,
      cover_url TEXT,
      download_count INTEGER,
      language TEXT,
      copyright BOOLEAN,
      subjects TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function insertBook(book) {
  const authors = book.authors.map(a => a.name).join(', ');
  const cover_url = book.formats["image/jpeg"] || null;
  const subjects = book.subjects.join(', ');
  await pool.query(
    `INSERT INTO books (gutendex_id, title, authors, cover_url, download_count, language, copyright, subjects)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (gutendex_id) DO NOTHING`,
    [
      book.id,
      book.title,
      authors,
      cover_url,
      book.download_count,
      (book.languages && book.languages[0]) || null,
      book.copyright || false,
      subjects
    ]
  );
}

async function fetchAndInsertAllBooks() {
  let next = 'https://gutendex.com/books/?languages=en&copyright=false&page=1';
  let total = 0;
  while (next) {
    console.log('Fetching:', next);
    const res = await fetch(next);
    const data = await res.json();
    for (const book of data.results) {
      await insertBook(book);
      total++;
    }
    next = data.next;
    if (!next) break;
  }
  console.log(`Toplam ${total} kitap eklendi!`);
}

(async () => {
  await createTableIfNotExists();
  await fetchAndInsertAllBooks();
  await pool.end();
})(); 