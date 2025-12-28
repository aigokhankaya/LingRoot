const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        console.log('Using backend DB config...');
        const filePath = path.join(__dirname, '../migrations/0055_gamification_tables.sql');
        if (!fs.existsSync(filePath)) throw new Error('File not found');

        const sql = fs.readFileSync(filePath, 'utf8');
        console.log('Executing SQL...');
        await pool.query(sql);
        console.log('✅ Success: Gamification tables created/updated.');
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await pool.end();
    }
}

run();
