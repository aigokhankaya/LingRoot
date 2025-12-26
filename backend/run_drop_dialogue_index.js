// Run migration to drop the problematic dialogue_segments index
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ SUPABASE_URL veya SUPABASE_SERVICE_KEY tanımlı değil');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const migrationPath = path.join(__dirname, 'migrations', 'drop_dialogue_segments_index.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🔧 Migration çalıştırılıyor: drop_dialogue_segments_index.sql');
    console.log('SQL:', sql);

    try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            // exec_sql RPC yoksa, doğrudan SQL çalıştırmayı dene
            console.log('⚠️ exec_sql RPC bulunamadı, alternatif yöntem deneniyor...');
            console.log('');
            console.log('📋 Lütfen Supabase Dashboard SQL Editor\'da şu komutu çalıştır:');
            console.log('');
            console.log('DROP INDEX IF EXISTS idx_contenthistory_dialogue_segments;');
            console.log('');
            return;
        }

        console.log('✅ Migration başarıyla tamamlandı!');
    } catch (err) {
        console.log('');
        console.log('📋 Supabase Dashboard SQL Editor\'da şu komutu çalıştır:');
        console.log('');
        console.log('DROP INDEX IF EXISTS idx_contenthistory_dialogue_segments;');
        console.log('');
    }
}

runMigration();
