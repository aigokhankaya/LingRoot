const { pool } = require('../config/db');

async function run() {
    try {
        console.log('Checking user_achievements schema...');
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_achievements'
    `);
        console.log('Columns in user_achievements:', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
