require('dotenv').config();
const db = require('../config/db');

async function main() {
    try {
        console.log('Inspecting books schema...');

        // Check columns for books
        const booksCols = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'books'
        `);
        console.log('Books Columns:', booksCols.rows.map(r => r.column_name));

        // Check columns for user_book_progress
        const ubpCols = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_book_progress'
        `);
        console.log('user_book_progress Columns:', ubpCols.rows.map(r => r.column_name));

        // Try a sample join with minimal columns
        console.log('\nTesting Join Query...');
        const joinTest = await db.query(`
            SELECT * 
            FROM user_book_progress ub
            LIMIT 1
        `);
        console.log('Sample user_book_progress:', joinTest.rows[0]);

    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit(0);
}

main();
