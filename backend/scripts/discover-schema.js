require('dotenv').config();
const db = require('../config/db');

async function main() {
    try {
        console.log('Searching for tables...');
        const res = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (
                table_name LIKE '%book%' OR 
                table_name LIKE '%user%' OR
                table_name LIKE '%content%' OR 
                table_name LIKE '%topic%' OR
                table_name LIKE '%fav%'
            )
            ORDER BY table_name;
        `);
        console.log('Found tables:', res.rows.map(r => r.table_name));

        // Let's also look at contenthistory content to see if we can extract topics from there
        // since user_content_progress is empty
        const chSamples = await db.query(`
            SELECT id, input_type, input, level, created_at, audio_duration_seconds
            FROM contenthistory 
            WHERE user_id = (SELECT id FROM users WHERE email = 'egokhankaya@gmail.com')
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        console.log('\nSample contenthistory items:', JSON.stringify(chSamples.rows, null, 2));

    } catch (err) {
        console.error(err);
    }
    // db.end() is apparently not a function on the pool in this environment or setup, 
    // just letting process exit or hanging is fine for this one-off.
    // However, I should try to exit cleanly if possible.
    process.exit(0);
}

main();
