const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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
        const migrationPath = path.join(__dirname, '../migrations', 'director_mode_2.0.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('🚀 Director Mode 2.0 Migration çalıştırılıyor...');
        await pool.query(migrationSQL);

        console.log('✅ Migration başarıyla tamamlandı!');

        // Validate
        const checkCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'books' 
      AND column_name IN ('preferred_voice_id', 'narrator_style');
    `);

        console.log('🔍 Eklenen kolonlar:', checkCols.rows.map(r => r.column_name));

    } catch (error) {
        console.error('❌ Migration hatası:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
        console.log('🔚 Veritabanı bağlantısı kapatıldı.');
    }
}

runMigration();
