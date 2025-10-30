const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔧 Running external services migration...');
    
    const migrationPath = path.join(__dirname, '../migrations/0037_create_external_services_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    
    console.log('✅ External services migration completed successfully!');
    
    // Verify the data
    const result = await client.query('SELECT * FROM external_services');
    console.log(`📊 Found ${result.rows.length} external service(s):`);
    result.rows.forEach(row => {
      console.log(`  - ${row.service_name} (${row.service_type}): ${row.api_url}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
