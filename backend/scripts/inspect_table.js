const { pool } = require('../config/db');
require('dotenv').config({ path: '../.env' });

async function run() {
    try {
        const res = await pool.query("SELECT * FROM topic_contents LIMIT 1");
        if (res.rows.length > 0) {
            console.log("Columns:", Object.keys(res.rows[0]));
            console.log("Sample row:", JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log("Topic contents table is empty");
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
