const { pool } = require('../config/db');

async function checkData() {
    try {
        console.log('--- VERİTABANI KONTROLÜ ---');

        // 1. Sektör Kelimeleri Sayısı
        const vocabCount = await pool.query('SELECT count(*) FROM sector_vocabulary');
        console.log(`✅ Toplam Kelime/Kalıp Sayısı: ${vocabCount.rows[0].count}`);

        // 2. İçerik (Diyalog, Cümle, Email) Sayısı
        const contentCount = await pool.query('SELECT count(*) FROM sector_content');
        console.log(`✅ Toplam İçerik (Diyalog/Email/Cümle) Sayısı: ${contentCount.rows[0].count}`);

        // 3. Örnek Veri (IT Sektörü)
        const example = await pool.query(`
      SELECT word, definition_tr, category 
      FROM sector_vocabulary 
      WHERE sector_id = (SELECT id FROM sectors WHERE code = 'it_software' LIMIT 1) 
      LIMIT 3
    `);

        console.log('\n--- Örnek Veriler (IT Sektörü) ---');
        console.table(example.rows);

        process.exit(0);
    } catch (err) {
        console.error('Hata:', err);
        process.exit(1);
    }
}

checkData();
