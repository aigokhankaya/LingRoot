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

async function runDeduplication() {
    try {
        await client.connect();
        console.log('🔌 Connected to database');

        // First, let's count duplicates before
        const beforeCount = await client.query('SELECT COUNT(*) as total FROM pattern_library');
        console.log(`📊 Total records before deduplication: ${beforeCount.rows[0].total}`);

        // Count duplicate groups
        const duplicateGroups = await client.query(`
            SELECT text, COALESCE(translation, '') as translation, COALESCE(explanation, '') as explanation, COUNT(*) as cnt
            FROM pattern_library
            GROUP BY text, COALESCE(translation, ''), COALESCE(explanation, '')
            HAVING COUNT(*) > 1
            LIMIT 10
        `);
        console.log(`🔍 Found ${duplicateGroups.rowCount} duplicate groups (showing first 10)`);

        if (duplicateGroups.rowCount > 0) {
            console.log('\nSample duplicates:');
            duplicateGroups.rows.forEach((row, i) => {
                console.log(`  ${i + 1}. "${row.text.substring(0, 50)}..." (${row.cnt} copies)`);
            });
        }

        // Run the migration
        const migrationPath = path.join(__dirname, '../migrations/20251228_deduplicate_pattern_library.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('\n📜 Running migration: 20251228_deduplicate_pattern_library.sql');
        await client.query(sql);

        // Count after
        const afterCount = await client.query('SELECT COUNT(*) as total FROM pattern_library');
        console.log(`\n✅ Deduplication complete!`);
        console.log(`📊 Records before: ${beforeCount.rows[0].total}`);
        console.log(`📊 Records after: ${afterCount.rows[0].total}`);
        console.log(`🗑️  Removed: ${beforeCount.rows[0].total - afterCount.rows[0].total} duplicate records`);

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await client.end();
    }
}

runDeduplication();
