require('dotenv').config();
const db = require('../config/db');

async function main() {
    const userId = '153fe018-0124-43e4-b2e8-dca91f1eb9d4'; // egokhankaya

    console.log('\n=== VERİ KAYNAKLARI ANALİZİ ===\n');

    // 1. TOPICS tablosu (Konu Ağacı)
    try {
        const topics = await db.query(`
            SELECT id, title, user_id, created_at 
            FROM topics 
            WHERE user_id = $1 
            ORDER BY created_at DESC LIMIT 10
        `, [userId]);
        console.log('📚 TOPICS (Konu Ağacı):', topics.rows.length, 'adet');
        topics.rows.forEach(t => console.log(`   - ${t.title}`));
    } catch (e) { console.log('TOPICS hatası:', e.message); }

    // 2. USER_FAVORITES (Favori Kitaplar)
    try {
        const favs = await db.query(`SELECT * FROM user_favorites WHERE user_id = $1 LIMIT 5`, [userId]);
        console.log('\n❤️ USER_FAVORITES:', favs.rows.length, 'adet');
        if (favs.rows.length > 0) console.log('   Sample:', JSON.stringify(favs.rows[0]));
    } catch (e) {
        // Alternatif tablo dene
        try {
            const favs2 = await db.query(`
                SELECT b.title, b.authors 
                FROM books b 
                WHERE b.id IN (SELECT book_id FROM user_book_progress WHERE user_id = $1)
            `, [userId]);
            console.log('\n❤️ BOOKS (via user_book_progress):', favs2.rows.length);
        } catch (e2) { console.log('Favorites error:', e2.message); }
    }

    // 3. BOOKS - Direkt favoriler
    try {
        const books = await db.query(`SELECT id, title, authors FROM books LIMIT 5`);
        console.log('\n📖 BOOKS tablosu sample:', books.rows.map(b => b.title));
    } catch (e) { console.log('BOOKS hatası:', e.message); }

    // 4. CONTENTHISTORY - podcast/text ayrımı
    try {
        const content = await db.query(`
            SELECT input_type, COUNT(*) as cnt 
            FROM contenthistory 
            WHERE user_id = $1 
            GROUP BY input_type
        `, [userId]);
        console.log('\n🎧 CONTENTHISTORY türleri:');
        content.rows.forEach(c => console.log(`   - ${c.input_type}: ${c.cnt}`));
    } catch (e) { console.log('CONTENTHISTORY hatası:', e.message); }

    // 5. CONVERSATIONS (Liro Chat)
    try {
        const convos = await db.query(`
            SELECT subject, created_at 
            FROM conversations 
            WHERE user_id = $1 
            ORDER BY created_at DESC LIMIT 10
        `, [userId]);
        console.log('\n💬 CONVERSATIONS (son 10):');
        convos.rows.forEach(c => console.log(`   - ${c.subject || '(başlıksız)'}`));
    } catch (e) { console.log('CONVERSATIONS hatası:', e.message); }

    // 6. BOOK_CHAPTERS (Chapter geçmişi)
    try {
        const chapters = await db.query(`
            SELECT bc.title, b.title as book_title
            FROM book_chapters bc
            JOIN books b ON b.id = bc.book_id
            LIMIT 5
        `);
        console.log('\n📑 BOOK_CHAPTERS sample:', chapters.rows.map(c => `${c.book_title} > ${c.title}`));
    } catch (e) { console.log('BOOK_CHAPTERS hatası:', e.message); }

    process.exit(0);
}

main();
