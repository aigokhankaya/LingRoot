const { supabase } = require('../utils/supabaseClient');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function runMigration() {
    try {
        logger.info('🔄 Starting locale column migration via Supabase client...');

        // Check if locale column already exists by attempting to query it
        const { data: testData, error: testError } = await supabase
            .from('users')
            .select('locale')
            .limit(1);

        if (!testError) {
            logger.info('ℹ️  Locale column already exists, skipping migration.');
            return;
        }

        // Read migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', 'add_locale_column_to_users.sql');
        logger.info('📖 Reading migration file from:', migrationPath);

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        logger.info('📄 Migration file loaded');

        // Execute migration using Supabase RPC or admin connection
        // Note: Standard Supabase client doesn't support raw SQL execution
        // This will need to be run via Supabase Dashboard SQL Editor or psql

        logger.warn('⚠️  Migration SQL needs to be executed via Supabase Dashboard:');
        logger.info('1. Go to Supabase Dashboard > SQL Editor');
        logger.info('2. Run the following SQL:');
        logger.info('---');
        console.log(migrationSQL);
        logger.info('---');
        logger.info('3. Or use the Supabase CLI: supabase db execute --file migrations/add_locale_column_to_users.sql');

    } catch (error) {
        logger.error('❌ Migration check failed:', error.message);
        logger.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration };
