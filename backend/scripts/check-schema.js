/**
 * Check Books and Chapters Schema
 * Run: node backend/scripts/check-schema.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { supabase } = require('../utils/storage/supabaseClient.js');

async function checkSchema() {
    console.log('🔍 Checking database schema for voice settings...');

    // Check 'books' table columns
    const { data: books, error: booksError } = await supabase
        .from('books')
        .select('*')
        .limit(1);

    if (booksError) {
        console.error('❌ Error fetching books:', booksError.message);
    } else if (books && books.length > 0) {
        console.log('📚 Books table keys:', Object.keys(books[0]));
    } else {
        console.log('📚 Books table is empty or inaccessible');
    }

    // Check 'chapters' table columns
    const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .limit(1);

    if (chaptersError) {
        console.error('❌ Error fetching chapters:', chaptersError.message);
    } else if (chapters && chapters.length > 0) {
        console.log('📄 Chapters table keys:', Object.keys(chapters[0]));
    } else {
        console.log('📄 Chapters table is empty');
    }
}

checkSchema().catch(console.error);
