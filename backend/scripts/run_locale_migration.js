const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    try {
        console.log('🔄 Starting locale column migration...');
        console.log('Environment:', process.env.NODE_ENV);
        console.log('Database URL exists:', !!process.env.DATABASE_URL);

        // Test database connection
        const testResult = await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful:', testResult.rows[0].now);

        // Check if locale column already exists
        const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'locale'
    `);

        if (columnCheck.rows.length > 0) {
            console.log('ℹ️  Locale column already exists, skipping migration.');
            return;
        }

        // Read migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', 'add_locale_column_to_users.sql');
        console.log('📖 Reading migration file from:', migrationPath);

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('📄 Migration file size:', migrationSQL.length, 'characters');

        // Run migration
        console.log('🚀 Executing migration...');
        await pool.query(migrationSQL);
        console.log('✅ Migration completed successfully!');

        // Verify column was added
        const verifyResult = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'locale'
    `);

        if (verifyResult.rows.length > 0) {
            console.log('✅ Locale column verified:', verifyResult.rows[0]);
        } else {
            console.error('❌ Locale column was not created');
        }

        console.log('🎉 Locale migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('🔚 Database connection closed.');
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration };
