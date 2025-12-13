const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
console.log('DEBUG: Script __dirname:', __dirname);
console.log('DEBUG: Expected .env path:', envPath);
console.log('DEBUG: .env exists?', fs.existsSync(envPath));

require('dotenv').config({ path: envPath });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    try {
        console.log('🔄 Starting director mode migration...');
        console.log('Database URL exists:', !!process.env.DATABASE_URL);
        if (process.env.DATABASE_URL) {
            console.log('Database URL prefix:', process.env.DATABASE_URL.substring(0, 15) + '...');
        }

        // Read migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', 'director_mode_columns.sql');
        console.log('📖 Reading migration file from:', migrationPath);

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Run migration
        console.log('🚀 Executing migration...');
        await pool.query(migrationSQL);
        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
