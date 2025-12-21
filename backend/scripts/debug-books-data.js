require('dotenv').config();
const db = require('../config/db');

async function main() {
    try {
        console.log('Searching for book-related content...');

        // Check content_items for type 'book' or similar
        const contentItems = await db.query(`
            SELECT type, count(*) 
            FROM content_items 
            GROUP BY type
        `);
        console.log('Content Item Types:', contentItems.rows);

        // Check if user has progress on any content item of type 'book'
        const userProgress = await db.query(`
            SELECT ci.type, ci.title, ucp.status, ucp.progress_percent 
            FROM user_content_progress ucp
            JOIN content_items ci ON ci.id = ucp.content_item_id
            WHERE ucp.user_id = (SELECT id FROM users WHERE email = 'egokhankaya@gmail.com')
            LIMIT 10
        `);
        console.log('User Progress Samples:', userProgress.rows);

        // Check 'user_book_progress' table structure again with count
        const ubpCount = await db.query(`SELECT count(*) FROM user_book_progress`);
        console.log('Total rows in user_book_progress table:', ubpCount.rows[0].count);

    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit(0);
}

main();
