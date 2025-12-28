require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
});

async function runMigration() {
    try {
        await client.connect();
        console.log('🔌 Connected to database');

        const migrationPath = path.join(__dirname, '../migrations/20251226_create_pattern_library.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('📜 Running migration: 20251226_create_pattern_library.sql');
        await client.query(sql);

        console.log('✅ Migration applied successfully');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
