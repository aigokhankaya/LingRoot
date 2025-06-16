const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('🔄 Veritabanı bağlantısı test ediliyor...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Veritabanı bağlantısı başarılı:', testResult.rows[0].now);
    
    console.log('📖 Migration dosyası okunuyor...');
    const migrationPath = path.join(__dirname, 'migrations', 'create_books_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Migration çalıştırılıyor...');
    await pool.query(migrationSQL);
    
    console.log('✅ Migration başarıyla tamamlandı!');
    
    // Test: Kitap sayısını kontrol et
    const bookCount = await pool.query('SELECT COUNT(*) FROM books');
    console.log(`📚 Toplam kitap sayısı: ${bookCount.rows[0].count}`);
    
    const chapterCount = await pool.query('SELECT COUNT(*) FROM chapters');
    console.log(`📄 Toplam bölüm sayısı: ${chapterCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration hatası:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    console.log('🔚 Veritabanı bağlantısı kapatıldı.');
  }
}

runMigration(); 