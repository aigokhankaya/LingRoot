require('dotenv').config();
const db = require('../config/db');

async function main() {
    const email = 'egokhankaya@gmail.com';
    console.log(`Diagnosing data for: ${email}`);

    try {
        const userRes = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            console.log('User not found');
            return;
        }
        const userId = userRes.rows[0].id;
        console.log(`User ID: ${userId}`);

        // Check contenthistory
        const ch = await db.query('SELECT count(*) FROM contenthistory WHERE user_id = $1', [userId]);
        console.log(`contenthistory count: ${ch.rows[0].count}`);

        // Check user_content_progress
        try {
            const ucp = await db.query('SELECT count(*) FROM user_content_progress WHERE user_id = $1', [userId]);
            console.log(`user_content_progress count: ${ucp.rows[0].count}`);
        } catch (e) { console.log('user_content_progress table error:', e.message); }

        // Check topic_nodes connection via ucp
        try {
            const topics = await db.query(`
                SELECT count(*) 
                FROM user_content_progress ucp
                JOIN content_items ci ON ci.id = ucp.content_item_id
                JOIN topic_nodes tn ON tn.id = ci.topic_id
                WHERE ucp.user_id = $1
            `, [userId]);
            console.log(`Linked Topic Nodes count: ${topics.rows[0].count}`);
        } catch (e) { console.log('Topic node query error:', e.message); }

        // Check user_books
        try {
            const ub = await db.query('SELECT count(*) FROM user_books WHERE user_id = $1', [userId]);
            console.log(`user_books count: ${ub.rows[0].count}`);
        } catch (e) { console.log('user_books table error:', e.message); }

        // Check for any other potentially relevant tables for books/pdfs
        // maybe 'favorites'?
        try {
            const fav = await db.query('SELECT count(*) FROM favorites WHERE user_id = $1', [userId]);
            console.log(`favorites count: ${fav.rows[0].count}`);
            if (fav.rows[0].count > 0) {
                const favSamples = await db.query('SELECT * FROM favorites WHERE user_id = $1 LIMIT 3', [userId]);
                console.log('Sample favorites:', favSamples.rows);
            }
        } catch (e) { console.log('favorites table error:', e.message); }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await db.end();
    }
}

main();
