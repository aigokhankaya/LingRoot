const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
  try {
    const sql = fs.readFileSync('./migrations/create_parameters_table.sql', 'utf8');
    console.log('Running migration...');
    console.log('SQL:', sql);
    
    // Direkt SQL çalıştır
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      console.error('Error:', error);
      // Alternatif olarak manuel SQL çalıştır
      console.log('Trying alternative approach...');
      
      // Parameters tablosunu oluştur
      const createTableResult = await supabase.rpc('exec_sql', { 
        sql_query: `CREATE TABLE IF NOT EXISTS parameters (
          id SERIAL PRIMARY KEY,
          key VARCHAR(255) UNIQUE NOT NULL,
          value TEXT,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )` 
      });
      console.log('Create table result:', createTableResult);
      
      // RLS politikalarını ekle
      const rlsResult = await supabase.rpc('exec_sql', { 
        sql_query: `ALTER TABLE parameters ENABLE ROW LEVEL SECURITY` 
      });
      console.log('RLS result:', rlsResult);
      
      // Default parametreleri ekle
      const insertResult = await supabase
        .from('parameters')
        .upsert([
          { key: 'mock_tts_enabled', value: 'false', description: 'Enable mock TTS responses instead of real API calls' },
          { key: 'mock_content_save_enabled', value: 'false', description: 'Enable mock content saving instead of real database saves' },
          { key: 'mock_auth_enabled', value: 'false', description: 'Enable mock authentication for testing purposes' }
        ]);
      console.log('Insert result:', insertResult);
    } else {
      console.log('Success:', data);
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration(); 