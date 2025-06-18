const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Database URL exists:', !!process.env.DATABASE_URL);
    
    // Test database connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', testResult.rows[0].now);
    
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create_books_tables.sql');
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
    
    // Verify tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('books', 'chapters', 'chapter_audio')
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:', tablesResult.rows.map(r => r.table_name));
    
    // Check sample data
    const bookCount = await pool.query('SELECT COUNT(*) FROM books');
    console.log(`📚 Total books: ${bookCount.rows[0].count}`);
    
    const chapterCount = await pool.query('SELECT COUNT(*) FROM chapters');
    console.log(`📄 Total chapters: ${chapterCount.rows[0].count}`);
    
    console.log('🎉 Migration completed successfully!');
    
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