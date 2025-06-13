const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTable() {
  try {
    console.log('Checking contenthistory table structure...');
    
    // Tablo yapısını kontrol et
    const { data, error } = await supabase
      .from('contenthistory')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error accessing contenthistory table:', error);
      
      // Tablo yoksa oluşturmayı dene
      console.log('Trying to create contenthistory table...');
      const createResult = await supabase.rpc('exec_sql', { 
        sql_query: `
          CREATE TABLE IF NOT EXISTS contenthistory (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            input TEXT NOT NULL,
            input_type VARCHAR(50) NOT NULL,
            level VARCHAR(10) NOT NULL,
            mp3_url TEXT,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Enable RLS
          ALTER TABLE contenthistory ENABLE ROW LEVEL SECURITY;
          
          -- Create policy for users to access their own content
          CREATE POLICY "Users can access their own content" ON contenthistory
            FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);
        ` 
      });
      console.log('Create table result:', createResult);
    } else {
      console.log('contenthistory table exists and accessible');
      console.log('Sample data:', data);
    }
    
    // Parameters tablosunu da kontrol et
    console.log('\nChecking parameters table...');
    const { data: paramData, error: paramError } = await supabase
      .from('parameters')
      .select('*');
    
    if (paramError) {
      console.error('Parameters table error:', paramError);
    } else {
      console.log('Parameters table data:', paramData);
    }
    
  } catch (error) {
    console.error('Check failed:', error);
  }
}

checkTable(); 