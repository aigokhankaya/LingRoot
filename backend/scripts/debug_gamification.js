const { pool } = require('../config/db');
const gamificationService = require('../services/gamificationService');

async function debug() {
    try {
        console.log('Connecting...');
        const userRes = await pool.query('SELECT id, email FROM users LIMIT 1');
        if (userRes.rows.length === 0) {
            console.log('No users found.');
            return;
        }
        const user = userRes.rows[0];
        console.log('Testing for user:', user.email, user.id);

        try {
            console.log('Calling getFullStats...');
            const stats = await gamificationService.getFullStats(user.id);
            console.log('✅ Stats Result:', JSON.stringify(stats, null, 2));
        } catch (err) {
            console.error('❌ Stats Error:', err);
            console.error(err.stack);
        }

    } catch (e) {
        console.error('❌ DB Error:', e);
    } finally {
        // Force exit because config/db might keep connection open
        process.exit(0);
    }
}

debug();
