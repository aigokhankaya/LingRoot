const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function runMigration() {
  try {
    console.log('🚀 Starting migration to add translated_text and adapted_text columns...');
    
    // Read migration file
    const migrationSQL = fs.readFileSync('./migrations/add_translated_adapted_text_columns.sql', 'utf8');
    console.log('📄 Migration file loaded successfully');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`\n⚡ Executing statement ${i + 1}/${statements.length}:`);
        console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
        
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          console.error('❌ Error:', error);
          throw error;
        } else {
          console.log('✅ Success!');
        }
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📝 contenthistory table now has translated_text and adapted_text columns');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 