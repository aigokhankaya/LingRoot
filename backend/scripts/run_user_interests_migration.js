const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Supabase requires SSL
});

async function runMigration() {
    try {
        console.log('🔄 Starting user_interests migration...');

        // Test database connection
        const testResult = await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful:', testResult.rows[0].now);

        // Read migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', 'create_user_interests_table.sql');
        console.log('📖 Reading migration file from:', migrationPath);

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Run migration
        console.log('🚀 Executing migration...');
        await pool.query(migrationSQL);
        console.log('✅ Created user_interests table successfully!');

        // Now verify
        const verifyResult = await pool.query("SELECT to_regclass('public.user_interests')");
        if (verifyResult.rows[0].to_regclass) {
            console.log('🎉 Verification successful: Table exists.');
        } else {
            console.error('❌ Verification failed: Table does not exist.');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await pool.end();
    }
}

runMigration();
