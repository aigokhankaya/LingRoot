const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');

async function runDirectorAgentMigration() {
    try {
        console.log('🔄 Veritabanı bağlantısı test ediliyor...');
        // Use db.pool directly to ensure we use the configured pool
        const testResult = await db.pool.query('SELECT NOW()');
        console.log('✅ Veritabanı bağlantısı başarılı:', testResult.rows[0].now);

        console.log('📖 Director Agent migration dosyası okunuyor...');
        const migrationPath = path.join(__dirname, '../migrations', 'director_agent_mood_columns.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('🚀 Migration çalıştırılıyor...');
        await db.pool.query(migrationSQL);

        console.log('✅ Migration başarıyla tamamlandı!');

        // Verify columns
        console.log('🔍 Sütunlar kontrol ediliyor...');
        const tables = ['topics', 'contenthistory', 'conversations'];
        const columns = ['mood_tag', 'detected_mood', 'current_mood'];

        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            const col = columns[i];
            try {
                const check = await db.pool.query(
                    `SELECT column_name FROM information_schema.columns 
                 WHERE table_name = $1 AND column_name = $2`,
                    [table, col]
                );
                if (check.rows.length > 0) {
                    console.log(`✅ ${table}.${col} mevcut.`);
                } else {
                    console.error(`❌ ${table}.${col} EKLENEMEDİ!`);
                }
            } catch (e) {
                console.error(`Error checking ${table}.${col}:`, e.message);
            }
        }

    } catch (error) {
        console.error('❌ Migration hatası:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        // Attempt to close pool, though db module handles it usually. 
        // Since this is a standalone script, we want to exit.
        await db.pool.end();
        console.log('🔚 Veritabanı bağlantısı kapatıldı.');
    }
}

runDirectorAgentMigration();
