const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        console.log('🗑️ Dropping existing gamification tables to fix schema mismatch...');
        await pool.query(`
      DROP TABLE IF EXISTS user_goals CASCADE;
      DROP TABLE IF EXISTS user_achievements CASCADE;
      DROP TABLE IF EXISTS achievements CASCADE;
      DROP TABLE IF EXISTS user_gamification CASCADE;
      DROP TABLE IF EXISTS daily_quests CASCADE;
      DROP TABLE IF EXISTS user_quest_progress CASCADE;
      DROP TABLE IF EXISTS quest_nodes CASCADE;
      DROP TABLE IF EXISTS xp_transactions CASCADE;
    `);

        console.log('🔄 Re-applying 0055_gamification_tables.sql...');
        const filePath = path.join(__dirname, '../migrations/0055_gamification_tables.sql');
        if (!fs.existsSync(filePath)) throw new Error('Migration file 0055 not found');

        const sql = fs.readFileSync(filePath, 'utf8');
        await pool.query(sql);

        console.log('✅ Database schema fixed successfully.');
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        process.exit(0);
    }
}
run();
