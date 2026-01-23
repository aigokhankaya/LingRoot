/**
 * Director Mode 2.0 Migration - Add voice_settings JSONB column
 * Uses Supabase client instead of direct pg connection
 * 
 * Run: node backend/scripts/run_director_migration_v2.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { supabase } = require('../utils/storage/supabaseClient.js');

async function runMigration() {
    console.log('🔧 Director Mode 2.0 Migration');
    console.log('================================');

    try {
        // Check current schema
        const { data: sample, error: sampleError } = await supabase
            .from('books')
            .select('id, title, voice_settings')
            .limit(1);

        if (sampleError) {
            // Column doesn't exist yet, need to add it via SQL
            console.log('📋 voice_settings column not found, attempting to add...');

            // Use Supabase's rpc or raw SQL
            const { error: alterError } = await supabase.rpc('exec_sql', {
                sql: `ALTER TABLE books ADD COLUMN IF NOT EXISTS voice_settings JSONB DEFAULT '{}'::jsonb;`
            });

            if (alterError) {
                console.log('⚠️ RPC method not available. Trying alternative approach...');

                // Alternative: Update a book with voice_settings to see if column exists
                // If it fails, we know we need manual migration
                const { data: testUpdate, error: testError } = await supabase
                    .from('books')
                    .update({ voice_settings: {} })
                    .eq('id', 0) // Non-existent ID, just testing column
                    .select();

                if (testError && testError.message.includes('voice_settings')) {
                    console.log('❌ Column does not exist. Please run this SQL in Supabase Dashboard:');
                    console.log('');
                    console.log('  ALTER TABLE books ADD COLUMN IF NOT EXISTS voice_settings JSONB DEFAULT \'{}\'::jsonb;');
                    console.log('');
                    return;
                }
            }

            console.log('✅ Column added successfully!');
        } else {
            console.log('✅ voice_settings column already exists');
            if (sample && sample.length > 0) {
                console.log('📋 Sample book:', sample[0].title);
                console.log('📋 Current voice_settings:', sample[0].voice_settings || '(empty)');
            }
        }

        // Verify
        const { data: verify, error: verifyError } = await supabase
            .from('books')
            .select('id, title, voice_settings')
            .limit(1);

        if (!verifyError && verify) {
            console.log('');
            console.log('✅ Migration verification passed!');
            console.log('📚 Books table now supports voice_settings JSONB column');
        }

    } catch (error) {
        console.error('❌ Migration error:', error.message);
    }
}

runMigration();
